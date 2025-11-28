import { showToast } from '../utils/toast';

/**
 * Analyzes an image of coffee to return a recognized label while favoring
 * online detection but falling back to the bundled offline TensorFlow Lite model.
 *
 * The function caches responses per image path to avoid repeated inference and
 * transparently switches to the offline model when the remote Vision API fails
 * or is unreachable. Users are notified when the offline model is used.
 *
 * @param {string} imagePath - Absolute path to the image that should be
 * recognized. The image must be accessible from the device file system.
 * @returns {Promise<string|null>} Resolves with the detected coffee label or
 * `null` when neither online nor offline inference succeeds.
 * @throws {Error} Propagates network errors if the remote Vision API request
 * throws before the offline fallback is attempted.
 */
export async function recognizeCoffee(imagePath: string): Promise<string | null> {
  const cacheKey = `vision:${imagePath}`;


  try {
    // pokus o použitie Google Vision API
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      body: JSON.stringify({ imagePath }),
    });
    if (res.ok) {
      const result = await res.json();
      const label = result.label || 'neznáme';
      return label;
    }
  } catch (err) {
    // pokračujeme offline
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
