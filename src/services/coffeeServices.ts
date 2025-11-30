import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import auth from '@react-native-firebase/auth';
import { API_URL } from './api';

export interface RecentScan {
  id: string;
  name: string;
  imageUrl?: string;
}

const STORAGE_KEY = 'recentScans';
const MAX_RECENT_SCANS = 20;
const MAX_IMAGE_URL_LENGTH = 1000;

/**
 * Normalizes loose scan payloads coming from network or storage into a consistent shape.
 *
 * Converts mixed id/name/image fields while dropping oversized data URIs to prevent
 * AsyncStorage cursor errors.
 *
 * @param {RecentScan | Record<string, any>} scan - Partial scan object from API or local cache that may use varying keys.
 * @returns {RecentScan} A sanitized scan object with guaranteed `id`, `name`, and optional `imageUrl` fields.
 */
const sanitizeRecentScan = (scan: RecentScan | Record<string, any>): RecentScan => {
  const idSource =
    (typeof scan.id === 'string' && scan.id) ||
    (typeof scan.id === 'number' && scan.id.toString()) ||
    (typeof (scan as any).scanId === 'string' && (scan as any).scanId) ||
    (typeof (scan as any).scan_id === 'string' && (scan as any).scan_id);

  const nameSource =
    (typeof scan.name === 'string' && scan.name.trim()) ||
    (typeof (scan as any).coffee_name === 'string' && (scan as any).coffee_name.trim()) ||
    (typeof (scan as any).coffeeName === 'string' && (scan as any).coffeeName.trim()) ||
    'Neznáma káva';

  const rawImage =
    (typeof scan.imageUrl === 'string' && scan.imageUrl) ||
    (typeof (scan as any).image_url === 'string' && (scan as any).image_url) ||
    (typeof (scan as any).image === 'string' && (scan as any).image);

  const sanitizedImage =
    rawImage &&
    rawImage.length <= MAX_IMAGE_URL_LENGTH &&
    !rawImage.startsWith('data:')
      ? rawImage
      : undefined;

  return {
    id: idSource || Date.now().toString(),
    name: nameSource,
    imageUrl: sanitizedImage,
  };
};

/**
 * Stores a new recent scan entry, deduplicating by id and trimming the list size.
 *
 * @param {RecentScan} scan - Scan metadata to persist including id, name, and optional image URL.
 * @returns {Promise<void>} Promise resolving when the updated list is written to AsyncStorage.
 */
export const addRecentScan = async (scan: RecentScan): Promise<void> => {
  try {
    const scans = await readCachedScans();
    const sanitized = sanitizeRecentScan(scan);
    const updated = [
      sanitized,
      ...scans.filter((s) => s.id !== sanitized.id),
    ].slice(0, MAX_RECENT_SCANS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store recent scan', err);
  }
};

const ROW_TOO_BIG_MESSAGE = 'Row too big to fit into CursorWindow';

/**
 * Reads and normalizes cached scans from AsyncStorage, clearing corrupted entries.
 *
 * @returns {Promise<RecentScan[]>} Array of sanitized scans; empty when no cache is present.
 * @throws {Error} Re-throws unexpected storage errors except for oversized row issues which are handled gracefully.
 */
const readCachedScans = async (): Promise<RecentScan[]> => {
  try {
    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!cachedRaw) {
      return [];
    }

    const parsed = JSON.parse(cachedRaw);
    return Array.isArray(parsed)
      ? parsed.map((item) => sanitizeRecentScan(item))
      : [];
  } catch (error: any) {
    if (
      typeof error?.message === 'string' &&
      error.message.includes(ROW_TOO_BIG_MESSAGE)
    ) {
      console.warn(
        'Cached recent scans exceeded storage limits, clearing corrupted entry'
      );
      await AsyncStorage.removeItem(STORAGE_KEY);
      return [];
    }

    throw error;
  }
};

/**
 * Fetches the most recent coffee scans with offline and caching support.
 *
 * Attempts to return cached results immediately, then refreshes from the API when
 * online and authenticated. Falls back to cached data on network errors.
 *
 * @param {number} limit - Maximum number of scans to return to the caller.
 * @returns {Promise<RecentScan[]>} Promise resolving to recent scans limited by the requested size.
 */
export const fetchRecentScans = async (limit: number): Promise<RecentScan[]> => {
  try {
    let cached = await readCachedScans();

    // Ak je zariadenie offline, vráť len cache
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return cached.slice(0, limit);
    }

    const user = auth().currentUser;
    const token = await user?.getIdToken();
    if (!token) {
      return cached.slice(0, limit);
    }

    const res = await fetch(`${API_URL}/coffees/recent?limit=${limit}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const normalized: RecentScan[] = Array.isArray(data)
        ? data.map((item) => sanitizeRecentScan(item)).slice(0, MAX_RECENT_SCANS)
        : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      cached = normalized;
    }

    return cached.slice(0, limit);
  } catch (err) {
    console.error('Failed to fetch recent scans', err);
    return (await readCachedScans()).slice(0, limit);
  }
};

export default { fetchRecentScans, addRecentScan };
