/*
 * Pomocný hook pre prácu s gamifikačným úložiskom.
 */
import {useCallback} from 'react';
import gamificationStore from '../store/gamificationStore';
import GamificationEngine from '../services/gamification/GamificationEngine';
import type {DailyQuestProgress, XpEvent} from '../types/gamification';
import type {LeaderboardScope} from '../services/gamification/GamificationEngine';

export default function useGamification() {
  const state = gamificationStore();

  const initialize = useCallback(
    (userId: string, preferences: string[] = []) => GamificationEngine.initialize(userId, preferences),
    []
  );
  const handleXp = useCallback((event: XpEvent) => GamificationEngine.handleXpEvent(event), []);
  const updateQuest = useCallback(
    (progress: DailyQuestProgress & {userId: string}) => GamificationEngine.updateQuestProgress(progress),
    []
  );
  const refreshQuests = useCallback(
    (preferences: string[] = []) => GamificationEngine.refreshDailyQuests(preferences),
    []
  );
  const useFreeze = useCallback(() => GamificationEngine.useFreeze(), []);
  const featureAchievement = useCallback(
    (achievementId: string) => GamificationEngine.featureAchievement(achievementId),
    []
  );
  const loadLeaderboard = useCallback(
    (scope: LeaderboardScope) => GamificationEngine.loadLeaderboard(scope),
    []
  );

  return {
    state,
    initialize,
    handleXp,
    updateQuest,
    refreshQuests,
    useFreeze,
    featureAchievement,
    loadLeaderboard,
  };
}
