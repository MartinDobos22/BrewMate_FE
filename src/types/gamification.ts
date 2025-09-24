/*
 * Všetky typy pre gamifikačný systém.
 * Komentáre sú v slovenčine podľa zadania.
 */

export type GamificationTitle =
  | 'Coffee Curious'
  | 'Bean Apprentice'
  | 'Flavor Explorer'
  | 'Craft Connoisseur'
  | 'Brew Virtuoso'
  | 'Roast Strategist'
  | 'Epic Roaster'
  | 'Mythic Barista'
  | 'Legendary Brewmaster';

export interface LevelDefinition {
  level: number;
  xpRequired: number;
  title: GamificationTitle;
  rewards: {
    skillPoints: number;
    perks: string[];
  };
}

export type XpSource =
  | 'brew'
  | 'perfect_brew'
  | 'help_others'
  | 'bean_review'
  | 'new_method'
  | 'share_story'
  | 'event_bonus';

export interface XpEvent {
  userId: string;
  source: XpSource;
  baseAmount: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type AchievementCategory =
  | 'beginner'
  | 'skills'
  | 'exploration'
  | 'social'
  | 'hidden'
  | 'seasonal';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  thresholds: number[];
  specialReward?: {
    type: 'feature_unlock' | 'badge' | 'cosmetic';
    payload: Record<string, unknown>;
  };
}

export interface AchievementProgress {
  userId: string;
  achievementId: string;
  progress: number;
  unlockedAt?: string;
  featured: boolean;
}

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'special';

export interface QuestRequirement {
  type:
    | 'time_window'
    | 'use_ai'
    | 'upload_photo'
    | 'rating'
    | 'new_recipe'
    | 'repeat_brew'
    | 'multi_method'
    | 'mentor_help'
    | 'method_specific'
    | 'streak'
    | 'auto_complete';
  value: unknown;
  progressKey: string;
}

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  rewardXpRange: [number, number];
  rewardSkillPoints: number;
  requirements: QuestRequirement[];
  tags: string[];
}

export interface DailyQuestInstance {
  id: string;
  templateId: string;
  userId: string;
  activeFrom: string;
  activeTo: string;
  rewardXp: number;
  rewardSkillPoints: number;
  requirements: QuestRequirement[];
}

export interface DailyQuestProgress {
  questId: string;
  progress: Record<string, number>;
  completed: boolean;
  claimed: boolean;
  updatedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  level: number;
  totalXp: number;
  streakDays: number;
  achievementsUnlocked: number;
  region?: string;
  avatarUrl?: string;
}

export interface RadarStats {
  brewing: number;
  exploration: number;
  social: number;
  knowledge: number;
  averageComparison?: number;
}

export interface SeasonalEvent {
  id: string;
  title: string;
  theme: string;
  startsAt: string;
  endsAt: string;
  bonusMultiplier: number;
  featuredMethods: string[];
}

export interface AbTestVariant {
  experiment: string;
  variant: 'A' | 'B' | 'C';
  allocatedAt: string;
}

export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface ComboMultiplierConfig {
  base: number;
  max: number;
  streakStep: number;
}

export interface GamificationStateSnapshot {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  loginStreak?: number;
  brewStreak?: number;
  perfectWeek?: boolean;
  freezeTokens?: number;
  comboMultiplier: number;
  doubleXpActive: boolean;
  skillPoints: number;
  title: GamificationTitle;
}
