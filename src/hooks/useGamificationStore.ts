import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AchievementDefinition,
  AchievementProgress,
  DailyQuestInstance,
  GamificationStateSnapshot,
  GamificationTitle,
  LeaderboardEntry,
  LeaderboardRange,
  LeaderboardScope,
  RadarStat,
  SeasonalEventConfig,
  SkillTreeNode,
} from '../types/gamification';

/**
 * Rozhranie opisujúce stav gamifikácie.
 */
interface GamificationState {
  userId: string | null;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  skillPoints: number;
  title: GamificationTitle;
  comboMultiplier: number;
  doubleXpActive: boolean;
  streakDays: number;
  brewStreakDays: number;
  perfectWeek: boolean;
  freezeTokens: number;
  skillTree: SkillTreeNode[];
  achievements: AchievementProgress[];
  achievementDefinitions: AchievementDefinition[];
  featuredAchievements: string[];
  dailyQuests: DailyQuestInstance[];
  leaderboard: Record<`${LeaderboardScope}:${LeaderboardRange}`, LeaderboardEntry[]>;
  radarStats: RadarStat[];
  seasonalEvents: SeasonalEventConfig[];
  initialized: boolean;
  lastSyncAt?: string;
  pendingXpQueue: { source: string; amount: number; timestamp: string }[];
  setUser(userId: string | null): void;
  hydrate(snapshot: GamificationStateSnapshot): void;
  setInitialized(value: boolean): void;
  addXp(amount: number, xpToNextLevel: number, comboMultiplier: number): void;
  setLevel(level: number): void;
  setSkillPoints(points: number): void;
  spendSkillPoint(nodeId: string): void;
  setDoubleXp(active: boolean): void;
  setTitle(title: GamificationTitle): void;
  updateStreaks(params: { streakDays: number; brewStreakDays: number; perfectWeek: boolean; freezeTokens: number }): void;
  setAchievements(achievements: AchievementProgress[]): void;
  setAchievementDefinitions(definitions: AchievementDefinition[]): void;
  updateAchievementProgress(progress: AchievementProgress): void;
  setFeaturedAchievements(ids: string[]): void;
  setDailyQuests(quests: DailyQuestInstance[]): void;
  updateQuestProgress(questId: string, data: Partial<DailyQuestInstance>): void;
  setLeaderboard(key: `${LeaderboardScope}:${LeaderboardRange}`, entries: LeaderboardEntry[]): void;
  setRadarStats(stats: RadarStat[]): void;
  setSeasonalEvents(events: SeasonalEventConfig[]): void;
  enqueueXp(source: string, amount: number): void;
  flushXpQueue(): { source: string; amount: number; timestamp: string }[];
}

/**
 * Východiskový stav gamifikácie pre nového používateľa.
 */
const DEFAULT_STATE: Omit<GamificationState, keyof GamificationStateSnapshot | 'setUser' | 'hydrate' | 'setInitialized' | 'addXp' | 'setLevel' | 'setSkillPoints' | 'spendSkillPoint' | 'setDoubleXp' | 'setTitle' | 'updateStreaks' | 'setAchievements' | 'updateAchievementProgress' | 'setDailyQuests' | 'updateQuestProgress' | 'setLeaderboard' | 'setRadarStats' | 'setSeasonalEvents' | 'enqueueXp' | 'flushXpQueue'> = {
  userId: null,
  level: 1,
  currentXp: 0,
  xpToNextLevel: 100,
  skillPoints: 0,
  title: 'Coffee Curious',
  comboMultiplier: 1,
  doubleXpActive: false,
  streakDays: 0,
  brewStreakDays: 0,
  perfectWeek: false,
  freezeTokens: 0,
  skillTree: [],
  achievements: [],
  achievementDefinitions: [],
  featuredAchievements: [],
  dailyQuests: [],
  leaderboard: {},
  radarStats: [],
  seasonalEvents: [],
  initialized: false,
  pendingXpQueue: [],
};

/**
 * Zustand store pre gamifikačný stav aplikácie.
 */
