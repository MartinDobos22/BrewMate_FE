import type { GamificationStatePatch, GamificationStateSnapshot } from '../../types/gamification';

export enum XpSource {
  DailyQuest = 'daily_quest',
  Achievement = 'achievement',
  ManualGrant = 'manual_grant',
  BrewLogEntry = 'brew_log_entry',
}

export interface XpGrant {
  userId: string;
  baseAmount: number;
  source: XpSource;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface XpApplicationSuccess {
  kind: 'applied';
  baseAmount: number;
  appliedXp: number;
  doubleXpActive: boolean;
  comboMultiplier: number;
  comboCount: number;
  totalMultiplier: number;
  skillPointsEarned: number;
  patch: GamificationStatePatch;
  state: GamificationStateSnapshot;
  metadata: Record<string, unknown> | undefined;
}

export interface XpApplicationRejected {
  kind: 'rejected';
  reason: 'invalid' | 'rate_limit' | 'amount_limit';
}

export type XpApplicationOutcome = XpApplicationSuccess | XpApplicationRejected;

interface ComboState {
  count: number;
  lastTimestamp: number;
}

interface AntiCheatRule {
  windowMs: number;
  maxEvents: number;
  maxAmount?: number;
}

const COMBO_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_COMBO_COUNT = 5;
const COMBO_STEP = 0.25;

const createDefaultSnapshot = (
  userId: string,
  timestamp: Date,
): GamificationStateSnapshot => ({
  userId,
  totalXp: 0,
  level: 1,
  xpToNextLevel: 100,
  lifetimePoints: 0,
  unclaimedPoints: 0,
  streakCount: 0,
  longestStreak: 0,
  lastStreakResetAt: null,
  seasonId: null,
  seasonLevel: 1,
  seasonXp: 0,
  seasonPoints: 0,
  seasonRank: null,
  seasonTier: null,
  seasonBonusMultiplier: 1,
  seasonBonusExpiresAt: null,
  seasonXpToNextLevel: 100,
  boostMultiplier: 1,
  boostExpiresAt: null,
  lastUpdatedAt: timestamp.toISOString(),
  metadata: undefined,
});

const calculateXpThreshold = (level: number): number => 100 + Math.floor(Math.max(0, level - 1) * 20);

const extractNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export class XpEngine {
  private readonly comboState = new Map<string, ComboState>();
  private readonly history = new Map<string, number[]>();

  private readonly antiCheatRules: Partial<Record<XpSource, AntiCheatRule>> = {
    [XpSource.BrewLogEntry]: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxEvents: 8,
      maxAmount: 150,
    },
  };

  public reset(): void {
    this.comboState.clear();
    this.history.clear();
  }

