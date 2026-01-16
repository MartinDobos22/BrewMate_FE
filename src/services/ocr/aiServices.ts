import { API_URL } from '../api';
import type { TasteProfileVector, UserTasteProfile } from '../../types/Personalization';
import { normalizeKeysToSnakeCase } from '../../utils/normalize';
import { loggedFetch } from './network';
import { mapTasteProfilePayload } from './tasteProfile';

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
      body: JSON.stringify(normalizeKeysToSnakeCase({ text: coffeeText })),
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
    const payload: Record<string, unknown> = {
      method,
      taste,
    };
    if (tasteProfilePayload) {
      payload.taste_profile = tasteProfilePayload;
    }
    if (coffeeAttributes) {
      payload.coffee_attributes = coffeeAttributes;
    }
    const response = await loggedFetch(`${API_URL}/ocr/brew-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizeKeysToSnakeCase(payload)),
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
