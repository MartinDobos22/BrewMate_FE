// services/ocrService.ts
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import { API_HOST, API_URL } from './api';
import type { TasteProfileVector, UserTasteProfile } from '../types/Personalization';


/**
 * Ensures the device is online before making network requests.
 *
 * @returns {Promise<void>} Resolves when connectivity is confirmed; rejects when offline.
 * @throws {Error} Throws an `Error` with message `Offline` when no internet connection is detected.
 */
const ensureOnline = async (): Promise<void> => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error('Offline');
  }
};

/**
 * Executes a fetch-like request with exponential backoff retry semantics.
 *
 * @param {() => Promise<Response>} request - Function that triggers the network call to retry.
 * @param {number} [retries=3] - Maximum number of retry attempts when the request rejects.
 * @returns {Promise<Response>} The successful response from the final attempt.
 * @throws {unknown} Re-throws the final error if all retry attempts fail.
 */
export const retryableFetch = async (
  request: () => Promise<Response>,
  retries = 3
): Promise<Response> => {
  let attempt = 0;
  let delay = 500;
  while (true) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise(res => setTimeout(res, delay));
      attempt += 1;
      delay *= 2;
    }
  }
};

/**
 * Executes fetch with an AbortController timeout to avoid hanging requests.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} options - Fetch options including headers and body.
 * @param {number} timeoutMs - Timeout in milliseconds before aborting the request.
 * @returns {Promise<Response>} The fetch response if completed before timeout.
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs = 45000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Wrapper around `fetch` that enforces online status and logs API traffic for debugging.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} options - Fetch options including method, headers, and body.
 * @returns {Promise<Response>} Response returned by the underlying fetch request.
 * @throws {Error} Propagates connectivity errors from {@link ensureOnline} or failures from {@link retryableFetch}.
 */
const loggedFetch = async (url: string, options: RequestInit): Promise<Response> => {
  await ensureOnline();
  console.log('📤 [FE->BE]');
  const res = await retryableFetch(() => fetchWithTimeout(url, options));
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const loggedFetchWithStatusRetry = async (
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<{ response?: Response; error?: unknown; exhaustedRetries: boolean }> => {
  await ensureOnline();
  let attempt = 0;
  let delay = 500;

  while (true) {
    console.log('📤 [FE->BE]');
    try {
      const response = await fetchWithTimeout(url, options);
      console.log('📥 [BE->FE]', url, response.status);

      if (!response.ok && response.status >= 500) {
        if (attempt >= retries) {
          return { response, exhaustedRetries: true };
        }
        await wait(delay);
        attempt += 1;
        delay *= 2;
        continue;
      }

      return { response, exhaustedRetries: false };
    } catch (error) {
      if (attempt >= retries) {
        return { error, exhaustedRetries: true };
      }
      await wait(delay);
      attempt += 1;
      delay *= 2;
    }
  }
};

/**
 * Safely attempts to parse unknown JSON values without throwing.
 *
 * @template T
 * @param {unknown} value - Raw value that may already be parsed or a JSON string.
 * @returns {T|null} Parsed JSON cast to `T` when possible; otherwise `null` when parsing fails or input type is invalid.
 */
const safeParseJSON = <T>(value: unknown): T | null => {
  if (value == null) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON payload', error);
    return null;
  }
};

const normalizeEvaluationStatus = (value: unknown): CoffeeEvaluationStatus => {
  if (value === 'ok' || value === 'profile_missing' || value === 'insufficient_coffee_data') {
    return value;
  }
  return 'unknown';
};

const normalizeEvaluationVerdict = (value: unknown): CoffeeEvaluationVerdict | null => {
  if (value === 'suitable' || value === 'not_suitable' || value === 'uncertain') {
    return value;
  }
  return null;
};

const normalizeEvaluationReasons = (value: unknown): CoffeeEvaluationReason[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      return {
        signal: typeof record.signal === 'string' ? record.signal : '',
        user_preference: typeof record.user_preference === 'string' ? record.user_preference : '',
        coffee_attribute:
          typeof record.coffee_attribute === 'string' ? record.coffee_attribute : '',
        explanation: typeof record.explanation === 'string' ? record.explanation : '',
      };
    })
    .filter((entry): entry is CoffeeEvaluationReason => Boolean(entry));
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

const parseDelimitedList = (value: string): string[] | null => {
  const items = value
    .split(/[,;|/]+/)
    .map(item => item.replace(/[()\[\]]/g, '').trim())
    .filter(Boolean);
  return items.length ? items : null;
};

const estimateCoffeeAttributesFromText = (
  text: string,
): Pick<StructuredCoffeeMetadata, 'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'varietals'> => {
  const normalizedText = text.replace(/\r/g, '');
  const lowerText = normalizedText.toLowerCase();

  const extractLabelValue = (labels: string[]): string | null => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i');
      const match = normalizedText.match(regex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/\s+/g, ' ').trim();
        return cleaned.length ? cleaned : null;
      }
    }
    return null;
  };

  const origin = extractLabelValue(['origin', 'pôvod', 'povod', 'country', 'region']);
  const flavorNotesRaw = extractLabelValue([
    'flavor notes',
    'flavour notes',
    'tóny',
    'chut',
    'notes',
  ]);
  const varietalsRaw = extractLabelValue([
    'varietal',
    'varietals',
    'variety',
    'odroda',
    'odrody',
  ]);
  const processing =
    extractLabelValue(['processing', 'process', 'spracovanie']) ||
    (['washed', 'natural', 'honey', 'anaerobic', 'semi-washed', 'carbonic maceration'].find(
      keyword => lowerText.includes(keyword),
    ) ??
      null);
  const roastLevelRaw = extractLabelValue(['roast', 'praženie', 'prazenie']);
  const roastLevel =
    roastLevelRaw ||
    (['light', 'medium-dark', 'medium', 'dark'].find(keyword => lowerText.includes(keyword)) ??
      null);

  return {
    origin,
    roastLevel,
    processing,
    flavorNotes: flavorNotesRaw ? parseDelimitedList(flavorNotesRaw) : null,
    varietals: varietalsRaw ? parseDelimitedList(varietalsRaw) : null,
  };
};

