import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AchievementDefinition,
  AchievementProgress,
  DailyQuestInstance,
  DailyQuestTemplate,
  GamificationStateSnapshot,
  LeaderboardEntry,
  LeaderboardRange,
  LeaderboardScope,
  SeasonalEventConfig,
} from '../../types/gamification';

interface UserLevelRow {
  user_id: string;
  current_level: number;
  current_xp: number;
  skill_points: number;
  skill_tree: unknown;
  streak_days: number;
  brew_streak_days: number;
  perfect_week: boolean;
  freeze_tokens: number;
  combo_multiplier: number;
  double_xp_active: boolean;
}

/**
 * Adaptér zodpovedný za čítanie a zapisovanie dát do Supabase.
 */
export class SupabaseGamificationAdapter {
  constructor(private readonly client: SupabaseClient, private readonly userId: string) {}

  async fetchState(): Promise<GamificationStateSnapshot> {
    const { data, error } = await this.client
      .from<UserLevelRow>('user_levels')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) {
      console.warn('SupabaseGamificationAdapter: fetchState error', error);
    }

    const row = data ?? {
      current_level: 1,
      current_xp: 0,
      skill_points: 0,
      skill_tree: [],
      streak_days: 0,
      brew_streak_days: 0,
      perfect_week: false,
      freeze_tokens: 1,
      combo_multiplier: 1,
      double_xp_active: false,
    };

    return {
      userId: this.userId,
      level: row.current_level,
      currentXp: row.current_xp,
      xpToNextLevel: 0,
      skillPoints: row.skill_points,
      comboMultiplier: row.combo_multiplier ?? 1,
      doubleXpActive: row.double_xp_active ?? false,
      title: 'Coffee Curious',
      streakDays: row.streak_days ?? 0,
      brewStreakDays: row.brew_streak_days ?? 0,
      perfectWeek: row.perfect_week ?? false,
      freezeTokens: row.freeze_tokens ?? 0,
      radarStats: [],
      skillTree: (row.skill_tree as unknown[])?.map((node) => node) ?? [],
    };
  }

  async upsertState(state: Partial<UserLevelRow>): Promise<void> {
    const { error } = await this.client
      .from('user_levels')
      .upsert({
        user_id: this.userId,
        ...state,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('SupabaseGamificationAdapter: upsertState error', error);
    }
  }

  async fetchAchievements(): Promise<AchievementDefinition[]> {
    const { data, error } = await this.client.from('achievements').select('*');
    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: achievements fallback', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      rarity: row.rarity,
      milestones: row.milestones ?? [row.goal ?? 1],
      rewardXp: row.reward_xp ?? 0,
      rewardSkillPoints: row.reward_skill_points ?? 0,
      featureUnlock: row.feature_unlock ?? undefined,
      isHidden: row.is_hidden ?? false,
    }));
  }

  async fetchUserAchievements(): Promise<AchievementProgress[]> {
    const { data, error } = await this.client
      .from('user_achievements')
      .select('*')
      .eq('user_id', this.userId);

    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: user achievements fallback', error);
      return [];
    }

    return data.map((row: any) => ({
      achievementId: row.achievement_id,
      progress: row.progress,
      completedMilestones: row.completed_milestones ?? [],
      unlockedAt: row.unlocked_at ?? undefined,
      featured: row.featured ?? false,
    }));
  }

  async updateAchievement(progress: AchievementProgress): Promise<void> {
    const { error } = await this.client.from('user_achievements').upsert({
      user_id: this.userId,
      achievement_id: progress.achievementId,
      progress: progress.progress,
      completed_milestones: progress.completedMilestones,
      unlocked_at: progress.unlockedAt,
      featured: progress.featured ?? false,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('SupabaseGamificationAdapter: updateAchievement error', error);
    }
  }

  async fetchDailyQuestTemplates(): Promise<DailyQuestTemplate[]> {
    const { data, error } = await this.client.from('daily_quests').select('*');
    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: quest template fallback', error);
      return [];
    }
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      xpReward: row.xp_reward,
      requirements: row.requirements,
      category: row.category,
    }));
  }

  async fetchUserDailyProgress(): Promise<DailyQuestInstance[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.client
      .from('user_daily_progress')
      .select('*')
      .eq('user_id', this.userId)
      .gte('expires_at', today);

    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: user daily progress fallback', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      templateId: row.template_id,
      assignedAt: row.assigned_at,
      expiresAt: row.expires_at,
      progress: row.progress,
      goal: row.goal,
      completed: row.completed,
      xpReward: row.xp_reward,
      metadata: row.metadata ?? {},
    }));
  }

  async upsertDailyQuest(quest: DailyQuestInstance): Promise<void> {
    const { error } = await this.client.from('user_daily_progress').upsert({
      id: quest.id,
      user_id: this.userId,
      template_id: quest.templateId,
      assigned_at: quest.assignedAt,
      expires_at: quest.expiresAt,
      progress: quest.progress,
      goal: quest.goal,
      completed: quest.completed,
      xp_reward: quest.xpReward,
      metadata: quest.metadata,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('SupabaseGamificationAdapter: upsertDailyQuest error', error);
    }
  }

  async fetchLeaderboards(scope: LeaderboardScope, range: LeaderboardRange): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.client
      .rpc('fetch_leaderboard', { scope, range, user_id: this.userId })
      .single();

    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: leaderboard fallback', error);
      return [];
    }

    return (data.entries ?? []).map((entry: any) => ({
      userId: entry.user_id,
      displayName: entry.display_name,
      avatarUrl: entry.avatar_url ?? undefined,
      xp: entry.xp,
      rank: entry.rank,
      trend: entry.trend,
      countryCode: entry.country_code ?? undefined,
      title: entry.title ?? 'Coffee Curious',
    }));
  }

  async fetchSeasonalEvents(): Promise<SeasonalEventConfig[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('seasonal_events')
      .select('*')
      .lte('start_at', now)
      .gte('end_at', now);

    if (error || !data) {
      console.warn('SupabaseGamificationAdapter: seasonal events fallback', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      theme: row.theme,
      startAt: row.start_at,
      endAt: row.end_at,
      bonusXpMultiplier: row.bonus_xp_multiplier ?? 1,
      featuredAchievements: row.featured_achievements ?? [],
    }));
  }
}
