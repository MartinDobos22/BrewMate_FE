import type { Json } from './supabase';

/**
 * Tituly priraďované hráčom podľa levelu.
 */
export type GamificationTitle =
  | 'Coffee Curious'
  | 'Bean Explorer'
  | 'Flavor Scholar'
  | 'Extraction Tactician'
  | 'Aroma Virtuoso'
  | 'Roast Strategist'
  | 'Sensory Sage'
  | 'Mythic Alchemist'
  | 'Legendary Brewmaster';

/**
 * Všetky zdroje XP ktoré aplikácia sleduje.
 */
export type XpSource =
  | 'brew'
  | 'perfect_brew'
  | 'help_others'
  | 'daily_quest'
  | 'streak_bonus'
  | 'event_reward'
  | 'skill_training'
  | 'exploration'
  | 'social_share';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'beginner'
  | 'skills'
  | 'exploration'
  | 'social'
  | 'hidden';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  milestones: number[];
  rewardXp: number;
  rewardSkillPoints?: number;
  featureUnlock?: string;
  isHidden?: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  completedMilestones: number[];
  unlockedAt?: string;
  featured?: boolean;
}

export type DailyQuestDifficulty = 'easy' | 'medium' | 'hard' | 'special';

export interface DailyQuestTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: DailyQuestDifficulty;
  xpReward: number;
  requirements: Json;
  category: 'ritual' | 'exploration' | 'social' | 'skill' | 'event';
}

export interface DailyQuestInstance {
  id: string;
  templateId: string;
  assignedAt: string;
  expiresAt: string;
  progress: number;
  goal: number;
  completed: boolean;
  xpReward: number;
  metadata: Json;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  xp: number;
  rank: number;
  trend?: 'up' | 'down' | 'steady';
  countryCode?: string;
  title: GamificationTitle;
}

export type LeaderboardScope = 'global' | 'friends' | 'local';

export type LeaderboardRange = 'weekly' | 'monthly' | 'all_time';

export interface RadarStat {
  key: 'brewing' | 'exploration' | 'social' | 'knowledge';
  value: number;
  average: number;
}

export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  prerequisites: string[];
  bonuses: Record<string, number>;
}

export interface GamificationStateSnapshot {
  userId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  skillPoints: number;
  comboMultiplier: number;
  doubleXpActive: boolean;
  title: GamificationTitle;
  streakDays: number;
  brewStreakDays: number;
  perfectWeek: boolean;
  freezeTokens: number;
  streakFrozenUntil?: string;
  radarStats: RadarStat[];
  skillTree: SkillTreeNode[];
}

export interface GamificationEvent {
  type: 'xp_gain' | 'level_up' | 'achievement_unlocked' | 'quest_completed' | 'streak_update';
  payload: Record<string, unknown>;
}

export interface SeasonalEventConfig {
  id: string;
  title: string;
  theme: string;
  startAt: string;
  endAt: string;
  bonusXpMultiplier: number;
  featuredAchievements: string[];
}

export interface AntiCheatReport {
  userId: string;
  timestamp: string;
  reason: 'rate_limit' | 'anomaly' | 'suspicious_pattern';
  details: Json;
}

export interface GamificationABTestAssignment {
  testName: string;
  variant: string;
  assignedAt: string;
}

export interface GamificationAnalyticsAdapter {
  track(event: GamificationEvent): Promise<void>;
}

export interface GamificationNotificationChannel {
  scheduleQuestReminder(quest: DailyQuestInstance): Promise<void>;
  cancelQuestReminder(questId: string): Promise<void>;
}

export interface GamificationSoundEffectManager {
  play(effect: 'level_up' | 'achievement' | 'quest_complete' | 'xp_gain'): Promise<void>;
}

export interface GamificationHaptics {
  success(): void;
  impact(): void;
  notification(): void;
}
