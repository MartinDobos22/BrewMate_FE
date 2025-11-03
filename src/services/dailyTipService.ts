import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/config';
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
const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;
const isTestEnvironment = process.env.NODE_ENV === 'test';

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

const sanitizeTipText = (raw: string): string =>
  raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/^['"„“”]+|['"„“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildTipPrompt = (date: string): string => {
  const formattedDate = new Date(date).toLocaleDateString('sk-SK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `Dnes je ${formattedDate}. Priprav prosím jeden jedinečný baristický tip na kávu, ` +
    'maximálne v dvoch vetách. Tip musí byť praktický, konkrétny a napísaný po slovensky.';
};

const generateTipWithAI = async (date: string): Promise<Tip | null> => {
  if (!OPENAI_API_KEY || isTestEnvironment || typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content:
              'Si barista špecialista na domácu prípravu kávy. Ponúkni stručné, praktické tipy v slovenskom jazyku.',
          },
          { role: 'user', content: buildTipPrompt(date) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('DailyTipService: AI request failed with status', response.status);
      return null;
    }

    const data = await response.json();
    const tipText = sanitizeTipText(data?.choices?.[0]?.message?.content ?? '');
    if (!tipText) {
      return null;
    }

    return {
      id: Date.now(),
      text: tipText,
      date,
    };
  } catch (error) {
    console.error('DailyTipService: failed to generate AI tip', error);
    return null;
  }
};

export const fetchDailyTip = async (now: Date = new Date()): Promise<Tip> => {
  const today = now.toISOString().slice(0, 10);
  const cached = await getTipFromCache(today);
  if (cached) {
    return cached;
  }

  const tip = (await generateTipWithAI(today)) ?? pickTipForDate(today);
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