const mergeStructuredMetadata = (
  base: StructuredCoffeeMetadata | null,
  fallback: Pick<
    StructuredCoffeeMetadata,
    'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'varietals'
  >,
): StructuredCoffeeMetadata | null => {
  if (!base && !fallback) {
    return null;
  }
  const mergedBase = base ?? ({} as StructuredCoffeeMetadata);
  return {
    ...mergedBase,
    origin: mergedBase.origin ?? fallback.origin ?? null,
    roastLevel: mergedBase.roastLevel ?? fallback.roastLevel ?? null,
    processing: mergedBase.processing ?? fallback.processing ?? null,
    flavorNotes: mergedBase.flavorNotes ?? fallback.flavorNotes ?? null,
    varietals: mergedBase.varietals ?? fallback.varietals ?? null,
  };
};

const normalizeEvaluationInsight = (value: unknown): CoffeeEvaluationInsight | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { headline: trimmed, sections: [] } : null;
  }
  const parsed = safeParseJSON<Record<string, unknown>>(value);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const headline =
    typeof parsed.headline === 'string'
      ? parsed.headline
      : typeof parsed.title === 'string'
        ? parsed.title
        : '';
  const sectionsSource = Array.isArray(parsed.sections)
    ? parsed.sections
    : Array.isArray(parsed.blocks)
      ? parsed.blocks
      : [];
  const sections = sectionsSource
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const title =
        typeof record.title === 'string'
          ? record.title
          : typeof record.heading === 'string'
            ? record.heading
            : '';
      const bulletsSource = Array.isArray(record.bullets)
        ? record.bullets
        : Array.isArray(record.items)
          ? record.items
          : Array.isArray(record.points)
            ? record.points
            : [];
      const bullets = bulletsSource.filter((item): item is string => typeof item === 'string');
      if (!title && bullets.length === 0) {
        return null;
      }
      return { title, bullets };
    })
    .filter((entry): entry is CoffeeEvaluationInsightSection => Boolean(entry));
  const derivedSections: CoffeeEvaluationInsightSection[] = [];
  const pushSection = (title: string, items: string[]) => {
    if (items.length) {
      derivedSections.push({ title, bullets: items });
    }
  };
  const why = normalizeStringArray(parsed.why);
  const whatYoullLike = normalizeStringArray(parsed.what_youll_like);
  const whatMightBotherYou = normalizeStringArray(parsed.what_might_bother_you);
  const tipsToMakeItBetter = normalizeStringArray(parsed.how_to_brew_for_better_match);
  const recommendedAlternatives = normalizeStringArray(parsed.recommended_alternatives);
  pushSection('Prečo', why);
  pushSection('Čo ti bude chutiť', whatYoullLike);
  pushSection('Čo môže rušiť', whatMightBotherYou);
  pushSection('Tipy na lepšiu zhodu', tipsToMakeItBetter);
  pushSection('Odporúčané prípravy', recommendedAlternatives);
  const resolvedSections = sections.length ? sections : derivedSections;
  if (!headline.trim() && resolvedSections.length === 0) {
    return null;
  }
  return { headline, sections: resolvedSections };
};

const normalizeEvaluationText = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
};

const extractTasteVector = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): TasteProfileVector | null => {
  if (!profile) {
    return null;
  }
  if ('preferences' in profile) {
    return profile.preferences ?? null;
  }
  return profile;
};

const mapOcrTasteVector = (vector: TasteProfileVector): TasteProfileVector => ({
  sweetness: vector.sweetness,
  acidity: vector.acidity,
  bitterness: vector.bitterness,
  body: vector.body,
});

const extractTasteProfileTimestamps = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): { updatedAt: string | null; lastRecalculatedAt: string | null } => {
  if (!profile || typeof profile !== 'object') {
    return { updatedAt: null, lastRecalculatedAt: null };
  }
  const record = profile as Record<string, unknown>;
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim().length > 0
      ? record.updatedAt
      : null;
  const lastRecalculatedAt =
    typeof record.lastRecalculatedAt === 'string' && record.lastRecalculatedAt.trim().length > 0
      ? record.lastRecalculatedAt
      : null;
  return { updatedAt, lastRecalculatedAt };
};

