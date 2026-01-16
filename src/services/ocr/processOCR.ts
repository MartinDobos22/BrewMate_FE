import { API_HOST, API_URL } from '../api';
import { preferenceEngine } from '../Personalization';
import type { TasteProfileVector, UserTasteProfile } from '../../types/Personalization';
import { normalizeKeysToSnakeCase } from '../../utils/normalize';
import { getAuthToken } from './auth';
import { fixTextWithAI, suggestBrewingMethods } from './aiServices';
import {
  NEUTRAL_EVALUATION_COPY,
  normalizeEvaluationResponse,
  resolveInsightSummary,
  resolveVerdictExplanationText,
} from './evaluation';
import { estimateCoffeeAttributesFromText, mergeStructuredMetadata, normalizeStructuredMetadataPayload } from './metadata';
import { ensureOnline, loggedFetch, loggedFetchWithStatusRetry } from './network';
import { isCoffeeRelatedText } from './textDetection';
import { isServerTasteProfile, isTasteProfileComplete, mapTasteProfilePayload, needsTasteProfileTimestamps } from './tasteProfile';
import type { CoffeeEvaluationResult, OCRResult, StructuredCoffeeMetadata } from './types';
import { safeParseJSON } from './utils';

/**
 * Processes OCR using backend services with offline fallbacks, AI enrichment, label detection,
 * and structured metadata parsing.
 *
 * @param {string} base64image - Base64 encoded image captured from the coffee label.
 * @param {{ imagePath?: string }} [options] - Optional hints including a pre-saved image path to reuse for offline flow.
 * @returns {Promise<OCRResult|null>} Consolidated OCR result including recommendations and metadata, or `null` when offline fallback fails.
 * @throws {Error} Propagates unexpected errors other than offline scenarios which are handled via fallback logic.
 */
