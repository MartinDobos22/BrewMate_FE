import { API_URL } from '../api';
import { normalizeKeysToSnakeCase } from '../../utils/normalize';
import { loggedFetch } from './network';

/**
 * Uses backend AI services to correct OCR-extracted coffee text.
 *
 * @param {string} ocrText - Raw OCR transcription to correct; may contain typos and artifacts.
 * @returns {Promise<string>} Corrected text or the original input when AI is unavailable.
 * @throws {Error} Propagates network errors encountered during the OpenAI call unless a cached value exists.
 */
export const fixTextWithAI = async (ocrText: string): Promise<string> => {
  try {
    const response = await loggedFetch(`${API_URL}/ocr/fix-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizeKeysToSnakeCase({ text: ocrText })),
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
