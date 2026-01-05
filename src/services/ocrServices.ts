// services/ocrService.ts
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import { CONFIG } from '../config/config';
import { API_HOST, API_URL } from './api';

const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;
const AI_CACHE_TTL = 24;

/**
 * Builds a normalized cache key for AI responses to ensure consistent lookups across calls.
 *
 * @param {string} prefix - Namespace prefix describing the cached resource category (e.g. `ocr:fix`).
 * @param {string} input - Raw user or OCR input used to derive a unique key; trimmed and encoded before use.
 * @returns {string} Encoded cache key string safe for storage systems.
 */
const createCacheKey = (prefix: string, input: string): string => {
  const normalized = input.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(normalized).slice(0, 96);
  return `ai:${prefix}:${encoded}`;
};


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
  const res = await retryableFetch(() => fetch(url, options));
  console.log('📥 [BE->FE]', url, res.status);
  return res;
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

const hasStructuredMetadataValue = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(entry => {
    if (Array.isArray(entry)) {
      return entry.some(item => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof entry === 'string') {
      return entry.trim().length > 0;
    }
    if (typeof entry === 'number') {
      return Number.isFinite(entry);
    }
    if (typeof entry === 'boolean') {
      return true;
    }
    if (entry && typeof entry === 'object') {
      return Object.values(entry as Record<string, unknown>).some(Boolean);
    }
    return entry != null;
  });
};

const normalizeStructuredMetadataInput = (
  value: unknown
): Record<string, unknown> | null => {
  if (value == null) return null;
  const parsed =
    safeParseJSON<Record<string, unknown>>(value) ??
    (typeof value === 'object' ? (value as Record<string, unknown>) : null);
  if (!parsed) return null;
  return hasStructuredMetadataValue(parsed) ? parsed : null;
};

const buildStructuredText = (
  value: unknown,
  orderedKeys: string[]
): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const joined = value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
      .join(' ');
    return joined.length ? joined : null;
  }
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const usedKeys = new Set(orderedKeys);
  const orderedParts = orderedKeys
    .map(key => (typeof record[key] === 'string' ? (record[key] as string) : null))
    .filter(Boolean);
  const remainingParts = Object.entries(record)
    .filter(([key, val]) => !usedKeys.has(key) && typeof val === 'string')
    .map(([, val]) => val as string);
  const combined = [...orderedParts, ...remainingParts]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');

  return combined.length ? combined : null;
};

const normalizeStructuredRecommendation = (
  value: unknown
): OCRStructuredRecommendation | null => {
  const parsed =
    safeParseJSON<Record<string, unknown>>(value) ??
    (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null);
  if (!parsed) return null;

  const hasFields = [
    'verdict',
    'confidence',
    'verdict_explanation',
    'verdict_explanation_text',
    'insight',
    'insight_text',
    'disclaimer',
  ].some(key => key in parsed);
  if (!hasFields) return null;

  const verdictExplanationRaw =
    parsed.verdict_explanation ?? parsed.verdictExplanation ?? parsed.verdict_explanation_text;
  const insightRaw = parsed.insight ?? parsed.insight_text;
  const verdictExplanationText =
    typeof parsed.verdict_explanation_text === 'string'
      ? parsed.verdict_explanation_text
      : buildStructuredText(verdictExplanationRaw, [
          'coffee_profile_summary',
          'comparison_summary',
          'user_preferences_summary',
        ]);
  const insightText =
    typeof parsed.insight_text === 'string'
      ? parsed.insight_text
      : buildStructuredText(insightRaw, [
          'headline',
          'why',
          'what_youll_like',
          'what_youll_like_more',
          'what_youll_like_even_more',
          'next_steps',
          'cta',
          'closing',
        ]);

  return {
    verdict: typeof parsed.verdict === 'string' ? parsed.verdict : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
    verdict_explanation:
      typeof verdictExplanationRaw === 'string'
        ? verdictExplanationRaw
        : verdictExplanationText ?? null,
    verdict_explanation_text: verdictExplanationText,
    insight:
      typeof insightRaw === 'string'
        ? insightRaw
        : insightText ?? null,
    insight_text: insightText,
    disclaimer: typeof parsed.disclaimer === 'string' ? parsed.disclaimer : null,
  };
};

