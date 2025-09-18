import AsyncStorage from '@react-native-async-storage/async-storage';
import { coffeeOfflineManager } from '../offline';
const tips = require('../../content/dailyTips.json');

export interface Tip {
  id: number;
  text: string;
  date: string;
}

const LAST_TIP_KEY = 'lastTip';
const OFFLINE_TIP_KEY = 'ai:dailyTip';
const AI_CACHE_TTL = 24;

export const fetchDailyTip = async (): Promise<Tip> => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const offlineCached = await coffeeOfflineManager.getItem<Tip>(`${OFFLINE_TIP_KEY}:${today}`);
    if (offlineCached) {
      return offlineCached;
    }

    const stored = await AsyncStorage.getItem(LAST_TIP_KEY);
    if (stored) {
      const parsed: Tip = JSON.parse(stored);
      if (parsed.date === today) {
        await coffeeOfflineManager.setItem(
          `${OFFLINE_TIP_KEY}:${today}`,
          parsed,
          AI_CACHE_TTL,
          4,
        );
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading last tip:', error);
  }

  const list: Tip[] = tips as Tip[];
  const matched = list.find((t) => t.date === today);
  const index = new Date(today).getDate() % list.length;
  const chosen = matched || list[index];
  const tip: Tip = { ...chosen, date: today };

  try {
    await AsyncStorage.setItem(LAST_TIP_KEY, JSON.stringify(tip));
  } catch (error) {
    console.error('Error saving last tip:', error);
  }

  try {
    await coffeeOfflineManager.setItem(
      `${OFFLINE_TIP_KEY}:${today}`,
      tip,
      AI_CACHE_TTL,
      4,
    );
  } catch (error) {
    console.error('Error caching daily tip:', error);
  }

  return tip;
};
