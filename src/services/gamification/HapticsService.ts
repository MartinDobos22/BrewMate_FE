/*
 * Jednoduchý modul pre haptickú odozvu využívajúci API Vibrácie.
 */
import {Platform, Vibration} from 'react-native';

class HapticsService {
  private pattern = [0, 40];

  triggerImpact(type: 'light' | 'medium' | 'heavy' = 'medium') {
    if (Platform.OS === 'ios') {
      // Na iOS sa vibrácie mapujú na systémové haptické odozvy.
      const duration = type === 'light' ? 20 : type === 'heavy' ? 80 : 40;
      Vibration.vibrate(duration);
    } else {
      const multiplier = type === 'heavy' ? 3 : type === 'medium' ? 2 : 1;
      Vibration.vibrate(this.pattern.map((value) => value * multiplier));
    }
  }
}

export default new HapticsService();
