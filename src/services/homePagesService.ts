// services/homeService.ts
import auth from '@react-native-firebase/auth';
import { API_URL } from './api';
import { coffeeOfflineManager, offlineSync } from '../offline';
import type { Coffee } from '../types/Coffee';

/**
 * Wrapper okolo fetchu ktorý loguje požiadavky a odpovede medzi frontendom a backendom.
 */
const loggedFetch = async (url: string, options: RequestInit) => {
  console.log('📤 [FE->BE]', url, options);
  const res = await fetch(url, options);
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

interface UserStats {
  coffeeCount: number;
  avgRating: number;
  favoritesCount: number;
}

interface CoffeeData extends Coffee {
  timestamp?: Date;
  isRecommended?: boolean;
}

interface DashboardData {
  stats: UserStats;
  recentScans: CoffeeData[];
  recommendations: CoffeeData[];
  dailyTip: string;
}

const COFFEE_CACHE_KEY = 'coffees:favorites';
const SCAN_HISTORY_CACHE_KEY = 'scans:history';
const CACHE_TTL_HOURS = 24;

const normalizeCachedTimestamp = (item: CoffeeData): CoffeeData => ({
  ...item,
  timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
});

const isOfflineError = (error: unknown) => {
  const message = (error as Error)?.message?.toLowerCase?.() ?? '';
  return (
    message.includes('network request failed') ||
    message.includes('offline') ||
    message.includes('networkerror')
  );
};

/**
 * Získa autorizačný token
 */
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

/**
 * Načíta dáta pre dashboard
 */
export const fetchDashboardData = async (): Promise<DashboardData | null> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.warn('No auth token available');
      return null;
    }

    const response = await loggedFetch(`${API_URL}/dashboard`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Dashboard API returned error:', response.status);
      // Vráť základné dáta ak API zlyhá
      return {
        stats: getDefaultStats(),
        recentScans: [],
        recommendations: [],
        dailyTip: getDailyTip(),
      };
    }

    const data = await response.json();

    // Transformuj dáta do správneho formátu
    return {
      stats: {
        coffeeCount: data.stats?.coffeeCount || 0,
        avgRating: parseFloat(data.stats?.avgRating || 0),
        favoritesCount: data.stats?.favoritesCount || 0,
      },
      recentScans: data.recentScans?.map((item: any) => ({
        id: item.id,
        name: item.name,
        rating: item.rating,
        match: item.match,
        timestamp: new Date(item.timestamp),
        isRecommended: item.isRecommended,
      })) || [],
      recommendations: data.recommendations?.map((item: any) => ({
        id: item.id,
        name: item.name,
        rating: item.rating,
        match: item.match,
        timestamp: new Date(item.timestamp),
        isRecommended: item.isRecommended,
      })) || [],
      dailyTip: data.dailyTip || getDailyTip(),
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
};

/**
 * Načíta štatistiky používateľa
 */