export const formatStructuredRecommendation = (
  payload: OCRStructuredRecommendation
): string => {
  const lines: string[] = [];
  const verdict = payload.verdict?.trim();
  if (verdict) {
    if (typeof payload.confidence === 'number') {
      const confidenceValue =
        payload.confidence <= 1
          ? Math.round(payload.confidence * 100)
          : Math.round(payload.confidence);
      lines.push(`${verdict} (${confidenceValue}% dôvera)`);
    } else {
      lines.push(verdict);
    }
  }

  const explanation = (payload.verdict_explanation_text ?? payload.verdict_explanation)?.trim();
  if (explanation) {
    lines.push(explanation);
  }

  const insight = (payload.insight_text ?? payload.insight)?.trim();
  if (insight) {
    lines.push(insight);
  }

  const disclaimer = payload.disclaimer?.trim();
  if (disclaimer) {
    lines.push(disclaimer);
  }

  return lines.join('\n');
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

export interface OCRStructuredRecommendation {
  verdict?: string | null;
  confidence?: number | null;
  verdict_explanation?: string | null;
  verdict_explanation_text?: string | null;
  insight?: string | null;
  insight_text?: string | null;
  disclaimer?: string | null;
}

export type OCRRecommendationPayload = string | OCRStructuredRecommendation;

interface OCRResult {
  original: string;
  corrected: string;
  recommendation: OCRRecommendationPayload;
  hasProfile?: boolean;
  match_percentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
  source?: 'offline' | 'online';
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  detectionLabels?: string[];
  detectionConfidence?: number;
  structuredMetadata?: StructuredCoffeeMetadata | null;
  rawStructuredResponse?: unknown;
}

/**
 * Retrieves the current Firebase authentication token if the user is signed in.
 *
 * @returns {Promise<string|null>} ID token string or `null` when no authenticated user is available.
 */
const getAuthToken = async (): Promise<string | null> => {
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
 * Uses OpenAI to correct OCR-extracted coffee text while caching results for offline reuse.
 *
 * @param {string} ocrText - Raw OCR transcription to correct; may contain typos and artifacts.
 * @returns {Promise<string>} Corrected text or the original input when AI is unavailable.
 * @throws {Error} Propagates network errors encountered during the OpenAI call unless a cached value exists.
 */
const fixTextWithAI = async (ocrText: string): Promise<string> => {
  const prompt = `
Toto je text získaný OCR rozpoznávaním z etikety kávy.
Oprav všetky chyby, ktoré mohli vzniknúť zlým rozpoznaním znakov.
Zachovaj pôvodný význam a štruktúru, ale oprav OCR chyby.
Vráť iba opravený text.

OCR text:
${ocrText}
  `;

  const cacheKey = createCacheKey('ocr:fix', ocrText);
  

  try {
    await ensureOnline();
    console.log('📤 [OpenAI] OCR prompt:', prompt);
    const response = await retryableFetch(() =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'Si expert na kávu a opravu textov z OCR. Opravuješ chyby v rozpoznaných textoch z etikiet káv.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      }),
    );

    const data = await response.json();
    console.log('📥 [OpenAI] OCR response:', data);

    if (data?.choices?.[0]?.message?.content) {
      
      return data.choices[0].message.content.trim();
    }

    return  ocrText;
  } catch (error) {
    console.error('AI correction error:', error);
    return  ocrText;
  }
};

/**
 * Generates brewing method recommendations from coffee description text using OpenAI with caching fallback.
 *
 * @param {string} coffeeText - Description of the coffee used as prompt context; may include roast or flavor notes.
 * @returns {Promise<string[]>} Up to four brewing method names prioritized by AI or sensible defaults.
 * @throws {Error} Propagates connectivity failures when both online call and cached values are unavailable.
 */
export const suggestBrewingMethods = async (
  coffeeText: string
): Promise<string[]> => {
  const prompt =
    `Na základe tohto popisu kávy navrhni presne 4 najvhodnejšie spôsoby prípravy kávy. ` +
    `Odpovedz len zoznamom metód oddelených novým riadkom. Popis: "${coffeeText}"`;

  const fallback = ['Espresso', 'French press', 'V60', 'Cold brew'];
  const cacheKey = createCacheKey('ocr:methods', coffeeText);

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Vráti sa predvolený zoznam metód.');
    return  fallback;
  }

  try {
    await ensureOnline();
    console.log('📤 [OpenAI] Brewing prompt:', prompt);
    const response = await retryableFetch(() =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'Si barista, ktorý odporúča spôsoby prípravy kávy na základe popisu z etikety.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      })
    );

    const data = await response.json();
    console.log('📥 [OpenAI] Brewing response:', data);
    const content = data?.choices?.[0]?.message?.content || '';
    let methods = content
      .split('\n')
      .map((m: string) => m.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean);

    if (methods.length === 0) {
      // Ak AI nevráti žiadne metódy, použijeme predvolené hodnoty
      methods = fallback;
    } else if (methods.length < 4) {
      // Ak AI vráti menej ako 4, doplníme ich predvolenými
      methods = [...methods, ...fallback].slice(0, 4);
    } else {
      methods = methods.slice(0, 4);
    }

    return methods;
  } catch (error) {
    console.error('Brewing suggestion error:', error);

    return fallback;
  }
};

/**
 * Produces a concise brewing recipe tailored to a selected method and taste preference via OpenAI.
 *
 * @param {string} method - Brewing method such as "Espresso" or "V60" to guide the recipe output.
 * @param {string} taste - Flavor preference description (e.g., "ovocná", "čokoládová").
 * @returns {Promise<string>} Generated recipe text or cached/default value when the AI service is unavailable.
 * @throws {Error} Propagates network failures when no cached recipe exists.
 */
export const getBrewRecipe = async (
  method: string,
  taste: string
): Promise<string> => {
  const prompt = `Priprav detailný recept na kávu pomocou metódy ${method}. Používateľ preferuje ${taste} chuť. Uveď ideálny pomer kávy k vode, teplotu vody a ďalšie dôležité kroky. Odpovedz stručne.`;

  const cacheKey = createCacheKey('ocr:recipe', `${method}|${taste}`);

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Recept sa nevygeneruje.');
    return  '';
  }

  try {
    await ensureOnline();
    console.log('📤 [OpenAI] Recipe prompt:', prompt);
    const response = await retryableFetch(() =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Si skúsený barista, ktorý navrhuje recepty na kávu.'
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      })
    );

    const data = await response.json();
    console.log('📥 [OpenAI] Recipe response:', data);
    const recipe = data?.choices?.[0]?.message?.content?.trim() || '';
    if (recipe) {
      return recipe;
    }
    return  '';
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
 * Processes OCR using backend services with offline fallbacks, AI enrichment, and structured metadata parsing.
 *
 * @param {string} base64image - Base64 encoded image captured from the coffee label.
 * @param {{ imagePath?: string }} [options] - Optional hints including a pre-saved image path to reuse for offline flow.
 * @returns {Promise<OCRResult|null>} Consolidated OCR result including recommendations and metadata, or `null` when offline fallback fails.
 * @throws {Error} Propagates unexpected errors other than offline scenarios which are handled via fallback logic.
 */
