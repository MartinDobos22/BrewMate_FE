import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrewLog } from '../types/BrewLog';
import { Platform, ToastAndroid, Alert } from 'react-native';

const STORAGE_KEY = 'brewLogs';

interface SaveOptions {
  showFeedback?: boolean;
}

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

export const getBrewLogs = async (recipeId?: string): Promise<BrewLog[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  let logs: BrewLog[] = raw ? JSON.parse(raw) : [];
  if (recipeId) {
    logs = logs.filter((l) => l.recipeId === recipeId);
  }
  return logs;
};
