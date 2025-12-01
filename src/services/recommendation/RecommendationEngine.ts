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

/**
 * Produces a deterministic hash string representing the contextual inputs used for recommendations.
 *
 * @param {PredictionContext} context - Prediction context including time, weather, mood, and weekday signals.
 * @returns {string} JSON-encoded hash string suitable for cache key comparisons.
 */
function hashContext(context: PredictionContext): string {
  return JSON.stringify({
    t: context.timeOfDay,
    w: context.weather?.temperatureC,
    h: context.weather?.humidity,
    m: context.anticipatedMood,
    d: context.weekday,
  });
}

/**
 * Core engine responsible for generating context-aware coffee recipe predictions using user taste profiles,
 * weather data, travel mode preferences, and cached responses to reduce computation.
 */
export class RecommendationEngine {
  private readonly cacheTtlMinutes: number;

  /**
   * Creates a new recommendation engine instance with all dependencies provided via configuration.
   *
   * @param {RecommendationEngineConfig} config - Dependencies including learning engine, weather provider, telemetry, and fetchers.
   */
  constructor(private readonly config: RecommendationEngineConfig) {
    this.cacheTtlMinutes = config.cacheTtlMinutes ?? 15;
  }

  /**
   * Retrieves top recipe predictions for a user, preferring cached results when context matches and cache is fresh.
   *
   * @param {object} params - Parameters for prediction retrieval.
   * @param {string} params.userId - Identifier of the user requesting recommendations.
   * @param {PredictionContext & { location?: BrewContext['location'] }} params.context - Context describing time, weather, and optional location.
   * @param {number} [params.limit=3] - Maximum number of predictions to return.
   * @returns {Promise<{ predictions: PredictionResult[]; context: PredictionContext }>} Predictions paired with the enriched context used.
   */
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

  /**
   * Populates missing contextual attributes such as time of day, weekday, mood, and weather.
   *
   * @param {PredictionContext & { location?: BrewContext['location'] }} context - Partial context collected from the UI.
   * @returns {Promise<PredictionContext>} Fully enriched context object used for scoring and caching.
   */
  private async enrichContext(context: PredictionContext & { location?: BrewContext['location'] }): Promise<PredictionContext> {
    const now = new Date();
    const timeOfDay = context.timeOfDay ?? this.resolveTimeOfDay(now);
    const weekday = context.weekday ?? now.getDay();
    const location = context.location ?? this.config.defaultLocation;
    const anticipatedMood = context.anticipatedMood ?? (await this.config.learningEngine.predictMood({ weekday, timeOfDay }));

    if (await this.config.travelModeManager.isTravelModeActive()) {
      this.config.telemetry.recordTravelMode();
    }

    return {
      timeOfDay,
      weekday,
      anticipatedMood,
    };
  }

  /**
   * Maps a Date instance to a semantic time-of-day bucket for scoring adjustments.
   *
   * @param {Date} date - Date representing the desired time reference.
   * @returns {BrewContext['timeOfDay']} One of the supported time-of-day labels.
   */
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

  /**
   * Fetches candidate recipes from Supabase using the provided taste preference vector.
   *
   * @param {TasteProfileVector} vector - User taste vector used to filter and rank recipes server-side.
   * @param {number} limit - Maximum number of recipes to fetch for local scoring.
   * @returns {Promise<RecipeProfile[]>} List of recipe profiles ready for scoring.
   */
  private async fetchCandidateRecipes(vector: TasteProfileVector, limit: number): Promise<RecipeProfile[]> {
    // Query Supabase edge function to keep computation close to data
    return this.config.supabaseFetcher('get_personalized_recipes', { vector, limit });
  }

  /**
   * Applies contextual scoring to candidate recipes, adjusting taste similarity with weather, time, mood, and travel mode signals.
   *
   * @param {RecipeProfile[]} recipes - Candidate recipes returned from the backend.
   * @param {PredictionContext} context - Enriched prediction context including weather and mood data.
   * @param {TasteProfileVector} vector - User taste profile vector used for base similarity calculations.
   * @param {boolean} simplify - Whether travel mode simplification should penalize complex recipes.
   * @returns {PredictionResult[]} Array of scored predictions including metadata for explanations.
   */
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

  /**
   * Calculates a scoring adjustment based on current weather and recipe tags.
   *
   * @param {RecipeProfile} recipe - Recipe being evaluated for context fit.
   * @param {BrewContext['weather']} [weather] - Weather context including temperature and humidity.
   * @returns {number} Positive or negative adjustment applied to the predicted rating.
   */
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

  /**
   * Adjusts scores for recipes that align with the current time of day.
   *
   * @param {RecipeProfile} recipe - Recipe under evaluation.
   * @param {BrewContext['timeOfDay']} [timeOfDay] - Time-of-day bucket such as morning or evening.
   * @returns {number} Adjustment boosting or leaving the base score unchanged.
   */
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

  /**
   * Adjusts prediction scores based on the user's anticipated mood and recipe tags.
   *
   * @param {RecipeProfile} recipe - Candidate recipe being scored.
   * @param {string} [mood] - Mood label predicted by the learning engine.
   * @returns {number} Positive adjustment when recipe supports the mood; otherwise zero.
   */
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

  /**
   * Aggregates human-readable explanation tokens describing contextual bonuses or penalties applied during scoring.
   *
   * @param {number} weatherBoost - Adjustment originating from weather alignment.
   * @param {number} timeBoost - Adjustment from time-of-day alignment.
   * @param {number} moodBoost - Adjustment from mood alignment.
   * @param {number} travelPenalty - Penalty applied when travel mode simplifies recipes.
   * @returns {string[]} Array of explanation strings used in UI evidence display.
   */
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

  /**
   * Determines whether a recipe is tagged as quick to prepare.
   *
   * @param {RecipeProfile} recipe - Recipe profile whose tags will be inspected.
   * @returns {boolean} True when the recipe contains the `quick` tag.
   */
  private isQuickRecipe(recipe: RecipeProfile): boolean {
    return recipe.tags?.includes('quick') ?? false;
  }

  /**
   * Attempts to retrieve a cached recommendation matching the provided context and still within the TTL.
   *
   * @param {PredictionContext} context - Full context used to compute the cache hash.
   * @returns {Promise<CachedRecommendation | undefined>} Cached entry when valid; otherwise undefined.
   */
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

  /**
   * Stores the latest recommendation payload keyed by the hashed context for quick reuse.
   *
   * @param {PredictionContext} context - Context used to derive the cache key.
   * @param {RecommendationPayload} payload - Recommendation data to cache including prediction and alternatives.
   * @returns {Promise<void>} Promise resolving once the cache entry is written or logging warning on failure.
   */
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

  /**
   * Builds user-facing explanation strings from prediction metadata and context signals.
   *
   * @param {PredictionResult} prediction - Selected prediction containing context bonuses.
   * @param {PredictionContext} context - Context applied when generating the prediction.
   * @returns {string[]} Evidence strings suitable for displaying alongside recommendation details.
   */
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
