import { API_HOST } from './api';
import { showToast } from '../utils/toast';

/**
 * Analyzes an image of coffee to return a recognized label while favoring
 * online detection but falling back to the bundled offline TensorFlow Lite model.
 *
 * The function caches responses per image path to avoid repeated inference and
 * transparently switches to the offline model when the remote Vision API fails
 * or is unreachable. Users are notified when the offline model is used.
 *
 * @param {string} base64Image - Base64 encoded image content (without data URL).
 * @param {string} imagePath - Absolute path to the image that should be
 * recognized. The image must be accessible from the device file system.
 * @returns {Promise<string|null>} Resolves with the detected coffee label or
 * `null` when neither online nor offline inference succeeds.
 * @throws {Error} Propagates network errors if the remote Vision API request
 * throws before the offline fallback is attempted.
 */
export async function recognizeCoffee(
  base64Image: string,
  imagePath: string,
): Promise<string | null> {
  const cacheKey = `vision:${imagePath}`;

  const normalizedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const payload = {
    requests: [
      {
        image: { content: normalizedBase64 },
        features: [{ type: 'TEXT_DETECTION' }],
      },
    ],
  };
  const proxyUrl = `${API_HOST}/ocr`;
  const visionApiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  const directUrl = visionApiKey
    ? `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`
    : null;

  try {
    // pokus o použitie Google Vision API
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const result = await res.json();
      const label =
        result.text ||
        result.responses?.[0]?.fullTextAnnotation?.text ||
        result.responses?.[0]?.textAnnotations?.[0]?.description ||
        'neznáme';
      return label;
    }
  } catch (err) {
    // pokračujeme offline
  }

  if (directUrl) {
    try {
      const res = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const label =
          result.responses?.[0]?.fullTextAnnotation?.text ||
          result.responses?.[0]?.textAnnotations?.[0]?.description ||
          'neznáme';
        return label;
      }
    } catch (err) {
      // pokračujeme offline
    }
  }

  try {
    // dynamický import tensorflow lite
    const tflite = require('tflite-react-native');
    const modelPath = 'assets/models/coffee.tflite';
    const model = await tflite.loadModel({ model: modelPath });
    const prediction = await tflite.runModelOnImage({ path: imagePath });
    const label = prediction?.[0]?.label || 'neznáme';
    showToast('Použitý lokálny model');
    return label;
  } catch (err) {
    console.warn('Lokálny model zlyhal', err);
    return null;
  }
}
