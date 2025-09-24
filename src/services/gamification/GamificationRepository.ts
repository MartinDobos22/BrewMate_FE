/*
 * Vrstvu komunikácie so Supabase držíme na jednom mieste.
 */
import {PostgrestError} from '@supabase/supabase-js';
import {getSupabaseClient} from '../../config/supabaseClient';
import type {
  AchievementDefinition,
  AchievementProgress,
  DailyQuestInstance,
  DailyQuestProgress,
  GamificationStateSnapshot,
  LeaderboardEntry,
  SeasonalEvent,
} from '../../types/gamification';

export default class GamificationRepository {
  private client = getSupabaseClient();

  /**
   * Načíta profil gamifikácie pre používateľa.
   */
  async fetchUserState(userId: string) {
    const {data, error} = await this.client
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    this.handleError(error);
    if (!data) {
      return null;
    }
    const xpToNextLevel = Math.round(100 * Math.pow(1.5, (data.current_level ?? 1) - 1));
    const titleIndex = Math.min(8, Math.floor((data.current_level - 1) / Math.ceil(50 / 9)));
    const titles = [
      'Coffee Curious',
      'Bean Apprentice',
      'Flavor Explorer',
      'Craft Connoisseur',
      'Brew Virtuoso',
      'Roast Strategist',
      'Epic Roaster',
      'Mythic Barista',
      'Legendary Brewmaster',
    ];

    return {
      userId: data.user_id,
      level: data.current_level,
      xp: data.current_xp,
      xpToNextLevel,
      streakDays: data.streak_days,
      loginStreak: data.login_streak,
      brewStreak: data.brew_streak,
      perfectWeek: data.perfect_week,
      freezeTokens: data.freeze_tokens,
      comboMultiplier: Number(data.combo_multiplier),
      doubleXpActive: Boolean(data.double_xp_until && new Date(data.double_xp_until).getTime() > Date.now()),
      skillPoints: data.skill_points,
      title: titles[titleIndex],
    } satisfies GamificationStateSnapshot;
  }

  async upsertUserState(snapshot: GamificationStateSnapshot) {
    const {error} = await this.client.from('user_levels').upsert(
      {
        user_id: snapshot.userId,
        current_level: snapshot.level,
        current_xp: snapshot.xp,
        skill_points: snapshot.skillPoints,
        combo_multiplier: snapshot.comboMultiplier,
        streak_days: snapshot.streakDays,
        login_streak: snapshot.loginStreak ?? 0,
        brew_streak: snapshot.brewStreak ?? 0,
        perfect_week: snapshot.perfectWeek ?? false,
        freeze_tokens: snapshot.freezeTokens ?? 0,
        double_xp_until: snapshot.doubleXpActive ? new Date().toISOString() : null,
      },
      {onConflict: 'user_id'}
    );
    this.handleError(error);
  }

  async fetchAchievements(): Promise<AchievementDefinition[]> {
    const {data, error} = await this.client.from('achievements').select('*');
    this.handleError(error);
    return (data ?? []) as AchievementDefinition[];
  }

  async syncAchievementProgress(progress: AchievementProgress) {
    const {error} = await this.client.from('user_achievements').upsert(
      {
        user_id: progress.userId,
        achievement_id: progress.achievementId,
        progress: progress.progress,
        unlocked_at: progress.unlockedAt,
        featured: progress.featured,
      },
      {onConflict: 'user_id,achievement_id'}
    );
    this.handleError(error);
  }

  async fetchDailyQuests(userId: string): Promise<DailyQuestInstance[]> {
    const now = new Date().toISOString();
    const {data, error} = await this.client
      .from('daily_quests')
      .select('*')
      .lte('active_from', now)
      .gte('active_to', now);
    this.handleError(error);
    const quests = (data ?? []).map((quest) => ({
      id: quest.id,
      templateId: quest.template_id ?? quest.id,
      userId,
      activeFrom: quest.active_from,
      activeTo: quest.active_to,
      rewardXp: quest.reward_xp,
      rewardSkillPoints: quest.reward_skill_points,
      requirements: quest.requirements ?? [],
    }));
    return quests as DailyQuestInstance[];
  }

  async syncQuestProgress(progress: DailyQuestProgress & {userId: string}) {
    const {error} = await this.client.from('user_daily_progress').upsert(
      {
        user_id: progress.userId,
        daily_quest_id: progress.questId,
        progress: progress.progress,
        completed: progress.completed,
        claimed: progress.claimed,
        updated_at: progress.updatedAt,
      },
      {onConflict: 'user_id,daily_quest_id'}
    );
    this.handleError(error);
  }

  async fetchLeaderboard(scope: 'global' | 'friends' | 'local'): Promise<LeaderboardEntry[]> {
    const query = this.client.from('gamification_leaderboard').select('*').order('current_level', {ascending: false});
    if (scope === 'local') {
      query.limit(100);
    }
    const {data, error} = await query;
    this.handleError(error);
    return (data ?? []).map((entry) => ({
      userId: entry.user_id,
      displayName: entry.display_name ?? 'Unknown',
      level: entry.current_level,
      totalXp: entry.current_xp,
      streakDays: entry.streak_days,
      achievementsUnlocked: entry.unlocked_achievements,
      region: entry.region,
      avatarUrl: entry.avatar_url,
    }));
  }

  async fetchSeasonalEvent(): Promise<SeasonalEvent | undefined> {
    const {data, error} = await this.client.from('seasonal_events').select('*').gte('ends_at', new Date().toISOString()).limit(1).single();
    if (error && error.code !== 'PGRST116') {
      this.handleError(error);
    }
    return data as SeasonalEvent | undefined;
  }

  private handleError(error: PostgrestError | null) {
    if (error) {
      // V produkcii by sme chceli posielať chyby do logovania.
      console.warn('[GamificationRepository] Supabase error', error.message);
    }
  }
}
