import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const STORAGE_KEY = 'brewmate:implicit_signals';

const defaultRecord = (id: string, name: string): CoffeeSignalRecord => ({
  id,
  name,
  scans: 0,
  repeats: 0,
  favorites: 0,
  ignores: 0,
  consumed: 0,
  lastSeen: new Date().toISOString(),
});

const readSignals = async (): Promise<Record<string, CoffeeSignalRecord>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, CoffeeSignalRecord>;
  } catch (error) {
    console.warn('userSignals: failed to read storage', error);
    return {};
  }
};

const writeSignals = async (signals: Record<string, CoffeeSignalRecord>): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  } catch (error) {
    console.warn('userSignals: failed to persist storage', error);
  }
};

const updateSignalRecord = async (
  id: string,
  name: string,
  updater: (record: CoffeeSignalRecord) => CoffeeSignalRecord,
): Promise<CoffeeSignalRecord> => {
  const signals = await readSignals();
  const current = signals[id] ?? defaultRecord(id, name);
  const updated = updater(current);
  signals[id] = updated;
  await writeSignals(signals);
  return updated;
};

export const recordScanSignal = async (id: string, name: string): Promise<CoffeeSignalRecord> =>
  updateSignalRecord(id, name, record => {
    const scans = record.scans + 1;
    const repeats = scans > 1 ? record.repeats + 1 : record.repeats;
    return {
      ...record,
      scans,
      repeats,
      lastSeen: new Date().toISOString(),
    };
  });

export const recordIgnoreSignal = async (id: string, name: string): Promise<CoffeeSignalRecord> =>
  updateSignalRecord(id, name, record => ({
    ...record,
    ignores: record.ignores + 1,
    lastSeen: new Date().toISOString(),
  }));

export const recordFavoriteSignal = async (
  id: string,
  name: string,
  isFavorite: boolean,
): Promise<CoffeeSignalRecord> =>
  updateSignalRecord(id, name, record => ({
    ...record,
    favorites: isFavorite ? record.favorites + 1 : record.favorites,
    lastSeen: new Date().toISOString(),
  }));

export const recordConsumptionSignal = async (id: string, name: string): Promise<CoffeeSignalRecord> =>
  updateSignalRecord(id, name, record => ({
    ...record,
    consumed: record.consumed + 1,
    lastSeen: new Date().toISOString(),
  }));

export const recordQuickFeedbackSignal = async (
  id: string,
  name: string,
  feedback: QuickFeedback,
  reason?: string,
): Promise<CoffeeSignalRecord> =>
  updateSignalRecord(id, name, record => ({
    ...record,
    lastFeedback: feedback,
    lastFeedbackReason: reason ?? null,
    lastSeen: new Date().toISOString(),
  }));

export const loadCoffeeSignal = async (
  id: string,
  name: string,
): Promise<CoffeeSignalRecord | null> => {
  const signals = await readSignals();
  if (signals[id]) {
    return signals[id];
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

