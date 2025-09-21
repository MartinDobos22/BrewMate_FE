export type DailyQuestStatus = 'pending' | 'active' | 'completed' | 'claimed' | 'expired';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AchievementReward {
  type: 'xp' | 'points' | 'badge' | 'item' | 'currency' | 'perk';
  value: number | string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AchievementDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  tier: AchievementTier;
  targetValue: number;
  rewardPoints: number;
  rewardXp: number;
  rewardBadge?: string | null;
  rewardItems: AchievementReward[];
  rewardCurrency?: Record<string, unknown>;
  isSecret: boolean;
  isSeasonal: boolean;
  seasonId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyQuestInstance {
  id: string;
  questDefinitionId: string;
  userId: string;
  status: DailyQuestStatus;
  progress: number;
  target: number;
  rewardPoints: number;
  rewardXp: number;
  seasonId?: string | null;
  seasonPoints: number;
  boostMultiplier: number;
  boostExpiresAt?: string | null;
  startedAt: string;
  availableFrom: string;
  lastProgressAt: string;
  expiresAt?: string | null;
  completedAt?: string | null;
  claimedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface GamificationStateSnapshot {
  userId: string;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  lifetimePoints: number;
  unclaimedPoints: number;
  streakCount: number;
  longestStreak: number;
  lastStreakResetAt?: string | null;
  seasonId?: string | null;
  seasonLevel: number;
  seasonXp: number;
  seasonPoints: number;
  seasonRank?: number | null;
  seasonTier?: string | null;
  seasonBonusMultiplier: number;
  seasonBonusExpiresAt?: string | null;
  seasonXpToNextLevel: number;
  boostMultiplier: number;
  boostExpiresAt?: string | null;
  lastUpdatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface GamificationOverview {
  state: GamificationStateSnapshot | null;
  dailyQuests: DailyQuestInstance[];
  achievements: AchievementDefinition[];
}

export type GamificationStatePatch = Partial<Omit<GamificationStateSnapshot, 'userId' | 'lastUpdatedAt'>> & {
  userId: string;
};
