import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreApi } from 'zustand';
import type {
  GamificationAnalyticsAdapter,
  GamificationEvent,
  GamificationHaptics,
  GamificationNotificationChannel,
  GamificationSoundEffectManager,
  LeaderboardRange,
  LeaderboardScope,
  SeasonalEventConfig,
  XpSource,
} from '../../types/gamification';
import type { GamificationStoreState } from '../../hooks/useGamificationStore';
import { XpEngine } from './XpEngine';
import { AchievementManager, type AchievementEventContext } from './AchievementManager';
import { DailyQuestService } from './DailyQuestService';
import { SupabaseGamificationAdapter } from './SupabaseGamificationAdapter';
import { GamificationNotifications } from './GamificationNotifications';

interface GamificationServiceDeps {
  supabaseClient: SupabaseClient;
  userId: string;
  store: StoreApi<GamificationStoreState>;
  analytics: GamificationAnalyticsAdapter;
  sounds: GamificationSoundEffectManager;
  haptics: GamificationHaptics;
  notifications?: GamificationNotificationChannel;
}

interface AntiCheatSample {
  timestamp: number;
  source: XpSource;
  amount: number;
}

/**
 * Orchestruje všetky časti gamifikačného systému.
 */
export class GamificationService {
  private readonly supabaseAdapter: SupabaseGamificationAdapter;
  private readonly xpEngine: XpEngine;
  private readonly achievementManager: AchievementManager;
  private readonly dailyQuestService: DailyQuestService;
  private readonly antiCheatWindow: AntiCheatSample[] = [];
  private seasonalMultiplier = 1;

  constructor(private readonly deps: GamificationServiceDeps) {
    this.supabaseAdapter = new SupabaseGamificationAdapter(deps.supabaseClient, deps.userId);
    const notifications = deps.notifications ?? new GamificationNotifications();
    this.xpEngine = new XpEngine({
      store: deps.store,
      analytics: deps.analytics,
      haptics: deps.haptics,
      sounds: deps.sounds,
      seasonalMultiplier: () => this.seasonalMultiplier,
    });
    this.achievementManager = new AchievementManager({
      store: deps.store,
      supabase: this.supabaseAdapter,
      xpEngine: this.xpEngine,
      analytics: deps.analytics,
      sounds: deps.sounds,
      haptics: deps.haptics,
    });
    this.dailyQuestService = new DailyQuestService({
      store: deps.store,
      supabase: this.supabaseAdapter,
      xpEngine: this.xpEngine,
      analytics: deps.analytics,
      notifications,
    });
  }

  async initialize(): Promise<void> {
    const [state, achievements, quests, events] = await Promise.all([
      this.supabaseAdapter.fetchState(),
      this.supabaseAdapter.fetchUserAchievements(),
      this.supabaseAdapter.fetchUserDailyProgress(),
      this.supabaseAdapter.fetchSeasonalEvents(),
    ]);

    await this.achievementManager.initialize();
    await this.dailyQuestService.initialize();

    const xpToNext = this.xpEngine.calculateXpForLevel(state.level);

    this.deps.store.setState({
      userId: this.deps.userId,
      level: state.level,
      currentXp: state.currentXp,
      xpToNextLevel: xpToNext,
      skillPoints: state.skillPoints,
      comboMultiplier: state.comboMultiplier,
      doubleXpActive: state.doubleXpActive,
      title: this.xpEngine.getTitleForLevel(state.level),
      streakDays: state.streakDays,
      brewStreakDays: state.brewStreakDays,
      perfectWeek: state.perfectWeek,
      freezeTokens: state.freezeTokens,
      skillTree: state.skillTree,
      achievements,
      dailyQuests: quests,
      seasonalEvents: events,
      initialized: true,
    });

    if (!state.radarStats || state.radarStats.length === 0) {
      this.deps.store.getState().setRadarStats?.([
        { key: 'brewing', value: 55, average: 50 },
        { key: 'exploration', value: 45, average: 40 },
        { key: 'social', value: 35, average: 30 },
        { key: 'knowledge', value: 60, average: 55 },
      ]);
    }

    this.updateSeasonalMultiplier(events);
    await this.dailyQuestService.assignDailyQuests();
  }

  private updateSeasonalMultiplier(events: SeasonalEventConfig[]) {
    if (events.length === 0) {
      this.seasonalMultiplier = 1;
      return;
    }
    this.seasonalMultiplier = events.reduce((max, event) => Math.max(max, event.bonusXpMultiplier), 1);
  }

  async addXp(source: XpSource, amount: number, metadata?: Record<string, unknown>): Promise<void> {
    if (this.isAnomalousGain({ amount, source })) {
      console.warn('GamificationService: Detegovaný podozrivý XP zisk', source, amount);
      return;
    }
    this.antiCheatWindow.push({ timestamp: Date.now(), amount, source });
    await this.xpEngine.applyXp({ source, baseAmount: amount, metadata });
    await this.supabaseAdapter.upsertState({
      current_level: this.deps.store.getState().level,
      current_xp: this.deps.store.getState().currentXp,
      skill_points: this.deps.store.getState().skillPoints,
    });
  }

