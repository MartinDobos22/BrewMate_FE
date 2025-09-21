import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

import type {
  AchievementDefinition,
  AchievementReward,
  DailyQuestInstance,
  DailyQuestStatus,
  GamificationOverview,
  GamificationStatePatch,
  GamificationStateSnapshot,
} from '../../types/gamification';

const isMissingFunction = (error: PostgrestError | null | undefined): boolean => {
  if (!error) {
    return false;
  }
  if (error.code === '42883' || error.code === '404') {
    return true;
  }
  const message = error.message ?? '';
  return /function .* does not exist/i.test(message) || /rpc function .* not found/i.test(message);
};

const isMissingRelation = (error: PostgrestError | null | undefined): boolean => {
  if (!error) {
    return false;
  }
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '');
};

const toNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = toNumber(value, Number.NaN);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value: unknown, fallback: boolean = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    if (/^(true|t|1)$/i.test(value)) {
      return true;
    }
    if (/^(false|f|0)$/i.test(value)) {
      return false;
    }
  }
  return fallback;
};

const toDateString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
};

const parseJson = <T>(value: unknown): T | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return value as T;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn('SupabaseGamificationAdapter: JSON parse failed', error);
      return null;
    }
  }
  return null;
};

const normaliseQuestStatus = (value: unknown): DailyQuestStatus => {
  if (typeof value === 'string') {
    const normalised = value.toLowerCase() as DailyQuestStatus;
    if (['pending', 'active', 'completed', 'claimed', 'expired'].includes(normalised)) {
      return normalised;
    }
  }
  return 'pending';
};

const mapRewardItems = (value: unknown): AchievementReward[] => {
  const parsed = parseJson<AchievementReward[] | Record<string, unknown>[]>(value);
  if (!parsed) {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map(item => {
        if (!item) {
          return null;
        }
        const candidate = item as AchievementReward & Record<string, unknown>;
        const type = typeof candidate.type === 'string' ? (candidate.type as AchievementReward['type']) : 'item';
        const mapped: AchievementReward = {
          type,
          value: candidate.value ?? candidate.reward ?? candidate.amount ?? 0,
        };
        if (candidate.metadata && typeof candidate.metadata === 'object') {
          mapped.metadata = candidate.metadata as Record<string, unknown>;
        }
        return mapped;
      })
      .filter((item): item is AchievementReward => Boolean(item));
  }
  return [];
};

const mergeMetadata = (
  primary?: Record<string, unknown>,
  secondary?: Record<string, unknown> | null,
): Record<string, unknown> | undefined => {
  if (!primary && !secondary) {
    return undefined;
  }
  return {
    ...(secondary ?? {}),
    ...(primary ?? {}),
  };
};

const RPC_FETCH_STATE_FUNCTIONS = [
  { name: 'gamification_fetch_state_v2', argument: 'p_user_id' },
  { name: 'gamification_fetch_state', argument: 'p_user_id' },
  { name: 'fetch_gamification_state', argument: 'user_id' },
];

const RPC_UPSERT_STATE_FUNCTIONS = ['gamification_upsert_state_v2', 'gamification_upsert_state'];

const RPC_LIST_QUESTS_FUNCTIONS = [
  { name: 'gamification_list_daily_quests_v2', argument: 'p_user_id' },
  { name: 'gamification_list_daily_quests', argument: 'p_user_id' },
];

const RPC_APPLY_QUEST_PROGRESS_FUNCTIONS = [
  'gamification_apply_daily_quest_progress_v2',
  'gamification_apply_daily_quest_progress',
];

const RPC_CLAIM_QUEST_FUNCTIONS = [
  'gamification_claim_daily_quest_v2',
  'gamification_claim_daily_quest',
];

