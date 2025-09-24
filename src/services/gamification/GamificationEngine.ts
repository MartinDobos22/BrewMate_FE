/*
 * Orchestrácia všetkých gamifikačných súčastí.
 */
import gamificationStore from '../../store/gamificationStore';
import type {
  DailyQuestProgress,
  GamificationStateSnapshot,
  XpEvent,
} from '../../types/gamification';
import AchievementManager from './AchievementManager';
import DailyQuestGenerator from './DailyQuestGenerator';
import GamificationRepository from './GamificationRepository';
import QuestNotificationService from './QuestNotificationService';
import XpSystem from './XpSystem';
import HapticsService from './HapticsService';
import SoundEffectService from './SoundEffectService';
import AnalyticsService from './AnalyticsService';

class GamificationEngine {
  private xpSystem = new XpSystem();

  private repository = new GamificationRepository();

  private questGenerator = new DailyQuestGenerator();

  private achievementManager?: AchievementManager;

  useFreeze() {
    const state = gamificationStore.getState();
    if (state.freezeTokens <= 0) {
      return false;
    }
    gamificationStore.updateStreaks({freezeUsed: true});
    return true;
  }

  async initialize(userId: string, preferences: string[] = []) {
    const [stateSnapshot, achievementDefinitions, seasonalEvent] = await Promise.all([
      this.repository.fetchUserState(userId),
      this.repository.fetchAchievements(),
      this.repository.fetchSeasonalEvent(),
    ]);

    gamificationStore.init({
      userId,
      level: stateSnapshot?.level ?? 1,
      xp: stateSnapshot?.xp ?? 0,
      xpToNextLevel: stateSnapshot?.xpToNextLevel ?? this.xpSystem.getRequiredXp(1),
      skillPoints: stateSnapshot?.skillPoints ?? 0,
      streakDays: stateSnapshot?.streakDays ?? 0,
      loginStreak: stateSnapshot?.loginStreak ?? 0,
      brewStreak: stateSnapshot?.brewStreak ?? 0,
      perfectWeek: stateSnapshot?.perfectWeek ?? false,
      freezeTokens: stateSnapshot?.freezeTokens ?? 1,
      comboMultiplier: stateSnapshot?.comboMultiplier ?? this.xpSystem.getComboMultiplier(0),
      doubleXpUntil: stateSnapshot?.doubleXpActive ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() : undefined,
    });

    if (this.xpSystem.isDoubleXpWeekend() && !stateSnapshot?.doubleXpActive) {
      const weekendEnd = new Date();
      weekendEnd.setUTCHours(23, 59, 59, 999);
      gamificationStore.setState({doubleXpUntil: weekendEnd.toISOString()});
    }

    gamificationStore.setAchievements(achievementDefinitions);
    gamificationStore.setSeasonalEvent(seasonalEvent);

    this.achievementManager = new AchievementManager(achievementDefinitions);

    const quests = this.questGenerator.generate(userId, gamificationStore.getState().level, preferences);
    gamificationStore.setDailyQuests(quests);
    QuestNotificationService.scheduleQuestReminders(quests);

    AnalyticsService.assignVariant('gamification_onboarding', userId);
    SoundEffectService.preload('level_up', 'assets/sounds/level-up.mp3');
    SoundEffectService.preload('xp_gain', 'assets/sounds/xp-gain.mp3');
    SoundEffectService.preload('quest_complete', 'assets/sounds/quest-complete.mp3');
  }

  async handleXpEvent(event: XpEvent) {
    const state = gamificationStore.getState();
    if (!state.initialized) {
      throw new Error('Gamification engine not initialized');
    }

    const xpGain = this.xpSystem.calculateXpGain(event, {
      comboMultiplier: state.comboMultiplier,
      streakDays: state.streakDays,
      doubleXpActive: state.doubleXpUntil ? new Date(state.doubleXpUntil).getTime() > Date.now() : this.xpSystem.isDoubleXpWeekend(),
    });

    const outcome = this.xpSystem.processXp(state.level, state.xp, xpGain);

    gamificationStore.registerXp({...event, baseAmount: xpGain});
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    if (event.source === 'brew' || event.source === 'perfect_brew') {
      gamificationStore.updateStreaks({brew: true});
    }
    if (typeof metadata.login === 'boolean' && metadata.login) {
      gamificationStore.updateStreaks({login: true});
    }
    if (typeof metadata.perfect_week === 'boolean' && metadata.perfect_week) {
      gamificationStore.updateStreaks({perfectWeek: true});
    }
    const updated = gamificationStore.getState();

    if (outcome.leveledUp) {
      HapticsService.triggerImpact('heavy');
      SoundEffectService.play('level_up');
    } else {
      HapticsService.triggerImpact('light');
      SoundEffectService.play('xp_gain');
    }

    const snapshot: GamificationStateSnapshot = {
      userId: event.userId,
      level: outcome.level,
      xp: outcome.xp,
      xpToNextLevel: outcome.xpToNext,
      streakDays: updated.streakDays,
      loginStreak: updated.loginStreak,
      brewStreak: updated.brewStreak,
      perfectWeek: updated.perfectWeek,
      freezeTokens: updated.freezeTokens,
      comboMultiplier: updated.comboMultiplier,
      doubleXpActive: updated.doubleXpUntil ? new Date(updated.doubleXpUntil).getTime() > Date.now() : false,
      skillPoints: updated.skillPoints,
      title: outcome.title,
    };
    await this.repository.upsertUserState(snapshot);

    if (this.achievementManager) {
      await this.achievementManager.evaluate(event);
    }
  }

  async updateQuestProgress(progress: DailyQuestProgress & {userId: string}) {
    gamificationStore.registerQuestProgress(progress);
    await this.repository.syncQuestProgress(progress);
    if (progress.completed && !progress.claimed) {
      HapticsService.triggerImpact('medium');
      SoundEffectService.play('quest_complete');
      AnalyticsService.track({
        name: 'quest_completed',
        timestamp: new Date().toISOString(),
        properties: {questId: progress.questId, userId: progress.userId},
      });
    }
  }

  async refreshDailyQuests(preferences: string[] = []) {
    const state = gamificationStore.getState();
    if (!state.userId) {
      return;
    }
    const quests = this.questGenerator.generate(state.userId, state.level, preferences);
    gamificationStore.setDailyQuests(quests);
    QuestNotificationService.scheduleQuestReminders(quests);
  }
}

export default new GamificationEngine();
