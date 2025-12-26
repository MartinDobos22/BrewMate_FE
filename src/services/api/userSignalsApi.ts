import auth from '@react-native-firebase/auth';

import { API_URL } from '../api';
import type { QuickFeedback } from '../userSignals';

export type UserSignalEventType = 'scan' | 'ignore' | 'favorite' | 'consumption' | 'feedback';

export interface UserSignalEventPayload {
  userId: string;
  coffeeId: string;
  coffeeName: string;
  event: UserSignalEventType;
  timestamp: string;
  isFavorite?: boolean;
  feedback?: QuickFeedback;
  feedbackReason?: string | null;
  clientVersion?: number;
}

export interface UserSignalAggregate {
  id: string;
  name: string;
  scans: number;
  repeats: number;
  favorites: number;
  ignores: number;
  consumed: number;
  lastFeedback?: QuickFeedback;
  lastFeedbackReason?: string | null;
  lastSeen: string;
  updatedAt?: string;
  version?: number;
}

const getAuthToken = async (): Promise<string | null> => {
  const user = auth().currentUser;
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken();
  } catch (error) {
    console.warn('userSignalsApi: failed to fetch auth token', error);
    return null;
  }
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const sanitizeAggregate = (raw: any): UserSignalAggregate | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : null;
  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : typeof raw.coffeeName === 'string' && raw.coffeeName.trim().length > 0
        ? raw.coffeeName.trim()
        : null;

  if (!id || !name) {
    return null;
  }

  const lastFeedback =
    raw.lastFeedback === 'perfect' ||
    raw.lastFeedback === 'ok' ||
    raw.lastFeedback === 'neutral' ||
    raw.lastFeedback === 'bad'
      ? raw.lastFeedback
      : undefined;

  const lastFeedbackReason =
    typeof raw.lastFeedbackReason === 'string' ? raw.lastFeedbackReason : null;

  const lastSeen =
    typeof raw.lastSeen === 'string' && raw.lastSeen.trim().length > 0
      ? raw.lastSeen
      : new Date().toISOString();

  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim().length > 0
      ? raw.updatedAt
      : undefined;

  return {
    id,
    name,
    scans: Math.max(0, Math.round(toNumber(raw.scans, 0))),
    repeats: Math.max(0, Math.round(toNumber(raw.repeats, 0))),
    favorites: Math.max(0, Math.round(toNumber(raw.favorites, 0))),
    ignores: Math.max(0, Math.round(toNumber(raw.ignores, 0))),
    consumed: Math.max(0, Math.round(toNumber(raw.consumed, 0))),
    lastFeedback,
    lastFeedbackReason,
    lastSeen,
    updatedAt,
    version: Math.max(0, Math.round(toNumber(raw.version, 0))),
  };
};

export const fetchUserSignalAggregates = async (
  userId: string,
): Promise<UserSignalAggregate[]> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(`${API_URL}/user-signals/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.warn('userSignalsApi: user signals not found, skipping hydration');
      return [];
    }
    throw new Error(`Failed to load user signals (${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map(item => sanitizeAggregate(item))
    .filter((item): item is UserSignalAggregate => Boolean(item));
};

export const upsertUserSignalEvent = async (
  payload: UserSignalEventPayload,
): Promise<UserSignalAggregate | null> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('User is not authenticated');
  }

  const response = await fetch(`${API_URL}/user-signals/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to upsert user signal (${response.status})`);
  }

  const aggregate = await response.json();
  return sanitizeAggregate(aggregate);
};
