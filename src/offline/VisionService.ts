import { coffeeOfflineManager } from './CoffeeOfflineManager';
import { showToast } from '../utils/toast';

/**
 * Rozpoznávanie typu kávy s podporou offline modelu.
 */
export async function recognizeCoffee(imagePath: string): Promise<string | null> {
  const cacheKey = `vision:${imagePath}`;
  const cached = await coffeeOfflineManager.getItem<string>(cacheKey);
  if (cached) return cached;

  try {
    // pokus o použitie Google Vision API
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      body: JSON.stringify({ imagePath }),
    });
    if (res.ok) {
      const result = await res.json();
      const label = result.label || 'neznáme';
      await coffeeOfflineManager.setItem(cacheKey, label, 24 * 30);
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
    await coffeeOfflineManager.setItem(cacheKey, label, 24 * 30);
    showToast('Použitý lokálny model');
    return label;
  } catch (err) {
    console.warn('Lokálny model zlyhal', err);
    return null;
  }
}