const resolveRpcRow = <T>(data: T | T[] | null | undefined): T | null => {
  if (!data) {
    return null;
  }
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  return data;
};

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const normalisePatchPayload = (patch: GamificationStatePatch): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    p_user_id: patch.userId,
  };

  if (patch.totalXp !== undefined) payload.p_total_xp = patch.totalXp;
  if (patch.level !== undefined) payload.p_level = patch.level;
  if (patch.xpToNextLevel !== undefined) payload.p_xp_to_next_level = patch.xpToNextLevel;
  if (patch.lifetimePoints !== undefined) payload.p_lifetime_points = patch.lifetimePoints;
  if (patch.unclaimedPoints !== undefined) payload.p_unclaimed_points = patch.unclaimedPoints;
  if (patch.streakCount !== undefined) payload.p_streak_count = patch.streakCount;
  if (patch.longestStreak !== undefined) payload.p_longest_streak = patch.longestStreak;
  if (patch.lastStreakResetAt !== undefined) payload.p_last_streak_reset_at = patch.lastStreakResetAt;
  if (patch.seasonId !== undefined) payload.p_season_id = patch.seasonId;
  if (patch.seasonLevel !== undefined) payload.p_season_level = patch.seasonLevel;
  if (patch.seasonXp !== undefined) payload.p_season_xp = patch.seasonXp;
  if (patch.seasonPoints !== undefined) payload.p_season_points = patch.seasonPoints;
  if (patch.seasonRank !== undefined) payload.p_season_rank = patch.seasonRank;
  if (patch.seasonTier !== undefined) payload.p_season_tier = patch.seasonTier;
  if (patch.seasonBonusMultiplier !== undefined) payload.p_season_bonus_multiplier = patch.seasonBonusMultiplier;
  if (patch.seasonBonusExpiresAt !== undefined) payload.p_season_bonus_expires_at = patch.seasonBonusExpiresAt;
  if (patch.seasonXpToNextLevel !== undefined) payload.p_season_xp_to_next_level = patch.seasonXpToNextLevel;
  if (patch.boostMultiplier !== undefined) payload.p_boost_multiplier = patch.boostMultiplier;
  if (patch.boostExpiresAt !== undefined) payload.p_boost_expires_at = patch.boostExpiresAt;
  if (patch.metadata !== undefined) payload.p_metadata = patch.metadata ?? {};

  return payload;
};

export class SupabaseGamificationAdapter {
  constructor(private readonly client: SupabaseClient) {}

  private mapState(row: Record<string, any>): GamificationStateSnapshot {
    return {
      userId: toStringOrNull(row.user_id ?? row.userId) ?? '',
      totalXp: toNumber(row.total_xp ?? row.totalXp),
      level: toNumber(row.level),
      xpToNextLevel: toNumber(row.xp_to_next_level ?? row.xpToNextLevel, 100),
      lifetimePoints: toNumber(row.lifetime_points ?? row.lifetimePoints),
      unclaimedPoints: toNumber(row.unclaimed_points ?? row.unclaimedPoints),
      streakCount: toNumber(row.streak_count ?? row.streakCount),
      longestStreak: toNumber(row.longest_streak ?? row.longestStreak),
      lastStreakResetAt: toDateString(row.last_streak_reset_at ?? row.lastStreakResetAt ?? null),
      seasonId: toStringOrNull(row.season_id ?? row.seasonId ?? null),
      seasonLevel: toNumber(row.season_level ?? row.seasonLevel ?? 1, 1),
      seasonXp: toNumber(row.season_xp ?? row.seasonXp),
      seasonPoints: toNumber(row.season_points ?? row.seasonPoints),
      seasonRank: toOptionalNumber(row.season_rank ?? row.seasonRank),
      seasonTier: toStringOrNull(row.season_tier ?? row.seasonTier ?? null),
      seasonBonusMultiplier: toNumber(row.season_bonus_multiplier ?? row.seasonBonusMultiplier, 1),
      seasonBonusExpiresAt: toDateString(row.season_bonus_expires_at ?? row.seasonBonusExpiresAt ?? null),
      seasonXpToNextLevel: toNumber(row.season_xp_to_next_level ?? row.seasonXpToNextLevel, 100),
      boostMultiplier: toNumber(row.boost_multiplier ?? row.boostMultiplier, 1),
      boostExpiresAt: toDateString(row.boost_expires_at ?? row.boostExpiresAt ?? null),
      lastUpdatedAt: toDateString(row.last_updated_at ?? row.lastUpdatedAt ?? new Date()) ?? new Date().toISOString(),
      metadata: parseJson<Record<string, unknown>>(row.metadata ?? row.extra ?? null) ?? undefined,
    };
  }

