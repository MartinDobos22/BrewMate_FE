import auth from '@react-native-firebase/auth';

const API_URL = 'http://10.0.2.2:3001/api';

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
  created_at: string;
}

export const saveRecipe = async (
  method: string,
  taste: string,
  recipe: string
): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    const res = await loggedFetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, taste, recipe }),
    });

    return res.ok;
  } catch (error) {
    console.error('Error saving recipe:', error);
    return false;
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