const mapTasteProfilePayload = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): Record<string, unknown> | null => {
  if (!profile) {
    return null;
  }

  const tasteVector = extractTasteVector(profile);
  if (!tasteVector) {
    return null;
  }
  // OCR evaluácia používa len 4D chuťový profil (sweetness/acidity/bitterness/body).
  const ocrTasteVector = mapOcrTasteVector(tasteVector);

  if ('preferences' in profile) {
    const flavorNoteEntries = profile.flavorNotes ?? {};
    const flavorNotes = Object.keys(flavorNoteEntries).filter(Boolean);
    return {
      user_id: profile.userId,
      taste_vector: ocrTasteVector,
      sweetness: ocrTasteVector.sweetness,
      acidity: ocrTasteVector.acidity,
      bitterness: ocrTasteVector.bitterness,
      body: ocrTasteVector.body,
      flavor_notes: flavorNotes,
      flavor_note_weights: flavorNoteEntries,
      milk_preferences: profile.milkPreferences,
      caffeine_sensitivity: profile.caffeineSensitivity,
      preferred_strength: profile.preferredStrength,
      seasonal_adjustments: profile.seasonalAdjustments?.map((adjustment) => ({
        key: adjustment.key,
        delta: adjustment.delta,
        last_applied: adjustment.lastApplied,
      })),
      preference_confidence: profile.preferenceConfidence,
      last_recalculated_at: profile.lastRecalculatedAt,
      updated_at: profile.updatedAt,
    };
  }

  const { updatedAt, lastRecalculatedAt } = extractTasteProfileTimestamps(profile);
  return {
    taste_vector: ocrTasteVector,
    sweetness: ocrTasteVector.sweetness,
    acidity: ocrTasteVector.acidity,
    bitterness: ocrTasteVector.bitterness,
    body: ocrTasteVector.body,
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    ...(lastRecalculatedAt ? { last_recalculated_at: lastRecalculatedAt } : {}),
  };
};

const isTasteProfileComplete = (profile?: TasteProfileVector | UserTasteProfile | null): boolean => {
  const tasteVector = extractTasteVector(profile);
  if (!tasteVector) {
    return false;
  }

  const values = [
    tasteVector.sweetness,
    tasteVector.acidity,
    tasteVector.bitterness,
    tasteVector.body,
  ];

  return values.every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
  );
};

type VerdictExplanation =
  | string
  | {
      user_preferences_summary?: string;
      coffee_profile_summary?: string;
      comparison_summary?: string;
    };

const normalizeVerdictExplanation = (
  value: unknown,
  fallback: VerdictExplanation = ''
): VerdictExplanation => {
  if (typeof value === 'string') {
    const fallbackText = typeof fallback === 'string' ? fallback : '';
    return normalizeEvaluationText(value, fallbackText);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const userPreferencesSummary = normalizeEvaluationText(
      record.user_preferences_summary
    );
    const coffeeProfileSummary = normalizeEvaluationText(
      record.coffee_profile_summary
    );
    const comparisonSummary = normalizeEvaluationText(record.comparison_summary);
    if (userPreferencesSummary || coffeeProfileSummary || comparisonSummary) {
      return {
        user_preferences_summary: userPreferencesSummary,
        coffee_profile_summary: coffeeProfileSummary,
        comparison_summary: comparisonSummary,
      };
    }
    if (typeof fallback === 'object') {
      return fallback;
    }
  }
  if (typeof fallback === 'string') {
    return normalizeEvaluationText(fallback);
  }
  return fallback;
};

const resolveVerdictExplanationText = (value: VerdictExplanation | null | undefined): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return (
    value.comparison_summary ||
    value.user_preferences_summary ||
    value.coffee_profile_summary ||
    ''
  );
};

const resolveInsightSummary = (insight: CoffeeEvaluationInsight | null | undefined): string => {
  if (!insight) {
    return '';
  }
  const headline = typeof insight.headline === 'string' ? insight.headline.trim() : '';
  if (headline) {
    return headline;
  }
  const sections = Array.isArray(insight.sections) ? insight.sections : [];
  for (const section of sections) {
    if (!section) {
      continue;
    }
    if (typeof section.title === 'string' && section.title.trim()) {
      return section.title.trim();
    }
    if (Array.isArray(section.bullets)) {
      const bullet = section.bullets.find((item) => typeof item === 'string' && item.trim());
      if (bullet) {
        return bullet.trim();
      }
    }
  }
  return '';
};

const NEUTRAL_EVALUATION_COPY = {
  summary: 'Na spoľahlivé vyhodnotenie potrebujeme doplniť detaily o káve.',
  verdict_explanation:
    'Nevieme spoľahlivo určiť, či sa táto káva hodí k vášmu profilu.',
  disclaimer: 'Výsledok je orientačný a môže sa zmeniť po doplnení údajov.',
};

