import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatISO } from 'date-fns';

import { CoffeeDiary } from './CoffeeDiary';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';
import { PrivacyManager, LearningEventProvider } from './PrivacyManager';
import { FlavorEmbeddingService } from './flavor/FlavorEmbeddingService';
import { FlavorJourneyRepository } from './flavor/FlavorJourneyRepository';
import { SmartDiaryService } from './SmartDiaryService';
import {
  BrewContext,
  BrewHistoryEntry,
  DiaryStorageAdapter,
  LearningEvent,
  LearningStorageAdapter,
  RecipeProfile,
  CommunityFlavorStats,
  UserTasteProfile,
  TasteProfileVector,
} from '../types/Personalization';

const DEFAULT_USER_ID = 'local-user';
const DIARY_STORAGE_PREFIX = 'brewmate:diary';
const PROFILE_STORAGE_PREFIX = 'brewmate:learning:profile';
const HISTORY_STORAGE_PREFIX = 'brewmate:learning:history';
const EVENTS_STORAGE_KEY = 'brewmate:learning:events';
const RECIPE_PROFILE_STORAGE_KEY = 'brewmate:learning:recipes';
const HISTORY_LIMIT = 200;

const safeParse = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('personalizationGateway: JSON parse failed', error);
    return null;
  }
};

class AsyncDiaryStorageAdapter implements DiaryStorageAdapter {
  private key(userId: string): string {
    return `${DIARY_STORAGE_PREFIX}:${userId}`;
  }

  public async saveEntry(entry: BrewHistoryEntry): Promise<void> {
    try {
      const key = this.key(entry.userId);
      const existing = safeParse<BrewHistoryEntry[]>(await AsyncStorage.getItem(key)) ?? [];
      const updated = [entry, ...existing.filter(item => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.warn('personalizationGateway: failed to save diary entry', error);
    }
  }

  public async getEntries(userId: string): Promise<BrewHistoryEntry[]> {
    try {
      return safeParse<BrewHistoryEntry[]>(await AsyncStorage.getItem(this.key(userId))) ?? [];
    } catch (error) {
      console.warn('personalizationGateway: failed to read diary entries', error);
      return [];
    }
  }

  public async deleteEntries(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.key(userId));
    } catch (error) {
      console.warn('personalizationGateway: failed to delete diary entries', error);
    }
  }
}

class AsyncLearningStorageAdapter implements LearningStorageAdapter {
  private profileKey(userId: string): string {
    return `${PROFILE_STORAGE_PREFIX}:${userId}`;
  }

  private historyKey(userId: string): string {
    return `${HISTORY_STORAGE_PREFIX}:${userId}`;
  }

  public async loadProfile(userId: string): Promise<UserTasteProfile | null> {
    return safeParse<UserTasteProfile>(await AsyncStorage.getItem(this.profileKey(userId)));
  }

