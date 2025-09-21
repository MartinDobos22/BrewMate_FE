import type { StoreApi } from 'zustand';
import type {
  AchievementDefinition,
  AchievementProgress,
  GamificationAnalyticsAdapter,
  GamificationHaptics,
  GamificationSoundEffectManager,
} from '../../types/gamification';
import type { GamificationStoreState } from '../../hooks/useGamificationStore';
import { randomId } from '../../utils/randomId';
import { SupabaseGamificationAdapter } from './SupabaseGamificationAdapter';
import { XpEngine } from './XpEngine';

export interface AchievementEventContext {
  type:
    | 'brew_completed'
    | 'perfect_brew'
    | 'daily_streak'
    | 'social_share'
    | 'exploration'
    | 'mentor_help'
    | 'night_brew'
    | 'consistency'
    | 'hidden_trigger';
  amount?: number;
  metadata?: Record<string, unknown>;
}

interface AchievementManagerDeps {
  store: StoreApi<GamificationStoreState>;
  supabase: SupabaseGamificationAdapter;
  xpEngine: XpEngine;
  analytics: GamificationAnalyticsAdapter;
  sounds: GamificationSoundEffectManager;
  haptics: GamificationHaptics;
}

const FALLBACK_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-brew',
    name: 'First Brew',
    description: 'Dokonči prvý zápis kávy',
    category: 'beginner',
    rarity: 'common',
    milestones: [1],
    rewardXp: 50,
  },
  {
    id: 'week-streak',
    name: 'Week Streak',
    description: 'Udrž si 7 dňový streak',
    category: 'beginner',
    rarity: 'common',
    milestones: [7],
    rewardXp: 120,
  },
  {
    id: 'espresso-master',
    name: 'Espresso Master',
    description: 'Dosiahni 50 perfektných extrakcií',
    category: 'skills',
    rarity: 'epic',
    milestones: [10, 25, 50],
    rewardXp: 400,
    rewardSkillPoints: 1,
    featureUnlock: 'advanced_espresso_insights',
  },
  {
    id: 'latte-artist',
    name: 'Latte Artist',
    description: 'Zdieľaj 20 latté fotografií',
    category: 'skills',
    rarity: 'rare',
    milestones: [5, 10, 20],
    rewardXp: 250,
  },
  {
    id: 'bean-explorer',
    name: 'Bean Explorer',
    description: 'Objav zrná z 10 krajín',
    category: 'exploration',
    rarity: 'rare',
    milestones: [3, 6, 10],
    rewardXp: 300,
  },
  {
    id: 'method-master',
    name: 'Method Master',
    description: 'Vyskúšaj 6 rôznych brew metód',
    category: 'exploration',
    rarity: 'epic',
    milestones: [3, 6],
    rewardXp: 260,
  },
  {
    id: 'helpful-barista',
    name: 'Helpful Barista',
    description: 'Pomôž komunite minimálne 10 krát',
    category: 'social',
    rarity: 'rare',
    milestones: [3, 6, 10],
    rewardXp: 240,
    rewardSkillPoints: 1,
  },
  {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Zdieľaj 15 odporúčaní receptov',
    category: 'social',
    rarity: 'epic',
    milestones: [5, 10, 15],
    rewardXp: 320,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Uvar kávu medzi 23:00 a 02:00',
    category: 'hidden',
    rarity: 'legendary',
    milestones: [1],
    rewardXp: 500,
    isHidden: true,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: '5 perfektných brew v jednom týždni',
    category: 'hidden',
    rarity: 'legendary',
    milestones: [5],
    rewardXp: 650,
    rewardSkillPoints: 2,
  },
];

/**
 * Správca achievementov zabezpečuje logiku progresu a odmien.
 */
export class AchievementManager {
  private definitions: Map<string, AchievementDefinition> = new Map();

  constructor(private readonly deps: AchievementManagerDeps) {}

  async initialize(): Promise<void> {
    const definitions = await this.deps.supabase.fetchAchievements();
    const finalDefinitions = definitions.length > 0 ? definitions : FALLBACK_ACHIEVEMENTS;
    this.definitions = new Map(finalDefinitions.map((item) => [item.id, item]));
    const storeState = this.deps.store.getState();
    if (typeof storeState.setAchievementDefinitions === 'function') {
      storeState.setAchievementDefinitions(finalDefinitions);
    }

    if (definitions.length === 0) {
      console.info('AchievementManager: používam fallback definície');
    }
  }

