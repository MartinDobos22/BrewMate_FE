// services/ocrService.ts
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import { coffeeOfflineManager } from '../offline';
import { recognizeCoffee } from '../offline/VisionService';
import { CONFIG } from '../config/config';
import { API_HOST, API_URL } from './api';

const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;
const AI_CACHE_TTL = 24;

const createCacheKey = (prefix: string, input: string) => {
  const normalized = input.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(normalized).slice(0, 96);
  return `ai:${prefix}:${encoded}`;
};

const getCachedAIValue = async <T>(key: string): Promise<T | null> =>
  coffeeOfflineManager.getItem<T>(key);

const setCachedAIValue = async (key: string, value: any, priority = 6) => {
  try {
    await coffeeOfflineManager.setItem(key, value, AI_CACHE_TTL, priority);
  } catch (error) {
    console.warn('Failed to cache AI response', error);
  }
};

/**
 * Overí sieťové pripojenie
 */
const ensureOnline = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error('Offline');
  }
};

/**
 * Fetch s automatickým opakovaním pri zlyhaní siete
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
 * Wrapper okolo fetchu pre logovanie požiadaviek a odpovedí.
 */
const loggedFetch = async (url: string, options: RequestInit) => {
  await ensureOnline();
   console.log('📤 [FE->BE]');
  const res = await retryableFetch(() => fetch(url, options));
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

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

interface OCRResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
  source?: 'offline' | 'online';
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  detectionLabels?: string[];
  detectionConfidence?: number;
  structuredMetadata?: StructuredCoffeeMetadata | null;
  structuredConfidence?: Record<string, unknown> | null;
  structuredUncertainty?: Record<string, unknown> | null;
  rawStructuredResponse?: unknown;
}

interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number;
  is_recommended?: boolean;
  is_purchased?: boolean;
}

/**
 * Získa autorizačný token
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
 * Extrahuje názov kávy z textu
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
 * Opraví text pomocou OpenAI
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
  const cached = await getCachedAIValue<string>(cacheKey);

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Text sa neodošle na opravu.');
    return cached ?? ocrText;
  }

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
              content: 'Si expert na kávu a opravu textov z OCR. Opravuješ chyby v rozpoznaných textoch z etikiet káv.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      })
    );

    const data = await response.json();
    console.log('📥 [OpenAI] OCR response:', data);

    if (data?.choices?.[0]?.message?.content) {
      const fixed = data.choices[0].message.content.trim();
      await setCachedAIValue(cacheKey, fixed, 7);
      return fixed;
    }

    return cached ?? ocrText;
  } catch (error) {
    console.error('AI correction error:', error);
    return cached ?? ocrText;
  }
};

/**
 * Navrhne spôsoby prípravy kávy na základe popisu
 */
export const suggestBrewingMethods = async (
  coffeeText: string
): Promise<string[]> => {
  const prompt =
    `Na základe tohto popisu kávy navrhni presne 4 najvhodnejšie spôsoby prípravy kávy. ` +
    `Odpovedz len zoznamom metód oddelených novým riadkom. Popis: "${coffeeText}"`;

  const fallback = ['Espresso', 'French press', 'V60', 'Cold brew'];
  const cacheKey = createCacheKey('ocr:methods', coffeeText);
  const cached = await getCachedAIValue<string[]>(cacheKey);

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Vráti sa predvolený zoznam metód.');
    return cached ?? fallback;
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

    await setCachedAIValue(cacheKey, methods, 6);
    return methods;
  } catch (error) {
    console.error('Brewing suggestion error:', error);
    if (cached) {
      return cached;
    }
    return fallback;
  }
};

/**
 * Vygeneruje recept na kávu podľa zvolenej metódy a chuťových preferencií
 */
