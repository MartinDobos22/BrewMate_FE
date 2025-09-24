/*
 * Obsluha zvukových efektov s fallbackom na konzolovú správu.
 */
import {NativeModules} from 'react-native';

type SoundModule = {
  preloadEffect: (name: string, resource: string) => void;
  playEffect: (name: string) => void;
};

const moduleProxy = (NativeModules.SoundEffectModule ?? {}) as SoundModule;

class SoundEffectService {
  preload(name: string, resource: string) {
    if (moduleProxy.preloadEffect) {
      moduleProxy.preloadEffect(name, resource);
    } else {
      console.warn('[SoundEffectService] Missing native module, preload skipped');
    }
  }

  play(name: string) {
    if (moduleProxy.playEffect) {
      moduleProxy.playEffect(name);
    } else {
      console.warn('[SoundEffectService] Missing native module, play skipped');
    }
  }
}

export default new SoundEffectService();
