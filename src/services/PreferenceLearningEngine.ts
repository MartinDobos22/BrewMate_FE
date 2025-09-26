import { differenceInCalendarDays, differenceInMinutes, formatISO } from 'date-fns';
import {
  BrewContext,
  BrewHistoryEntry,
  CommunityFlavorStats,
  LearningEvent,
  LearningStorageAdapter,
  PredictionContext,
  PredictionResult,
  RecipeProfile,
  TasteDimension,
  TasteProfileVector,
  UserTasteProfile,
} from '../types/Personalization';

const DEFAULT_LEARNING_RATE = 0.1;
const DEFAULT_DECAY_FACTOR = 0.95;
const MAX_HISTORY_CACHE = 200;

export interface PreferenceLearningEngineConfig {
  learningRate?: number;
  decayFactor?: number;
  storage: LearningStorageAdapter;
  nowProvider?: () => Date;
}

const tasteDimensions: TasteDimension[] = ['sweetness', 'acidity', 'bitterness', 'body'];

export class PreferenceLearningEngine {
  private profile: UserTasteProfile | null = null;
  private historyCache: BrewHistoryEntry[] = [];
  private readonly learningRate: number;
  private readonly decayFactor: number;
  private readonly storage: LearningStorageAdapter;
  private readonly nowProvider: () => Date;
  private initialized = false;
  private readonly userId: string;

  constructor(userId: string, config: PreferenceLearningEngineConfig) {
    this.userId = userId;
    this.storage = config.storage;
    this.learningRate = config.learningRate ?? DEFAULT_LEARNING_RATE;
    this.decayFactor = config.decayFactor ?? DEFAULT_DECAY_FACTOR;
    this.nowProvider = config.nowProvider ?? (() => new Date());
  }

  /**
   * Inicializácia načíta profil aj históriu používateľa lokálne.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      this.profile = await this.storage.loadProfile(this.userId);
      if (!this.profile) {
        this.profile = this.createDefaultProfile();
        await this.storage.persistProfile(this.profile);
      }
      this.historyCache = await this.storage.fetchRecentHistory(this.userId, MAX_HISTORY_CACHE);
      this.initialized = true;
    } catch (error) {
      console.error('Nepodarilo sa načítať profil používateľa', error);
      throw error;
    }
  }

  /**
   * Predikcia hodnotenia pre recept na základe kosínusovej podobnosti a kontextu.
   */
  public async predictRating(recipeId: string, context: PredictionContext = {}): Promise<PredictionResult> {
    await this.ensureInitialized();
    if (!this.profile) {
      throw new Error('Profil používateľa nie je k dispozícii');
    }

    const recipeProfile = await this.storage.fetchRecipeProfile(recipeId);
    if (!recipeProfile) {
      return {
        recipeId,
        predictedRating: 3,
        confidence: 0.2,
        contributingRecipes: [],
        contextBonuses: ['Žiadne historické dáta pre recept'],
      };
    }

    const baseSimilarity = this.computeCosineSimilarity(this.profile.preferences, recipeProfile.tasteVector);
    const baseRating = this.scoreFromSimilarity(baseSimilarity);

    const contextBonuses: string[] = [];
    let adjustedRating = baseRating;

    if (context.timeOfDay === 'morning' && this.profile.preferredStrength === 'strong') {
      adjustedRating += 0.25;
      contextBonuses.push('Ranný boost pre silnú kávu');
    }

    if (context.weather) {
      const weatherBonus = this.applyWeatherBonus(context.weather.condition, recipeProfile);
      if (weatherBonus !== 0) {
        adjustedRating += weatherBonus;
        contextBonuses.push(`Počasie bonus: ${weatherBonus.toFixed(2)}`);
      }
    }

    if (context.weekday !== undefined) {
      const weekdayBonus = this.applyWeekdayHeuristic(context.weekday);
      if (weekdayBonus !== 0) {
        adjustedRating += weekdayBonus;
        contextBonuses.push(`Bonus podľa dňa: ${weekdayBonus.toFixed(2)}`);
      }
    }

    if (context.anticipatedMood && context.anticipatedMood.toLowerCase().includes('unaven')) {
      adjustedRating += 0.2;
      contextBonuses.push('Bonus za očakávanú únavu');
    }

    const similarRecipes = (await this.storage.fetchSimilarRecipes?.(this.userId, recipeId, 3)) ?? [];
    let similarityBoost = 0;
    const contributingRecipes = similarRecipes
      .map((recipe) => {
        const sim = this.computeCosineSimilarity(recipe.tasteVector, recipeProfile.tasteVector);
        similarityBoost += sim * 0.1;
        return recipe.recipeId;
      })
      .slice(0, 3);

    if (similarityBoost !== 0) {
      adjustedRating += similarityBoost;
      contextBonuses.push('Boost zo podobných receptov');
    }

    adjustedRating = Math.min(5, Math.max(1, adjustedRating));

    const confidence = this.calculateConfidence(baseSimilarity, similarRecipes.length);

    return {
      recipeId,
      predictedRating: Number(adjustedRating.toFixed(2)),
      confidence,
      contributingRecipes,
      contextBonuses,
    };
  }

