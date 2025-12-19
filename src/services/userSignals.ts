import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchUserSignalAggregates,
  upsertUserSignalEvent,
  UserSignalAggregate,
  UserSignalEventPayload,
  UserSignalEventType,
} from './api/userSignalsApi';

export type QuickFeedback = 'perfect' | 'ok' | 'neutral' | 'bad';

export interface CoffeeSignalRecord {
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
  lastSyncedAt?: string | null;
}

export interface SignalUpdateResult {
  record: CoffeeSignalRecord;
  synced: boolean;
  error?: string;
}

type PendingSignalEvent = UserSignalEventPayload & { id: string };

const STORAGE_KEY = 'brewmate:implicit_signals';
const QUEUE_KEY = 'brewmate:implicit_signals_queue';
const LAST_REFRESH_KEY = 'brewmate:implicit_signals_last_refresh';

const defaultRecord = (id: string, name: string): CoffeeSignalRecord => ({
  id,
  name,
  scans: 0,
  repeats: 0,
  favorites: 0,
  ignores: 0,
  consumed: 0,
  lastSeen: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 0,
  lastSyncedAt: null,
});

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('userSignals: failed to parse storage payload', error);
    return null;
  }
};

const readSignals = async (): Promise<Record<string, CoffeeSignalRecord>> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParse<Record<string, CoffeeSignalRecord>>(raw) ?? {};
};

const readQueue = async (): Promise<PendingSignalEvent[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return safeParse<PendingSignalEvent[]>(raw) ?? [];
};

const writeSignals = async (signals: Record<string, CoffeeSignalRecord>): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  } catch (error) {
    console.warn('userSignals: failed to persist storage', error);
  }
};

const writeQueue = async (queue: PendingSignalEvent[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('userSignals: failed to persist signal queue', error);
  }
};

const retryWithBackoff = async <T,>(fn: () => Promise<T>, attempts = 2): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('Unknown retry error');
};

const mergeSignalRecord = (
  local: CoffeeSignalRecord | null,
  incoming: Partial<CoffeeSignalRecord>,
): CoffeeSignalRecord => {
  if (!local) {
    return {
      ...defaultRecord(incoming.id ?? 'unknown', incoming.name ?? 'Neznáma káva'),
      ...incoming,
    };
  }

  const resolvedIncoming: CoffeeSignalRecord = {
    ...local,
    ...incoming,
  };

  const incomingVersion = resolvedIncoming.version ?? 0;
  const localVersion = local.version ?? 0;
  if (incomingVersion !== localVersion) {
    return incomingVersion > localVersion ? resolvedIncoming : local;
  }

  const incomingUpdatedAt = resolvedIncoming.updatedAt ?? resolvedIncoming.lastSeen;
  const localUpdatedAt = local.updatedAt ?? local.lastSeen;

  if (!incomingUpdatedAt || !localUpdatedAt) {
    return resolvedIncoming;
  }

  return new Date(incomingUpdatedAt).getTime() >= new Date(localUpdatedAt).getTime()
    ? resolvedIncoming
    : local;
};

const applyEventToRecord = (
  record: CoffeeSignalRecord,
  event: UserSignalEventType,
  timestamp: string,
  options?: { isFavorite?: boolean; feedback?: QuickFeedback; feedbackReason?: string | null },
): CoffeeSignalRecord => {
  const version = (record.version ?? 0) + 1;
  switch (event) {
    case 'scan': {
      const scans = record.scans + 1;
      const repeats = scans > 1 ? record.repeats + 1 : record.repeats;
      return {
        ...record,
        scans,
        repeats,
        lastSeen: timestamp,
        updatedAt: timestamp,
        version,
      };
    }
    case 'ignore':
      return {
        ...record,
        ignores: record.ignores + 1,
        lastSeen: timestamp,
        updatedAt: timestamp,
        version,
      };
    case 'favorite':
      return {
        ...record,
        favorites: options?.isFavorite ? record.favorites + 1 : record.favorites,
        lastSeen: timestamp,
        updatedAt: timestamp,
        version,
      };
    case 'consumption':
      return {
        ...record,
        consumed: record.consumed + 1,
        lastSeen: timestamp,
        updatedAt: timestamp,
        version,
      };
    case 'feedback':
      return {
        ...record,
        lastFeedback: options?.feedback,
        lastFeedbackReason: options?.feedbackReason ?? null,
        lastSeen: timestamp,
        updatedAt: timestamp,
        version,
      };
    default:
      return record;
  }
};

const enqueueEvent = async (event: PendingSignalEvent): Promise<void> => {
  const queue = await readQueue();
  await writeQueue([...queue, event]);
};

const buildPendingEvent = (
  payload: Omit<UserSignalEventPayload, 'coffeeId' | 'coffeeName'> & {
    coffeeId: string;
    coffeeName: string;
  },
  version?: number,
): PendingSignalEvent => ({
  ...payload,
  coffeeId: payload.coffeeId,
  coffeeName: payload.coffeeName,
  id: `${payload.coffeeId}:${payload.timestamp}`,
  clientVersion: version,
});

const syncQueueForUser = async (userId: string): Promise<{ synced: number; failed: number }> => {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const signals = await readSignals();
  const remaining: PendingSignalEvent[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    const payload: UserSignalEventPayload = { ...item, userId };
    try {
      const aggregate = await retryWithBackoff(() => upsertUserSignalEvent(payload));
      if (aggregate) {
        const merged = mergeSignalRecord(signals[aggregate.id] ?? null, {
          ...aggregate,
          lastSyncedAt: new Date().toISOString(),
        });
        signals[aggregate.id] = merged;
        synced += 1;
      }
    } catch (error) {
      console.warn('userSignals: failed to sync queued event', error);
      remaining.push(item);
      failed += 1;
    }
  }

  await writeQueue(remaining);
  await writeSignals(signals);
  return { synced, failed };
};

