import { InteractionManager } from 'react-native';
import type { GamificationAnalyticsAdapter, GamificationEvent } from '../../types/gamification';

/**
 * Analytika pre gamifikačné udalosti s optimalizáciou výkonu.
 */
export class GamificationAnalytics implements GamificationAnalyticsAdapter {
  constructor(private readonly transport: (event: GamificationEvent) => Promise<void>) {}

  /**
   * Sledovanie udalosti odložíme až po vykreslení UI, aby sme neblokovali interakcie.
   */
  async track(event: GamificationEvent): Promise<void> {
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        this.transport(event).finally(resolve);
      });
    });
  }
}

/**
 * Základná implementácia transportu cez HTTP/Supabase funkciu.
 */
export const createHttpGamificationTransport = (endpoint: string) =>
  async (event: GamificationEvent) => {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('GamificationAnalytics: HTTP transport zlyhal', error);
    }
  };
