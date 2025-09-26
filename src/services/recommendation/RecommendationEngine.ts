import { differenceInMinutes } from 'date-fns';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';
import { BrewContext, PredictionContext, PredictionResult, RecipeProfile, TasteProfileVector } from '../../types/Personalization';
import { RecommendationPayload } from '../../types/PersonalizationAI';
import { PreferenceLearningEngine } from '../PreferenceLearningEngine';
import { WeatherProvider } from '../../types/Personalization';
import { RecommendationTelemetry } from './RecommendationTelemetry';
import { TravelModeManager } from './TravelModeManager';

export interface RecommendationEngineConfig {
  learningEngine: PreferenceLearningEngine;
  weatherProvider: WeatherProvider;
  supabaseFetcher: (query: string, params?: Record<string, unknown>) => Promise<RecipeProfile[]>;
  telemetry: RecommendationTelemetry;
  travelModeManager: TravelModeManager;
  defaultLocation?: BrewContext['location'];
  cacheTtlMinutes?: number;
}

interface CachedRecommendation {
  contextHash: string;
  payload: RecommendationPayload;
  createdAt: string;
}

const CACHE_KEY = 'brewmate:recommendations:cache_v2';

function hashContext(context: PredictionContext): string {
  return JSON.stringify({
    t: context.timeOfDay,
    w: context.weather?.temperatureC,
    h: context.weather?.humidity,
    m: context.anticipatedMood,
    d: context.weekday,
  });
}

export class RecommendationEngine {
  private readonly cacheTtlMinutes: number;

  constructor(private readonly config: RecommendationEngineConfig) {
    this.cacheTtlMinutes = config.cacheTtlMinutes ?? 15;
  }

  public async getTopPredictions({
    userId,
    context,
    limit = 3,
  }: {
    userId: string;
    context: PredictionContext & { location?: BrewContext['location'] };
    limit?: number;
  }): Promise<{ predictions: PredictionResult[]; context: PredictionContext }> {
    const enrichedContext = await this.enrichContext(context);
    const cached = await this.getCachedRecommendation(enrichedContext);
    if (cached) {
      this.config.telemetry.recordCacheHit(userId, enrichedContext);
      return { predictions: cached.payload.alternatives.concat([cached.payload.prediction]).slice(0, limit), context: enrichedContext };
    }

    const profile = await this.config.learningEngine.getUserTasteProfile(userId);
    const recipes = await this.fetchCandidateRecipes(profile.preferences, limit * 4);

    if (recipes.length === 0) {
      return { predictions: [], context: enrichedContext };
    }

    const simplify = await this.config.travelModeManager.shouldSimplify();
    const scored = this.scoreRecipes(recipes, enrichedContext, profile.preferences, simplify);
    const sorted = scored.sort((a, b) => b.predictedRating - a.predictedRating).slice(0, limit);

    const payload: RecommendationPayload = {
      prediction: sorted[0],
      alternatives: sorted.slice(1, 3),
      explanation: {
        reason: 'Kontextovo chránené odporúčanie s AI.',
        confidence: sorted[0]?.confidence ?? 0.4,
        evidence: this.buildEvidence(sorted[0], enrichedContext),
      },
      timestamp: new Date().toISOString(),
    };

    await this.persistCache(enrichedContext, payload);
    this.config.telemetry.recordGenerated(userId, enrichedContext, payload.prediction);

    return { predictions: sorted, context: enrichedContext };
  }

  private async enrichContext(context: PredictionContext & { location?: BrewContext['location'] }): Promise<PredictionContext> {
    const now = new Date();
    const timeOfDay = context.timeOfDay ?? this.resolveTimeOfDay(now);
    const weekday = context.weekday ?? now.getDay();
    const location = context.location ?? this.config.defaultLocation;
    const weather = context.weather ?? (await this.config.weatherProvider.getWeather(location));
    const anticipatedMood = context.anticipatedMood ?? (await this.config.learningEngine.predictMood({ weekday, timeOfDay }));

    if (await this.config.travelModeManager.isTravelModeActive()) {
      this.config.telemetry.recordTravelMode();
    }

    return {
      timeOfDay,
      weather,
      weekday,
      anticipatedMood,
    };
  }

  private resolveTimeOfDay(date: Date): BrewContext['timeOfDay'] {
    const hours = date.getHours();
    if (hours < 6) {
      return 'night';
    }
    if (hours < 11) {
      return 'morning';
    }
    if (hours < 17) {
      return 'afternoon';
    }
    if (hours < 21) {
      return 'evening';
    }
    return 'night';
  }

  private async fetchCandidateRecipes(vector: TasteProfileVector, limit: number): Promise<RecipeProfile[]> {
    // Query Supabase edge function to keep computation close to data
    return this.config.supabaseFetcher('get_personalized_recipes', { vector, limit });
  }

