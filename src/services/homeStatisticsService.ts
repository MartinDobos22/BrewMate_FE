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
}

const DEFAULT_STATS: HomeStatistics = {
  monthlyBrewCount: 0,
  topRecipe: null,
  topTastingNotes: [],
};

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
    };
  } catch (error) {
    console.warn('homeStatisticsService: nepodarilo sa načítať štatistiky', error);
    throw error instanceof Error
      ? error
      : new Error('Nepodarilo sa načítať štatistiky');
  }
};

export const getEmptyStatistics = (): HomeStatistics => ({ ...DEFAULT_STATS });