// Normalize the evaluation payload to align with the backend schema
// (verdict_explanation, insight, disclaimer) while keeping contradiction-safe defaults.
const normalizeEvaluationResponse = (payload: unknown): CoffeeEvaluationResult => {
  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const insightRecord =
    record.insight && typeof record.insight === 'object'
      ? (record.insight as Record<string, unknown>)
      : null;
  const normalizedStatus = normalizeEvaluationStatus(record.status);
  const verdict =
    normalizeEvaluationVerdict(record.verdict) ??
    (normalizedStatus === 'insufficient_coffee_data' ? 'uncertain' : null);
  const useNeutralCopy =
    verdict === 'uncertain' ||
    normalizedStatus === 'insufficient_coffee_data' ||
    normalizedStatus === 'unknown';
  const whatYoullLike = normalizeStringArray(
    record.what_youll_like ?? insightRecord?.what_youll_like
  );
  const whatMightBotherYou = normalizeStringArray(
    record.what_might_bother_you ?? insightRecord?.what_might_bother_you
  );
  const tipsToMakeItBetter = normalizeStringArray(
    record.tips_to_make_it_better ?? insightRecord?.how_to_brew_for_better_match
  );
  const recommendedBrewMethods = normalizeStringArray(
    record.recommended_brew_methods ?? insightRecord?.recommended_alternatives
  );
  const fallbackInsightSections: CoffeeEvaluationInsightSection[] = [];
  const addFallbackSection = (title: string, items: string[]) => {
    if (items.length) {
      fallbackInsightSections.push({ title, bullets: items });
    }
  };
  addFallbackSection('Čo ti bude chutiť', whatYoullLike);
  addFallbackSection('Čo môže rušiť', whatMightBotherYou);
  addFallbackSection('Tipy na lepšiu zhodu', tipsToMakeItBetter);
  addFallbackSection('Odporúčané prípravy', recommendedBrewMethods);
  const normalizedInsight =
    normalizeEvaluationInsight(record.insight) ??
    (fallbackInsightSections.length ? { headline: '', sections: fallbackInsightSections } : null);
  if (normalizedStatus === 'profile_missing') {
    // Preserve profile-missing payloads so the UI can display the CTA and guidance text.
    return {
      status: normalizedStatus,
      verdict: null,
      confidence: null,
      summary: typeof record.summary === 'string' ? record.summary : '',
      reasons: [],
      what_youll_like: whatYoullLike,
      what_might_bother_you: whatMightBotherYou,
      tips_to_make_it_better: tipsToMakeItBetter,
      recommended_brew_methods: recommendedBrewMethods,
      cta: {
        action:
          record.cta && typeof record.cta === 'object' && record.cta.action === 'complete_taste_profile'
            ? 'complete_taste_profile'
            : 'complete_taste_profile',
        label:
          record.cta && typeof record.cta === 'object' && typeof record.cta.label === 'string'
            ? record.cta.label
            : 'Vyplniť chuťový profil',
      },
      disclaimer: normalizeEvaluationText(record.disclaimer),
      verdict_explanation: normalizeVerdictExplanation(record.verdict_explanation),
      insight: normalizedInsight,
      raw: payload,
    };
  }
  if (normalizedStatus !== 'ok') {
    const summary = useNeutralCopy
      ? normalizeEvaluationText(record.summary, NEUTRAL_EVALUATION_COPY.summary)
      : normalizeEvaluationText(record.summary);
    // Unknown payloads remain neutral so the UI can display a generic fallback state.
    return {
      status: normalizedStatus,
      verdict: null,
      confidence: null,
      summary,
      reasons: [],
      what_youll_like: whatYoullLike,
      what_might_bother_you: whatMightBotherYou,
      tips_to_make_it_better: tipsToMakeItBetter,
      recommended_brew_methods: recommendedBrewMethods,
      cta: { action: null, label: null },
      disclaimer: useNeutralCopy
        ? normalizeEvaluationText(record.disclaimer, NEUTRAL_EVALUATION_COPY.disclaimer)
        : normalizeEvaluationText(record.disclaimer),
      verdict_explanation: useNeutralCopy
        ? normalizeVerdictExplanation(
            record.verdict_explanation,
            NEUTRAL_EVALUATION_COPY.verdict_explanation
          )
        : normalizeVerdictExplanation(record.verdict_explanation),
      insight: normalizedInsight,
      raw: payload,
    };
  }
  const confidenceValue =
    typeof record.confidence === 'number' ? record.confidence : null;
  const summary = useNeutralCopy
    ? normalizeEvaluationText(record.summary, NEUTRAL_EVALUATION_COPY.summary)
    : normalizeEvaluationText(record.summary);
  const reasons = normalizeEvaluationReasons(record.reasons);

  return {
    status: normalizedStatus,
    verdict,
    confidence: confidenceValue,
    summary,
    reasons,
    what_youll_like: whatYoullLike,
    what_might_bother_you: whatMightBotherYou,
    tips_to_make_it_better: tipsToMakeItBetter,
    recommended_brew_methods: recommendedBrewMethods,
    cta:
      record.cta && typeof record.cta === 'object'
        ? {
            action:
              record.cta.action === 'complete_taste_profile'
                ? 'complete_taste_profile'
                : null,
            label: typeof record.cta.label === 'string' ? record.cta.label : null,
          }
        : { action: null, label: null },
    disclaimer: useNeutralCopy
      ? normalizeEvaluationText(record.disclaimer, NEUTRAL_EVALUATION_COPY.disclaimer)
      : normalizeEvaluationText(record.disclaimer),
    verdict_explanation: useNeutralCopy
      ? normalizeVerdictExplanation(
          record.verdict_explanation,
          NEUTRAL_EVALUATION_COPY.verdict_explanation
        )
      : normalizeVerdictExplanation(record.verdict_explanation),
    insight: normalizedInsight,
    raw: payload,
  };
};

export interface StructuredCoffeeMetadata {
  roaster: string | null;
  origin: string | null;
  roastLevel: string | null;
  processing: string | null;
  flavorNotes: string[] | null;
  roastDate: string | null;
  varietals: string[] | null;
  confidenceFlags?: {
    roaster?: boolean | null;
    origin?: boolean | null;
    roastLevel?: boolean | null;
    processing?: boolean | null;
    flavorNotes?: boolean | null;
    roastDate?: boolean | null;
    varietals?: boolean | null;
  } | null;
}