  async handleBrewEvent(event: { rating: number; timestamp: string; methods: string[]; perfect?: boolean }): Promise<void> {
    await this.addXp(event.perfect ? 'perfect_brew' : 'brew', event.perfect ? 50 : 10, {
      rating: event.rating,
    });

    const achievements: AchievementEventContext[] = [
      { type: 'brew_completed' },
    ];

    if (event.perfect) {
      achievements.push({ type: 'perfect_brew', amount: 1, metadata: { weeklyPerfects: 1 } });
    }

    if (event.methods.length >= 3 && event.rating >= 4) {
      achievements.push({
        type: 'exploration',
        metadata: { methodsDiscovered: event.methods.length },
      });
    }

    await this.achievementManager.evaluate(achievements);

    await this.dailyQuestService.autoCompleteFromEvent({
      type: 'brew',
      payload: {
        rating: event.rating,
        methods: event.methods,
        timestamp: event.timestamp,
      },
    });

    await this.updateBrewStreak(new Date(event.timestamp));
  }

  async handleCommunityHelp(count = 1): Promise<void> {
    await this.addXp('help_others', 15 * count);
    await this.achievementManager.evaluate([{ type: 'mentor_help', amount: count }]);
    await this.dailyQuestService.autoCompleteFromEvent({
      type: 'community_help',
      payload: { count },
    });
  }

  async updateLoginStreak(): Promise<void> {
    const state = this.deps.store.getState();
    const now = startOfDay(new Date());
    const lastSync = state.lastSyncAt ? startOfDay(new Date(state.lastSyncAt)) : null;
    let streak = state.streakDays;
    let freezeTokens = state.freezeTokens;

    if (!lastSync || differenceInCalendarDays(now, lastSync) === 1) {
      streak += 1;
    } else if (differenceInCalendarDays(now, lastSync) > 1) {
      if (freezeTokens > 0) {
        freezeTokens -= 1;
      } else {
        streak = 1;
      }
    }

    this.deps.store.getState().updateStreaks({
      streakDays: streak,
      brewStreakDays: state.brewStreakDays,
      perfectWeek: state.perfectWeek,
      freezeTokens,
    });

    await this.achievementManager.evaluate([{ type: 'daily_streak', amount: streak }]);
    await this.deps.analytics.track({ type: 'streak_update', payload: { streak } });
  }

  private async updateBrewStreak(date: Date): Promise<void> {
    const state = this.deps.store.getState();
    const now = startOfDay(date);
    const lastSync = state.lastSyncAt ? startOfDay(new Date(state.lastSyncAt)) : null;
    let brewStreak = state.brewStreakDays;

    if (!lastSync || differenceInCalendarDays(now, lastSync) === 0) {
      brewStreak = Math.max(brewStreak, 1);
    } else if (differenceInCalendarDays(now, lastSync) === 1) {
      brewStreak += 1;
    } else {
      brewStreak = 1;
    }

    const perfectWeek = brewStreak >= 7;

    this.deps.store.getState().updateStreaks({
      streakDays: state.streakDays,
      brewStreakDays: brewStreak,
      perfectWeek,
      freezeTokens: state.freezeTokens,
    });

    if (perfectWeek) {
      await this.addXp('streak_bonus', 120);
    }
  }

  async refreshLeaderboards(scope: LeaderboardScope, range: LeaderboardRange): Promise<void> {
    const entries = await this.supabaseAdapter.fetchLeaderboards(scope, range);
    this.deps.store.getState().setLeaderboard(`${scope}:${range}`, entries);
  }

  async sync(): Promise<void> {
    const snapshot = this.deps.store.getState();
    await this.supabaseAdapter.upsertState({
      current_level: snapshot.level,
      current_xp: snapshot.currentXp,
      skill_points: snapshot.skillPoints,
      skill_tree: snapshot.skillTree,
      streak_days: snapshot.streakDays,
      brew_streak_days: snapshot.brewStreakDays,
      perfect_week: snapshot.perfectWeek,
      combo_multiplier: snapshot.comboMultiplier,
      double_xp_active: snapshot.doubleXpActive,
    });

    await Promise.all(snapshot.dailyQuests.map((quest) => this.supabaseAdapter.upsertDailyQuest(quest)));
    await Promise.all(snapshot.achievements.map((achievement) => this.supabaseAdapter.updateAchievement(achievement)));
  }

  private isAnomalousGain(sample: AntiCheatSample): boolean {
    const now = Date.now();
    this.antiCheatWindow.splice(0, this.antiCheatWindow.length, ...this.antiCheatWindow.filter((item) => now - item.timestamp < 60_000));
    const total = this.antiCheatWindow.reduce((sum, item) => sum + item.amount, 0) + sample.amount;
    const highSpike = sample.amount > 500;
    const rateLimited = this.antiCheatWindow.length > 10;
    return highSpike || rateLimited || total > 1000;
  }

  async trackEvent(event: GamificationEvent): Promise<void> {
    await this.deps.analytics.track(event);
  }

  getXpEngine(): XpEngine {
    return this.xpEngine;
  }

  getAchievementManager(): AchievementManager {
    return this.achievementManager;
  }

  getDailyQuestService(): DailyQuestService {
    return this.dailyQuestService;
  }
}