export const getBrewRecipe = async (
  method: string,
  taste: string
): Promise<string> => {
  const prompt = `Priprav detailný recept na kávu pomocou metódy ${method}. Používateľ preferuje ${taste} chuť. Uveď ideálny pomer kávy k vode, teplotu vody a ďalšie dôležité kroky. Odpovedz stručne.`;

  const cacheKey = createCacheKey('ocr:recipe', `${method}|${taste}`);
  const cached = await getCachedAIValue<string>(cacheKey);

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Recept sa nevygeneruje.');
    return cached ?? '';
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
      await setCachedAIValue(cacheKey, recipe, 6);
      return recipe;
    }
    return cached ?? '';
  } catch (error) {
    console.error('Brew recipe error:', error);
    if (cached) {
      return cached;
    }
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
 * Spracuje OCR z obrázka
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

const offlineFallback = async (
  base64image: string,
  imagePath?: string,
): Promise<OCRResult | null> => {
  try {
    const path = await ensureOfflineImagePath(base64image, imagePath);
    const label = await recognizeCoffee(path);
    if (!label) {
      return null;
    }

    const labelIsCoffee = isCoffeeRelatedText(label);
    const detectionLabels = label ? [label] : undefined;
    return {
      original: '',
      corrected: label,
      recommendation: labelIsCoffee
        ? 'Výsledok z lokálneho modelu.'
        : 'Nepodarilo sa rozpoznať kávu. Skús znova naskenovať etiketu.',
      scanId: `offline-${Date.now()}`,
      source: 'offline',
      isCoffee: labelIsCoffee,
      detectionLabels,
      nonCoffeeReason: labelIsCoffee ? undefined : `Rozpoznané: ${label}`,
      structuredMetadata: null,
      structuredConfidence: null,
      structuredUncertainty: null,
      rawStructuredResponse: null,
    };
  } catch (fallbackError) {
    console.error('Offline OCR fallback failed:', fallbackError);
    return null;
  }
};

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
    const correctedText = await fixTextWithAI(originalText);

    // 3. Ulož do databázy a získaj match percentage
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Nie si prihlásený');
    }

    const saveResponse = await loggedFetch(`${API_URL}/ocr/save`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_text: originalText,
        corrected_text: correctedText,
      }),
    });

    let matchPercentage = 0;
    let isRecommended = false;
    let scanId = '';
    let structuredMetadata: StructuredCoffeeMetadata | null = null;
    let structuredConfidence: Record<string, unknown> | null = null;
    let structuredUncertainty: Record<string, unknown> | null = null;
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

      structuredConfidence = safeParseJSON<Record<string, unknown>>(
        saveData.structured_confidence
      );
      structuredUncertainty = safeParseJSON<Record<string, unknown>>(
        saveData.structured_uncertainty
      );
      if (rawStructuredResponse == null) {
        rawStructuredResponse = metadataRaw ?? null;
      }
    }

    // 4. Získaj AI hodnotenie a návrhy metód súčasne
    const evaluatePromise = (async () => {
      try {
        const response = await loggedFetch(`${API_URL}/ocr/evaluate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ corrected_text: correctedText }),
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

    let recommendation = '';
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
          recommendation = evalData.recommendation || '';
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
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    if (error instanceof Error && error.message === 'Offline') {
      return await offlineFallback(base64image, options?.imagePath);
    }
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
  match_percentage?: number;
  is_recommended?: boolean;
  is_purchased?: boolean;
  is_favorite?: boolean;
  brand?: string | null;
  origin?: string | null;
  roast_level?: string | null;
  flavor_notes?: string[] | null;
  thumbnail_url?: string | null;
}

/**
 * Načíta históriu OCR skenovaní
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
      match_percentage: item.match_percentage,
      is_recommended: item.is_recommended,
      is_purchased: item.is_purchased,
      is_favorite: item.is_favorite,
      brand: item.brand ?? item.roaster ?? null,
      origin: item.origin ?? item.country_of_origin ?? null,
      roast_level: item.roast_level ?? item.roastLevel ?? null,
      flavor_notes: item.flavor_notes ?? item.flavorNotes ?? null,
      thumbnail_url: item.thumbnail_url ?? item.thumbnailUrl ?? null,
    }));
  } catch (error) {
    console.error('Error fetching OCR history:', error);
    return [];
  }
};

/**
 * Označí, že používateľ kúpil danú kávu
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
 * Potvrdí štruktúrované metadáta pre daný sken
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
 * Vymaže OCR záznam
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
 * Ohodnotí OCR výsledok
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