export interface ConfirmStructuredPayload {
  metadata: StructuredCoffeeMetadata | null;
  confidence?: Record<string, unknown> | null;
  uncertainty?: Record<string, unknown> | null;
  raw?: unknown;
}

export type CoffeeEvaluationStatus =
  | 'ok'
  | 'profile_missing'
  | 'insufficient_coffee_data'
  | 'unknown';

export type CoffeeEvaluationVerdict = 'suitable' | 'not_suitable' | 'uncertain';

export interface CoffeeEvaluationReason {
  signal: string;
  user_preference: string;
  coffee_attribute: string;
  explanation: string;
}

export interface CoffeeEvaluationCta {
  action: 'complete_taste_profile' | null;
  label: string | null;
}

export interface CoffeeEvaluationInsightSection {
  title: string;
  bullets: string[];
}

export interface CoffeeEvaluationInsight {
  headline?: string;
  sections?: CoffeeEvaluationInsightSection[];
}

export interface CoffeeEvaluationResult {
  status: CoffeeEvaluationStatus;
  verdict: CoffeeEvaluationVerdict | null;
  confidence: number | null;
  summary: string;
  reasons: CoffeeEvaluationReason[];
  what_youll_like: string[];
  what_might_bother_you: string[];
  tips_to_make_it_better: string[];
  recommended_brew_methods: string[];
  cta: CoffeeEvaluationCta;
  disclaimer: string;
  verdict_explanation: VerdictExplanation;
  insight: CoffeeEvaluationInsight | null;
  raw?: unknown;
}

interface OCRResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number | null;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
  source?: 'offline' | 'online';
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  /**
   * Labels returned by Vision label detection (e.g., "coffee", "espresso").
   * Optional when the backend does not return label annotations.
   */
  detectionLabels?: string[];
  /**
   * Confidence score derived from label detection for coffee-related labels.
   * Optional and may be undefined when label detection is unavailable.
   */
  detectionConfidence?: number;
  /**
   * Structured metadata extracted from OCR text when available (e.g., origin, roast, notes).
   */
  structuredMetadata?: StructuredCoffeeMetadata | null;
  /**
   * Confidence flags for structured metadata extraction when provided by the backend.
   */
  structuredConfidence?: Record<string, unknown> | null;
  structuredUncertainty?: Record<string, unknown> | null;
  rawStructuredResponse?: unknown;
  evaluation?: CoffeeEvaluationResult | null;
  tasteProfileSent?: boolean;
}

/**
 * Retrieves the current Firebase authentication token if the user is signed in.
 *
 * @returns {Promise<string|null>} ID token string or `null` when no authenticated user is available.
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Extracts a likely coffee name from raw OCR text by prioritizing known brands and limiting length.
 *
 * @param {string} text - OCR text to inspect; may contain brand names or arbitrary words.
 * @returns {string} Shortened coffee name candidate or default label when detection fails.
 */
export const extractCoffeeName = (text: string): string => {
  if (!text) return 'Neznáma káva';

  // Hľadaj známe značky
  const brands = [
    'Lavazza', 'Illy', 'Segafredo', 'Kimbo', 'Pellini', 'Bazzara',
    'Nespresso', 'Starbucks', 'Costa', 'Tchibo', 'Jacobs', 'Douwe Egberts'
  ];

  for (const brand of brands) {
    const regex = new RegExp(`${brand}[\\s\\w]+`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[0].substring(0, 50);
    }
  }

  // Ak nenájde značku, vráť prvé slová
  const words = text.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ').substring(0, 50) || 'Neznáma káva';
};

/**
 * Uses backend AI services to correct OCR-extracted coffee text.
 *
 * @param {string} ocrText - Raw OCR transcription to correct; may contain typos and artifacts.
 * @returns {Promise<string>} Corrected text or the original input when AI is unavailable.
 * @throws {Error} Propagates network errors encountered during the OpenAI call unless a cached value exists.
 */
const fixTextWithAI = async (ocrText: string): Promise<string> => {
  try {
    const response = await loggedFetch(`${API_URL}/ocr/fix-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: ocrText }),
    });

    const data = await response.json();
    console.log('📥 [BE] OCR fix response:', data);
    if (response.ok && typeof data?.corrected_text === 'string') {
      return data.corrected_text.trim();
    }
    return ocrText;
  } catch (error) {
    console.error('AI correction error:', error);
    return ocrText;
  }
};

/**
 * Generates brewing method recommendations from coffee description text using backend AI services.
 *
 * @param {string} coffeeText - Description of the coffee used as prompt context; may include roast or flavor notes.
 * @returns {Promise<string[]>} Up to four brewing method names prioritized by AI or sensible defaults.
 * @throws {Error} Propagates connectivity failures when both online call and cached values are unavailable.
 */
export const suggestBrewingMethods = async (
  coffeeText: string
): Promise<string[]> => {
  const fallback = ['Espresso', 'French press', 'V60', 'Cold brew'];

  try {
    const response = await loggedFetch(`${API_URL}/ocr/brewing-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: coffeeText }),
    });
    const data = await response.json();
    console.log('📥 [BE] Brewing methods response:', data);
    if (response.ok && Array.isArray(data?.methods)) {
      const cleaned = data.methods
        .filter((method: unknown): method is string => typeof method === 'string')
        .map((method: string) => method.trim())
        .filter(Boolean);
      if (cleaned.length >= 4) {
        return cleaned.slice(0, 4);
      }
      if (cleaned.length > 0) {
        return [...cleaned, ...fallback].slice(0, 4);
      }
    }
    return fallback;
  } catch (error) {
    console.error('Brewing suggestion error:', error);

    return fallback;
  }
};

