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

/**
 * Uloží nový scan do lokálneho úložiska.
 */
export const addRecentScan = async (scan: RecentScan): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const scans: RecentScan[] = raw ? JSON.parse(raw) : [];
    const updated = [scan, ...scans.filter(s => s.id !== scan.id)].slice(0, 20);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to store recent scan', err);
  }
};

/**
 * Načíta posledné skeny. Najprv sa pokúsi načítať z cache,
 * následne osvieži dáta z API. Pri offline stave vráti len cache.
 */
export const fetchRecentScans = async (limit: number): Promise<RecentScan[]> => {
  try {
    const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
    let cached: RecentScan[] = cachedRaw ? JSON.parse(cachedRaw) : [];

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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      cached = data;
    }

    return cached.slice(0, limit);
  } catch (err) {
    console.error('Failed to fetch recent scans', err);
    const fallback = await AsyncStorage.getItem(STORAGE_KEY);
    return fallback ? JSON.parse(fallback).slice(0, limit) : [];
  }
};

export default { fetchRecentScans, addRecentScan };