  /**
   * Aktualizuje progres konkrétneho achievementu.
   */
  private async updateProgress(definition: AchievementDefinition, increment: number): Promise<void> {
    const current = this.deps.store
      .getState()
      .achievements.find((item) => item.achievementId === definition.id);

    const progressValue = Math.max(0, (current?.progress ?? 0) + increment);
    const completedMilestones = new Set(current?.completedMilestones ?? []);

    definition.milestones.forEach((milestone) => {
      if (progressValue >= milestone) {
        completedMilestones.add(milestone);
      }
    });

    const unlocked = completedMilestones.size === definition.milestones.length;
    const updated: AchievementProgress = {
      achievementId: definition.id,
      progress: progressValue,
      completedMilestones: Array.from(completedMilestones).sort((a, b) => a - b),
      unlockedAt: unlocked ? current?.unlockedAt ?? new Date().toISOString() : current?.unlockedAt,
      featured: current?.featured ?? false,
    };

    this.deps.store.getState().updateAchievementProgress(updated);
    await this.deps.supabase.updateAchievement(updated);

    if (unlocked && (!current || !current.unlockedAt)) {
      await this.handleCompletion(definition, updated);
    }
  }

  private async handleCompletion(definition: AchievementDefinition, progress: AchievementProgress) {
    this.deps.haptics.success();
    await this.deps.sounds.play('achievement');
    await this.deps.analytics.track({
      type: 'achievement_unlocked',
      payload: {
        id: definition.id,
        rarity: definition.rarity,
        category: definition.category,
      },
    });

    if (definition.rewardXp > 0) {
      await this.deps.xpEngine.applyXp({ source: 'event_reward', baseAmount: definition.rewardXp });
    }
    if (definition.rewardSkillPoints) {
      const { skillPoints } = this.deps.store.getState();
      this.deps.store.setState({ skillPoints: skillPoints + definition.rewardSkillPoints });
    }

    if (definition.featureUnlock) {
      console.info('AchievementManager: odomknutá funkcia', definition.featureUnlock);
    }

    const state = this.deps.store.getState();
    if (typeof state.setFeaturedAchievements === 'function') {
      const featured = Array.from(new Set([...(state.featuredAchievements ?? []), definition.id])).slice(0, 6);
      state.setFeaturedAchievements(featured);
    }
  }

  /**
   * Vyhodnotenie viacnásobných spúšťačov paralelne.
   */
  async evaluate(events: AchievementEventContext[]): Promise<void> {
    await Promise.all(
      events.map(async (event) => {
        switch (event.type) {
          case 'brew_completed':
            await this.track('first-brew', 1);
            break;
          case 'perfect_brew':
            await Promise.all([
              this.track('espresso-master', event.amount ?? 1),
              this.track('perfectionist', event.metadata?.weeklyPerfects ? Number(event.metadata.weeklyPerfects) : 0),
            ]);
            break;
          case 'daily_streak':
            await this.track('week-streak', event.amount ?? 1);
            break;
          case 'social_share':
            await Promise.all([
              this.track('latte-artist', event.amount ?? 1),
              this.track('trendsetter', event.amount ?? 1),
            ]);
            break;
          case 'exploration':
            await Promise.all([
              this.track('bean-explorer', event.metadata?.countriesDiscovered ? Number(event.metadata.countriesDiscovered) : 1),
              this.track('method-master', event.metadata?.methodsDiscovered ? Number(event.metadata.methodsDiscovered) : 0),
            ]);
            break;
          case 'mentor_help':
            await this.track('helpful-barista', event.amount ?? 1);
            break;
          case 'night_brew':
            await this.track('night-owl', 1);
            break;
          case 'consistency':
            await this.track('perfectionist', event.amount ?? 1);
            break;
          case 'hidden_trigger':
            if (event.metadata?.achievementId) {
              await this.track(String(event.metadata.achievementId), event.amount ?? 1);
            }
            break;
          default:
            break;
        }
      }),
    );
  }

  private async track(id: string, increment: number): Promise<void> {
    if (increment <= 0) {
      return;
    }
    const definition = this.definitions.get(id);
    if (!definition) {
      return;
    }
    await this.updateProgress(definition, increment);
  }

  /**
   * Vytvorí placeholder achievement ak chýba v supabase (pre debug účely).
   */
  async ensureAchievement(definition: AchievementDefinition): Promise<void> {
    if (this.definitions.has(definition.id)) {
      return;
    }
    await this.deps.supabase.updateAchievement({
      achievementId: definition.id,
      progress: 0,
      completedMilestones: [],
    });
    this.definitions.set(definition.id, definition);
  }

  /**
   * Pomocná metóda na vytvorenie dočasného achievementu.
   */
  static createCustomAchievement(partial: Partial<AchievementDefinition>): AchievementDefinition {
    return {
      id: partial.id ?? randomId({ prefix: 'ach', length: 8 }),
      name: partial.name ?? 'Custom Achievement',
      description: partial.description ?? 'Dočasná výzva',
      category: partial.category ?? 'hidden',
      rarity: partial.rarity ?? 'rare',
      milestones: partial.milestones ?? [1],
      rewardXp: partial.rewardXp ?? 100,
      rewardSkillPoints: partial.rewardSkillPoints,
      featureUnlock: partial.featureUnlock,
      isHidden: partial.isHidden ?? false,
    };
  }
}