  private mapDailyQuest(row: Record<string, any>): DailyQuestInstance {
    const metadata = mergeMetadata(
      parseJson<Record<string, unknown>>(row.metadata ?? null) ?? undefined,
      parseJson<Record<string, unknown>>(row.definition_metadata ?? null) ?? undefined,
    );

    return {
      id: toStringOrNull(row.id) ?? '',
      questDefinitionId: toStringOrNull(row.quest_definition_id ?? row.questDefinitionId) ?? '',
      userId: toStringOrNull(row.user_id ?? row.userId) ?? '',
      status: normaliseQuestStatus(row.status),
      progress: toNumber(row.progress),
      target: toNumber(row.target ?? row.target_value ?? 1, 1),
      rewardPoints: toNumber(row.reward_points ?? row.rewardPoints),
      rewardXp: toNumber(row.reward_xp ?? row.rewardXp),
      seasonId: toStringOrNull(row.season_id ?? row.seasonId ?? null),
      seasonPoints: toNumber(row.season_points ?? row.seasonPoints),
      boostMultiplier: toNumber(row.boost_multiplier ?? row.boostMultiplier, 1),
      boostExpiresAt: toDateString(row.boost_expires_at ?? row.boostExpiresAt ?? null),
      startedAt: toDateString(row.started_at ?? row.startedAt ?? new Date()) ?? new Date().toISOString(),
      availableFrom: toDateString(row.available_from ?? row.availableFrom ?? row.started_at ?? row.startedAt ?? new Date()) ?? new Date().toISOString(),
      lastProgressAt: toDateString(row.last_progress_at ?? row.lastProgressAt ?? row.started_at ?? row.startedAt ?? new Date()) ?? new Date().toISOString(),
      expiresAt: toDateString(row.expires_at ?? row.expiresAt ?? null),
      completedAt: toDateString(row.completed_at ?? row.completedAt ?? null),
      claimedAt: toDateString(row.claimed_at ?? row.claimedAt ?? null),
      metadata,
    };
  }

  private mapAchievement(row: Record<string, any>): AchievementDefinition {
    return {
      id: toStringOrNull(row.id) ?? '',
      code: toStringOrNull(row.code) ?? '',
      title: toStringOrNull(row.title) ?? '',
      description: toStringOrNull(row.description) ?? '',
      category: toStringOrNull(row.category) ?? 'general',
      tier: (toStringOrNull(row.tier) as AchievementDefinition['tier']) ?? 'bronze',
      targetValue: toNumber(row.target_value ?? row.targetValue ?? 1, 1),
      rewardPoints: toNumber(row.reward_points ?? row.rewardPoints),
      rewardXp: toNumber(row.reward_xp ?? row.rewardXp),
      rewardBadge: toStringOrNull(row.reward_badge ?? row.rewardBadge ?? null),
      rewardItems: mapRewardItems(row.reward_items ?? row.rewardItems),
      rewardCurrency: parseJson<Record<string, unknown>>(row.reward_currency ?? row.rewardCurrency ?? null) ?? undefined,
      isSecret: toBoolean(row.is_secret ?? row.isSecret, false),
      isSeasonal: toBoolean(row.is_seasonal ?? row.isSeasonal, false),
      seasonId: toStringOrNull(row.season_id ?? row.seasonId ?? null) ?? undefined,
      metadata: parseJson<Record<string, unknown>>(row.metadata ?? null) ?? undefined,
      createdAt: toDateString(row.created_at ?? row.createdAt ?? null) ?? undefined,
      updatedAt: toDateString(row.updated_at ?? row.updatedAt ?? null) ?? undefined,
    };
  }

  public async fetchOverview(userId: string): Promise<GamificationOverview> {
    const [state, dailyQuests, achievements] = await Promise.all([
      this.fetchState(userId),
      this.listDailyQuests(userId),
      this.listAchievements(),
    ]);

    return { state, dailyQuests, achievements };
  }