const refreshSignalsFromServer = async (userId: string): Promise<void> => {
  const aggregates = await fetchUserSignalAggregates(userId);
  if (!aggregates.length) {
    return;
  }
  const signals = await readSignals();
  aggregates.forEach((aggregate: UserSignalAggregate) => {
    const merged = mergeSignalRecord(signals[aggregate.id] ?? null, {
      ...aggregate,
      lastSyncedAt: new Date().toISOString(),
    });
    signals[aggregate.id] = merged;
  });
  await writeSignals(signals);
  await AsyncStorage.setItem(LAST_REFRESH_KEY, new Date().toISOString());
};

const updateSignalRecord = async (
  userId: string | null,
  id: string,
  name: string,
  event: UserSignalEventType,
  options?: { isFavorite?: boolean; feedback?: QuickFeedback; feedbackReason?: string | null },
): Promise<SignalUpdateResult> => {
  const signals = await readSignals();
  const current = signals[id] ?? defaultRecord(id, name);
  const timestamp = new Date().toISOString();
  const optimistic = applyEventToRecord(current, event, timestamp, options);
  signals[id] = optimistic;
  await writeSignals(signals);

  if (!userId) {
    await enqueueEvent(
      buildPendingEvent(
        {
          userId: 'anonymous',
          coffeeId: id,
          coffeeName: name,
          event,
          timestamp,
          isFavorite: options?.isFavorite,
          feedback: options?.feedback,
          feedbackReason: options?.feedbackReason ?? null,
        },
        optimistic.version,
      ),
    );
    return {
      record: optimistic,
      synced: false,
      error: 'Missing authenticated user – queued for later sync.',
    };
  }

  const pendingEvent = buildPendingEvent(
    {
      userId,
      coffeeId: id,
      coffeeName: name,
      event,
      timestamp,
      isFavorite: options?.isFavorite,
      feedback: options?.feedback,
      feedbackReason: options?.feedbackReason ?? null,
    },
    optimistic.version,
  );

  try {
    const aggregate = await retryWithBackoff(() => upsertUserSignalEvent(pendingEvent));
    if (aggregate) {
      const merged = mergeSignalRecord(optimistic, {
        ...aggregate,
        lastSyncedAt: new Date().toISOString(),
      });
      signals[id] = merged;
      await writeSignals(signals);
      return { record: merged, synced: true };
    }
    return { record: optimistic, synced: true };
  } catch (error) {
    console.warn('userSignals: failed to sync immediately, queueing', error);
    await enqueueEvent(pendingEvent);
    return {
      record: optimistic,
      synced: false,
      error: error instanceof Error ? error.message : 'Failed to sync signal',
    };
  }
};

export const recordScanSignal = async (
  userId: string | null,
  id: string,
  name: string,
): Promise<SignalUpdateResult> => updateSignalRecord(userId, id, name, 'scan');

export const recordIgnoreSignal = async (
  userId: string | null,
  id: string,
  name: string,
): Promise<SignalUpdateResult> => updateSignalRecord(userId, id, name, 'ignore');

export const recordFavoriteSignal = async (
  userId: string | null,
  id: string,
  name: string,
  isFavorite: boolean,
): Promise<SignalUpdateResult> =>
  updateSignalRecord(userId, id, name, 'favorite', { isFavorite });

export const recordConsumptionSignal = async (
  userId: string | null,
  id: string,
  name: string,
): Promise<SignalUpdateResult> => updateSignalRecord(userId, id, name, 'consumption');

export const recordQuickFeedbackSignal = async (
  userId: string | null,
  id: string,
  name: string,
  feedback: QuickFeedback,
  reason?: string,
): Promise<SignalUpdateResult> =>
  updateSignalRecord(userId, id, name, 'feedback', {
    feedback,
    feedbackReason: reason ?? null,
  });

export const hydrateUserSignals = async (userId: string): Promise<void> => {
  await syncQueueForUser(userId);
  await refreshSignalsFromServer(userId);
};

export const loadCoffeeSignal = async (
  userId: string | null,
  id: string,
  name: string,
): Promise<CoffeeSignalRecord | null> => {
  const signals = await readSignals();
  if (signals[id]) {
    return signals[id];
  }

  if (userId) {
    try {
      await refreshSignalsFromServer(userId);
      const refreshed = await readSignals();
      if (refreshed[id]) {
        return refreshed[id];
      }
    } catch (error) {
      console.warn('userSignals: failed to refresh missing record', error);
    }
  }

  return defaultRecord(id, name);
};

export const computeSignalWeight = (record: CoffeeSignalRecord | null): number => {
  if (!record) {
    return 0;
  }
  const curiosity = Math.min(6, record.repeats * 1.5);
  const loyalty = Math.min(8, record.favorites * 2 + record.consumed * 1.5);
  const caution = Math.min(12, record.ignores * 2);
  const feedbackWeight =
    record.lastFeedback === 'perfect'
      ? 6
      : record.lastFeedback === 'ok'
        ? 3
        : record.lastFeedback === 'neutral'
          ? 0
          : record.lastFeedback === 'bad'
            ? -8
            : 0;

  return curiosity + loyalty + feedbackWeight - caution;
};
