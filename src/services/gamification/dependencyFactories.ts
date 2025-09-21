import type {
  GamificationAnalytics,
  GamificationHaptics,
  GamificationNotifications,
  GamificationSoundPlayer,
} from './GamificationService';

export const createDefaultGamificationAnalytics = (): GamificationAnalytics => ({
  track(event, payload) {
    console.debug('[Gamification][Analytics]', event, payload ?? {});
  },
});

export const createDefaultGamificationSoundPlayer = (): GamificationSoundPlayer => ({
  async play(effect: string) {
    console.debug('[Gamification][Sound] play', effect);
  },
  async stop(effect?: string) {
    console.debug('[Gamification][Sound] stop', effect);
  },
});

export const createDefaultGamificationHaptics = (): GamificationHaptics => ({
  async impact(pattern) {
    console.debug('[Gamification][Haptics] impact', pattern);
  },
  async notify(type) {
    console.debug('[Gamification][Haptics] notify', type);
  },
});

export const createDefaultGamificationNotifications = (): GamificationNotifications => ({
  async trigger(event, payload) {
    console.debug('[Gamification][Notifications] trigger', event, payload ?? {});
  },
});