  /**
   * Spracovanie nového hodnotenia s automatickou úpravou profilu.
   */
  public async ingestBrew(brew: BrewHistoryEntry, event?: LearningEvent): Promise<UserTasteProfile> {
    await this.ensureInitialized();
    if (!this.profile) {
      throw new Error('Profil používateľa nie je k dispozícii');
    }

    try {
      this.historyCache.unshift(brew);
      this.historyCache = this.historyCache.slice(0, MAX_HISTORY_CACHE);

      const weightMultiplier = event ? this.weightFromEvent(event) : 1;
      const ratingSignal = (brew.rating - 3) / 2; // rozsah -1 až 1

      this.applyTimeDecay();
      this.updateTastePreferences(brew, ratingSignal, weightMultiplier);
      await this.updateFlavorNotes(brew, ratingSignal, weightMultiplier);
      this.updateSeasonalAdjustments(brew, ratingSignal, weightMultiplier);
      this.detectTasteShift(brew, ratingSignal);
      this.updateConfidence();

      this.profile.lastRecalculatedAt = formatISO(this.nowProvider());
      this.profile.updatedAt = formatISO(this.nowProvider());

      await this.storage.persistProfile(this.profile);
      return this.profile;
    } catch (error) {
      console.error('Chyba pri spracovaní hodnotenia', error);
      throw error;
    }
  }

  /**
   * Získanie aktuálneho profilu (už po inicializácii).
   */
  public getProfile(): UserTasteProfile | null {
    return this.profile;
  }

  public async getUserTasteProfile(userId: string): Promise<UserTasteProfile> {
    await this.ensureInitialized();
    if (!this.profile || this.profile.userId !== userId) {
      throw new Error('Profil používateľa nie je inicializovaný pre dané ID');
    }
    return this.profile;
  }

  public async updateProfile(profile: UserTasteProfile): Promise<void> {
    this.profile = profile;
    await this.storage.persistProfile(profile);
  }

  public calculateTasteSimilarity(target: TasteProfileVector, baseline: TasteProfileVector): number {
    return this.computeCosineSimilarity(target, baseline);
  }

  public async predictMood({
    weekday,
    timeOfDay,
  }: {
    weekday: number;
    timeOfDay: BrewContext['timeOfDay'];
  }): Promise<string | undefined> {
    await this.ensureInitialized();
    const recent = this.historyCache.slice(0, 20);
    if (!recent.length) {
      return undefined;
    }

    const stressSignals = recent.filter((entry) => entry.context?.moodBefore === 'stressed');
    if (stressSignals.length >= 3 && timeOfDay === 'morning') {
      return 'stressed';
    }

    if (weekday >= 5 && timeOfDay === 'evening') {
      return 'relaxed';
    }

    const tiredSignals = recent.filter((entry) => entry.context?.moodBefore === 'tired');
    if (tiredSignals.length > 2) {
      return 'tired';
    }

    return 'focused';
  }

