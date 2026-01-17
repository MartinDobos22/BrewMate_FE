import NetInfo from '@react-native-community/netinfo';
import auth from '@react-native-firebase/auth';
import { API_URL } from './api';

export interface RecentScan {
  id: string;
  name: string;
  imageUrl?: string;
}

const MAX_RECENT_SCANS = 20;
const MAX_IMAGE_URL_LENGTH = 1000;
const MAX_IMAGE_DATA_URI_LENGTH = 8000;

/**
 * Normalizes loose scan payloads coming from network or storage into a consistent shape.
 *
 * Converts mixed id/name/image fields while dropping oversized data URIs to prevent
 * memory bloat from large data payloads.
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

  const sanitizedImage = (() => {
    if (typeof rawImage !== 'string') {
      return undefined;
    }

    const trimmed = rawImage.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith('data:')) {
      return trimmed.length <= MAX_IMAGE_DATA_URI_LENGTH ? trimmed : undefined;
    }

    return trimmed.length <= MAX_IMAGE_URL_LENGTH ? trimmed : undefined;
  })();

  return {
    id: idSource || Date.now().toString(),
    name: nameSource,
    imageUrl: sanitizedImage,
  };
};

/**
 * Stubbed out recent scan storage to avoid persisting scan cache locally.
 *
 * @param {RecentScan} scan - Scan metadata to persist including id, name, and optional image URL.
 * @returns {Promise<void>} Promise resolving immediately without storage.
 */
export const addRecentScan = async (_scan: RecentScan): Promise<void> => {};

/**
 * Fetches the most recent coffee scans with offline-aware behavior.
 *
 * @param {number} limit - Maximum number of scans to return to the caller.
 * @returns {Promise<RecentScan[]>} Promise resolving to recent scans limited by the requested size.
 */
export const fetchRecentScans = async (limit: number): Promise<RecentScan[]> => {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return [];
    }

    const user = auth().currentUser;
    const token = await user?.getIdToken();
    if (!token) {
      return [];
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
      return normalized.slice(0, limit);
    }

    return [];
  } catch (err) {
    console.error('Failed to fetch recent scans', err);
    return [];
  }
};

export default { fetchRecentScans, addRecentScan };