  public applyXp(grant: XpGrant, state: GamificationStateSnapshot | null): XpApplicationOutcome {
    const { userId, baseAmount, source } = grant;
    if (!userId || baseAmount <= 0 || !Number.isFinite(baseAmount)) {
      return { kind: 'rejected', reason: 'invalid' };
    }

    const timestamp = grant.timestamp ?? new Date();
    const rule = this.antiCheatRules[source];
    const historyKey = `${userId}:${source}`;

    if (rule) {
      const now = timestamp.getTime();
      const entries = this.history.get(historyKey) ?? [];
      const filtered = entries.filter((value) => value > now - rule.windowMs);

      if (rule.maxAmount !== undefined && baseAmount > rule.maxAmount) {
        this.history.set(historyKey, filtered);
        return { kind: 'rejected', reason: 'amount_limit' };
      }

      if (filtered.length >= rule.maxEvents) {
        this.history.set(historyKey, filtered);
        return { kind: 'rejected', reason: 'rate_limit' };
      }

      filtered.push(now);
      this.history.set(historyKey, filtered);
    }

    const doubleXpActive = this.isDoubleXpWeekend(timestamp);
    const combo = this.getComboMultiplier(historyKey, timestamp.getTime());
    const totalMultiplier = (doubleXpActive ? 2 : 1) * combo.multiplier;
    const appliedXp = Math.max(1, Math.round(baseAmount * totalMultiplier));

    const baseState = state ? { ...state } : createDefaultSnapshot(userId, timestamp);

    const levelProgress = this.calculateLevelProgress(baseState.level, baseState.xpToNextLevel, appliedXp);
    const seasonProgress = this.calculateLevelProgress(
      baseState.seasonLevel ?? 1,
      baseState.seasonXpToNextLevel ?? 100,
      appliedXp,
    );

    const metadata: Record<string, unknown> = { ...(baseState.metadata ?? {}) };
    const previousSkillPoints = extractNumber(metadata['skillPoints']);
    const lastGrants = {
      source,
      baseAmount,
      appliedXp,
      timestamp: timestamp.toISOString(),
      doubleXpActive,
      comboMultiplier: combo.multiplier,
      comboCount: combo.count,
      metadata: grant.metadata ?? {},
    };

    metadata['skillPoints'] = previousSkillPoints + levelProgress.skillPointsEarned;
    metadata['lastXpGrant'] = lastGrants;

    const stateSnapshot: GamificationStateSnapshot = {
      ...baseState,
      totalXp: (baseState.totalXp ?? 0) + appliedXp,
      level: levelProgress.level,
      xpToNextLevel: levelProgress.xpToNextLevel,
      seasonXp: (baseState.seasonXp ?? 0) + appliedXp,
      seasonLevel: seasonProgress.level,
      seasonXpToNextLevel: seasonProgress.xpToNextLevel,
      unclaimedPoints: (baseState.unclaimedPoints ?? 0) + levelProgress.skillPointsEarned,
      metadata: this.cleanMetadata(metadata),
      lastUpdatedAt: timestamp.toISOString(),
    };

    const patch: GamificationStatePatch = {
      userId,
      totalXp: stateSnapshot.totalXp,
      level: stateSnapshot.level,
      xpToNextLevel: stateSnapshot.xpToNextLevel,
      seasonXp: stateSnapshot.seasonXp,
      seasonLevel: stateSnapshot.seasonLevel,
      seasonXpToNextLevel: stateSnapshot.seasonXpToNextLevel,
      unclaimedPoints: stateSnapshot.unclaimedPoints,
      metadata: stateSnapshot.metadata,
    };

    return {
      kind: 'applied',
      baseAmount,
      appliedXp,
      doubleXpActive,
      comboMultiplier: combo.multiplier,
      comboCount: combo.count,
      totalMultiplier,
      skillPointsEarned: levelProgress.skillPointsEarned,
      patch,
      state: stateSnapshot,
      metadata: stateSnapshot.metadata,
    };
  }

  private calculateLevelProgress(initialLevel: number | undefined, xpToNextLevel: number | undefined, appliedXp: number) {
    let level = initialLevel && initialLevel > 0 ? initialLevel : 1;
    let xpRequired = xpToNextLevel && xpToNextLevel > 0 ? xpToNextLevel : calculateXpThreshold(level);
    let remaining = appliedXp;
    let skillPointsEarned = 0;

    while (remaining >= xpRequired) {
      remaining -= xpRequired;
      level += 1;
      skillPointsEarned += 1;
      xpRequired = calculateXpThreshold(level);
    }

    const xpToNext = Math.max(10, xpRequired - remaining);

    return {
      level,
      xpToNextLevel: xpToNext,
      skillPointsEarned,
    };
  }

  private getComboMultiplier(key: string, timestamp: number) {
    const existing = this.comboState.get(key);
    if (!existing || timestamp - existing.lastTimestamp > COMBO_WINDOW_MS) {
      this.comboState.set(key, { count: 1, lastTimestamp: timestamp });
      return { multiplier: 1, count: 1 };
    }

    const nextCount = Math.min(existing.count + 1, MAX_COMBO_COUNT);
    const multiplier = 1 + (nextCount - 1) * COMBO_STEP;
    this.comboState.set(key, { count: nextCount, lastTimestamp: timestamp });
    return { multiplier, count: nextCount };
  }

  private isDoubleXpWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private cleanMetadata(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
    const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
}

export default XpEngine;
