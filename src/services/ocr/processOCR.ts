import { API_HOST } from '../api';
import { normalizeKeysToSnakeCase } from '../../utils/normalize';
import { fixTextWithAI } from './aiServices';
import { ensureOnline, loggedFetch } from './network';
import { isCoffeeRelatedText } from './textDetection';
import type { OCRResult } from './types';

/**
 * Processes OCR using backend services with offline fallbacks, AI enrichment, and label detection.
 *
 * @param {string} base64image - Base64 encoded image captured from the coffee label.
 * @param {{ imagePath?: string }} [options] - Optional hints including a pre-saved image path to reuse for offline flow.
 * @returns {Promise<OCRResult|null>} Consolidated OCR result, or `null` when offline fallback fails.
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

    return {
      original: originalText,
      corrected: trimmedCorrectedText,
      isCoffee,
      nonCoffeeReason,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};
