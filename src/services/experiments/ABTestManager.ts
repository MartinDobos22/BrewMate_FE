import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GamificationABTestAssignment } from '../../types/gamification';
import { randomId } from '../../utils/randomId';

/**
 * Jednoduchý A/B testovací manager s persistenciou.
 */
export class ABTestManager {
  private readonly storageKey = 'brewmate-ab-tests';
  private assignments: Record<string, GamificationABTestAssignment> = {};

  constructor() {
    void this.hydrate();
  }

  /**
   * Hydratuje uložené priradenia z AsyncStorage.
   */
  private async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      if (raw) {
        this.assignments = JSON.parse(raw);
      }
    } catch (error) {
      console.warn('ABTestManager: Nepodarilo sa načítať priradenia', error);
    }
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.assignments));
    } catch (error) {
      console.warn('ABTestManager: Nepodarilo sa uložiť priradenia', error);
    }
  }

  /**
   * Vráti variant testu a priradí nový ak neexistuje.
   */
  async getVariant(testName: string, variants: string[]): Promise<GamificationABTestAssignment> {
    if (this.assignments[testName]) {
      return this.assignments[testName];
    }

    const index = Math.floor(Math.random() * variants.length);
    const assignment: GamificationABTestAssignment = {
      testName,
      variant: variants[index],
      assignedAt: new Date().toISOString(),
    };

    this.assignments[testName] = assignment;
    await this.persist();
    return assignment;
  }

  /**
   * Reset testov – využíva sa pri ručnom čistení alebo debug režime.
   */
  async reset(): Promise<void> {
    this.assignments = {};
    await AsyncStorage.removeItem(this.storageKey);
  }

  /**
   * Generuje anonymné ID používateľa pre experimenty.
   */
  static anonymousId(): string {
    return randomId({ prefix: 'ab', length: 16 });
  }
}
