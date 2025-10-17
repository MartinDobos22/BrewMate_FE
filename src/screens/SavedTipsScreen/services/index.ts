import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip } from '../../../services/contentServices';

export const SAVED_TIPS_KEY = 'SavedTips';

export const loadSavedTips = async (): Promise<Tip[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    throw error;
  }
};

export const persistSavedTips = async (tips: Tip[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(tips));
  } catch (error) {
    throw error;
  }
};

export const removeSavedTip = (tips: Tip[], id: number, date: string): Tip[] =>
  tips.filter((tip) => !(tip.id === id && tip.date === date));
