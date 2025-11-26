import AsyncStorage from '@react-native-async-storage/async-storage';
import { badges, Badge } from '../data/badges';
import { scheduleLocalNotification } from './NotificationService';

const STORAGE_KEY = 'userProgress';

/**
 * Tracks progress toward BrewMate achievements and levels.
 */
export interface UserProgress {
  level: number;
  scan: number;
  recipes: Record<string, number>;
  badges: string[];
  lastBadge?: string;
}

const defaultProgress: UserProgress = {
  level: 1,
  scan: 0,
  recipes: {},
  badges: [],
};

/**
 * Loads persisted progress from storage or initializes defaults when absent.
 *
 * @returns Promise resolving to the most recent {@link UserProgress} snapshot.
 */
export async function getUserProgress(): Promise<UserProgress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    return JSON.parse(raw);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProgress));
  return { ...defaultProgress };
}

/**
 * Persists the provided progress snapshot to AsyncStorage.
 *
 * @param progress - State object representing unlocked badges and counters.
 */
async function saveProgress(progress: UserProgress) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/**
 * Increments progress counters for scans or recipe completions and awards any
 * newly unlocked badges.
 *
 * @param eventType - Action type being recorded (scan or recipe).
 * @param brewDevice - Optional brew device identifier used to tally recipe
 *   usage per device.
 * @returns Promise resolving to an array of badges unlocked by this action.
 */
export async function incrementProgress(eventType: 'scan' | 'recipe', brewDevice?: string): Promise<Badge[]> {
  const progress = await getUserProgress();

  if (eventType === 'scan') {
    progress.scan += 1;
  } else if (eventType === 'recipe' && brewDevice) {
    progress.recipes[brewDevice] = (progress.recipes[brewDevice] || 0) + 1;
  }

  const totalEvents = progress.scan + Object.values(progress.recipes).reduce((a, b) => a + b, 0);
  progress.level = Math.min(10, Math.floor(totalEvents / 10) + 1);

  const newlyUnlocked: Badge[] = [];

  badges.forEach((badge) => {
    if (!progress.badges.includes(badge.id)) {
      if (badge.criteria.type === 'scan') {
        if (progress.scan >= badge.criteria.count) {
          if (badge.id === 'all_rounder') {
            const totalRecipes = Object.values(progress.recipes).reduce((a, b) => a + b, 0);
            if (totalRecipes >= 20) {
              progress.badges.push(badge.id);
              newlyUnlocked.push(badge);
            }
          } else {
            progress.badges.push(badge.id);
            newlyUnlocked.push(badge);
          }
        }
      } else if (badge.criteria.type === 'recipe') {
        const deviceCount = progress.recipes[badge.criteria.device || ''] || 0;
        if (deviceCount >= badge.criteria.count) {
          progress.badges.push(badge.id);
          newlyUnlocked.push(badge);
        }
      }
    }
  });

  if (newlyUnlocked.length > 0) {
    const first = newlyUnlocked[0];
    progress.lastBadge = first.id;
    await scheduleLocalNotification('Nový odznak', first.title);
  }

  await saveProgress(progress);
  return newlyUnlocked;
}

/**
 * Retrieves all badges the user has earned.
 *
 * @returns Promise resolving to badge metadata filtered by the user's stored
 *   progress.
 */
export async function getUnlockedBadges(): Promise<Badge[]> {
  const progress = await getUserProgress();
  return badges.filter((b) => progress.badges.includes(b.id));
}
