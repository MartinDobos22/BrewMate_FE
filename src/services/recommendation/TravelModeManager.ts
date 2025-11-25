import EncryptedStorage from 'react-native-encrypted-storage';

const STORAGE_KEY = 'brewmate:travel_mode';

/**
 * Persisted state describing whether simplified travel recommendations are
 * active.
 */
interface TravelModeState {
  enabled: boolean;
  expiresAt?: string;
}

/**
 * Manages a temporary "travel mode" that simplifies recommendations when
 * connectivity or equipment may be limited.
 */
export class TravelModeManager {
  /**
   * Checks whether travel mode is currently active, removing expired state
   * records when necessary.
   */
  public async isTravelModeActive(): Promise<boolean> {
    const state = await this.getState();
    if (!state) {
      return false;
    }
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
      await EncryptedStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return state.enabled;
  }

  /**
   * Alias for {@link isTravelModeActive} used by consumers to toggle lighter UI
   * experiences.
   */
  public async shouldSimplify(): Promise<boolean> {
    return this.isTravelModeActive();
  }

  /**
   * Enables travel mode for a specified duration.
   *
   * @param hours - Number of hours until the mode should auto-expire.
   */
  public async activate(hours: number): Promise<void> {
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt } satisfies TravelModeState));
  }

  /**
   * Disables travel mode immediately and persists the cleared state.
   */
  public async deactivate(): Promise<void> {
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false } satisfies TravelModeState));
  }

  /**
   * Reads the persisted travel mode state from secure storage.
   *
   * @returns Stored state or undefined when parsing fails or nothing is saved.
   */
  private async getState(): Promise<TravelModeState | undefined> {
    try {
      const raw = await EncryptedStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return undefined;
      }
      return JSON.parse(raw) as TravelModeState;
    } catch (error) {
      console.warn('TravelModeManager: failed to read state', error);
      return undefined;
    }
  }
}
