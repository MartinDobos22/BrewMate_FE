/*
 * Trieda zodpovedná za výpočet skúseností, titulov a odmien.
 */
import type {
  ComboMultiplierConfig,
  GamificationTitle,
  LevelDefinition,
  XpEvent,
  XpSource,
} from '../../types/gamification';

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

const XP_PER_SOURCE: Record<XpSource, number> = {
  brew: 10,
  perfect_brew: 50,
  help_others: 15,
  bean_review: 12,
  new_method: 25,
  share_story: 8,
  event_bonus: 30,
};

const MAX_LEVEL = 50;

export default class XpSystem {
  private comboConfig: ComboMultiplierConfig;

  constructor(comboConfig?: Partial<ComboMultiplierConfig>) {
    this.comboConfig = {
      base: comboConfig?.base ?? 1,
      max: comboConfig?.max ?? 3,
      streakStep: comboConfig?.streakStep ?? 5,
    };
  }

  /**
   * Vypočíta potrebné XP pre daný level podľa exponenciálnej krivky.
   */
  getRequiredXp(level: number) {
    return Math.round(100 * Math.pow(1.5, level - 1));
  }

  /**
   * Vráti detaily levelov vrátane odmien.
   */
  getLevelDefinitions(): LevelDefinition[] {
    return Array.from({length: MAX_LEVEL}, (_, index) => {
      const level = index + 1;
      const xpRequired = this.getRequiredXp(level);
      const titleIndex = Math.min(TITLES.length - 1, Math.floor((level - 1) / Math.ceil(MAX_LEVEL / TITLES.length)));
      return {
        level,
        xpRequired,
        title: TITLES[titleIndex],
        rewards: {
          skillPoints: level % 5 === 0 ? 1 : 0,
          perks: level % 10 === 0 ? ['seasonal_badge'] : [],
        },
      };
    });
  }

  /**
   * Vypočíta výsledné XP po aplikovaní násobiteľov.
   */
  calculateXpGain(event: XpEvent, options: {comboMultiplier: number; streakDays: number; doubleXpActive: boolean}) {
    const base = XP_PER_SOURCE[event.source] ?? event.baseAmount;
    const streakMultiplier = 1 + Math.min(2, options.streakDays / this.comboConfig.streakStep);
    const doubleXp = options.doubleXpActive ? 2 : 1;
    const combo = Math.min(options.comboMultiplier, this.comboConfig.max);
    const total = base * streakMultiplier * doubleXp * combo;
    return Math.round(total);
  }

  /**
   * Zistí či aktuálny deň spadá do víkendu a teda poskytuje double XP.
   */
  isDoubleXpWeekend(date: Date = new Date()) {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  /**
   * Vypočíta nový kombo násobiteľ na základe počtu dní streaku.
   */
  getComboMultiplier(streakDays: number) {
    const bonus = Math.floor(streakDays / this.comboConfig.streakStep) * 0.25;
    return Math.min(this.comboConfig.max, this.comboConfig.base + bonus);
  }

  /**
   * Nájde titul prislúchajúci levelu.
   */
  getTitleForLevel(level: number): GamificationTitle {
    const titleIndex = Math.min(TITLES.length - 1, Math.floor((level - 1) / Math.ceil(MAX_LEVEL / TITLES.length)));
    return TITLES[titleIndex];
  }

  /**
   * Vyhodnotí, či hráč postúpil na vyšší level a koľko XP má zostať.
   */
  processXp(currentLevel: number, currentXp: number, xpGain: number) {
    let xp = currentXp + xpGain;
    let level = currentLevel;
    let skillPoints = 0;
    let leveledUp = false;

    while (level < MAX_LEVEL && xp >= this.getRequiredXp(level)) {
      xp -= this.getRequiredXp(level);
      level += 1;
      leveledUp = true;
      if (level % 5 === 0) {
        skillPoints += 1;
      }
    }

    const xpToNext = level >= MAX_LEVEL ? 0 : this.getRequiredXp(level);

    return {
      level,
      xp,
      xpToNext,
      skillPoints,
      leveledUp,
      title: this.getTitleForLevel(level),
    };
  }
}
