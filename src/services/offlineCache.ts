import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_KEY = 'ocr:last';

/**
 * Persists an OCR parsing result in local encrypted storage and tracks the last
 * saved identifier for easy retrieval.
 *
 * @param {string} id - Unique identifier of the OCR run, typically derived from
 * the source image or scan session.
 * @param {any} payload - Arbitrary OCR result payload to store; it is
 * serialized to JSON before persistence.
 * @returns {Promise<void>} Resolves after the payload and last key reference
 * are written; errors are logged but not rethrown.
 */
export const saveOCRResult = async (id: string, payload: any) => {
  try {
    await AsyncStorage.setItem(`ocr:${id}`, JSON.stringify(payload));
    await AsyncStorage.setItem(LAST_KEY, id);
  } catch (error) {
    console.error('Error saving OCR result:', error);
  }
};

/**
 * Loads a previously saved OCR result, defaulting to the last stored entry
 * when no explicit identifier is provided.
 *
 * @param {string} [id] - Optional identifier of the OCR run to load; when
 * omitted the most recent saved ID is used.
 * @returns {Promise<any|null>} Parsed OCR payload or `null` if not found or a
 * read error occurs.
 */
export const loadOCRResult = async (id?: string) => {
  try {
    let key = id;
    if (!key) {
      key = (await AsyncStorage.getItem(LAST_KEY)) || undefined;
      if (!key) return null;
    }
    const data = await AsyncStorage.getItem(`ocr:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading OCR result:', error);
    return null;
  }
};