/**
 * Produces a concise brewing recipe tailored to a selected method and taste preference via backend AI services.
 *
 * @param {string} method - Brewing method such as "Espresso" or "V60" to guide the recipe output.
 * @param {string} taste - Flavor preference description (e.g., "ovocná", "čokoládová").
 * @returns {Promise<string>} Generated recipe text or cached/default value when the AI service is unavailable.
 * @throws {Error} Propagates network failures when no cached recipe exists.
 */
export const getBrewRecipe = async (
  method: string,
  taste: string,
  options?: {
    tasteProfile?: TasteProfileVector | UserTasteProfile | null;
    coffeeAttributes?: Record<string, unknown> | null;
  }
): Promise<string> => {
  try {
    const tasteProfilePayload = mapTasteProfilePayload(options?.tasteProfile);
    const coffeeAttributes = options?.coffeeAttributes ?? null;
    const response = await loggedFetch(`${API_URL}/ocr/brew-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method,
        taste,
        ...(tasteProfilePayload ? { taste_profile: tasteProfilePayload } : {}),
        ...(coffeeAttributes ? { coffee_attributes: coffeeAttributes } : {}),
      }),
    });
    const data = await response.json();
    console.log('📥 [BE] Brew recipe response:', data);
    if (response.ok && typeof data?.recipe === 'string') {
      return data.recipe.trim();
    }
    return '';
  } catch (error) {
    console.error('Brew recipe error:', error);

    return '';
  }
};

const COFFEE_KEYWORDS = [
  'coffee',
  'káva',
  'kava',
  'kávy',
  'kavy',
  'cafe',
  'espresso',
  'cappuccino',
  'latte',
  'arabica',
  'robusta',
  'ristretto',
  'macchiato',
  'filter',
  'brew',
  'bean',
  'beans',
  'zrn',
  'zrnk',
  'mleta kava',
  'mleta káva',
  'zrnková káva',
  'zrnkovu kavu',
  'prazená káva',
  'prazenu kavu',
  'instant coffee',
  'ground coffee',
  'coffee beans',
  'coffee bag',
  'coffee package',
  'coffee pack',
  'balik kavy',
  'balik kava',
  'balenie kavy',
  'balenie kávy',
];

const COFFEE_KEYWORD_COMBINATIONS: string[][] = [
  ['balik', 'kav'],
  ['balenie', 'kav'],
  ['bag', 'coffee'],
  ['package', 'coffee'],
  ['pack', 'coffee'],
  ['zrn', 'kav'],
  ['prazen', 'kav'],
];

/**
 * Determines whether provided text likely refers to coffee products by matching keywords and token combinations.
 *
 * @param {string|null|undefined} input - OCR-extracted or user-provided text to analyze.
 * @returns {boolean} True when coffee-related terms are detected; otherwise false.
 */
export const isCoffeeRelatedText = (input?: string | null): boolean => {
  if (!input) return false;
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (COFFEE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return true;
  }

  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }

  return COFFEE_KEYWORD_COMBINATIONS.some(combination =>
    combination.every(part => tokens.some(token => token.includes(part))),
  );
};

/**
 * Ensures a valid filesystem path exists for offline OCR by writing a temporary image if needed.
 *
 * @param {string} base64image - Raw base64 image payload to persist when no path is provided.
 * @param {string} [providedPath] - Optional pre-existing path to reuse instead of writing a new file.
 * @returns {Promise<string>} Absolute file path pointing to the stored image for offline processing.
 * @throws {Error} When no temporary directory is available for creating the image file.
 */
const ensureOfflineImagePath = async (
  base64image: string,
  providedPath?: string,
): Promise<string> => {
  if (providedPath) return providedPath;

  const cacheDir =
    RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath || RNFS.DocumentDirectoryPath;
  if (!cacheDir) {
    throw new Error('Missing temporary directory for offline recognition');
  }

  const path = `${cacheDir}/ocr-offline-${Date.now()}.jpg`;
  await RNFS.writeFile(path, base64image, 'base64');
  return path;
};

/**
 * Attempts OCR recognition using the on-device model when online processing fails.
 *
 * @param {string} base64image - Base64 encoded image used when an image path is unavailable.
 * @param {string} [imagePath] - Optional path to an existing image file to bypass writing a new one.
 * @returns {Promise<OCRResult|null>} Simplified OCR result from offline model or null when detection fails.
 */


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
      body: JSON.stringify({ base64image }),
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
    const shouldPersistScan =
      isCoffee &&
      (Boolean(detectionLabels?.length) ||
        Boolean(initialStructuredMetadata) ||
        hasCoffeeTextSignals);
    const shouldEvaluate = isCoffee !== false && hasReadableText;
    if (shouldPersistScan) {
      await ensureOnline();
      token = await getAuthToken();
      if (!token) {
        throw new Error('Nie si prihlásený');
      }

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
        body: JSON.stringify(savePayload),
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
        if (metadataParsed && typeof metadataParsed === 'object') {
          const normalizeString = (value: unknown): string | null => {
            if (typeof value !== 'string') return null;
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
          };

          const normalizeStringArray = (value: unknown): string[] | null => {
            if (Array.isArray(value)) {
              const cleaned = value
                .map(item => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean);
              return cleaned.length ? cleaned : null;
            }
            if (typeof value === 'string') {
              const parts = value
                .split(/[,;\n]/)
                .map(part => part.trim())
                .filter(Boolean);
              return parts.length ? parts : null;
            }
            return null;
          };

          const confidenceSource =
            metadataParsed.confidenceFlags ??
            metadataParsed.confidence_flags ??
            metadataParsed.flags ??
            null;

          let confidenceFlags: StructuredCoffeeMetadata['confidenceFlags'] = null;
          if (confidenceSource && typeof confidenceSource === 'object') {
            confidenceFlags = {
              roaster:
                typeof confidenceSource.roaster === 'boolean'
                  ? confidenceSource.roaster
                  : null,
              origin:
                typeof confidenceSource.origin === 'boolean'
                  ? confidenceSource.origin
                  : null,
              roastLevel:
                typeof confidenceSource.roastLevel === 'boolean'
                  ? confidenceSource.roastLevel
                  : typeof confidenceSource.roast_level === 'boolean'
                  ? confidenceSource.roast_level
                  : null,
              processing:
                typeof confidenceSource.processing === 'boolean'
                  ? confidenceSource.processing
                  : null,
              flavorNotes:
                typeof confidenceSource.flavorNotes === 'boolean'
                  ? confidenceSource.flavorNotes
                  : typeof confidenceSource.flavor_notes === 'boolean'
                  ? confidenceSource.flavor_notes
                  : null,
              roastDate:
                typeof confidenceSource.roastDate === 'boolean'
                  ? confidenceSource.roastDate
                  : typeof confidenceSource.roast_date === 'boolean'
                  ? confidenceSource.roast_date
                  : null,
              varietals:
                typeof confidenceSource.varietals === 'boolean'
                  ? confidenceSource.varietals
                  : null,
            };
          }

          structuredMetadata = {
            roaster:
              normalizeString(metadataParsed.roaster ?? metadataParsed.roaster_name) ??
              null,
            origin: normalizeString(metadataParsed.origin),
            roastLevel:
              normalizeString(metadataParsed.roastLevel ?? metadataParsed.roast_level) ??
              null,
            processing: normalizeString(metadataParsed.processing),
            flavorNotes:
              normalizeStringArray(
                metadataParsed.flavorNotes ?? metadataParsed.flavor_notes
              ),
            roastDate:
              normalizeString(metadataParsed.roastDate ?? metadataParsed.roast_date) ??
              null,
            varietals: normalizeStringArray(metadataParsed.varietals),
            confidenceFlags,
          };

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
    if (shouldEvaluate && !token) {
      await ensureOnline();
      token = await getAuthToken();
    }

    const fallbackEvaluation: CoffeeEvaluationResult = {
      status: 'unknown',
      verdict: null,
      confidence: null,
      summary: NEUTRAL_EVALUATION_COPY.summary,
      reasons: [],
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
    const evaluationStructuredMetadata = mergeStructuredMetadata(
      structuredMetadata,
      estimatedAttributes,
    );
    let tasteProfileSent = false;
    const emptyTextEvaluation: CoffeeEvaluationResult = {
      status: 'insufficient_coffee_data',
      verdict: null,
      confidence: null,
      summary: 'Z etikety nebolo možné prečítať text.',
      reasons: [],
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
                const tasteProfilePayload = mapTasteProfilePayload(options.tasteProfile);
                if (tasteProfilePayload) {
                  const { updatedAt, lastRecalculatedAt } = extractTasteProfileTimestamps(
                    options.tasteProfile,
                  );
                  const hasServerTimestamps = Boolean(updatedAt || lastRecalculatedAt);
                  payload.taste_profile = tasteProfilePayload;
                  tasteProfileSent = true;
                  if (hasServerTimestamps) {
                    payload.taste_profile_source = 'server';
                  } else {
                    payload.taste_profile_source = 'client';
                  }
                }
              }
              // Manual QA: submit the questionnaire flow (TasteProfileVector) and confirm
              // `/ocr/evaluate` receives `taste_profile` with only taste_vector + sweetness/acidity/bitterness/body.
              // Extra dimensions (intensity/experimentalism) are intentionally dropped for OCR evaluation.
              const evaluationResult = await loggedFetchWithStatusRetry(
                `${API_URL}/ocr/evaluate`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  // Send structured metadata to help the backend ground the evaluation in actual coffee attributes.
                  body: JSON.stringify(payload),
                },
              );

              if (evaluationResult.response?.status === 409) {
                console.warn(
                  'Stale taste profile detected. Retrying evaluation without taste profile.',
                );
                const retryPayload = { ...basePayload };
                const retryResult = await loggedFetchWithStatusRetry(
                  `${API_URL}/ocr/evaluate`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(retryPayload),
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
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};

export interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number | null;
  is_recommended?: boolean;
  is_purchased?: boolean;
  is_favorite?: boolean;
  brand?: string | null;
  origin?: string | null;
  roast_level?: string | null;
  flavor_notes?: string[] | string | null;
  processing?: string | null;
  roast_date?: string | null;
  varietals?: string[] | string | null;
  thumbnail_url?: string | null;
  structured_confidence?: Record<string, unknown> | null;
  structured_uncertainty?: Record<string, unknown> | null;
  confirmed_structured_metadata?: StructuredCoffeeMetadata | null;
  confirmed_structured_confidence?: Record<string, unknown> | null;
  confirmed_structured_raw?: unknown | null;
}

/**
 * Fetches OCR scan history for the authenticated user from the backend service.
 *
 * @param {number} [limit=10] - Maximum number of history items to retrieve; defaults to 10.
 * @returns {Promise<OCRHistory[]>} Normalized list of OCR history entries or an empty array on failure.
 */
export const fetchOCRHistory = async (limit: number = 10): Promise<OCRHistory[]> => {
  try {
    await ensureOnline();
    const token = await getAuthToken();
    if (!token) return [];

    const response = await loggedFetch(`${API_URL}/ocr/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch OCR history');
      return [];
    }

    const data = await response.json();

    return data.map((item: any) => ({
      id: item.id,
      coffee_name: item.coffee_name || extractCoffeeName(item.corrected_text),
      original_text: item.original_text,
      corrected_text: item.corrected_text,
      created_at: new Date(item.created_at),
      rating: item.rating,
      match_percentage: typeof item.match_percentage === 'number' ? item.match_percentage : null,
      is_recommended: item.is_recommended,
      is_purchased: item.is_purchased,
      is_favorite: item.is_favorite,
      brand: item.brand ?? null,
      origin: item.origin ?? null,
      roast_level: item.roast_level ?? null,
      flavor_notes: item.flavor_notes ?? null,
      processing: item.processing ?? null,
      roast_date: item.roast_date ?? null,
      varietals: item.varietals ?? null,
      thumbnail_url: item.thumbnail_url ?? null,
      structured_confidence: item.structured_confidence ?? null,
      structured_uncertainty: item.structured_uncertainty ?? null,
      confirmed_structured_metadata: item.confirmed_structured_metadata ?? null,
      confirmed_structured_confidence: item.confirmed_structured_confidence ?? null,
      confirmed_structured_raw: item.confirmed_structured_raw ?? null,
    }));
  } catch (error) {
    console.error('Error fetching OCR history:', error);
    return [];
  }
};

