import AsyncStorage from '@react-native-async-storage/async-storage';
import { coffeeOfflineManager } from '../offline';
const tipsData = require('../../content/dailyTips.json');

export interface Tip {
  id: number;
  text: string;
  date: string;
}

export const TIP_STORAGE_KEY = 'ai:dailyTip:last';
export const TIP_OFFLINE_CACHE_KEY_PREFIX = 'ai:dailyTip';
export const TIP_CACHE_TTL_HOURS = 24;

let scheduledRefreshHandle: ReturnType<typeof setTimeout> | null = null;

const tipList: Tip[] = tipsData as Tip[];

const buildOfflineCacheKey = (date: string) => `${TIP_OFFLINE_CACHE_KEY_PREFIX}:${date}`;

export const getTipFromCache = async (date: string): Promise<Tip | null> => {
  try {
    const offlineKey = buildOfflineCacheKey(date);
    const offlineCached = await coffeeOfflineManager.getItem<Tip>(offlineKey);
    if (offlineCached) {
      return offlineCached;
    }

    const stored = await AsyncStorage.getItem(TIP_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed: Tip = JSON.parse(stored);
    if (parsed.date === date) {
      try {
        await coffeeOfflineManager.setItem(offlineKey, parsed, TIP_CACHE_TTL_HOURS, 4);
      } catch (error) {
        console.error('Error caching tip offline:', error);
      }
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Error reading cached tip:', error);
    return null;
  }
};

export const persistTip = async (tip: Tip): Promise<void> => {
  const offlineKey = buildOfflineCacheKey(tip.date);
  try {
    await AsyncStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(tip));
  } catch (error) {
    console.error('Error saving last tip:', error);
  }

  try {
    await coffeeOfflineManager.setItem(offlineKey, tip, TIP_CACHE_TTL_HOURS, 4);
  } catch (error) {
    console.error('Error caching daily tip:', error);
  }
};

export const pickTipForDate = (date: string): Tip => {
  if (!tipList.length) {
    return {
      id: 0,
      text: 'Enjoy your brew!',
      date,
    };
  }

  const matched = tipList.find(tip => tip.date === date);
  if (matched) {
    return { ...matched, date };
  }

  const day = new Date(date).getDate();
  const fallback = tipList[day % tipList.length];
  return { ...fallback, date };
};

export const fetchDailyTip = async (now: Date = new Date()): Promise<Tip> => {
  const today = now.toISOString().slice(0, 10);
  const cached = await getTipFromCache(today);
  if (cached) {
    return cached;
  }

  const tip = pickTipForDate(today);
  await persistTip(tip);
  return tip;
};

export const getNextRefreshDelay = (now: Date = new Date()): number => {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(midnight.getTime() - now.getTime(), 0);
};

export const scheduleDailyTipRefresh = (
  refresh: () => Promise<unknown> | unknown,
  now: Date = new Date(),
): ReturnType<typeof setTimeout> => {
  const delay = getNextRefreshDelay(now);

  if (scheduledRefreshHandle) {
    clearTimeout(scheduledRefreshHandle);
  }

  scheduledRefreshHandle = setTimeout(() => {
    scheduledRefreshHandle = null;
    Promise.resolve()
      .then(() => refresh())
      .catch(error => {
        console.error('Error running scheduled daily tip refresh:', error);
      });
  }, delay);

  return scheduledRefreshHandle;
};

export const clearScheduledDailyTipRefresh = () => {
  if (scheduledRefreshHandle) {
    clearTimeout(scheduledRefreshHandle);
    scheduledRefreshHandle = null;
  }
};

export const getScheduledDailyTipRefreshHandle = () => scheduledRefreshHandle;