export const processOCR = async (
  base64image: string,
  options?: { imagePath?: string; structuredMetadata?: Record<string, unknown> | null },
): Promise<OCRResult | null> => {
  try {
    await ensureOnline();
    // 1. Pošli na Google Vision API
    const ocrResponse = await loggedFetch(`${API_HOST}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64image }),
    });

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

    let isCoffee: boolean | undefined;
    if (typeof ocrData.isCoffee === 'boolean') {
      isCoffee = ocrData.isCoffee;
    } else if (detectionLabels && detectionLabels.length > 0) {
      isCoffee = detectionLabels.some(label => isCoffeeRelatedText(label));
    }

    const nonCoffeeReasonRaw =
      typeof ocrData.nonCoffeeReason === 'string' ? ocrData.nonCoffeeReason : undefined;
    let nonCoffeeReason = nonCoffeeReasonRaw;
    if (!nonCoffeeReason && isCoffee === false && detectionLabels && detectionLabels.length > 0) {
      nonCoffeeReason = `Rozpoznané: ${detectionLabels.slice(0, 3).join(', ')}`;
    }

    // 2. Oprav text pomocou AI
    const correctedTextRaw = await fixTextWithAI(originalText);
    const correctedText =
      typeof correctedTextRaw === 'string' && correctedTextRaw.trim().length > 0
        ? correctedTextRaw
        : originalText;

    const localStructuredMetadata = normalizeStructuredMetadataInput(
      options?.structuredMetadata ??
        ocrData?.structured_metadata ??
        ocrData?.structuredMetadata ??
        null
    );

    // 3. Ulož do databázy a získaj match percentage
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Nie si prihlásený');
    }

    const savePayload: Record<string, unknown> = {
      original_text: originalText,
      corrected_text: correctedText,
    };
    if (localStructuredMetadata) {
      savePayload.structured_metadata = localStructuredMetadata;
    }

    const saveResponse = await loggedFetch(`${API_URL}/ocr/save`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(savePayload),
    });

    let matchPercentage = 0;
    let isRecommended = false;
    let scanId = '';
    let structuredMetadata: StructuredCoffeeMetadata | null = null;
    let rawStructuredResponse: unknown = null;

    if (saveResponse.ok) {
      const saveData = await saveResponse.json();
      console.log('📥 [BE] Save OCR response:', saveData);
      matchPercentage = saveData.match_percentage || 0;
      isRecommended = saveData.is_recommended || false;
      scanId = saveData.id || '';

      const metadataRaw = saveData.structured_metadata;
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

      if (rawStructuredResponse == null) {
        rawStructuredResponse = metadataRaw ?? null;
      }
    }

    // 4. Získaj AI hodnotenie a návrhy metód súčasne
    const evaluatePromise = (async () => {
      try {
        const evaluatePayload: Record<string, unknown> = {
          corrected_text: correctedText || originalText,
        };
        const structuredCandidate =
          structuredMetadata ?? rawStructuredResponse ?? localStructuredMetadata ?? null;
        const normalizedStructuredCandidate =
          normalizeStructuredMetadataInput(structuredCandidate);
        if (normalizedStructuredCandidate) {
          evaluatePayload.structured_metadata = normalizedStructuredCandidate;
        }

        const response = await loggedFetch(`${API_URL}/ocr/evaluate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evaluatePayload),
        });

        return { response } as const;
      } catch (error) {
        return { error } as const;
      }
    })();

    const methodsPromise = (async () => {
      try {
        return await suggestBrewingMethods(correctedText);
      } catch (error) {
        console.warn('Brewing suggestion promise failed:', error);
        return [] as string[];
      }
    })();

    const [evaluationResult, brewingMethods] = await Promise.all([
      evaluatePromise,
      methodsPromise,
    ]);

    let recommendation: OCRRecommendationPayload = '';
    let hasProfile: boolean | null = null;
    if ('error' in evaluationResult) {
      console.warn('Evaluation failed:', evaluationResult.error);
      recommendation =
        'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
    } else {
      try {
        const evalResponse = evaluationResult.response;
        if (evalResponse.ok) {
          const evalData = await evalResponse.json();
          console.log('📥 [BE] Evaluate response:', evalData);
          if (typeof evalData.has_profile === 'boolean') {
            hasProfile = evalData.has_profile;
          } else if (typeof evalData.hasProfile === 'boolean') {
            hasProfile = evalData.hasProfile;
          } else if (typeof evalData.status === 'string') {
            switch (evalData.status) {
              case 'ok':
                hasProfile = true;
                break;
              case 'profile_missing':
                hasProfile = false;
                break;
              case 'insufficient_coffee_data':
                hasProfile = null;
                break;
              default:
                break;
            }
          }
          const structuredRecommendation = normalizeStructuredRecommendation(
            evalData.recommendation ?? evalData
          );
          if (structuredRecommendation) {
            recommendation = structuredRecommendation;
          } else if (typeof evalData.recommendation === 'string') {
            recommendation = evalData.recommendation;
          } else {
            recommendation = '';
          }
        }
      } catch (evalError) {
        console.warn('Evaluation failed:', evalError);
        recommendation =
          'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
      }
    }

    return {
      original: originalText,
      corrected: correctedText,
      recommendation,
      hasProfile: typeof hasProfile === 'boolean' ? hasProfile : undefined,
      match_percentage: matchPercentage,
      isRecommended,
      scanId,
      brewingMethods,
      source: 'online',
      isCoffee,
      detectionLabels,
      detectionConfidence,
      nonCoffeeReason,
      structuredMetadata,
      rawStructuredResponse,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};

export interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text?: string | null;
  corrected_text?: string | null;
  created_at: Date;
  rating?: number;
  match_percentage?: number;
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
  structured_metadata?: Record<string, unknown> | null;
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

    return data.map((item: any) => {
      const structuredMetadata = normalizeStructuredMetadataInput(item.structured_metadata);
      const normalizedOriginal =
        typeof item.original_text === 'string' ? item.original_text : null;
      const normalizedCorrected =
        typeof item.corrected_text === 'string' ? item.corrected_text : null;
      const fallbackText =
        normalizedCorrected || normalizedOriginal || item.coffee_name || '';

      return {
        id: item.id,
        coffee_name: item.coffee_name || extractCoffeeName(fallbackText),
        original_text: normalizedOriginal || normalizedCorrected || item.coffee_name || null,
        corrected_text: normalizedCorrected || normalizedOriginal || item.coffee_name || null,
        created_at: new Date(item.created_at),
        rating: item.rating,
        match_percentage: item.match_percentage,
        is_recommended: item.is_recommended,
        is_purchased: item.is_purchased,
        is_favorite: item.is_favorite,
        brand:
          item.brand ??
          structuredMetadata?.roaster ??
          structuredMetadata?.brand ??
          item.roaster ??
          null,
        origin:
          item.origin ??
          structuredMetadata?.origin ??
          structuredMetadata?.country_of_origin ??
          item.country_of_origin ??
          null,
        roast_level: item.roast_level ?? structuredMetadata?.roast_level ?? null,
        flavor_notes: item.flavor_notes ?? structuredMetadata?.flavor_notes ?? null,
        processing: item.processing ?? structuredMetadata?.processing ?? null,
        roast_date: item.roast_date ?? structuredMetadata?.roast_date ?? null,
        varietals: item.varietals ?? structuredMetadata?.varietals ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        structured_metadata: structuredMetadata,
      };
    });
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
