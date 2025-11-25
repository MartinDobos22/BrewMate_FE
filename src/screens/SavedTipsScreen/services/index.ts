import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip } from '../../../services/contentServices';

/**
 * Storage key used to persist saved tips in AsyncStorage.
 *
 * @type {string}
 */
export const SAVED_TIPS_KEY = 'SavedTips';

/**
 * Loads the user's saved tips from AsyncStorage.
 *
 * @returns {Promise<Tip[]>} Promise resolving with the parsed list of saved tips or an empty array when none exist.
 * @throws {Error} Propagates errors from AsyncStorage when retrieval fails.
 */
export const loadSavedTips = async (): Promise<Tip[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    throw error;
  }
};

/**
 * Persists the given tips collection to AsyncStorage.
 *
 * @param {Tip[]} tips - Ordered list of tips to persist; overwrites any existing saved tips.
 * @returns {Promise<void>} Promise that resolves when storage completes successfully.
 * @throws {Error} Propagates errors from AsyncStorage when saving fails.
 */
export const persistSavedTips = async (tips: Tip[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(tips));
  } catch (error) {
    throw error;
  }
};

/**
 * Removes a tip with a matching id and date from the provided list.
 *
 * @param {Tip[]} tips - Existing list of saved tips.
 * @param {number} id - Unique tip identifier to remove.
 * @param {string} date - Date string that, combined with `id`, uniquely identifies a tip occurrence.
 * @returns {Tip[]} New array without the matched tip entry.
 */
export const removeSavedTip = (tips: Tip[], id: number, date: string): Tip[] =>
  tips.filter((tip) => !(tip.id === id && tip.date === date));
