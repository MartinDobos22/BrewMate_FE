import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { GamificationHaptics } from '../../types/gamification';

const OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

/**
 * Implementácia haptiky prispôsobená pre gamifikáciu.
 */
export class GamificationHapticManager implements GamificationHaptics {
  /**
   * Jemný pocit úspechu pri menších odmenách.
   */
  success(): void {
    ReactNativeHapticFeedback.trigger('notificationSuccess', OPTIONS);
  }

  /**
   * Výrazný dopad pri získaní XP alebo posune.
   */
  impact(): void {
    ReactNativeHapticFeedback.trigger('impactMedium', OPTIONS);
  }

  /**
   * Používa sa pri upozorneniach alebo level up.
   */
  notification(): void {
    ReactNativeHapticFeedback.trigger('notificationWarning', OPTIONS);
  }
}
