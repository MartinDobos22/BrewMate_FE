import auth from '@react-native-firebase/auth';

import { API_URL } from './api';

export interface TopRecipeStat {
  id: string;
  name: string;
  brewCount: number;
}

export interface TastingNoteStat {
  note: string;
  occurrences: number;
}

export interface HomeStatistics {
  monthlyBrewCount: number;
  topRecipe: TopRecipeStat | null;
  topTastingNotes: TastingNoteStat[];
  scanCount: number;
  recipeGenerationCount: number;
}

const DEFAULT_STATS: HomeStatistics = {
  monthlyBrewCount: 0,
  topRecipe: null,
  topTastingNotes: [],
  scanCount: 0,
  recipeGenerationCount: 0,
};

/**
 * Ensures the current user is authenticated and returns their bearer token.
 *
 * @returns {Promise<string>} Firebase ID token for the signed-in user.
 * @throws {Error} Throws when the user is not authenticated or token retrieval fails.
 */
const ensureAuthenticated = async (): Promise<string> => {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Používateľ nie je prihlásený.');
  }

  const token = await user.getIdToken();
  if (!token) {
    throw new Error('Používateľ nie je prihlásený.');
  }

  return token;
};

/**
 * Coerces an unknown value to a finite number, falling back to a default when parsing fails.
 *
 * @param {unknown} value - Raw value received from the API payload.
 * @param {number} [fallback=0] - Value returned when parsing fails or input is invalid.
 * @returns {number} Parsed numeric value or the fallback.
 */
const coerceNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

/**
 * Normalizes raw top recipe payloads into the strongly typed `TopRecipeStat` structure.
 *
 * @param {unknown} raw - Arbitrary object returned by the API representing the top recipe.
 * @returns {TopRecipeStat | null} Sanitized recipe data or null when required fields are missing.
 */
const sanitizeTopRecipe = (raw: unknown): TopRecipeStat | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;

  const idSource = value.id ?? value.recipeId ?? value.recipe_id;
  const id =
    typeof idSource === 'string'
      ? idSource
      : typeof idSource === 'number'
      ? idSource.toString()
      : null;

  if (!id) {
    return null;
  }

  const nameSource = value.name ?? value.recipe ?? value.title;
  const name =
    typeof nameSource === 'string' && nameSource.trim().length > 0
      ? nameSource.trim()
      : 'Neznámy recept';

  const brewCount = Math.max(0, Math.round(coerceNumber(value.brewCount, 0)));

  return {
    id,
    name,
    brewCount,
  };
};

/**
 * Normalizes raw tasting note stats into the expected format while discarding invalid entries.
 *
 * @param {unknown} raw - Array-like payload representing tasting note statistics.
 * @returns {TastingNoteStat[]} Cleaned list of tasting notes with occurrence counts.
 */
const sanitizeTopTastingNotes = (raw: unknown): TastingNoteStat[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (item && typeof item === 'object') {
        const noteSource =
          (item as Record<string, unknown>).note ??
          (item as Record<string, unknown>).name ??
          (item as Record<string, unknown>).label;
        const note =
          typeof noteSource === 'string' && noteSource.trim().length > 0
            ? noteSource.trim()
            : null;

        if (!note) {
          return null;
        }

        const occurrences = Math.max(
          1,
          Math.round(coerceNumber((item as Record<string, unknown>).occurrences, 1)),
        );

        return { note, occurrences };
      }

      if (typeof item === 'string' && item.trim().length > 0) {
        return { note: item.trim(), occurrences: 1 };
      }

      return null;
    })
    .filter((value): value is TastingNoteStat => Boolean(value));
};

/**
 * Fetches aggregated statistics for the home dashboard including brews, scans, and tasting insights.
 *
 * @returns {Promise<HomeStatistics>} Normalized statistics ready for rendering in the home screen UI.
 * @throws {Error} Propagates network or parsing errors when the request fails.
 */
export const fetchHomeStatistics = async (): Promise<HomeStatistics> => {
  const token = await ensureAuthenticated();

  try {
    const response = await fetch(`${API_URL}/home-stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const message = `Home stats request failed (${response.status})`;
      throw new Error(message);
    }

    const payload = await response.json();

    return {
      monthlyBrewCount: Math.round(coerceNumber(payload?.monthlyBrewCount, 0)),
      topRecipe: sanitizeTopRecipe(payload?.topRecipe),
      topTastingNotes: sanitizeTopTastingNotes(payload?.topTastingNotes),
      scanCount: Math.round(coerceNumber(payload?.scanCount, 0)),
      recipeGenerationCount: Math.round(coerceNumber(payload?.recipeGenerationCount, 0)),
    };
  } catch (error) {
    console.warn('homeStatisticsService: nepodarilo sa načítať štatistiky', error);
    throw error instanceof Error
      ? error
      : new Error('Nepodarilo sa načítať štatistiky');
  }
};

/**
 * Provides an empty statistics object used for initial or fallback rendering states.
 *
 * @returns {HomeStatistics} Default statistics with zeroed metrics.
 */
export const getEmptyStatistics = (): HomeStatistics => ({ ...DEFAULT_STATS });
