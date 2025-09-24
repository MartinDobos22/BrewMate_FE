/*
 * Ľahký analytický modul s možnosťou A/B testovania.
 */
import type {AbTestVariant, AnalyticsEvent} from '../../types/gamification';
import {getSupabaseClient} from '../../config/supabaseClient';

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];

  private variants = new Map<string, AbTestVariant>();

  private flushing = false;

  constructor() {
    setInterval(() => {
      void this.flush();
    }, 10_000);
  }

  track(event: AnalyticsEvent) {
    this.queue.push(event);
  }

  async flush() {
    if (this.flushing || this.queue.length === 0) {
      return;
    }
    this.flushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const client = getSupabaseClient();
      const {error} = await client.from('analytics_events').insert(batch);
      if (error) {
        console.warn('[AnalyticsService] insert failed', error.message);
        this.queue.unshift(...batch);
      }
    } catch (error) {
      console.warn('[AnalyticsService] flush exception', error);
      this.queue.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }

  assignVariant(experiment: string, userId: string): AbTestVariant {
    const existing = this.variants.get(userId + experiment);
    if (existing) {
      return existing;
    }
    const variants: AbTestVariant['variant'][] = ['A', 'B', 'C'];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const allocation: AbTestVariant = {
      experiment,
      variant,
      allocatedAt: new Date().toISOString(),
    };
    this.variants.set(userId + experiment, allocation);
    this.track({
      name: 'ab_assignment',
      timestamp: allocation.allocatedAt,
      properties: {experiment, variant, userId},
    });
    return allocation;
  }
}

export default new AnalyticsService();