/**
 * Flags a scanned coffee as purchased and optionally attaches structured metadata for later personalization.
 *
 * @param {string} ocrLogId - Identifier of the OCR log entry to update.
 * @param {string} coffeeName - User-friendly coffee name displayed in history and analytics.
 * @param {string} [brand] - Optional roaster or brand to persist alongside the purchase event.
 * @param {Partial<StructuredCoffeeMetadata>|null} [metadata] - Additional structured details to store with the purchase record.
 * @returns {Promise<void>} Resolves when the backend acknowledges the purchase update.
 * @throws {Error} When the user is unauthenticated or network requests fail.
 */
export const markCoffeePurchased = async (
  ocrLogId: string,
  coffeeName: string,
  brand?: string,
  metadata?: Partial<StructuredCoffeeMetadata> | null,
): Promise<void> => {
  await ensureOnline();
  const token = await getAuthToken();
  if (!token) throw new Error('Nie si prihlásený');

  const body: Record<string, unknown> = {
    ocr_log_id: ocrLogId,
    coffee_name: coffeeName,
  };
  if (brand) {
    body.brand = brand;
  }
  if (metadata) {
    body.metadata = metadata;
  }

  await loggedFetch(`${API_URL}/ocr/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
};

/**
 * Confirms AI-generated structured metadata for a specific scan and persists the user's decision.
 *
 * @param {string} scanId - Unique scan identifier returned from the OCR pipeline.
 * @param {ConfirmStructuredPayload} payload - Structured metadata and confidence indicators approved by the user.
 * @returns {Promise<boolean>} True when the confirmation was accepted by the backend; otherwise false.
 * @throws {Error} When the user is unauthenticated or the network request fails before receiving a response.
 */
export const confirmStructuredScan = async (
  scanId: string,
  payload: ConfirmStructuredPayload
): Promise<boolean> => {
  await ensureOnline();
  const token = await getAuthToken();
  if (!token) throw new Error('Nie si prihlásený');

  const response = await loggedFetch(
    `${API_URL}/ocr/${encodeURIComponent(scanId)}/structured/confirm`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
    }
  );

  return response.ok;
};

/**
 * Deletes an OCR record belonging to the signed-in user.
 *
 * @param {string} id - Identifier of the OCR log to remove.
 * @returns {Promise<boolean>} True when the backend deletion succeeds; false on error or missing auth.
 */
export const deleteOCRRecord = async (id: string): Promise<boolean> => {
  try {
    await ensureOnline();
    const token = await getAuthToken();
    if (!token) return false;

      const response = await loggedFetch(`${API_URL}/ocr/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [BE] Delete status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Error deleting OCR record:', error);
    return false;
  }
};

/**
 * Submits a user rating for a scanned coffee, storing sentiment for recommendation tuning.
 *
 * @param {string} scanId - Coffee identifier associated with the scan or recipe evaluation.
 * @param {number} rating - Rating value typically on a bounded scale; expected to be between 1 and 5.
 * @returns {Promise<boolean>} True when the rating was accepted by the API; otherwise false.
 */
export const rateOCRResult = async (scanId: string, rating: number): Promise<boolean> => {
  try {
    await ensureOnline();
    const token = await getAuthToken();
    if (!token) return false;

    const response = await loggedFetch(`${API_URL}/coffee/rate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coffee_id: scanId,
        rating: rating,
      }),
    });

    console.log('📥 [BE] Rate status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Error rating coffee:', error);
    return false;
  }
};
