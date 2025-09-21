import { isWeekend } from 'date-fns';
import type { StoreApi } from 'zustand';
import {
  type GamificationAnalyticsAdapter,
  type GamificationHaptics,
  type GamificationSoundEffectManager,
  type GamificationTitle,
  type XpSource,
} from '../../types/gamification';
import type { GamificationStoreState } from '../../hooks/useGamificationStore';

const TITLES: GamificationTitle[] = [
  'Coffee Curious',
  'Bean Explorer',
  'Flavor Scholar',
  'Extraction Tactician',
  'Aroma Virtuoso',
  'Roast Strategist',
  'Sensory Sage',
  'Mythic Alchemist',
  'Legendary Brewmaster',
];

interface ApplyXpOptions {
  source: XpSource;
  baseAmount: number;
  metadata?: Record<string, unknown>;
}

interface XpEngineDependencies {
  store: StoreApi<GamificationStoreState>;
  analytics: GamificationAnalyticsAdapter;
  haptics: GamificationHaptics;
  sounds: GamificationSoundEffectManager;
  seasonalMultiplier?: () => number;
  isDoubleXpOverride?: () => boolean;
}

/**
 * Hlavný engine pre XP systém vrátane double XP víkendov a combo násobiča.
 */
export class XpEngine {
  constructor(private readonly deps: XpEngineDependencies) {}

  /**
   * Exponenciálna XP krivka podľa zadania.
   */
  calculateXpForLevel(level: number): number {
    return Math.round(100 * Math.pow(1.5, level - 1));
  }

  /**
   * Odvodzuje titul podľa levelu.
   */
  getTitleForLevel(level: number): GamificationTitle {
    const index = Math.min(TITLES.length - 1, Math.floor((level - 1) / Math.ceil(50 / TITLES.length)));
    return TITLES[index];
  }

  /**
   * Násobič podľa streaku (max 2x pri 30+ dňoch).
   */
  getComboMultiplier(streakDays: number): number {
    if (streakDays <= 0) {
      return 1;
    }
    const capped = Math.min(30, streakDays);
    return 1 + capped * 0.03;
  }

  private isDoubleXpActive(): boolean {
    if (this.deps.isDoubleXpOverride?.()) {
      return true;
    }
    return isWeekend(new Date());
  }

  /**
   * Hlavná metóda pre aplikovanie XP.
   */
  async applyXp({ source, baseAmount, metadata }: ApplyXpOptions): Promise<void> {
    const state = this.deps.store.getState();
    const seasonalMultiplier = this.deps.seasonalMultiplier?.() ?? 1;
    const comboMultiplier = this.getComboMultiplier(state.streakDays);
    const doubleXp = this.isDoubleXpActive() || state.doubleXpActive;
    const doubleMultiplier = doubleXp ? 2 : 1;
    const totalGain = Math.round(baseAmount * comboMultiplier * doubleMultiplier * seasonalMultiplier);

    let level = state.level;
    let currentXp = state.currentXp + totalGain;
    let xpToNext = this.calculateXpForLevel(level);
    let skillPoints = state.skillPoints;
    let leveledUp = false;

    while (currentXp >= xpToNext && level < 50) {
      currentXp -= xpToNext;
      level += 1;
      xpToNext = this.calculateXpForLevel(level);
      if (level % 5 === 0) {
        skillPoints += 1;
      }
      leveledUp = true;
    }

    this.deps.store.setState({
      currentXp,
      level,
      xpToNextLevel: xpToNext,
      skillPoints,
      comboMultiplier,
      doubleXpActive: doubleXp,
      title: this.getTitleForLevel(level),
    });

    await this.deps.analytics.track({
      type: 'xp_gain',
      payload: {
        source,
        baseAmount,
        totalGain,
        comboMultiplier,
        doubleXp,
        seasonalMultiplier,
        level,
        metadata,
      },
    });

    this.deps.haptics.impact();
    await this.deps.sounds.play('xp_gain');

    if (leveledUp) {
      this.deps.haptics.notification();
      await this.deps.sounds.play('level_up');
      await this.deps.analytics.track({
        type: 'level_up',
        payload: {
          level,
          skillPoints,
        },
      });
    }
  }
}
