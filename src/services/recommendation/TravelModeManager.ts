import EncryptedStorage from 'react-native-encrypted-storage';

const STORAGE_KEY = 'brewmate:travel_mode';

interface TravelModeState {
  enabled: boolean;
  expiresAt?: string;
}

export class TravelModeManager {
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

  public async shouldSimplify(): Promise<boolean> {
    return this.isTravelModeActive();
  }

  public async activate(hours: number): Promise<void> {
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: true, expiresAt } satisfies TravelModeState));
  }

  public async deactivate(): Promise<void> {
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: false } satisfies TravelModeState));
  }

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