export const fetchUserStats = async (): Promise<UserStats> => {
  try {
    const token = await getAuthToken();
    if (!token) return getDefaultStats();

      const response = await loggedFetch(`${API_URL}/user/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return getDefaultStats();
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return getDefaultStats();
  }
};

/**
 * Načíta odporúčania pre používateľa
 */
// export const fetchRecommendations = async (): Promise<CoffeeData[]> => {
//   try {
//     const token = await getAuthToken();
//     if (!token) return getMockRecommendations();
//
//     const response = await fetch(`${API_URL}/coffee/recommendations`, {
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json',
//       },
//     });
//
//     if (!response.ok) {
//       return getMockRecommendations();
//     }
//
//     const data = await response.json();
//     return data.map((item: any) => ({
//       ...item,
//       timestamp: new Date(item.timestamp),
//     }));
//   } catch (error) {
//     console.error('Error fetching recommendations:', error);
//     return getMockRecommendations();
//   }
// };

/**
 * Načíta všetky kávy z databázy
 */
export const fetchCoffees = async (): Promise<CoffeeData[]> => {
  const cached = await coffeeOfflineManager.getItem<CoffeeData[]>(COFFEE_CACHE_KEY);
  try {
    const token = await getAuthToken();
    if (!token) return [];

    const response = await loggedFetch(`${API_URL}/coffees`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return cached ?? [];
    }

    const data = await response.json();
    const mapped: CoffeeData[] = data.map((item: any) => {
      const flavorNotesRaw = item.flavor_notes ?? item.flavorNotes;
      const flavorNotes = Array.isArray(flavorNotesRaw)
        ? flavorNotesRaw
        : typeof flavorNotesRaw === 'string'
          ? flavorNotesRaw
              .split(',')
              .map((note: string) => note.trim())
              .filter((note: string) => note.length > 0)
          : undefined;

      const matchValue = item.match ?? item.match_score ?? item.match_percentage;
      const roastLevelValue =
        typeof item.roast_level === 'number'
          ? item.roast_level
          : typeof item.roastLevel === 'number'
            ? item.roastLevel
            : undefined;
      const intensityValue =
        typeof item.intensity === 'number'
          ? item.intensity
          : typeof item.intensity_level === 'number'
            ? item.intensity_level
            : undefined;

      const processValue =
        item.process ?? item.processing ?? item.process_method ?? item.processing_method;
      const varietyValue = item.variety ?? item.bean_variety ?? item.beanVariety;
      const brandValue = item.brand ?? item.roastery ?? item.roaster;
      const ratingValue =
        typeof item.rating === 'number'
          ? item.rating
          : typeof item.avg_rating === 'number'
            ? item.avg_rating
            : undefined;

      return {
        id: item.id?.toString() || '',
        name: item.name ?? item.coffee_name ?? 'Neznáma káva',
        brand: brandValue ?? undefined,
        origin: item.origin ?? item.country_of_origin ?? item.origin_country ?? undefined,
        roastLevel: roastLevelValue,
        intensity: intensityValue,
        flavorNotes,
        rating: ratingValue,
        match: typeof matchValue === 'number' ? matchValue : undefined,
        process: typeof processValue === 'string' ? processValue : undefined,
        variety: typeof varietyValue === 'string' ? varietyValue : undefined,
        isFavorite: Boolean(item.is_favorite ?? item.isFavorite ?? false),
      };
    });
    await coffeeOfflineManager.setItem(
      COFFEE_CACHE_KEY,
      mapped,
      CACHE_TTL_HOURS,
      8,
    );
    return mapped;
  } catch (error) {
    console.error('Error fetching coffees:', error);
    if (cached) {
      return cached;
    }
    return [];
  }
};

/**
 * Načíta históriu skenovaní
 */
export const fetchScanHistory = async (limit: number = 5): Promise<CoffeeData[]> => {
  const cached = await coffeeOfflineManager.getItem<CoffeeData[]>(SCAN_HISTORY_CACHE_KEY);
  try {
    const token = await getAuthToken();
    if (!token) return [];

      const response = await loggedFetch(`${API_URL}/ocr/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Scan history API returned error:', response.status);
      return (cached ?? []).map(normalizeCachedTimestamp);
    }

    const data = await response.json();
    const mapped = data.map((item: any) => ({
      id: item.id.toString(),
      name: item.coffee_name || 'Neznáma káva',
      rating: parseFloat(item.rating || 0),
      match: parseInt(item.match_percentage || 0),
      timestamp: new Date(item.created_at),
      isRecommended: item.is_recommended || false,
      brand: item.brand,
      origin: item.origin,
    }));
    await coffeeOfflineManager.setItem(
      SCAN_HISTORY_CACHE_KEY,
      mapped,
      CACHE_TTL_HOURS,
      6,
    );
    return mapped;
  } catch (error) {
    console.error('Error fetching scan history:', error);
    if (cached) {
      return cached.map(normalizeCachedTimestamp);
    }
    return [];
  }
};

/**
 * Získa denný tip
 */
export const getDailyTip = (): string => {
  const tips = [
    'Espresso Lungo - perfektné pre produktívne ráno',
    'Flat White - keď potrebuješ jemnú chuť s energiou',
    'V60 - pre objavovanie nových chutí',
    'Cold Brew - osvieženie na horúce dni',
    'Cappuccino - klasika ktorá nikdy nesklame',
    'Americano - pre tých čo majú radi jemnú kávu',
    'Macchiato - malé potešenie s veľkou chuťou',
  ];
  const today = new Date().getDay();
  return tips[today % tips.length];
};

// Helper funkcie pre predvolené dáta

/**
 * Vráti prázdne štatistiky používateľa ako predvolenú hodnotu.
 */
const getDefaultStats = (): UserStats => ({
  coffeeCount: 0,
  avgRating: 0,
  favoritesCount: 0,
});

/**
 * Uloží hodnotenie kávy
 */
export const saveCoffeeRating = async (
  coffeeId: string,
  rating: number,
  notes?: string
): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) return false;

      const response = await loggedFetch(`${API_URL}/coffee/rate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coffee_id: coffeeId,
        rating,
        notes,
      }),
    });

    if (response.ok) {
      return true;
    }
    if (response.status === 401) {
      await offlineSync.enqueue('coffee:rate', { coffeeId, rating, notes });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving coffee rating:', error);
    if (isOfflineError(error)) {
      await offlineSync.enqueue('coffee:rate', { coffeeId, rating, notes });
      return true;
    }
    return false;
  }
};

/**
 * Pridá kávu do obľúbených
 */
export const toggleFavorite = async (coffeeId: string): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    if (!token) return false;

      const response = await loggedFetch(`${API_URL}/coffee/favorite/${coffeeId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return true;
    }
    if (response.status === 401) {
      await offlineSync.enqueue('coffee:favorite', { coffeeId });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    if (isOfflineError(error)) {
      await offlineSync.enqueue('coffee:favorite', { coffeeId });
      return true;
    }
    return false;
  }
};