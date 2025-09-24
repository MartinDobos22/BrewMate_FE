/*
 * Centrálne úložisko gamifikácie využívajúce ľahkú implementáciu podobnú Zustandu.
 */
import {create} from '../utils/zustandLite';
import type {
  AchievementDefinition,
  AchievementProgress,
  DailyQuestInstance,
  DailyQuestProgress,
  GamificationStateSnapshot,
  GamificationTitle,
  LeaderboardEntry,
  RadarStats,
  SeasonalEvent,
  XpEvent,
} from '../types/gamification';

interface GamificationState {
  userId?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  title: GamificationTitle;
  skillPoints: number;
  streakDays: number;
  loginStreak: number;
  brewStreak: number;
  perfectWeek: boolean;
  freezeTokens: number;
  comboMultiplier: number;
  doubleXpUntil?: string;
  xpLog: XpEvent[];
  achievements: AchievementDefinition[];
  achievementProgress: Record<string, AchievementProgress>;
  dailyQuests: DailyQuestInstance[];
  questProgress: Record<string, DailyQuestProgress>;
  leaderboard: LeaderboardEntry[];
  radarStats?: RadarStats;
  seasonalEvent?: SeasonalEvent;
  lastInteraction?: string;
  initialized: boolean;
  init: (payload: Partial<GamificationState>) => void;
  setAchievements: (definitions: AchievementDefinition[]) => void;
  setDailyQuests: (quests: DailyQuestInstance[]) => void;
  updateStreaks: (payload: {login?: boolean; brew?: boolean; perfectWeek?: boolean; freezeUsed?: boolean}) => void;
  registerXp: (event: XpEvent) => {newLevel: number; leveledUp: boolean};
  registerQuestProgress: (progress: DailyQuestProgress) => void;
  registerAchievementProgress: (progress: AchievementProgress) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setRadarStats: (stats: RadarStats) => void;
  setSeasonalEvent: (event?: SeasonalEvent) => void;
  consumeSkillPoints: (amount: number) => boolean;
  getSnapshot: () => GamificationStateSnapshot | undefined;
}