  public async persistProfile(profile: UserTasteProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(this.profileKey(profile.userId), JSON.stringify(profile));
    } catch (error) {
      console.warn('personalizationGateway: failed to persist profile', error);
    }
  }

  public async fetchRecentHistory(userId: string, limit: number = HISTORY_LIMIT): Promise<BrewHistoryEntry[]> {
    try {
      const history = safeParse<BrewHistoryEntry[]>(await AsyncStorage.getItem(this.historyKey(userId))) ?? [];
      return history.slice(0, limit);
    } catch (error) {
      console.warn('personalizationGateway: failed to read history', error);
      return [];
    }
  }

  public async fetchRecipeProfile(recipeId: string): Promise<RecipeProfile | null> {
    try {
      const profiles = safeParse<Record<string, RecipeProfile>>(await AsyncStorage.getItem(RECIPE_PROFILE_STORAGE_KEY));
      return profiles?.[recipeId] ?? null;
    } catch (error) {
      console.warn('personalizationGateway: failed to read recipe profile', error);
      return null;
    }
  }

  public async fetchSimilarRecipes(): Promise<RecipeProfile[]> {
    return [];
  }

  public async fetchCommunityFlavorStats(): Promise<CommunityFlavorStats> {
    return {};
  }

  public async appendHistory(entry: BrewHistoryEntry): Promise<void> {
    try {
      const key = this.historyKey(entry.userId);
      const existing = safeParse<BrewHistoryEntry[]>(await AsyncStorage.getItem(key)) ?? [];
      const updated = [entry, ...existing.filter(item => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.warn('personalizationGateway: failed to append history', error);
    }
  }
}

class PreferenceEngineFacade {
  private readonly engine: PreferenceLearningEngine;
  private readonly pendingEvents: LearningEvent[] = [];

  constructor(private readonly userId: string, private readonly storage: AsyncLearningStorageAdapter) {
    this.engine = new PreferenceLearningEngine(this.userId, { storage: this.storage });
  }

  public getEngine(): PreferenceLearningEngine {
    return this.engine;
  }

  public async getProfile(): Promise<UserTasteProfile | null> {
    try {
      await this.engine.initialize();
    } catch (error) {
      console.warn('personalizationGateway: failed to initialize engine for profile', error);
      return null;
    }
    return this.engine.getProfile();
  }

  public async getCommunityAverage(): Promise<TasteProfileVector | null> {
    try {
      await this.engine.initialize();
    } catch (error) {
      console.warn('personalizationGateway: failed to resolve community average', error);
      return null;
    }

    const profile = this.engine.getProfile();
    if (profile) {
      return profile.preferences;
    }

    const stats = await this.storage.fetchCommunityFlavorStats?.();
    if (!stats) {
      return null;
    }

    const clamp = (value: number | undefined): number | undefined => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return undefined;
      }
      return Math.min(10, Math.max(0, value));
    };

    const fallback: TasteProfileVector = { sweetness: 5, acidity: 5, bitterness: 5, body: 5 };

    return {
      sweetness: clamp(stats.sweetness?.average) ?? fallback.sweetness,
      acidity: clamp(stats.acidity?.average) ?? fallback.acidity,
      bitterness: clamp(stats.bitterness?.average) ?? fallback.bitterness,
      body: clamp(stats.body?.average) ?? fallback.body,
    };
  }

  public async recordBrew(recipeId: string, rating: number, context?: BrewContext): Promise<LearningEvent> {
    const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
    const effectiveRecipeId = recipeId || `manual-${Date.now()}`;
    const now = new Date();
    const createdAt = formatISO(now);

    const normalizedContext: BrewContext = {
      ...(context ?? {}),
      timeOfDay: context?.timeOfDay ?? this.resolveTimeOfDay(now),
      weekday: context?.weekday ?? this.getIsoWeekday(now),
      metadata: {
        ...(context?.metadata ?? {}),
      },
    };

    const brewEntry: BrewHistoryEntry = {
      id: `brew-${now.getTime()}`,
      userId: this.userId,
      recipeId: effectiveRecipeId,
      rating: safeRating,
      flavorNotes: {},
      context: normalizedContext,
      modifications: [],
      createdAt,
      updatedAt: createdAt,
    };

    await this.storage.appendHistory(brewEntry);
    await this.engine.initialize();

    const event: LearningEvent = {
      id: `event-${now.getTime()}`,
      userId: this.userId,
      brewHistoryId: brewEntry.id,
      eventType: this.resolveEventType(safeRating),
      eventWeight: this.resolveEventWeight(safeRating),
      metadata: {
        recipeId: effectiveRecipeId,
        rating: safeRating,
        context: normalizedContext,
      },
      createdAt,
    };

    await this.engine.ingestBrew(brewEntry, event);
    this.pendingEvents.push(event);
    return event;
  }

  public async saveEvents(events?: LearningEvent | LearningEvent[]): Promise<void> {
    const eventsArray = events
      ? Array.isArray(events)
        ? events
        : [events]
      : [...this.pendingEvents];

    if (eventsArray.length === 0) {
      return;
    }

    try {
      const stored = safeParse<LearningEvent[]>(await AsyncStorage.getItem(EVENTS_STORAGE_KEY)) ?? [];
      const incomingIds = new Set(eventsArray.map(event => event.id));
      const merged = [...eventsArray, ...stored.filter(event => !incomingIds.has(event.id))].slice(0, HISTORY_LIMIT);
      await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('personalizationGateway: failed to persist learning events', error);
    }

    if (events) {
      const ids = new Set(eventsArray.map(event => event.id));
      for (let i = this.pendingEvents.length - 1; i >= 0; i -= 1) {
        if (ids.has(this.pendingEvents[i].id)) {
          this.pendingEvents.splice(i, 1);
        }
      }
    } else {
      this.pendingEvents.length = 0;
    }
  }

  private resolveEventType(rating: number): LearningEvent['eventType'] {
    if (rating >= 4) {
      return 'liked';
    }
    if (rating <= 2) {
      return 'disliked';
    }
    return 'repeated';
  }

  private resolveEventWeight(rating: number): number {
    if (rating >= 5) {
      return 1.1;
    }
    if (rating >= 4) {
      return 1.0;
    }
    if (rating <= 1) {
      return 0.3;
    }
    if (rating <= 2) {
      return 0.5;
    }
    return 0.75;
  }

  private resolveTimeOfDay(date: Date): BrewContext['timeOfDay'] {
    const hour = date.getHours();
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'afternoon';
    }
    if (hour < 22) {
      return 'evening';
    }
    return 'night';
  }

  private getIsoWeekday(date: Date): number {
    const weekday = date.getDay();
    return weekday === 0 ? 7 : weekday;
  }
}

const diaryStorage = new AsyncDiaryStorageAdapter();
const learningStorage = new AsyncLearningStorageAdapter();
const eventsStorageProvider: LearningEventProvider = {
  async getEvents(userId: string): Promise<LearningEvent[]> {
    const events = safeParse<LearningEvent[]>(await AsyncStorage.getItem(EVENTS_STORAGE_KEY)) ?? [];
    return events.filter(event => event.userId === userId);
  },
  async deleteEvents(userId: string): Promise<void> {
    const events = safeParse<LearningEvent[]>(await AsyncStorage.getItem(EVENTS_STORAGE_KEY)) ?? [];
    const remaining = events.filter(event => event.userId !== userId);
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(EVENTS_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(remaining));
  },
};

export const preferenceEngine = new PreferenceEngineFacade(DEFAULT_USER_ID, learningStorage);
export const PERSONALIZATION_USER_ID = DEFAULT_USER_ID;
export const privacyManager = new PrivacyManager({
  learningStorage,
  diaryStorage,
  eventProvider: eventsStorageProvider,
});

const flavorJourneyRepository = new FlavorJourneyRepository();
const flavorEmbeddingService = new FlavorEmbeddingService(flavorJourneyRepository);
const gatewaySmartDiary = new SmartDiaryService(preferenceEngine.getEngine(), flavorEmbeddingService);

export const coffeeDiary = new CoffeeDiary({
  storage: diaryStorage,
  learningEngine: preferenceEngine.getEngine(),
  smartDiary: gatewaySmartDiary,
});

export const smartDiary = gatewaySmartDiary;

