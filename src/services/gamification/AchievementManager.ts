/*
 * Manažér achievementov - logika pre vyhodnocovanie a odmeny.
 */
import gamificationStore from '../../store/gamificationStore';
import type {
  AchievementDefinition,
  AchievementProgress,
  AnalyticsEvent,
  XpEvent,
} from '../../types/gamification';
import AnalyticsService from './AnalyticsService';

export default class AchievementManager {
  constructor(private definitions: AchievementDefinition[]) {}

  /**
   * Paralelne skontroluje všetky dostupné achievementy.
   */
  async evaluate(event: XpEvent) {
    const checks = this.definitions.map((definition) => this.evaluateAchievement(definition, event));
    await Promise.all(checks);
  }

  /**
   * Aktualizuje progres a zapisuje ho do úložiska.
   */
  private async evaluateAchievement(definition: AchievementDefinition, event: XpEvent) {
    const current = gamificationStore.getState().achievementProgress[definition.id];
    const progress = await this.resolveProgress(definition, event, current);
    if (!progress) {
      return;
    }

    gamificationStore.registerAchievementProgress(progress);

    if (progress.unlockedAt) {
      AnalyticsService.track({
        name: 'achievement_unlocked',
        timestamp: new Date().toISOString(),
        properties: {achievement: definition.code, userId: event.userId},
      } satisfies AnalyticsEvent);
    }
  }

  /**
   * Podľa kategórie vyhodnotí progres.
   */
  private async resolveProgress(
    definition: AchievementDefinition,
    event: XpEvent,
    current?: AchievementProgress
  ): Promise<AchievementProgress | undefined> {
    const existingProgress = current?.progress ?? 0;
    let nextProgress = existingProgress;

    switch (definition.code) {
      case 'first_brew':
        if (event.source === 'brew') {
          nextProgress = Math.max(existingProgress, 1);
        }
        break;
      case 'week_streak':
        if (event.metadata?.streak_days) {
          nextProgress = Number(event.metadata.streak_days);
        }
        break;
      case 'espresso_master':
        if (event.source === 'perfect_brew' && event.metadata?.method === 'espresso') {
          nextProgress = existingProgress + 1;
        }
        break;
      case 'latte_artist':
        if (event.metadata?.art_score) {
          nextProgress = Math.max(existingProgress, Number(event.metadata.art_score));
        }
        break;
      case 'bean_explorer':
        if (event.metadata?.country) {
          nextProgress = existingProgress + Number(event.metadata.country_new ? 1 : 0);
        }
        break;
      case 'helpful_barista':
        if (event.source === 'help_others') {
          nextProgress = existingProgress + 1;
        }
        break;
      case 'night_owl':
        if (event.metadata?.brew_hour !== undefined && Number(event.metadata.brew_hour) >= 22) {
          nextProgress = 1;
        }
        break;
      case 'perfectionist':
        if (event.source === 'perfect_brew') {
          nextProgress = existingProgress + 1;
        }
        break;
      default:
        nextProgress = existingProgress + 1;
    }

    const unlocked = this.checkThreshold(definition.thresholds, nextProgress) && !current?.unlockedAt;
    const progress: AchievementProgress = {
      userId: event.userId,
      achievementId: definition.id,
      progress: nextProgress,
      unlockedAt: unlocked ? new Date().toISOString() : current?.unlockedAt,
      featured: current?.featured ?? false,
    };

    return progress;
  }

  /**
   * Zistí či bol dosiahnutý nejaký míľnik.
   */
  private checkThreshold(thresholds: number[], value: number) {
    return thresholds.some((threshold) => value >= threshold);
  }

  /**
   * Nastaví featured odznak.
   */
  featureBadge(achievementId: string) {
    const state = gamificationStore.getState();
    const progress = state.achievementProgress[achievementId];
    if (!progress || !progress.unlockedAt) {
      return;
    }
    gamificationStore.registerAchievementProgress({...progress, featured: true});
  }
}
