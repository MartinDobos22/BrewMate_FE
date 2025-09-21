import type { GamificationOverview } from '../../types/gamification';

export interface GamificationStoreState {
  overview: GamificationOverview | null;
  isLoading: boolean;
  lastFetchedAt: string | null;
  error: string | null;
}

const DEFAULT_STATE: GamificationStoreState = {
  overview: null,
  isLoading: false,
  lastFetchedAt: null,
  error: null,
};

export type GamificationStoreListener = (state: GamificationStoreState) => void;

export interface GamificationStore {
  getState(): GamificationStoreState;
  setState(patch: Partial<GamificationStoreState>): void;
  subscribe(listener: GamificationStoreListener): () => void;
  reset(): void;
}

export const createGamificationStore = (
  initialState: Partial<GamificationStoreState> = {},
): GamificationStore => {
  let state: GamificationStoreState = { ...DEFAULT_STATE, ...initialState };
  const listeners = new Set<GamificationStoreListener>();

  const notify = () => {
    const snapshot = state;
    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn('GamificationStore listener threw', error);
      }
    });
  };

  return {
    getState() {
      return state;
    },
    setState(patch) {
      state = { ...state, ...patch };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset() {
      state = { ...DEFAULT_STATE, ...initialState };
      notify();
    },
  };
};