export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setUser(userId) {
        set({ userId });
      },
      hydrate(snapshot) {
        set({
          userId: snapshot.userId,
          level: snapshot.level,
          currentXp: snapshot.currentXp,
          xpToNextLevel: snapshot.xpToNextLevel,
          skillPoints: snapshot.skillPoints,
          comboMultiplier: snapshot.comboMultiplier,
          doubleXpActive: snapshot.doubleXpActive,
          title: snapshot.title,
          streakDays: snapshot.streakDays,
          brewStreakDays: snapshot.brewStreakDays,
          perfectWeek: snapshot.perfectWeek,
          freezeTokens: snapshot.freezeTokens,
          radarStats: snapshot.radarStats,
          skillTree: snapshot.skillTree,
        });
      },
      setInitialized(value) {
        set({ initialized: value, lastSyncAt: new Date().toISOString() });
      },
      addXp(amount, xpToNextLevel, comboMultiplier) {
        set((state) => ({
          currentXp: Math.max(0, state.currentXp + amount),
          xpToNextLevel,
          comboMultiplier,
        }));
      },
      setLevel(level) {
        set({ level });
      },
      setSkillPoints(points) {
        set({ skillPoints: points });
      },
      spendSkillPoint(nodeId) {
        set((state) => {
          if (state.skillPoints <= 0) {
            return state;
          }
          return {
            skillPoints: state.skillPoints - 1,
            skillTree: state.skillTree.map((node) =>
              node.id === nodeId ? { ...node, unlocked: true } : node,
            ),
          };
        });
      },
      setDoubleXp(active) {
        set({ doubleXpActive: active });
      },
      setTitle(title) {
        set({ title });
      },
      updateStreaks({ streakDays, brewStreakDays, perfectWeek, freezeTokens }) {
        set({ streakDays, brewStreakDays, perfectWeek, freezeTokens });
      },
      setAchievements(achievements) {
        set({ achievements });
      },
      setAchievementDefinitions(definitions) {
        set({ achievementDefinitions: definitions });
      },
      setFeaturedAchievements(ids) {
        set({ featuredAchievements: ids });
      },
      updateAchievementProgress(progress) {
        set((state) => ({
          achievements: state.achievements.some((item) => item.achievementId === progress.achievementId)
            ? state.achievements.map((item) =>
                item.achievementId === progress.achievementId ? { ...item, ...progress } : item,
              )
            : [...state.achievements, progress],
        }));
      },
      setDailyQuests(quests) {
        set({ dailyQuests: quests });
      },
      updateQuestProgress(questId, data) {
        set((state) => ({
          dailyQuests: state.dailyQuests.map((quest) =>
            quest.id === questId ? { ...quest, ...data } : quest,
          ),
        }));
      },
      setLeaderboard(key, entries) {
        set((state) => ({ leaderboard: { ...state.leaderboard, [key]: entries } }));
      },
      setRadarStats(stats) {
        set({ radarStats: stats });
      },
      setSeasonalEvents(events) {
        set({ seasonalEvents: events });
      },
      enqueueXp(source, amount) {
        set((state) => ({
          pendingXpQueue: [
            ...state.pendingXpQueue,
            { source, amount, timestamp: new Date().toISOString() },
          ].slice(-50),
        }));
      },
      flushXpQueue() {
        const queue = get().pendingXpQueue;
        set({ pendingXpQueue: [] });
        return queue;
      },
    }),
    {
      name: 'brewmate-gamification-state',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        userId: state.userId,
        level: state.level,
        currentXp: state.currentXp,
        xpToNextLevel: state.xpToNextLevel,
        skillPoints: state.skillPoints,
        title: state.title,
        comboMultiplier: state.comboMultiplier,
        doubleXpActive: state.doubleXpActive,
        streakDays: state.streakDays,
        brewStreakDays: state.brewStreakDays,
        perfectWeek: state.perfectWeek,
        freezeTokens: state.freezeTokens,
        skillTree: state.skillTree,
        achievements: state.achievements,
        achievementDefinitions: state.achievementDefinitions,
        featuredAchievements: state.featuredAchievements,
        dailyQuests: state.dailyQuests,
        seasonalEvents: state.seasonalEvents,
        radarStats: state.radarStats,
      }),
      version: 2,
      migrate: async (persistedState, version) => {
        if (version < 2) {
          return {
            ...DEFAULT_STATE,
            ...persistedState,
            seasonalEvents: [],
            radarStats: persistedState?.radarStats ?? [],
          } satisfies Partial<GamificationState>;
        }
        return persistedState as GamificationState;
      },
    },
  ),
);

export type GamificationStoreState = ReturnType<typeof useGamificationStore.getState>;