export const processOCR = async (
  base64image: string,
  options?: { imagePath?: string; tasteProfile?: TasteProfileVector | UserTasteProfile | null },
): Promise<OCRResult | null> => {
  try {
    await ensureOnline();
    // 1. Pošli na Google Vision API
    const ocrResponse = await loggedFetch(`${API_HOST}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeKeysToSnakeCase({ base64image })),
    });

    if (!ocrResponse.ok) {
      let errorText = '';
      try {
        errorText = await ocrResponse.text();
      } catch (error) {
        console.warn('Failed to read OCR error response', error);
      }
      const normalizedError = errorText.toLowerCase();
      if (ocrResponse.status === 413 || (ocrResponse.status === 400 && normalizedError.includes('upload aborted'))) {
        throw new Error('upload aborted');
      }
      throw new Error(
        errorText || `OCR request failed with status ${ocrResponse.status}`,
      );
    }

    const ocrData = await ocrResponse.json();
    console.log('📥 [BE] OCR result:', ocrData);

    if (ocrData.error) {
      throw new Error(ocrData.error);
    }

    const originalText = ocrData.text;
    const detectionLabels: string[] | undefined = Array.isArray(ocrData.labels)
      ? ocrData.labels.filter((label: unknown): label is string => typeof label === 'string')
      : undefined;
    const detectionConfidence =
      typeof ocrData.coffeeConfidence === 'number' ? ocrData.coffeeConfidence : undefined;
    const initialStructuredMetadata = safeParseJSON<Record<string, unknown>>(
      ocrData.structured_metadata ?? ocrData.structuredMetadata
    );
    const initialNormalizedStructuredMetadata =
      normalizeStructuredMetadataPayload(initialStructuredMetadata);
    const initialStructuredConfidence = safeParseJSON<Record<string, unknown>>(
      ocrData.structured_confidence ?? ocrData.structuredConfidence
    );

    // 2. Oprav text pomocou AI
    const correctedText = await fixTextWithAI(originalText);
    const trimmedCorrectedText = correctedText.trim();
    const hasReadableText = trimmedCorrectedText.length > 0;

    let isCoffee: boolean | undefined;
    if (typeof ocrData.isCoffee === 'boolean') {
      isCoffee = ocrData.isCoffee;
    } else {
      isCoffee =
        (detectionLabels?.some(label => isCoffeeRelatedText(label)) ?? false) ||
        isCoffeeRelatedText(trimmedCorrectedText) ||
        isCoffeeRelatedText(originalText);
    }

    const nonCoffeeReasonRaw =
      typeof ocrData.nonCoffeeReason === 'string' ? ocrData.nonCoffeeReason : undefined;
    let nonCoffeeReason = nonCoffeeReasonRaw;
    if (!nonCoffeeReason && isCoffee === false && detectionLabels && detectionLabels.length > 0) {
      nonCoffeeReason = `Rozpoznané: ${detectionLabels.slice(0, 3).join(', ')}`;
    }

    let matchPercentage: number | null = null;
    let isRecommended = false;
    let scanId = '';
    let structuredMetadata: StructuredCoffeeMetadata | null = null;
    let structuredConfidence: Record<string, unknown> | null = null;
    let structuredUncertainty: Record<string, unknown> | null = null;
    let rawStructuredResponse: unknown = null;

    let token: string | null = null;
    const hasCoffeeTextSignals =
      hasReadableText &&
      (isCoffeeRelatedText(trimmedCorrectedText) || isCoffeeRelatedText(originalText));
    const minTextOnlyLength = 40;
    const hasTextOnlyCoffeeSignal =
      !detectionLabels?.length &&
      !initialStructuredMetadata &&
      trimmedCorrectedText.length >= minTextOnlyLength &&
      isCoffeeRelatedText(trimmedCorrectedText);
    const shouldPersistScan =
      hasCoffeeTextSignals ||
      hasTextOnlyCoffeeSignal ||
      (isCoffee &&
        (Boolean(detectionLabels?.length) || Boolean(initialStructuredMetadata)));
    const shouldEvaluate = isCoffee !== false && hasReadableText;
    if (shouldEvaluate || shouldPersistScan) {
      await ensureOnline();
      token = await getAuthToken();
      if (!token) {
        throw new Error('Nie si prihlásený');
      }
    }
    if (shouldPersistScan) {
      const savePayload: Record<string, unknown> = {
        original_text: originalText,
        corrected_text: trimmedCorrectedText,
      };
      if (initialStructuredMetadata) {
        savePayload.structured_metadata = initialStructuredMetadata;
      }
      if (initialStructuredConfidence) {
        savePayload.structured_confidence = initialStructuredConfidence;
      }

      const saveResponse = await loggedFetch(`${API_URL}/ocr/save`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // Expect snake_case keys for OCR payloads (manual QA: verify request body format).
        body: JSON.stringify(normalizeKeysToSnakeCase(savePayload)),
      });

      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        console.log('📥 [BE] Save OCR response:', saveData);
        matchPercentage =
          typeof saveData.match_percentage === 'number' ? saveData.match_percentage : null;
        isRecommended = saveData.is_recommended || false;
        scanId = saveData.id || '';

        const metadataRaw =
          saveData.structured_metadata ??
          saveData.structuredMetadata ??
          initialStructuredMetadata;
        const metadataParsed = safeParseJSON<Record<string, any>>(metadataRaw);
        structuredMetadata = normalizeStructuredMetadataPayload(metadataParsed);
        if (structuredMetadata) {
          rawStructuredResponse = metadataParsed;
        }

        structuredConfidence = safeParseJSON<Record<string, unknown>>(
          saveData.structured_confidence ??
            saveData.structuredConfidence ??
            initialStructuredConfidence
        );
        structuredUncertainty = safeParseJSON<Record<string, unknown>>(
          saveData.structured_uncertainty
        );
        if (rawStructuredResponse == null) {
          rawStructuredResponse = metadataRaw ?? null;
        }
      }
    }
    if (!structuredMetadata && initialNormalizedStructuredMetadata) {
      structuredMetadata = initialNormalizedStructuredMetadata;
      if (rawStructuredResponse == null) {
        rawStructuredResponse = initialStructuredMetadata;
      }
    }
    if (!structuredConfidence && initialStructuredConfidence) {
      structuredConfidence = initialStructuredConfidence;
    }
    const fallbackEvaluation: CoffeeEvaluationResult = {
      status: 'unknown',
      verdict: null,
      confidence: null,
      summary: NEUTRAL_EVALUATION_COPY.summary,
      reasons: [],
      dimension_diffs: [],
      what_youll_like: [],
      what_might_bother_you: [],
      tips_to_make_it_better: [],
      recommended_brew_methods: [],
      cta: { action: null, label: null },
      disclaimer: NEUTRAL_EVALUATION_COPY.disclaimer,
      verdict_explanation: NEUTRAL_EVALUATION_COPY.verdict_explanation,
      insight: null,
      raw: null,
    };

    const evaluationRetryFallback: CoffeeEvaluationResult = {
      status: 'unknown',
      verdict: null,
      confidence: null,
      summary: 'Hodnotenie kávy je momentálne nedostupné.',
      reasons: [],
      dimension_diffs: [],
      what_youll_like: [],
      what_might_bother_you: [],
      tips_to_make_it_better: [],
      recommended_brew_methods: [],
      cta: { action: null, label: null },
      disclaimer:
        'Skúste to znova o chvíľu. Výsledok môže byť dostupný po obnovení služby.',
      verdict_explanation:
        'Hodnotenie sa nepodarilo dokončiť pre dočasný problém na strane služby.',
      insight: null,
      raw: null,
    };

    // 4. Získaj AI hodnotenie a návrhy metód súčasne
    const estimatedAttributes = estimateCoffeeAttributesFromText(trimmedCorrectedText);
    const mergedStructuredMetadata = mergeStructuredMetadata(
      structuredMetadata,
      estimatedAttributes,
    );
    structuredMetadata = mergedStructuredMetadata;
    const evaluationStructuredMetadata = mergedStructuredMetadata;
    let tasteProfileSent = false;
    let tasteProfileRejectedAsStale = false;
    const emptyTextEvaluation: CoffeeEvaluationResult = {
      status: 'insufficient_coffee_data',
      verdict: null,
      confidence: null,
      summary: 'Z etikety nebolo možné prečítať text.',
      reasons: [],
      dimension_diffs: [],
      what_youll_like: [],
      what_might_bother_you: [],
      tips_to_make_it_better: [],
      recommended_brew_methods: [],
      cta: { action: null, label: null },
      disclaimer: NEUTRAL_EVALUATION_COPY.disclaimer,
      verdict_explanation: 'Z etikety nebolo možné prečítať text.',
      insight: null,
      raw: null,
    };
    const evaluatePromise =
      isCoffee === false
        ? Promise.resolve({ skipped: true, reason: 'non_coffee' } as const)
        : !hasReadableText
          ? Promise.resolve({ skipped: true, reason: 'empty_text' } as const)
          : (async () => {
            try {
              if (!token) {
                throw new Error('Nie si prihlásený');
              }
              const tasteProfileSource =
                options?.tasteProfile && isServerTasteProfile(options.tasteProfile)
                  ? 'server'
                  : 'client';
              const dbTasteProfile =
                options?.tasteProfile && needsTasteProfileTimestamps(options.tasteProfile)
                  ? await preferenceEngine.getProfile()
                  : null;
              // Contract: `corrected_text` is required at top-level; we also mirror it
              // inside `coffee_attributes` for BE normalization without re-parsing.
              const coffeeAttributes = {
                corrected_text: trimmedCorrectedText,
                origin: evaluationStructuredMetadata?.origin ?? null,
                roast_level: evaluationStructuredMetadata?.roastLevel ?? null,
                flavor_notes: evaluationStructuredMetadata?.flavorNotes ?? null,
                processing: evaluationStructuredMetadata?.processing ?? null,
                varietals: evaluationStructuredMetadata?.varietals ?? null,
                roast_date: evaluationStructuredMetadata?.roastDate ?? null,
                roaster: evaluationStructuredMetadata?.roaster ?? null,
              };
              const basePayload: Record<string, unknown> = {
                corrected_text: trimmedCorrectedText,
                structured_metadata: evaluationStructuredMetadata,
                coffee_attributes: coffeeAttributes,
              };
              const payload: Record<string, unknown> = { ...basePayload };
              if (options?.tasteProfile) {
                const tasteProfilePayload = mapTasteProfilePayload(options.tasteProfile, {
                  tasteProfileSource,
                  dbProfile: dbTasteProfile,
                });
                if (tasteProfilePayload) {
                  payload.taste_profile = tasteProfilePayload;
                  tasteProfileSent = true;
                  payload.taste_profile_source = tasteProfileSource;
                }
              }
              // Manual QA: submit the questionnaire flow (TasteProfileVector) and confirm
              // `/ocr/evaluate` receives `taste_profile` with the 4D core plus optional extra dimensions when present.
              // Contract: `taste_profile.taste_vector` values are on a 0–10 scale across FE/BE (no 0–1 normalization).
              // OCR evaluation uses the 4D core (sweetness/acidity/bitterness/body); extra dims are ignored downstream.
              // Contract: `updated_at`/`last_recalculated_at` timestamps are forwarded as ISO strings
              // compatible with BE conflict checks when comparing client vs. DB profile freshness.
              const evaluationResult = await loggedFetchWithStatusRetry(
                `${API_URL}/ocr/evaluate`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  // Send structured metadata to help the backend ground the evaluation in actual coffee attributes.
                  body: JSON.stringify(normalizeKeysToSnakeCase(payload)),
                },
              );

              if (evaluationResult.response?.status === 409) {
                console.warn(
                  'Stale taste profile detected. Retrying evaluation without taste profile.',
                );
                tasteProfileRejectedAsStale = true;
                const retryPayload = { ...basePayload };
                const retryResult = await loggedFetchWithStatusRetry(
                  `${API_URL}/ocr/evaluate`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(normalizeKeysToSnakeCase(retryPayload)),
                  },
                );
                if (retryResult.response) {
                  return {
                    response: retryResult.response,
                    exhaustedRetries: retryResult.exhaustedRetries,
                  } as const;
                }
                return {
                  error: retryResult.error,
                  exhaustedRetries: retryResult.exhaustedRetries,
                } as const;
              }

              if (evaluationResult.response) {
                return {
                  response: evaluationResult.response,
                  exhaustedRetries: evaluationResult.exhaustedRetries,
                } as const;
              }
              return {
                error: evaluationResult.error,
                exhaustedRetries: evaluationResult.exhaustedRetries,
              } as const;
            } catch (error) {
              return { error, exhaustedRetries: true } as const;
            }
          })();

    const methodsPromise = (async () => {
      try {
        if (!hasReadableText) {
          return [] as string[];
        }
        return await suggestBrewingMethods(trimmedCorrectedText);
      } catch (error) {
        console.warn('Brewing suggestion promise failed:', error);
        return [] as string[];
      }
    })();

    const [evaluationResult, brewingMethods] = await Promise.all([
      evaluatePromise,
      methodsPromise,
    ]);

    // Evaluation endpoint now returns structured JSON (status/verdict/confidence/etc.).
    let recommendation = '';
    let evaluation: CoffeeEvaluationResult = fallbackEvaluation;
    if ('skipped' in evaluationResult) {
      if (evaluationResult.reason === 'empty_text') {
        evaluation = emptyTextEvaluation;
        recommendation = emptyTextEvaluation.summary;
      } else {
        recommendation =
          resolveVerdictExplanationText(fallbackEvaluation.verdict_explanation) ||
          resolveInsightSummary(fallbackEvaluation.insight) ||
          '';
      }
    } else if ('error' in evaluationResult) {
      console.warn('Evaluation failed:', evaluationResult.error);
      recommendation =
        'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
      evaluation = {
        ...(evaluationResult.exhaustedRetries ? evaluationRetryFallback : fallbackEvaluation),
        raw: evaluationResult.error,
      };
    } else {
      try {
        const { response: evalResponse, exhaustedRetries } = evaluationResult;
        if (evalResponse.ok) {
          const evalData = await evalResponse.json();
          console.log('📥 [BE] Evaluate response:', evalData);
          evaluation = normalizeEvaluationResponse(evalData);
          if (
            options?.tasteProfile &&
            evaluation.status === 'profile_missing' &&
            isTasteProfileComplete(options.tasteProfile) &&
            evaluation.verdict
          ) {
            evaluation = {
              ...evaluation,
              status: 'unknown',
              cta: { action: null, label: null },
            };
          }
          recommendation =
            resolveVerdictExplanationText(evaluation.verdict_explanation) ||
            resolveInsightSummary(evaluation.insight) ||
            '';
        } else {
          recommendation =
            'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
          evaluation = {
            ...(exhaustedRetries ? evaluationRetryFallback : fallbackEvaluation),
            raw: evalResponse.status,
          };
        }
      } catch (evalError) {
        console.warn('Evaluation failed:', evalError);
        recommendation =
          'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
        evaluation = {
          ...evaluationRetryFallback,
          raw: evalError,
        };
      }
    }

    return {
      original: originalText,
      corrected: trimmedCorrectedText,
      recommendation,
      evaluation,
      matchPercentage,
      isRecommended,
      scanId,
      brewingMethods,
      source: 'online',
      isCoffee,
      detectionLabels,
      detectionConfidence,
      nonCoffeeReason,
      structuredMetadata,
      structuredConfidence,
      structuredUncertainty,
      rawStructuredResponse,
      evaluation,
      tasteProfileSent,
      tasteProfileRejectedAsStale,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};
