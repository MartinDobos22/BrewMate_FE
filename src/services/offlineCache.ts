import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_KEY = 'ocr:last';

export const saveOCRResult = async (id: string, payload: any) => {
  try {
    await AsyncStorage.setItem(`ocr:${id}`, JSON.stringify(payload));
    await AsyncStorage.setItem(LAST_KEY, id);
  } catch (error) {
    console.error('Error saving OCR result:', error);
  }
};

export const loadOCRResult = async (id?: string) => {
  try {
    let key = id;
    if (!key) {
      key = await AsyncStorage.getItem(LAST_KEY) || undefined;
      if (!key) return null;
    }
    const data = await AsyncStorage.getItem(`ocr:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading OCR result:', error);
    return null;
  }
};
