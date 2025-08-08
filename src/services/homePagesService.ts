// services/homeService.ts
import auth from '@react-native-firebase/auth';

const API_URL = 'http://10.0.2.2:3001/api';

interface UserStats {
  coffeeCount: number;
  avgRating: number;
  favoritesCount: number;
}

interface CoffeeData {
  id: string;
  name: string;
  rating: number;
  match: number;
  timestamp: Date;
  isRecommended: boolean;
  brand?: string;
  origin?: string;
  roastLevel?: string;
  notes?: string[];
}

interface DashboardData {
  stats: UserStats;
  recentScans: CoffeeData[];
  recommendations: CoffeeData[];
  dailyTip: string;
}

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

    const response = await fetch(`${API_URL}/dashboard`, {
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

    const response = await fetch(`${API_URL}/user/stats`, {
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
 * Načíta históriu skenovaní
 */
export const fetchScanHistory = async (limit: number = 5): Promise<CoffeeData[]> => {
  try {
    const token = await getAuthToken();
    if (!token) return [];

    const response = await fetch(`${API_URL}/ocr/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Scan history API returned error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.map((item: any) => ({
      id: item.id.toString(),
      name: item.coffee_name || 'Neznáma káva',
      rating: parseFloat(item.rating || 0),
      match: parseInt(item.match_percentage || 0),
      timestamp: new Date(item.created_at),
      isRecommended: item.is_recommended || false,
      brand: item.brand,
      origin: item.origin,
    }));
  } catch (error) {
    console.error('Error fetching scan history:', error);
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

    const response = await fetch(`${API_URL}/coffee/rate`, {
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

    return response.ok;
  } catch (error) {
    console.error('Error saving coffee rating:', error);
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

    const response = await fetch(`${API_URL}/coffee/favorite/${coffeeId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};