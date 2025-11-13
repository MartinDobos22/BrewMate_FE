import auth from '@react-native-firebase/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseClient } from './supabaseClient';

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

interface BrewHistoryRow {
  id: number | string;
  recipe_id: string | null;
  flavor_notes: unknown;
  beans: unknown;
  created_at: string;
}

interface ComputedStatisticsContext {
  client: SupabaseClient;
  userId: string;
  brews: BrewHistoryRow[];
}

const DEFAULT_STATS: HomeStatistics = {
  monthlyBrewCount: 0,
  topRecipe: null,
  topTastingNotes: [],
};

const ensureSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    throw new Error('Supabase klient nie je nakonfigurovaný.');
  }
  return supabaseClient;
};

const resolveActiveUserId = (): string => {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Používateľ nie je prihlásený.');
  }
  return user.uid;
};

const loadRecentBrews = async (
  client: SupabaseClient,
  userId: string,
): Promise<BrewHistoryRow[]> => {
  const since = new Date();
  since.setMonth(since.getMonth() - 1);

  const { data, error } = await client
    .from('brew_history')
    .select('id, recipe_id, flavor_notes, beans, created_at')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Načítanie histórie príprav zlyhalo: ${error.message}`);
  }

  return (data as BrewHistoryRow[] | null) ?? [];
};

const normalizeNoteName = (raw: unknown): string | null => {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (raw && typeof raw === 'object') {
    const candidate =
      (raw as Record<string, unknown>).note ??
      (raw as Record<string, unknown>).name ??
      (raw as Record<string, unknown>).label;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
};

const incrementMap = (map: Map<string, number>, key: string, amount: number = 1) => {
  const current = map.get(key) ?? 0;
  map.set(key, current + amount);
};

const deriveRecipeDisplayName = (row: Record<string, unknown>): string => {
  const recipe = typeof row.recipe === 'string' ? row.recipe.trim() : '';
  if (recipe.length > 0) {
    return recipe.split('\n')[0].trim();
  }

  const taste = typeof row.taste === 'string' ? row.taste.trim() : '';
  if (taste.length > 0) {
    return taste;
  }

  const method = typeof row.method === 'string' ? row.method.trim() : '';
  if (method.length > 0) {
    return method;
  }

  return 'Vlastný recept';
};

const resolveRecipeNames = async (
  client: SupabaseClient,
  recipeIds: string[],
): Promise<Map<string, string>> => {
  if (recipeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('brew_recipes')
    .select('id, recipe, taste, method')
    .in('id', recipeIds);

  if (error) {
    console.warn('homeStatisticsService: načítanie receptov zlyhalo', error);
    return new Map();
  }

  const entries = Array.isArray(data) ? data : [];
  return entries.reduce<Map<string, string>>((acc, row) => {
    const id = typeof row.id === 'string' ? row.id : null;
    if (!id) {
      return acc;
    }

    acc.set(id, deriveRecipeDisplayName(row as Record<string, unknown>));
    return acc;
  }, new Map());
};

const buildStatisticsContext = async (): Promise<ComputedStatisticsContext> => {
  const client = ensureSupabaseClient();
  const userId = resolveActiveUserId();
  const brews = await loadRecentBrews(client, userId);

  return { client, userId, brews };
};

const pickTopRecipe = async (
  context: ComputedStatisticsContext,
): Promise<TopRecipeStat | null> => {
  const usage = new Map<
    string,
    { count: number; recipeId: string | null; fallbackName: string | null }
  >();
  const recipeIds = new Set<string>();

  context.brews.forEach((brew) => {
    const recipeId = typeof brew.recipe_id === 'string' ? brew.recipe_id : null;
    if (recipeId) {
      recipeIds.add(recipeId);
    }

    let fallbackName: string | null = null;
    if (brew.beans && typeof brew.beans === 'object') {
      const beanInfo = brew.beans as Record<string, unknown>;
      const candidate =
        (typeof beanInfo.name === 'string' && beanInfo.name) ||
        (typeof beanInfo.label === 'string' && beanInfo.label) ||
        (typeof beanInfo.title === 'string' && beanInfo.title) ||
        null;
      fallbackName = candidate ? candidate.trim() : null;
    }

    const key = recipeId ?? (fallbackName ? `beans:${fallbackName}` : null);
    if (!key) {
      return;
    }

    const current = usage.get(key) ?? {
      count: 0,
      recipeId,
      fallbackName,
    };

    current.count += 1;
    current.recipeId = recipeId ?? current.recipeId;
    current.fallbackName = fallbackName ?? current.fallbackName;
    usage.set(key, current);
  });

  if (usage.size === 0) {
    return null;
  }

  let bestKey: string | null = null;
  let best = 0;
  usage.forEach((value, key) => {
    if (value.count > best) {
      best = value.count;
      bestKey = key;
    }
  });

  if (!bestKey) {
    return null;
  }

  const selected = usage.get(bestKey);
  if (!selected) {
    return null;
  }

  let name = selected.fallbackName ?? null;

  if (selected.recipeId) {
    const names = await resolveRecipeNames(context.client, Array.from(recipeIds));
    name = names.get(selected.recipeId) ?? name;
  }

  return {
    id: selected.recipeId ?? bestKey,
    name: name ?? 'Neznámy recept',
    brewCount: selected.count,
  };
};

const pickTopTastingNotes = (context: ComputedStatisticsContext): TastingNoteStat[] => {
  const noteTotals = new Map<string, number>();

  context.brews.forEach((brew) => {
    const notes = brew.flavor_notes;

    if (Array.isArray(notes)) {
      notes.forEach((item) => {
        const name = normalizeNoteName(item);
        if (name) {
          const weight =
            typeof item === 'object' && item !== null
              ? typeof (item as Record<string, unknown>).count === 'number'
                ? ((item as Record<string, unknown>).count as number)
                : typeof (item as Record<string, unknown>).value === 'number'
                ? ((item as Record<string, unknown>).value as number)
                : 1
              : 1;
          incrementMap(noteTotals, name, weight);
        }
      });
      return;
    }

    if (notes && typeof notes === 'object') {
      Object.entries(notes as Record<string, unknown>).forEach(([key, value]) => {
        const name = normalizeNoteName(key);
        if (!name) {
          return;
        }

        const weight = typeof value === 'number' ? value : 1;
        incrementMap(noteTotals, name, weight);
      });
      return;
    }

    if (typeof notes === 'string' && notes.trim().length > 0) {
      notes.split(/[;,]/).forEach((chunk) => {
        const name = normalizeNoteName(chunk);
        if (name) {
          incrementMap(noteTotals, name);
        }
      });
    }
  });

  return Array.from(noteTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([note, total]) => ({
      note,
      occurrences: Math.max(1, Math.round(total)),
    }));
};

export const getMonthlyBrewCount = async (): Promise<number> => {
  const context = await buildStatisticsContext();
  return context.brews.length;
};

export const getTopRecipe = async (): Promise<TopRecipeStat | null> => {
  const context = await buildStatisticsContext();
  return pickTopRecipe(context);
};

export const getTopTastingNotes = async (): Promise<TastingNoteStat[]> => {
  const context = await buildStatisticsContext();
  return pickTopTastingNotes(context);
};

export const fetchHomeStatistics = async (): Promise<HomeStatistics> => {
  try {
    const context = await buildStatisticsContext();
    const topRecipe = await pickTopRecipe(context);
    const topNotes = pickTopTastingNotes(context);

    return {
      monthlyBrewCount: context.brews.length,
      topRecipe,
      topTastingNotes: topNotes,
    };
  } catch (error) {
    console.warn('homeStatisticsService: nepodarilo sa načítať štatistiky', error);
    throw error instanceof Error ? error : new Error('Nepodarilo sa načítať štatistiky');
  }
};

export const getEmptyStatistics = (): HomeStatistics => ({ ...DEFAULT_STATS });

