/*
 * Pomocný hook pre prácu s gamifikačným úložiskom.
 */
import {useCallback} from 'react';
import gamificationStore from '../store/gamificationStore';
import GamificationEngine from '../services/gamification/GamificationEngine';
import type {DailyQuestProgress, XpEvent} from '../types/gamification';

export default function useGamification() {
  const state = gamificationStore();

  const handleXp = useCallback((event: XpEvent) => GamificationEngine.handleXpEvent(event), []);
  const updateQuest = useCallback(
    (progress: DailyQuestProgress & {userId: string}) => GamificationEngine.updateQuestProgress(progress),
    []
  );
  const refreshQuests = useCallback(() => GamificationEngine.refreshDailyQuests(), []);
  const useFreeze = useCallback(() => GamificationEngine.useFreeze(), []);

  return {
    state,
    handleXp,
    updateQuest,
    refreshQuests,
    useFreeze,
  };
}
