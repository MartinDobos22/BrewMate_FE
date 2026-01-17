import { API_HOST, API_URL } from '../api';
import { normalizeKeysToSnakeCase } from '../../utils/normalize';
import { getAuthToken } from './auth';
import { fixTextWithAI } from './aiServices';
import { estimateCoffeeAttributesFromText, mergeStructuredMetadata, normalizeStructuredMetadataPayload } from './metadata';
import { ensureOnline, loggedFetch } from './network';
import { isCoffeeRelatedText } from './textDetection';
import type { OCRResult, StructuredCoffeeMetadata } from './types';
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
  options?: { imagePath?: string },
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
    // 4. Získaj odhadované atribúty z textu etikety
    const estimatedAttributes = estimateCoffeeAttributesFromText(trimmedCorrectedText);
    const mergedStructuredMetadata = mergeStructuredMetadata(
      structuredMetadata,
      estimatedAttributes,
    );
    structuredMetadata = mergedStructuredMetadata;
    const recommendation = hasReadableText
      ? `AI opis: ${trimmedCorrectedText}`
      : 'Z etikety sa nepodarilo získať čitateľný text.';

    return {
      original: originalText,
      corrected: trimmedCorrectedText,
      recommendation,
      scanId,
      source: 'online',
      isCoffee,
      detectionLabels,
      detectionConfidence,
      nonCoffeeReason,
      structuredMetadata,
      structuredConfidence,
      structuredUncertainty,
      rawStructuredResponse,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};