  public async calculateTasteTrend(
    userId: string,
    entries: BrewHistoryEntry[],
  ): Promise<{ periodDays: number; direction: string } | undefined> {
    await this.ensureInitialized();
    if (!entries.length) {
      return undefined;
    }

    const slice = entries.slice(0, 10);
    const avgBody = slice.reduce((sum, entry) => sum + (entry.tasteFeedback?.body ?? 0), 0) / slice.length;
    const avgSweetness = slice.reduce((sum, entry) => sum + (entry.tasteFeedback?.sweetness ?? 0), 0) / slice.length;
    if (!avgBody && !avgSweetness) {
      return undefined;
    }

    const direction = avgBody > avgSweetness ? 'bohatším telom' : 'sladším tónom';
    const periodDays = Math.max(
      1,
      differenceInCalendarDays(new Date(slice[0].createdAt), new Date(slice[slice.length - 1].createdAt)),
    );

    return { periodDays, direction };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private createDefaultProfile(): UserTasteProfile {
    const now = formatISO(this.nowProvider());
    return {
      userId: this.userId,
      preferences: {
        sweetness: 5,
        acidity: 5,
        bitterness: 5,
        body: 5,
      },
      flavorNotes: {
        chocolate: 6,
        fruity: 5,
        nutty: 6,
      },
      milkPreferences: {
        types: ['plnotučné', 'ovsené'],
        texture: 'krémová',
      },
      caffeineSensitivity: 'medium',
      preferredStrength: 'balanced',
      seasonalAdjustments: [],
      preferenceConfidence: 0.35,
      lastRecalculatedAt: now,
      updatedAt: now,
    };
  }

  private weightFromEvent(event: LearningEvent): number {
    const base = event.eventWeight ?? 1;
    switch (event.eventType) {
      case 'liked':
        return base * 1.1;
      case 'favorited':
        return base * 1.2;
      case 'repeated':
        return base * 0.9;
      case 'disliked':
        return base * 1.3;
      default:
        return base;
    }
  }

  private applyTimeDecay(): void {
    if (!this.profile) {
      return;
    }
    const now = this.nowProvider();
    const last = new Date(this.profile.lastRecalculatedAt ?? this.profile.updatedAt);
    const daysDiff = Math.max(0, differenceInCalendarDays(now, last));
    if (daysDiff === 0) {
      return;
    }
    const decay = Math.pow(this.decayFactor, daysDiff / 7);
    for (const dimension of tasteDimensions) {
      const current = this.profile.preferences[dimension];
      const neutral = 5;
      this.profile.preferences[dimension] = neutral + (current - neutral) * decay;
    }

    Object.keys(this.profile.flavorNotes).forEach((note) => {
      const value = this.profile!.flavorNotes[note];
      this.profile!.flavorNotes[note] = 5 + (value - 5) * decay;
    });
  }

  private updateTastePreferences(brew: BrewHistoryEntry, ratingSignal: number, weightMultiplier: number): void {
    if (!this.profile) {
      return;
    }
    const weight = this.learningRate * weightMultiplier;

    for (const dimension of tasteDimensions) {
      const feedbackValue = brew.tasteFeedback?.[dimension];
      const current = this.profile.preferences[dimension];
      const target = typeof feedbackValue === 'number' ? feedbackValue : current + ratingSignal * 2;
      const delta = (target - current) * weight * Math.max(0.5, Math.abs(ratingSignal));
      this.profile.preferences[dimension] = this.clampPreference(current + delta);
    }
  }

  private async updateFlavorNotes(
    brew: BrewHistoryEntry,
    ratingSignal: number,
    weightMultiplier: number,
  ): Promise<void> {
    if (!this.profile) {
      return;
    }
    if (!brew.flavorNotes || Object.keys(brew.flavorNotes).length === 0) {
      return;
    }

    const stats: CommunityFlavorStats | undefined = await this.storage.fetchCommunityFlavorStats?.();
    const weight = this.learningRate * weightMultiplier;

    Object.entries(brew.flavorNotes).forEach(([note, value]) => {
      const current = this.profile!.flavorNotes[note] ?? 5;
      const collaborative = stats?.[note];
      const communityInfluence = collaborative
        ? ((collaborative.average - current) * Math.min(1, collaborative.sampleSize / 50))
        : 0;
      const delta = (value - current) * weight * (1 + Math.abs(ratingSignal)) + communityInfluence * 0.05;
      this.profile!.flavorNotes[note] = this.clampPreference(current + delta);
    });
  }

  private updateSeasonalAdjustments(brew: BrewHistoryEntry, ratingSignal: number, weightMultiplier: number): void {
    if (!this.profile) {
      return;
    }
    const contextDate = new Date(brew.createdAt);
    const monthKey = `${contextDate.getFullYear()}-${String(contextDate.getMonth() + 1).padStart(2, '0')}`;
    const seasonal = this.profile.seasonalAdjustments.find((adj) => adj.key === monthKey);
    const factor = this.learningRate * weightMultiplier * 0.5 * ratingSignal;

    if (!seasonal) {
      this.profile.seasonalAdjustments.push({
        key: monthKey,
        delta: {
          sweetness: factor,
          acidity: -factor / 2,
        },
        lastApplied: formatISO(this.nowProvider()),
      });
    } else {
      seasonal.delta.sweetness = this.clampPreference((seasonal.delta.sweetness ?? 0) + factor, -3, 3);
      seasonal.delta.body = this.clampPreference((seasonal.delta.body ?? 0) + factor / 1.5, -3, 3);
      seasonal.lastApplied = formatISO(this.nowProvider());
    }
  }

  private detectTasteShift(brew: BrewHistoryEntry, ratingSignal: number): void {
    if (!this.profile) {
      return;
    }
    if (this.historyCache.length < 5) {
      return;
    }

    const recentAverage =
      this.historyCache.slice(1, 6).reduce((sum, entry) => sum + entry.rating, 0) / Math.min(5, this.historyCache.length - 1);
    if (recentAverage >= 4.5 && brew.rating <= 2) {
      // drastické zhoršenie obľúbenej kávy => posun preferencií k nižšej sladkosti
      this.profile.preferences.sweetness = this.clampPreference(this.profile.preferences.sweetness - 0.4);
      this.profile.preferences.bitterness = this.clampPreference(this.profile.preferences.bitterness + 0.4);
    }

    const lastSimilar = this.historyCache.find((entry) => entry.recipeId && entry.recipeId === brew.recipeId && entry.id !== brew.id);
    if (lastSimilar && Math.abs(lastSimilar.rating - brew.rating) >= 2 && ratingSignal < 0) {
      this.profile.preferredStrength = this.profile.preferredStrength === 'strong' ? 'balanced' : 'light';
    }
  }

  private updateConfidence(): void {
    if (!this.profile) {
      return;
    }
    const interactionScore = Math.min(50, this.historyCache.length);
    const recentBrew = this.historyCache[0];
    const minutesSinceLast = recentBrew
      ? Math.max(1, differenceInMinutes(this.nowProvider(), new Date(recentBrew.createdAt)))
      : 1440;
    const recencyFactor = Math.max(0.2, 1 - minutesSinceLast / (7 * 24 * 60));
    const baseConfidence = 0.35 + interactionScore * 0.01;
    this.profile.preferenceConfidence = Math.min(0.95, baseConfidence * recencyFactor);
  }

  private applyWeatherBonus(condition: string, recipe: RecipeProfile): number {
    const normalized = condition.toLowerCase();
    if (normalized.includes('rain')) {
      return recipe.tasteVector.body > 6 ? 0.25 : 0.1;
    }
    if (normalized.includes('sun')) {
      return recipe.tasteVector.acidity > 6 ? 0.2 : -0.05;
    }
    if (normalized.includes('snow')) {
      return 0.3;
    }
    return 0;
  }

  private applyWeekdayHeuristic(weekday: number): number {
    // pondelok = 1 (ISO), nedeľa = 7
    if (weekday === 1) {
      return 0.2;
    }
    if (weekday === 5) {
      return 0.1;
    }
    if (weekday === 6 || weekday === 7) {
      return -0.1; // víkend menej kofeínu
    }
    return 0;
  }

  private calculateConfidence(similarity: number, similarRecipeCount: number): number {
    const base = 0.3 + Math.max(0, similarity) * 0.4;
    const diversityBoost = similarRecipeCount * 0.05;
    const dataBoost = Math.min(0.25, this.historyCache.length * 0.01);
    return Math.min(0.95, base + diversityBoost + dataBoost);
  }

  private computeCosineSimilarity(a: TasteProfileVector, b: TasteProfileVector): number {
    const dot = tasteDimensions.reduce((acc, dim) => acc + a[dim] * b[dim], 0);
    const magA = Math.sqrt(tasteDimensions.reduce((acc, dim) => acc + a[dim] ** 2, 0));
    const magB = Math.sqrt(tasteDimensions.reduce((acc, dim) => acc + b[dim] ** 2, 0));
    if (magA === 0 || magB === 0) {
      return 0;
    }
    return dot / (magA * magB);
  }

  private scoreFromSimilarity(similarity: number): number {
    return 3 + similarity * 1.5;
  }

  private clampPreference(value: number, min = 0, max = 10): number {
    if (Number.isNaN(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, Number(value.toFixed(3))));
  }
}
