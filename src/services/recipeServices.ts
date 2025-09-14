import auth from '@react-native-firebase/auth';
import { API_URL } from './api';
import { Recipe, BrewDevice } from '../types/Recipe';

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

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.id?.toString() ?? '',
      method,
      taste,
      recipe,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return null;
  }
};

export const fetchRecipeHistory = async (
  limit: number = 10
): Promise<RecipeHistory[]> => {
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
      return [];
    }

    const data = await res.json();
    return data as RecipeHistory[];
  } catch (error) {
    console.error('Error fetching recipe history:', error);
    return [];
  }
};

export const createRecipe = async (recipe: Recipe): Promise<Recipe | null> => {
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

    if (!res.ok) return null;

    const data = await res.json();
    return { ...data, brewDevice: data.brewDevice as BrewDevice } as Recipe;
  } catch (error) {
    console.error('Error creating recipe:', error);
    return null;
  }
};

const mapRecipes = (arr: any[]): Recipe[] =>
  arr.map((r) => ({ ...r, brewDevice: r.brewDevice as BrewDevice }));

export const fetchRecipes = async (): Promise<Recipe[]> => {
  try {
    const res = await loggedFetch(`${API_URL}/recipes`, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return mapRecipes(data);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }
};

export const fetchUserRecipes = async (): Promise<Recipe[]> => {
  try {
    const token = await getAuthToken();
    if (!token) return [];
    const res = await loggedFetch(`${API_URL}/users/me/recipes`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return mapRecipes(data);
  } catch (error) {
    console.error('Error fetching user recipes:', error);
    return [];
  }
};