  public async fetchState(userId: string): Promise<GamificationStateSnapshot | null> {
    for (const rpc of RPC_FETCH_STATE_FUNCTIONS) {
      try {
        const { data, error } = await this.client.rpc(rpc.name, { [rpc.argument]: userId });
        if (error) {
          if (isMissingFunction(error)) {
            continue;
          }
          console.warn(`SupabaseGamificationAdapter.fetchState RPC ${rpc.name} failed`, error);
          continue;
        }
        const row = resolveRpcRow(data as Record<string, any> | Record<string, any>[] | null);
        if (row) {
          return this.mapState(row as Record<string, any>);
        }
      } catch (error) {
        console.warn(`SupabaseGamificationAdapter.fetchState RPC ${rpc.name} threw`, error);
      }
    }

    try {
      const { data, error } = await this.client
        .from('v_gamification_season_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<Record<string, any>>();

      if (error) {
        if (!isMissingRelation(error)) {
          console.warn('SupabaseGamificationAdapter.fetchState view fallback failed', error);
        }
      }

      if (data) {
        return this.mapState(data);
      }
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.fetchState view fallback threw', error);
    }

    try {
      const { data, error } = await this.client
        .from('gamification_state_snapshots')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<Record<string, any>>();

      if (error) {
        if (!isMissingRelation(error)) {
          console.warn('SupabaseGamificationAdapter.fetchState table fallback failed', error);
        }
        return null;
      }

      return data ? this.mapState(data) : null;
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.fetchState table fallback threw', error);
      return null;
    }
  }

  public async upsertState(patch: GamificationStatePatch): Promise<GamificationStateSnapshot | null> {
    const payload = normalisePatchPayload(patch);

    for (const rpc of RPC_UPSERT_STATE_FUNCTIONS) {
      try {
        const { data, error } = await this.client.rpc(rpc, payload);
        if (error) {
          if (isMissingFunction(error)) {
            continue;
          }
          console.warn(`SupabaseGamificationAdapter.upsertState RPC ${rpc} failed`, error);
          continue;
        }
        const row = resolveRpcRow(data as Record<string, any> | Record<string, any>[] | null);
        if (row) {
          return this.mapState(row as Record<string, any>);
        }
      } catch (error) {
        console.warn(`SupabaseGamificationAdapter.upsertState RPC ${rpc} threw`, error);
      }
    }

    try {
      const upsertPayload: Record<string, unknown> = {
        user_id: patch.userId,
        total_xp: patch.totalXp,
        level: patch.level,
        xp_to_next_level: patch.xpToNextLevel,
        lifetime_points: patch.lifetimePoints,
        unclaimed_points: patch.unclaimedPoints,
        streak_count: patch.streakCount,
        longest_streak: patch.longestStreak,
        last_streak_reset_at: patch.lastStreakResetAt,
        season_id: patch.seasonId,
        season_level: patch.seasonLevel,
        season_xp: patch.seasonXp,
        season_points: patch.seasonPoints,
        season_rank: patch.seasonRank,
        season_tier: patch.seasonTier,
        season_bonus_multiplier: patch.seasonBonusMultiplier,
        season_bonus_expires_at: patch.seasonBonusExpiresAt,
        season_xp_to_next_level: patch.seasonXpToNextLevel,
        boost_multiplier: patch.boostMultiplier,
        boost_expires_at: patch.boostExpiresAt,
        metadata: patch.metadata,
      };

      Object.keys(upsertPayload).forEach(key => {
        if (upsertPayload[key] === undefined) {
          delete upsertPayload[key];
        }
      });

      const { error } = await this.client
        .from('gamification_state_snapshots')
        .upsert(upsertPayload, { onConflict: 'user_id' });

      if (error) {
        console.warn('SupabaseGamificationAdapter.upsertState table upsert failed', error);
        return null;
      }

      return this.fetchState(patch.userId);
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.upsertState table upsert threw', error);
      return null;
    }
  }

  public async listDailyQuests(userId: string): Promise<DailyQuestInstance[]> {
    for (const rpc of RPC_LIST_QUESTS_FUNCTIONS) {
      try {
        const { data, error } = await this.client.rpc(rpc.name, { [rpc.argument]: userId });
        if (error) {
          if (isMissingFunction(error)) {
            continue;
          }
          console.warn(`SupabaseGamificationAdapter.listDailyQuests RPC ${rpc.name} failed`, error);
          continue;
        }
        const rows = ensureArray(data as Record<string, any>[] | Record<string, any> | null);
        if (rows.length > 0) {
          return rows.map(row => this.mapDailyQuest(row as Record<string, any>));
        }
      } catch (error) {
        console.warn(`SupabaseGamificationAdapter.listDailyQuests RPC ${rpc.name} threw`, error);
      }
    }

    try {
      const { data, error } = await this.client
        .from('v_active_daily_quests')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        if (!isMissingRelation(error)) {
          console.warn('SupabaseGamificationAdapter.listDailyQuests view fallback failed', error);
        }
      }

      if (data && data.length > 0) {
        return data.map(row => this.mapDailyQuest(row as Record<string, any>));
      }
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.listDailyQuests view fallback threw', error);
    }

    try {
      const { data, error } = await this.client
        .from('daily_quest_instances')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        if (!isMissingRelation(error)) {
          console.warn('SupabaseGamificationAdapter.listDailyQuests table fallback failed', error);
        }
        return [];
      }

      return (data ?? []).map(row => this.mapDailyQuest(row as Record<string, any>));
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.listDailyQuests table fallback threw', error);
      return [];
    }
  }

  public async applyDailyQuestProgress(
    questInstanceId: string,
    increment: number = 1,
    boostOverride?: number,
  ): Promise<DailyQuestInstance | null> {
    for (const rpc of RPC_APPLY_QUEST_PROGRESS_FUNCTIONS) {
      try {
        const { data, error } = await this.client.rpc(rpc, {
          p_instance_id: questInstanceId,
          p_increment: increment,
          p_boost_override: boostOverride,
        });
        if (error) {
          if (isMissingFunction(error)) {
            continue;
          }
          console.warn(`SupabaseGamificationAdapter.applyDailyQuestProgress RPC ${rpc} failed`, error);
          continue;
        }
        const row = resolveRpcRow(data as Record<string, any>[] | Record<string, any> | null);
        if (row) {
          return this.mapDailyQuest(row as Record<string, any>);
        }
      } catch (error) {
        console.warn(`SupabaseGamificationAdapter.applyDailyQuestProgress RPC ${rpc} threw`, error);
      }
    }

    return this.applyQuestProgressFallback(questInstanceId, increment, boostOverride);
  }

  private async applyQuestProgressFallback(
    questInstanceId: string,
    increment: number,
    boostOverride?: number,
  ): Promise<DailyQuestInstance | null> {
    try {
      const { data: existing, error: fetchError } = await this.client
        .from('daily_quest_instances')
        .select('*')
        .eq('id', questInstanceId)
        .maybeSingle<Record<string, any>>();

      if (fetchError || !existing) {
        if (fetchError && !isMissingRelation(fetchError)) {
          console.warn('SupabaseGamificationAdapter.applyQuestProgressFallback fetch failed', fetchError);
        }
        return null;
      }

      const target = toNumber(existing.target ?? existing.target_value ?? 1, 1);
      const progress = toNumber(existing.progress ?? 0);
      const multiplier = boostOverride ?? toNumber(existing.boost_multiplier ?? 1, 1);
      const incremented = Math.ceil(Math.max(0, increment) * Math.max(multiplier, 0));
      const nextProgress = Math.min(target, progress + incremented);
      const isCompleted = nextProgress >= target;

      const updatePayload: Record<string, unknown> = {
        progress: nextProgress,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? existing.completed_at ?? new Date().toISOString() : existing.completed_at ?? null,
        last_progress_at: new Date().toISOString(),
      };

      const { data, error } = await this.client
        .from('daily_quest_instances')
        .update(updatePayload)
        .eq('id', questInstanceId)
        .select('*')
        .maybeSingle<Record<string, any>>();

      if (error) {
        console.warn('SupabaseGamificationAdapter.applyQuestProgressFallback update failed', error);
        return null;
      }

      return data ? this.mapDailyQuest(data) : null;
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.applyQuestProgressFallback threw', error);
      return null;
    }
  }

  public async claimDailyQuest(questInstanceId: string): Promise<DailyQuestInstance | null> {
    for (const rpc of RPC_CLAIM_QUEST_FUNCTIONS) {
      try {
        const { data, error } = await this.client.rpc(rpc, { p_instance_id: questInstanceId });
        if (error) {
          if (isMissingFunction(error)) {
            continue;
          }
          console.warn(`SupabaseGamificationAdapter.claimDailyQuest RPC ${rpc} failed`, error);
          continue;
        }
        const row = resolveRpcRow(data as Record<string, any>[] | Record<string, any> | null);
        if (row) {
          return this.mapDailyQuest(row as Record<string, any>);
        }
      } catch (error) {
        console.warn(`SupabaseGamificationAdapter.claimDailyQuest RPC ${rpc} threw`, error);
      }
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('daily_quest_instances')
        .update({ status: 'claimed', claimed_at: now })
        .eq('id', questInstanceId)
        .select('*')
        .maybeSingle<Record<string, any>>();

      if (error) {
        console.warn('SupabaseGamificationAdapter.claimDailyQuest fallback update failed', error);
        return null;
      }

      return data ? this.mapDailyQuest(data) : null;
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.claimDailyQuest fallback threw', error);
      return null;
    }
  }

  public async listAchievements(): Promise<AchievementDefinition[]> {
    try {
      const { data, error } = await this.client
        .from('achievement_definitions')
        .select('*');

      if (error) {
        if (!isMissingRelation(error)) {
          console.warn('SupabaseGamificationAdapter.listAchievements query failed', error);
        }
        return [];
      }

      return (data ?? []).map(row => this.mapAchievement(row as Record<string, any>));
    } catch (error) {
      console.warn('SupabaseGamificationAdapter.listAchievements threw', error);
      return [];
    }
  }
}

export default SupabaseGamificationAdapter;
