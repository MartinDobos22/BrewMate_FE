import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrewLog } from '../types/BrewLog';
import { Platform, ToastAndroid, Alert } from 'react-native';

const STORAGE_KEY = 'brewLogs';

/**
 * Options controlling persistence side effects when saving a brew log.
 */
interface SaveOptions {
  showFeedback?: boolean;
}

/**
 * Persists a brew log entry to AsyncStorage and optionally shows user feedback.
 *
 * @param log - Brew log payload to persist.
 * @param options - Controls whether toast/alert feedback is shown.
 */
export const saveBrewLog = async (log: BrewLog, options: SaveOptions = {}): Promise<void> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const logs: BrewLog[] = raw ? JSON.parse(raw) : [];
  logs.push(log);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  if (options.showFeedback !== false) {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Záznam uložený', ToastAndroid.SHORT);
    } else {
      Alert.alert('Záznam uložený');
    }
  }
};

/**
 * Retrieves stored brew logs, optionally filtered by recipe ID.
 *
 * @param recipeId - When provided, limits results to logs tied to the recipe.
 * @returns Array of brew logs from local storage.
 */
export const getBrewLogs = async (recipeId?: string): Promise<BrewLog[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  let logs: BrewLog[] = raw ? JSON.parse(raw) : [];
  if (recipeId) {
    logs = logs.filter((l) => l.recipeId === recipeId);
  }
  return logs;
};
