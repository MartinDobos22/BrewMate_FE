import Sound from 'react-native-sound';
import { Platform } from 'react-native';
import type { GamificationSoundEffectManager } from '../../types/gamification';

/**
 * Jednoduchý manager na prehrávanie gamifikačných zvukov.
 */
export class SoundEffectManager implements GamificationSoundEffectManager {
  private cache: Map<string, Sound> = new Map();

  constructor(private readonly soundMapping: Record<string, string | undefined>) {
    Sound.setCategory('Ambient', true);
  }

  /**
   * Prehrá zvukový efekt podľa kľúča.
   */
  async play(effect: 'level_up' | 'achievement' | 'quest_complete' | 'xp_gain'): Promise<void> {
    const fileName = this.soundMapping[effect];
    if (!fileName) {
      return;
    }

    const cached = this.cache.get(effect);
    if (cached) {
      cached.stop();
      cached.play();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const sound = new Sound(fileName, Platform.OS === 'ios' ? Sound.MAIN_BUNDLE : Sound.ANDROID, (error) => {
        if (error) {
          reject(error);
          return;
        }
        this.cache.set(effect, sound);
        sound.play(() => resolve());
      });
    }).catch((error) => {
      console.warn('SoundEffectManager: prehrávanie zlyhalo', error);
    });
  }

  /**
   * Vyčistí všetky nahraté zvuky.
   */
  dispose(): void {
    this.cache.forEach((sound) => sound.release());
    this.cache.clear();
  }
}
