// services/ocrService.ts
import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import { CONFIG } from '../config/config';
import { API_HOST, API_URL } from './api';

const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;

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
  console.log('📤 [FE->BE]', url, options);
  const res = await retryableFetch(() => fetch(url, options));
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

interface OCRResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
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

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Text sa neodošle na opravu.');
    return ocrText;
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
      return data.choices[0].message.content.trim();
    }

    return ocrText;
  } catch (error) {
    console.error('AI correction error:', error);
    return ocrText;
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

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Vráti sa predvolený zoznam metód.');
    return fallback;
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
 * Vygeneruje recept na kávu podľa zvolenej metódy a chuťových preferencií
 */
export const getBrewRecipe = async (
  method: string,
  taste: string
): Promise<string> => {
  const prompt = `Priprav detailný recept na kávu pomocou metódy ${method}. Používateľ preferuje ${taste} chuť. Uveď ideálny pomer kávy k vode, teplotu vody a ďalšie dôležité kroky. Odpovedz stručne.`;

  if (!OPENAI_API_KEY) {
    console.error('Chýba OpenAI API key. Recept sa nevygeneruje.');
    return '';
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
    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Brew recipe error:', error);
    return '';
  }
};

/**
 * Spracuje OCR z obrázka
 */
export const processOCR = async (base64image: string): Promise<OCRResult | null> => {
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

    if (saveResponse.ok) {
      const saveData = await saveResponse.json();
      console.log('📥 [BE] Save OCR response:', saveData);
      matchPercentage = saveData.match_percentage || 0;
      isRecommended = saveData.is_recommended || false;
      scanId = saveData.id || '';
    }

    // 4. Získaj AI hodnotenie
    let recommendation = '';
    try {
        const evalResponse = await loggedFetch(`${API_URL}/ocr/evaluate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ corrected_text: correctedText }),
      });

      if (evalResponse.ok) {
          const evalData = await evalResponse.json();
          console.log('📥 [BE] Evaluate response:', evalData);
        recommendation = evalData.recommendation || '';
      }
    } catch (evalError) {
      console.warn('Evaluation failed:', evalError);
      recommendation = 'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.';
    }

    // 5. Navrhni spôsoby prípravy
    const brewingMethods = await suggestBrewingMethods(correctedText);

    return {
      original: originalText,
      corrected: correctedText,
      recommendation,
      matchPercentage,
      isRecommended,
      scanId,
      brewingMethods,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};

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
  brand?: string
): Promise<void> => {
  await ensureOnline();
  const token = await getAuthToken();
  if (!token) throw new Error('Nie si prihlásený');

  await loggedFetch(`${API_URL}/ocr/purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ocr_log_id: ocrLogId, coffee_name: coffeeName, brand }),
  });
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