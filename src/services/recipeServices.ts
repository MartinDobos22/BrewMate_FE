import auth from '@react-native-firebase/auth';
import { API_URL } from './api';
import { Recipe, BrewDevice } from '../types/Recipe';
import { coffeeOfflineManager, offlineSync } from '../offline';

const TOP_RECIPES_CACHE_KEY = 'recipes:top';
const RECIPE_HISTORY_CACHE_KEY = 'recipes:history';
const USER_RECIPES_CACHE_KEY = 'recipes:user';
const CACHE_TTL_DAYS = 24 * 7;
const SECONDARY_CACHE_PRIORITY = 5;

const isOfflineError = (error: unknown) => {
  if (!error) return false;
  const message = (error as Error)?.message?.toLowerCase?.() ?? '';
  return (
    message.includes('network request failed') ||
    message.includes('offline') ||
    message.includes('networkerror')
  );
};

const loggedFetch = async (url: string, options: RequestInit) => {
  console.log('📤 [FE->BE]', url, options);
  const res = await fetch(url, options);
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export interface RecipeHistory {
  id: string;
  method: string;
  taste: string;
  recipe: string;
  brewDevice?: BrewDevice;
  created_at: string;
}

export const saveRecipe = async (
  method: string,
  taste: string,
  recipe: string
): Promise<RecipeHistory | null> => {
  const payload = { method, taste, recipe };
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await loggedFetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, taste, recipe }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await offlineSync.enqueue('recipes:create', payload);
        const optimistic: RecipeHistory = {
          id: `offline-${Date.now()}`,
          method,
          taste,
          recipe,
          created_at: new Date().toISOString(),
        };
        return optimistic;
      }
      return null;
    }

    const data = await res.json();
    const saved: RecipeHistory = {
      id: data.id?.toString() ?? '',
      method,
      taste,
      recipe,
      created_at: new Date().toISOString(),
    };
    const cachedHistory = await coffeeOfflineManager.getItem<RecipeHistory[]>(
      RECIPE_HISTORY_CACHE_KEY,
    );
    await coffeeOfflineManager.setItem(
      RECIPE_HISTORY_CACHE_KEY,
      [saved, ...(cachedHistory ?? [])].slice(0, 50),
      CACHE_TTL_DAYS,
      SECONDARY_CACHE_PRIORITY,
    );
    return saved;
  } catch (error) {
    console.error('Error saving recipe:', error);
    if (isOfflineError(error)) {
      await offlineSync.enqueue('recipes:create', payload);
      const optimistic: RecipeHistory = {
        id: `offline-${Date.now()}`,
        method,
        taste,
        recipe,
        created_at: new Date().toISOString(),
      };
      return optimistic;
    }
    return null;
  }
};

export const fetchRecipeHistory = async (
  limit: number = 10
): Promise<RecipeHistory[]> => {
  const cached = await coffeeOfflineManager.getItem<RecipeHistory[]>(
    RECIPE_HISTORY_CACHE_KEY,
  );
  try {
    const token = await getAuthToken();
    if (!token) return [];

    const res = await loggedFetch(`${API_URL}/recipes/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn('Failed to fetch recipe history');
      return cached ?? [];
    }

    const data = (await res.json()) as RecipeHistory[];
    await coffeeOfflineManager.setItem(
      RECIPE_HISTORY_CACHE_KEY,
      data,
      CACHE_TTL_DAYS,
      SECONDARY_CACHE_PRIORITY,
    );
    return data;
  } catch (error) {
    console.error('Error fetching recipe history:', error);
    if (cached) {
      return cached;
    }
    return [];
  }
};

export const createRecipe = async (recipe: Recipe): Promise<Recipe | null> => {
  const payload = { ...recipe };
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await loggedFetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipe),
    });

    if (!res.ok) {
      if (res.status === 401) {
        await offlineSync.enqueue('recipes:create', payload);
        const optimistic = {
          ...recipe,
          id: recipe.id || `offline-${Date.now()}`,
        } as Recipe;
        return optimistic;
      }
      return null;
    }

    const data = await res.json();
    const created = { ...data, brewDevice: data.brewDevice as BrewDevice } as Recipe;
    const cachedUserRecipes = await coffeeOfflineManager.getItem<Recipe[]>(
      USER_RECIPES_CACHE_KEY,
    );
    await coffeeOfflineManager.setItem(
      USER_RECIPES_CACHE_KEY,
      [created, ...(cachedUserRecipes ?? [])].slice(0, 100),
      CACHE_TTL_DAYS,
      SECONDARY_CACHE_PRIORITY,
    );
    return created;
  } catch (error) {
    console.error('Error creating recipe:', error);
    if (isOfflineError(error)) {
      await offlineSync.enqueue('recipes:create', payload);
      const optimistic = {
        ...recipe,
        id: recipe.id || `offline-${Date.now()}`,
      } as Recipe;
      return optimistic;
    }
    return null;
  }
};

const mapRecipes = (arr: any[]): Recipe[] =>
  arr.map((r) => ({ ...r, brewDevice: r.brewDevice as BrewDevice }));

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const cached = await coffeeOfflineManager.getItem<Recipe[]>(TOP_RECIPES_CACHE_KEY);
  try {
    const res = await loggedFetch(`${API_URL}/recipes`, { method: 'GET' });
    if (!res.ok) return cached ?? [];
    const data = await res.json();
    const mapped = mapRecipes(data);
    await coffeeOfflineManager.setItem(
      TOP_RECIPES_CACHE_KEY,
      mapped.slice(0, 50),
      CACHE_TTL_DAYS,
      10,
    );
    return mapped;
  } catch (error) {
    console.error('Error fetching recipes:', error);
    if (cached) return cached;
    return [];
  }
};

export const fetchUserRecipes = async (): Promise<Recipe[]> => {
  const cached = await coffeeOfflineManager.getItem<Recipe[]>(USER_RECIPES_CACHE_KEY);
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const res = await loggedFetch(`${API_URL}/users/me/recipes`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return cached ?? [];
    const data = await res.json();
    const mapped = mapRecipes(data);
    await coffeeOfflineManager.setItem(
      USER_RECIPES_CACHE_KEY,
      mapped,
      CACHE_TTL_DAYS,
      SECONDARY_CACHE_PRIORITY,
    );
    return mapped;
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    if (cached) return cached;
    return [];
  }
};

