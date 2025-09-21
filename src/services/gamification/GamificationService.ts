import type { SupabaseClient } from '@supabase/supabase-js';
import SupabaseGamificationAdapter from './SupabaseGamificationAdapter';
import type { GamificationOverview, GamificationStateSnapshot } from '../../types/gamification';
import type { GamificationStore } from './GamificationStore';
import XpEngine, { type XpGrant, XpSource } from './XpEngine';

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
  private readonly xpEngine = new XpEngine();
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

  public async addXp(grant: XpGrant): Promise<GamificationStateSnapshot | null> {
    if (this.disposed) {
      return null;
    }

    const { store, analytics, sounds, haptics, notifications } = this.dependencies;
    const currentState = store.getState().overview?.state ?? null;
    const outcome = this.xpEngine.applyXp(grant, currentState);

    if (outcome.kind === 'rejected') {
      analytics.track('gamification_xp_rejected', {
        userId: grant.userId,
        source: grant.source,
        reason: outcome.reason,
      });
      return currentState;
    }

    analytics.track('gamification_xp_applied', {
      userId: grant.userId,
      source: grant.source,
      baseAmount: outcome.baseAmount,
      appliedXp: outcome.appliedXp,
      doubleXpActive: outcome.doubleXpActive,
      comboMultiplier: outcome.comboMultiplier,
      comboCount: outcome.comboCount,
      totalMultiplier: outcome.totalMultiplier,
      skillPointsEarned: outcome.skillPointsEarned,
    });

    this.applyLocalSnapshot(outcome.state);

    try {
      await Promise.resolve(sounds.play('xp_gain'));
    } catch (error) {
      console.warn('GamificationService.addXp sound failed', error);
    }

    try {
      await Promise.resolve(haptics.impact('light'));
    } catch (error) {
      console.warn('GamificationService.addXp haptics failed', error);
    }

    try {
      await Promise.resolve(
        notifications.trigger('xp_awarded', {
          userId: grant.userId,
          amount: outcome.appliedXp,
          source: grant.source,
        }),
      );
    } catch (error) {
      console.warn('GamificationService.addXp notification failed', error);
    }

    if (!this.adapter) {
      return outcome.state;
    }

    try {
      const persisted = await this.adapter.upsertState(outcome.patch);
      if (persisted) {
        this.applyLocalSnapshot(persisted);
        return persisted;
      }
    } catch (error) {
      console.warn('GamificationService.addXp persistence failed', error);
    }

    return outcome.state;
  }

  public async handleBrewLogSaved(
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<GamificationStateSnapshot | null> {
    return this.addXp({
      userId,
      baseAmount: 35,
      source: XpSource.BrewLogEntry,
      metadata,
    });
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.dependencies.store.reset();
    this.xpEngine.reset();
  }

  private applyLocalSnapshot(snapshot: GamificationStateSnapshot): void {
    const { store } = this.dependencies;
    const { overview } = store.getState();
    const nextOverview: GamificationOverview = overview
      ? { ...overview, state: snapshot }
      : { state: snapshot, dailyQuests: [], achievements: [] };
    store.setState({
      overview: nextOverview,
      lastFetchedAt: snapshot.lastUpdatedAt ?? new Date().toISOString(),
    });
  }
}

export default GamificationService;