  private scoreRecipes(
    recipes: RecipeProfile[],
    context: PredictionContext,
    vector: TasteProfileVector,
    simplify: boolean,
  ): PredictionResult[] {
    return recipes.map((recipe) => {
      const baseScore = this.config.learningEngine.calculateTasteSimilarity(recipe.tasteVector, vector);
      const weatherBoost = this.weatherAdjustment(recipe, context.weather);
      const timeBoost = this.timeOfDayAdjustment(recipe, context.timeOfDay);
      const moodBoost = this.moodAdjustment(recipe, context.anticipatedMood);
      const travelPenalty = simplify && !this.isQuickRecipe(recipe) ? -0.15 : 0;

      return {
        recipeId: recipe.recipeId,
        predictedRating: Math.min(5, baseScore * 5 + weatherBoost + timeBoost + moodBoost + travelPenalty),
        confidence: baseScore * 0.6 + weatherBoost * 0.1 + 0.3,
        contributingRecipes: recipe.tags ?? [],
        contextBonuses: this.collectContextBonuses(weatherBoost, timeBoost, moodBoost, travelPenalty),
      };
    });
  }

  private weatherAdjustment(recipe: RecipeProfile, weather?: BrewContext['weather']): number {
    if (!weather?.temperatureC) {
      return 0;
    }

    if (weather.temperatureC > 24 && recipe.tags?.includes('iced')) {
      return 0.35;
    }

    if (weather.temperatureC < 5 && recipe.tags?.includes('rich')) {
      return 0.25;
    }

    if (weather.humidity && weather.humidity > 80 && recipe.brewMethod === 'cold_brew') {
      return 0.2;
    }

    return 0;
  }

  private timeOfDayAdjustment(recipe: RecipeProfile, timeOfDay?: BrewContext['timeOfDay']): number {
    if (!timeOfDay) {
      return 0;
    }

    if (timeOfDay === 'morning' && recipe.tags?.includes('morning_boost')) {
      return 0.3;
    }

    if (timeOfDay === 'evening' && recipe.tags?.includes('low_caffeine')) {
      return 0.35;
    }

    return 0;
  }

  private moodAdjustment(recipe: RecipeProfile, mood?: string): number {
    if (!mood) {
      return 0;
    }

    if (mood === 'stressed' && recipe.tags?.includes('comfort')) {
      return 0.25;
    }

    if (mood === 'tired' && recipe.tags?.includes('energy')) {
      return 0.2;
    }

    return 0;
  }

  private collectContextBonuses(
    weatherBoost: number,
    timeBoost: number,
    moodBoost: number,
    travelPenalty: number,
  ): string[] {
    const messages: string[] = [];
    if (weatherBoost > 0.2) {
      messages.push('Perfektné do aktuálneho počasia.');
    }
    if (timeBoost > 0.2) {
      messages.push('Optimálne pre tento čas dňa.');
    }
    if (moodBoost > 0.2) {
      messages.push('Ladí s tvojou náladou.');
    }
    if (travelPenalty < 0) {
      messages.push('Zjednodušené kvôli cestovnému režimu.');
    }
    return messages;
  }

  private isQuickRecipe(recipe: RecipeProfile): boolean {
    return recipe.tags?.includes('quick') ?? false;
  }

  private async getCachedRecommendation(context: PredictionContext): Promise<CachedRecommendation | undefined> {
    try {
      const raw = await EncryptedStorage.getItem(CACHE_KEY);
      if (!raw) {
        return undefined;
      }
      const cached = JSON.parse(raw) as CachedRecommendation;
      if (differenceInMinutes(new Date(), new Date(cached.createdAt)) > this.cacheTtlMinutes) {
        await EncryptedStorage.removeItem(CACHE_KEY);
        return undefined;
      }
      if (cached.contextHash !== hashContext(context)) {
        return undefined;
      }
      return cached;
    } catch (error) {
      console.warn('RecommendationEngine: unable to read cache', error);
      return undefined;
    }
  }

  private async persistCache(context: PredictionContext, payload: RecommendationPayload): Promise<void> {
    try {
      const entry: CachedRecommendation = {
        contextHash: hashContext(context),
        payload,
        createdAt: new Date().toISOString(),
      };
      await EncryptedStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.warn('RecommendationEngine: unable to persist cache', error);
    }
  }

  private buildEvidence(prediction: PredictionResult, context: PredictionContext): string[] {
    const evidence: string[] = [];
    if (context.weather?.temperatureC) {
      evidence.push(`Počasie ${context.weather.temperatureC.toFixed(1)}°C ovplyvnilo výber.`);
    }
    if (context.timeOfDay) {
      evidence.push(`Čas dňa ${context.timeOfDay} pridal váhu.`);
    }
    if (prediction.contextBonuses?.length) {
      evidence.push(...prediction.contextBonuses);
    }
    return evidence;
  }
}
