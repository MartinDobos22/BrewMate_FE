import AsyncStorage from '@react-native-async-storage/async-storage';
import tipsData from '../../content/dailyTips.json';

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

/**
 * Picks a deterministic tip for the specified date from the bundled static list.
 *
 * @param {string} date - ISO date string (YYYY-MM-DD) used to find or seed a fallback tip.
 * @returns {Tip} A tip matching the provided date or a fallback mapped from the day value.
 */
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

/**
 * Fetches a tip for the current day, preferring cached data and falling back to the static list.
 *
 * @param {Date} [now=new Date()] - Reference date to resolve the current tip for; defaults to system time.
 * @returns {Promise<Tip>} Resolved tip ready for display and subsequent caching.
 */
export const fetchDailyTip = async (now: Date = new Date()): Promise<Tip> => {
  const today = now.toISOString().slice(0, 10);
  return pickTipForDate(today);
};

/**
 * Calculates the delay in milliseconds until the next midnight, used to schedule a refresh.
 *
 * @param {Date} [now=new Date()] - Reference point for calculating the remaining time until midnight.
 * @returns {number} Milliseconds between the provided time and the next midnight boundary.
 */
export const getNextRefreshDelay = (now: Date = new Date()): number => {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(midnight.getTime() - now.getTime(), 0);
};

/**
 * Schedules the provided refresh callback to run at the next midnight, clearing any previous timer.
 *
 * @param {() => Promise<unknown> | unknown} refresh - Callback invoked when the timer elapses; errors are logged.
 * @param {Date} [now=new Date()] - Optional reference date used to compute the delay until midnight.
 * @returns {ReturnType<typeof setTimeout>} Timeout handle that can be cleared to cancel the scheduled refresh.
 */
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

/**
 * Clears the scheduled daily tip refresh timer when present.
 */
export const clearScheduledDailyTipRefresh = () => {
  if (scheduledRefreshHandle) {
    clearTimeout(scheduledRefreshHandle);
    scheduledRefreshHandle = null;
  }
};

/**
 * Returns the currently scheduled refresh timeout handle if one exists.
 *
 * @returns {ReturnType<typeof setTimeout> | null} The active timeout reference or null when none is scheduled.
 */
export const getScheduledDailyTipRefreshHandle = () => scheduledRefreshHandle;
