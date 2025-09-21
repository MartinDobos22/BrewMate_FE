import type { SupabaseClient } from '@supabase/supabase-js';
import SupabaseGamificationAdapter from './SupabaseGamificationAdapter';
import type { GamificationOverview } from '../../types/gamification';
import type { GamificationStore } from './GamificationStore';

export interface GamificationAnalytics {
  track(event: string, payload?: Record<string, unknown>): void;
}

export interface GamificationSoundPlayer {
  play(effect: string): Promise<void> | void;
  stop?(effect?: string): Promise<void> | void;
}

export interface GamificationHaptics {
  impact(pattern: 'light' | 'medium' | 'heavy'): Promise<void> | void;
  notify?(type: 'success' | 'warning' | 'error'): Promise<void> | void;
}

export interface GamificationNotifications {
  trigger(event: string, payload?: Record<string, unknown>): Promise<void> | void;
}

export interface GamificationServiceDependencies {
  supabaseClient: SupabaseClient | null;
  store: GamificationStore;
  analytics: GamificationAnalytics;
  sounds: GamificationSoundPlayer;
  haptics: GamificationHaptics;
  notifications: GamificationNotifications;
}

export class GamificationService {
  private readonly adapter: SupabaseGamificationAdapter | null;
  private disposed = false;

  constructor(private readonly dependencies: GamificationServiceDependencies) {
    this.adapter = dependencies.supabaseClient
      ? new SupabaseGamificationAdapter(dependencies.supabaseClient)
      : null;
  }

  public getDeps(): GamificationServiceDependencies {
    return this.dependencies;
  }

  public async refreshOverview(userId: string): Promise<GamificationOverview | null> {
    if (this.disposed) {
      return null;
    }

    const { store, analytics } = this.dependencies;
    store.setState({ isLoading: true, error: null });

    try {
      if (!this.adapter) {
        store.setState({ isLoading: false });
        return null;
      }

      const overview = await this.adapter.fetchOverview(userId);
      store.setState({
        overview,
        isLoading: false,
        lastFetchedAt: new Date().toISOString(),
      });
      analytics.track('gamification_overview_refresh', { userId });
      return overview;
    } catch (error) {
      console.warn('GamificationService.refreshOverview failed', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      store.setState({ error: message, isLoading: false });
      return null;
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.dependencies.store.reset();
  }
}

export default GamificationService;