const TITLES: GamificationTitle[] = [
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

const MAX_LEVEL = 50;

const computeXpForLevel = (level: number) => Math.round(100 * Math.pow(1.5, level - 1));

const gamificationStore = create<GamificationState>((set, get) => ({
  level: 1,
  xp: 0,
  xpToNextLevel: computeXpForLevel(1),
  title: TITLES[0],
  skillPoints: 0,
  streakDays: 0,
  loginStreak: 0,
  brewStreak: 0,
  perfectWeek: false,
  freezeTokens: 1,
  comboMultiplier: 1,
  xpLog: [],
  achievements: [],
  achievementProgress: {},
  dailyQuests: [],
  questProgress: {},
  leaderboard: [],
  initialized: false,
  init: (payload) => {
    set({
      ...payload,
      initialized: true,
      xpToNextLevel: computeXpForLevel(payload.level ?? 1),
      title: TITLES[Math.min(TITLES.length - 1, Math.floor(((payload.level ?? 1) - 1) / Math.ceil(MAX_LEVEL / TITLES.length)))],
      lastInteraction: new Date().toISOString(),
    });
  },
  registerXp: (event) => {
    const state = get();
    const isDoubleXp = state.doubleXpUntil
      ? new Date(state.doubleXpUntil).getTime() > new Date(event.timestamp).getTime()
      : false;
    const streakMultiplier = 1 + Math.min(2, state.streakDays / 7);
    const seasonalMultiplier = state.seasonalEvent?.bonusMultiplier ?? 1;
    const comboMultiplier = state.comboMultiplier;
    const totalMultiplier = (isDoubleXp ? 2 : 1) * streakMultiplier * seasonalMultiplier * comboMultiplier;
    const xpGain = Math.round(event.baseAmount * totalMultiplier);

    let newXp = state.xp + xpGain;
    let newLevel = state.level;
    let leveledUp = false;
    let skillPointsGain = 0;

    while (newLevel < MAX_LEVEL && newXp >= computeXpForLevel(newLevel)) {
      newXp -= computeXpForLevel(newLevel);
      newLevel += 1;
      leveledUp = true;
      if (newLevel % 5 === 0) {
        skillPointsGain += 1;
      }
    }

    const snapshotLevel = newLevel;
    const xpToNext = newLevel >= MAX_LEVEL ? 0 : computeXpForLevel(newLevel);

    set({
      level: snapshotLevel,
      xp: newXp,
      xpToNextLevel: xpToNext,
      skillPoints: state.skillPoints + skillPointsGain,
      xpLog: [...state.xpLog.slice(-49), event],
      title: TITLES[Math.min(TITLES.length - 1, Math.floor((snapshotLevel - 1) / Math.ceil(MAX_LEVEL / TITLES.length)))],
    });

    return {newLevel: snapshotLevel, leveledUp};
  },
  registerQuestProgress: (progress) => {
    set(({questProgress}) => ({
      questProgress: {...questProgress, [progress.questId]: progress},
      lastInteraction: new Date().toISOString(),
    }));
  },
  registerAchievementProgress: (progress) => {
    set(({achievementProgress}) => ({
      achievementProgress: {...achievementProgress, [progress.achievementId]: progress},
      lastInteraction: new Date().toISOString(),
    }));
  },
  setAchievements: (definitions) => set({achievements: definitions}),
  setDailyQuests: (quests) => set({dailyQuests: quests}),
  updateStreaks: ({login, brew, perfectWeek, freezeUsed}) => {
    set((state) => {
      const consumeFreeze = freezeUsed && state.freezeTokens > 0;
      const shouldResetLogin = login === false && !consumeFreeze;
      const shouldResetBrew = brew === false && !consumeFreeze;
      const nextLogin = login
        ? state.loginStreak + 1
        : shouldResetLogin
          ? 0
          : state.loginStreak;
      const nextBrew = brew
        ? state.brewStreak + 1
        : shouldResetBrew
          ? 0
          : state.brewStreak;
      const nextFreeze = consumeFreeze ? state.freezeTokens - 1 : state.freezeTokens;
      const nextStreakDays = login || brew ? state.streakDays + 1 : state.streakDays;
      const nextCombo = Math.min(3, 1 + nextStreakDays / 10);
      return {
        loginStreak: nextLogin,
        brewStreak: nextBrew,
        freezeTokens: nextFreeze,
        streakDays: nextStreakDays,
        comboMultiplier: nextCombo,
        perfectWeek: perfectWeek ?? state.perfectWeek,
      };
    });
  },
  setLeaderboard: (entries) => set({leaderboard: entries}),
  setRadarStats: (stats) => set({radarStats: stats}),
  setSeasonalEvent: (event) => set({seasonalEvent: event}),
  consumeSkillPoints: (amount) => {
    const state = get();
    if (state.skillPoints < amount) {
      return false;
    }
    set({skillPoints: state.skillPoints - amount});
    return true;
  },
  getSnapshot: () => {
    const state = get();
    if (!state.userId) {
      return undefined;
    }
    return {
      userId: state.userId,
      level: state.level,
      xp: state.xp,
      xpToNextLevel: state.xpToNextLevel,
      streakDays: state.streakDays,
      loginStreak: state.loginStreak,
      brewStreak: state.brewStreak,
      perfectWeek: state.perfectWeek,
      freezeTokens: state.freezeTokens,
      comboMultiplier: state.comboMultiplier,
      doubleXpActive: state.doubleXpUntil ? new Date(state.doubleXpUntil).getTime() > Date.now() : false,
      skillPoints: state.skillPoints,
      title: state.title,
    };
  },
}));

export default gamificationStore;
