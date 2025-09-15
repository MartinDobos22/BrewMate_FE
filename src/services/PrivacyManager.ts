import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DiaryStorageAdapter,
  ExportPayload,
  LearningEvent,
  LearningStorageAdapter,
  TrackingPreferences,
} from '../types/Personalization';

export interface LearningEventProvider {
  getEvents: (userId: string) => Promise<LearningEvent[]>;
  deleteEvents: (userId: string) => Promise<void>;
}

export interface PrivacyManagerConfig {
  learningStorage: LearningStorageAdapter;
  diaryStorage: DiaryStorageAdapter;
  eventProvider?: LearningEventProvider;
}

const DEFAULT_TRACKING: TrackingPreferences = {
  analytics: false,
  autoTracking: false,
  notificationPersonalization: false,
  communityInsights: false,
};

/**
 * PrivacyManager zabezpečuje GDPR kompatibilitu a riadenie súhlasov.
 */
export class PrivacyManager {
  private readonly learningStorage: LearningStorageAdapter;
  private readonly diaryStorage: DiaryStorageAdapter;
  private readonly eventProvider?: LearningEventProvider;
  private cache: TrackingPreferences | null = null;

  constructor(config: PrivacyManagerConfig) {
    this.learningStorage = config.learningStorage;
    this.diaryStorage = config.diaryStorage;
    this.eventProvider = config.eventProvider;
  }

  /**
   * Načíta preferencie sledovania so štandardným vypnutím.
   */
  public async loadPreferences(userId: string): Promise<TrackingPreferences> {
    const raw = await AsyncStorage.getItem(this.prefKey(userId));
    if (!raw) {
      this.cache = { ...DEFAULT_TRACKING };
      return this.cache;
    }
    try {
      const parsed = JSON.parse(raw) as TrackingPreferences;
      this.cache = { ...DEFAULT_TRACKING, ...parsed };
      return this.cache;
    } catch (error) {
      console.warn('Chyba pri čítaní preferencií súkromia', error);
      this.cache = { ...DEFAULT_TRACKING };
      return this.cache;
    }
  }

  /**
   * Nastaví súhlas pre konkrétny typ sledovania.
   */
  public async setTrackingConsent(userId: string, type: keyof TrackingPreferences, allowed: boolean): Promise<void> {
    const prefs = this.cache ?? (await this.loadPreferences(userId));
    prefs[type] = allowed;
    this.cache = { ...prefs };
    await AsyncStorage.setItem(this.prefKey(userId), JSON.stringify(prefs));
  }

  /**
   * Odpovie, či môžeme spracovávať citlivé údaje lokálne.
   */
  public async canProcess(type: keyof TrackingPreferences, userId: string): Promise<boolean> {
    const prefs = this.cache ?? (await this.loadPreferences(userId));
    return Boolean(prefs[type]);
  }

  /**
   * Export kompletnej osobnej databázy používateľa vo formáte JSON.
   */
  public async exportUserData(userId: string): Promise<ExportPayload> {
    const profile = await this.learningStorage.loadProfile(userId);
    const history = await this.learningStorage.fetchRecentHistory(userId, 5000);
    const events = this.eventProvider ? await this.eventProvider.getEvents(userId) : [];
    const diaryEntries = await this.diaryStorage.getEntries(userId);

    return {
      profile,
      history: history.map((entry) => ({
        ...entry,
        userId: 'self',
      })),
      events: events.map((event) => ({
        ...event,
        userId: 'self',
      })),
      diaryEntries: diaryEntries.map((entry) => ({
        ...entry,
        userId: 'self',
      })),
    };
  }

  /**
   * Nenávratné vymazanie údajov používateľa.
   */
  public async deleteUserData(userId: string): Promise<void> {
    await AsyncStorage.removeItem(this.prefKey(userId));
    const history = await this.learningStorage.fetchRecentHistory(userId, 5000);
    await this.diaryStorage.deleteEntries?.(userId);
    await Promise.all(
      history.map(async (entry) => {
        await this.diaryStorage.saveEntry({
          ...entry,
          rating: 0,
          flavorNotes: {},
          context: undefined,
        });
      }),
    );
    if (this.eventProvider) {
      await this.eventProvider.deleteEvents(userId);
    }
    this.cache = null;
  }

  /**
   * Vytvorenie anonymizovaných agregátov pre komunitu bez identifikátorov.
   */
  public async buildCommunityInsights(userId: string): Promise<{ flavorTrends: Record<string, number>; sampleSize: number }> {
    const allowed = await this.canProcess('communityInsights', userId);
    if (!allowed) {
      return { flavorTrends: {}, sampleSize: 0 };
    }
    const history = await this.learningStorage.fetchRecentHistory(userId, 500);
    const aggregates: Record<string, { sum: number; count: number }> = {};
    history.forEach((entry) => {
      Object.entries(entry.flavorNotes ?? {}).forEach(([note, value]) => {
        const anonymizedNote = note.toLowerCase();
        if (!aggregates[anonymizedNote]) {
          aggregates[anonymizedNote] = { sum: 0, count: 0 };
        }
        aggregates[anonymizedNote].sum += value;
        aggregates[anonymizedNote].count += 1;
      });
    });

    const flavorTrends = Object.entries(aggregates).reduce<Record<string, number>>((acc, [note, stats]) => {
      acc[note] = Number((stats.sum / Math.max(1, stats.count)).toFixed(2));
      return acc;
    }, {});

    return { flavorTrends, sampleSize: history.length };
  }

  private prefKey(userId: string): string {
    return `brewmate:privacy:${userId}`;
  }
}
