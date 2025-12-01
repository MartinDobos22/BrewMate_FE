import { v4 as uuid } from 'uuid';
import { differenceInMinutes } from 'date-fns';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  BrewContext,
  PredictionContext,
  PredictionResult,
  TasteProfileVector,
  UserTasteProfile,
} from '../types/Personalization';
import {
  PersonalizedLearningModule,
  RecommendationExplanation,
  RecommendationPayload,
  TasteQuizAnswer,
  TasteQuizQuestion,
  TasteQuizResult,
  TasteQuizRuntimeContext,
} from '../types/PersonalizationAI';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';
import { RecommendationEngine } from './recommendation/RecommendationEngine';

const QUIZ_CACHE_KEY = 'brewmate:taste_quiz:cache_v1';

export interface TasteProfileQuizEngineConfig {
  learningEngine: PreferenceLearningEngine;
  recommendationEngine: RecommendationEngine;
  userId: string;
  weather?: BrewContext['weather'];
  timeOfDay?: BrewContext['timeOfDay'];
}

interface CachedQuizState {
  answers: TasteQuizAnswer[];
  updatedAt: string;
}

const BASE_QUESTIONS: TasteQuizQuestion[] = [
  {
    id: 'base-espresso-style',
    order: 0,
    type: 'image',
    category: 'basics',
    title: 'Ako máš rád/rada kávu na začiatku dňa?',
    subtitle: 'Vyber obrázok, ktorý ťa najviac vystihuje.',
    animation: 'morning-sunrise.json',
    options: [
      { id: 'black', label: 'Čierna', value: 'black', image: 'espresso.png' },
      { id: 'milk', label: 'S mliekom', value: 'milk', image: 'latte.png' },
      { id: 'sweet', label: 'Sladká špecialita', value: 'sweet', image: 'mocha.png' },
    ],
    skippable: true,
    profileImpact: { bitterness: 0.3, sweetness: -0.1 },
  },
  {
    id: 'strength-slider',
    order: 1,
    type: 'slider',
    category: 'basics',
    title: 'Ako silnú kávu preferuješ?',
    subtitle: 'Posuň slider – vizuálny feedback sa mení v reálnom čase.',
    animation: 'strength-meter.json',
    min: 1,
    max: 10,
    step: 1,
    profileImpact: { body: 0.2 },
  },
  {
    id: 'flavor-wheel',
    order: 2,
    type: 'multiple',
    category: 'flavor',
    title: 'Vyber chuťové tóny, ktoré ťa lákajú.',
    subtitle: 'Klikni na segmenty flavor wheelu.',
    options: [
      { id: 'citrus', label: 'Citrus', value: 'citrus' },
      { id: 'floral', label: 'Kvetinová', value: 'floral' },
      { id: 'chocolate', label: 'Čokoládová', value: 'chocolate' },
      { id: 'nutty', label: 'Oriešková', value: 'nutty' },
      { id: 'spicy', label: 'Korenistá', value: 'spicy' },
    ],
    allowsMultiple: true,
    skippable: true,
  },
  {
    id: 'texture',
    order: 3,
    type: 'single',
    category: 'flavor',
    title: 'Akú textúru preferuješ?',
    options: [
      { id: 'silky', label: 'Hodvábna', value: 'silky' },
      { id: 'creamy', label: 'Krémová', value: 'creamy' },
      { id: 'airy', label: 'Ľahká', value: 'airy' },
    ],
  },
  {
    id: 'brew-time',
    order: 4,
    type: 'multiple',
    category: 'lifestyle',
    title: 'Kedy si najčastejšie vychutnávaš kávu?',
    options: [
      { id: 'morning', label: 'Ráno', value: 'morning' },
      { id: 'afternoon', label: 'Popoludní', value: 'afternoon' },
      { id: 'evening', label: 'Večer', value: 'evening' },
    ],
    allowsMultiple: true,
    skippable: true,
  },
  {
    id: 'experience',
    order: 5,
    type: 'slider',
    category: 'lifestyle',
    title: 'Aký je tvoj baristický skill level?',
    min: 1,
    max: 5,
    step: 1,
  },
  {
    id: 'diet',
    order: 6,
    type: 'multiple',
    category: 'wellbeing',
    title: 'Máme vedieť o alergiách alebo obmedzeniach?',
    options: [
      { id: 'lactose', label: 'Laktóza', value: 'lactose' },
      { id: 'nuts', label: 'Orechy', value: 'nuts' },
      { id: 'gluten', label: 'Glutén', value: 'gluten' },
      { id: 'sugar', label: 'Cukor', value: 'sugar' },
    ],
    allowsMultiple: true,
    skippable: true,
  },
  {
    id: 'budget',
    order: 7,
    type: 'slider',
    category: 'lifestyle',
    title: 'Aký je tvoj ideálny budget na porciu?',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    id: 'equipment',
    order: 8,
    type: 'multiple',
    category: 'equipment',
    title: 'Aké zariadenia máš práve k dispozícii?',
    options: [
      { id: 'espresso', label: 'Espresso stroj', value: 'espresso' },
      { id: 'aeropress', label: 'AeroPress', value: 'aeropress' },
      { id: 'v60', label: 'V60', value: 'v60' },
      { id: 'frenchpress', label: 'French press', value: 'frenchpress' },
      { id: 'moka', label: 'Moka kanvička', value: 'moka' },
    ],
    allowsMultiple: true,
  },
  {
    id: 'habit',
    order: 9,
    type: 'text',
    category: 'lifestyle',
    title: 'Aká je tvoja najpamätnejšia kávová skúsenosť?',
    subtitle: 'Pomáha nám pochopiť tvoj chuťový príbeh.',
    skippable: true,
  },
];

/**
 * Orchestrates the adaptive taste profile quiz flow, managing cached answers, profile updates,
 * recommendation generation, and learning paths based on user responses.
 */
export class TasteProfileQuizEngine {
  private readonly questions = BASE_QUESTIONS;
  private answers: TasteQuizAnswer[] = [];

  /**
   * Initializes the quiz engine with dependencies required for personalization and recommendation generation.
   *
   * @param {TasteProfileQuizEngineConfig} config - Configuration containing learning engine, recommendation engine, embedding service, and optional context defaults.
   */
  constructor(private readonly config: TasteProfileQuizEngineConfig) {}

  /**
   * Restores previously answered questions from encrypted storage when cache is fresh.
   *
   * @returns {Promise<void>} Resolves after cache has been loaded or cleared when stale.
   */
  public async hydrateFromCache(): Promise<void> {
    try {
      const raw = await EncryptedStorage.getItem(QUIZ_CACHE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as CachedQuizState;
      if (differenceInMinutes(new Date(), new Date(parsed.updatedAt)) > 1440) {
        await EncryptedStorage.removeItem(QUIZ_CACHE_KEY);
        return;
      }

      this.answers = parsed.answers;
    } catch (error) {
      console.warn('TasteProfileQuizEngine: hydrateFromCache failed', error);
    }
  }

  /**
   * Retrieves the question at the specified index from the base quiz sequence.
   *
   * @param {number} index - Zero-based position of the question to retrieve.
   * @returns {TasteQuizQuestion | undefined} Question definition when present; otherwise undefined for out-of-range indices.
   */
  public getCurrentQuestion(index: number): TasteQuizQuestion | undefined {
    return this.questions[index];
  }

  /**
   * Returns the cached answer for a given question identifier.
   *
   * @param {string} questionId - Identifier of the question whose answer is requested.
   * @returns {TasteQuizAnswer | undefined} Stored answer payload or undefined when unanswered.
   */
  public getAnswer(questionId: string): TasteQuizAnswer | undefined {
    return this.answers.find(answer => answer.questionId === questionId);
  }

  /**
   * Persists an answer for a question, stamping it with the current timestamp and updating cache.
   *
   * @param {Omit<TasteQuizAnswer, 'timestamp'>} answer - Answer payload excluding timestamp, containing question id and value.
   * @returns {Promise<void>} Resolves once answer state and cache are updated.
   */
  public async submitAnswer(
    answer: Omit<TasteQuizAnswer, 'timestamp'>,
  ): Promise<void> {
    const payload: TasteQuizAnswer = {
      ...answer,
      timestamp: new Date().toISOString(),
    };
    this.answers = [
      ...this.answers.filter(
        existing => existing.questionId !== answer.questionId,
      ),
      payload,
    ];
    await this.persistCache();
  }

  /**
   * Marks a question as skipped and records an empty value while persisting cache state.
   *
   * @param {string} questionId - Identifier of the question being skipped.
   * @returns {Promise<void>} Resolves after the skip is recorded and cached.
   */
  public async skipQuestion(questionId: string): Promise<void> {
    await this.submitAnswer({ questionId, value: '', skipped: true });
  }

  /**
   * Computes quiz completion progress based on answered questions.
   *
   * @returns {number} Fraction between 0 and 1 representing completion percentage.
   */
  public getProgress(): number {
    return this.answers.length / this.questions.length;
  }

  /**
   * Produces an adaptive follow-up question based on the current question's adaptive logic and prior answers.
   *
   * @param {TasteQuizQuestion} current - The current question that may define adaptive logic.
   * @param {TasteQuizRuntimeContext} runtimeContext - Runtime context such as device state and user selections.
   * @returns {Promise<TasteQuizQuestion | undefined>} Next adaptive question or undefined when no adaptation is needed.
   */
  public async buildAdaptiveQuestion(
    current: TasteQuizQuestion,
    runtimeContext: TasteQuizRuntimeContext,
  ): Promise<TasteQuizQuestion | undefined> {
    if (!current.adaptiveLogic) {
      return undefined;
    }

    const answer = this.getAnswer(current.id);
    if (!answer) {
      return undefined;
    }

    return current.adaptiveLogic(answer, runtimeContext);
  }

  /**
   * Finalizes the quiz by updating the user's taste profile, generating recommendations, and clearing cache.
   *
   * @param {TasteQuizRuntimeContext} context - Context captured during quiz completion such as time of day and weather.
   * @returns {Promise<TasteQuizResult>} Comprehensive result including updated profile, confidence scores, and suggestions.
   */
  public async completeQuiz(context: {
    timeOfDay: any;
    answers: any[];
    userId: string | null | undefined;
  }): Promise<TasteQuizResult> {
    const baseProfile = await this.config.learningEngine.getUserTasteProfile(
      this.config.userId,
    );
    const updatedProfile = this.mergeAnswersIntoProfile(baseProfile, context);
    await this.config.learningEngine.updateProfile(updatedProfile);

    const predictionContext: PredictionContext & {
      location?: BrewContext['location'];
    } = {
      ...(context.timeOfDay ? { timeOfDay: context.timeOfDay } : {}),
      ...('location' in context
        ? {
            location: (context as { location?: BrewContext['location'] })
              .location,
          }
        : {}),
    };

    const predictions =
      await this.config.recommendationEngine.getTopPredictions({
        userId: this.config.userId,
        context: predictionContext,
        limit: 3,
      });

    const learningPath = this.buildLearningPath(
      updatedProfile,
      predictions.predictions,
    );

    await EncryptedStorage.removeItem(QUIZ_CACHE_KEY);
    this.answers = [];

    return {
      profile: updatedProfile,
      confidenceScores: this.buildConfidenceScores(updatedProfile),
      suggestedRecipes: predictions.predictions,
      learningPath,
    };
  }

  /**
   * Converts a prediction into a human-readable explanation payload used in UI surfaces.
   *
   * @param {PredictionResult} prediction - Prediction result containing context bonuses and contributing recipes.
   * @returns {RecommendationExplanation} Explanation with reasons, evidence, and confidence score.
   */
  public explainPrediction(
    prediction: PredictionResult,
  ): RecommendationExplanation {
    const reasons: string[] = [];
    if (prediction.contextBonuses?.length) {
      reasons.push(...prediction.contextBonuses);
    }

    if (prediction.contributingRecipes?.length) {
      reasons.push(
        `Podobá sa na ${
          prediction.contributingRecipes.length
        } obľúbené recepty: ${prediction.contributingRecipes
          .slice(0, 3)
          .join(', ')}`,
      );
    }

    return {
      reason:
        'Personalizované odporúčanie na základe tvojho profilu a kontextu.',
      evidence: reasons,
      confidence: Math.round(prediction.confidence * 100) / 100,
    };
  }

  /**
   * Assembles a structured suggestion payload combining the top prediction, alternatives, and explanation.
   *
   * @param {PredictionResult} prediction - Primary prediction to present to the user.
   * @param {PredictionResult[]} alternatives - Secondary predictions offered as alternatives.
   * @returns {RecommendationPayload} Payload with explanation and timestamp for downstream consumers.
   */
  public buildSuggestionPayload(
    prediction: PredictionResult,
    alternatives: PredictionResult[],
  ): RecommendationPayload {
    return {
      prediction,
      alternatives,
      explanation: this.explainPrediction(prediction),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Integrates quiz answers into an existing taste profile, updating preferences, flavor notes, and confidence.
   *
   * @param {UserTasteProfile} profile - Current persisted taste profile to be augmented.
   * @param {TasteQuizRuntimeContext} context - Runtime context used for potential future adjustments.
   * @returns {UserTasteProfile} Updated profile reflecting quiz insights.
   */
  private mergeAnswersIntoProfile(
    profile: UserTasteProfile,
    context: { answers: any[]; userId: string | null | undefined },
  ): UserTasteProfile {
    const answersById = new Map(
      this.answers.map(answer => [answer.questionId, answer] as const),
    );
    const vector: TasteProfileVector = { ...profile.preferences };
    const flavorNotes = { ...profile.flavorNotes };

    const strength = answersById.get('strength-slider');
    if (strength && typeof strength.value === 'number') {
      const normalized = Number(strength.value) / 10;
      vector.body = Math.min(
        1,
        Math.max(0, vector.body * 0.6 + normalized * 0.4),
      );
    }

    const flavor = answersById.get('flavor-wheel');
    if (flavor && Array.isArray(flavor.value)) {
      flavor.value.forEach(note => {
        const key = String(note);
        flavorNotes[key] = (flavorNotes[key] ?? 0) + 1;
      });
    }

    const milkPreference = answersById.get('base-espresso-style');
    const preferredStrength = answersById.get('strength-slider');

    return {
      ...profile,
      preferences: vector,
      flavorNotes,
      preferredStrength:
        typeof preferredStrength?.value === 'number'
          ? preferredStrength.value > 7
            ? 'strong'
            : preferredStrength.value > 3
            ? 'balanced'
            : 'light'
          : profile.preferredStrength,
      milkPreferences:
        milkPreference?.value === 'milk'
          ? { types: ['plnotučné', 'ovsené'], texture: 'krémová' }
          : profile.milkPreferences,
      seasonalAdjustments: profile.seasonalAdjustments,
      preferenceConfidence: Math.min(0.95, profile.preferenceConfidence + 0.15),
      updatedAt: new Date().toISOString(),
      lastRecalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Derives confidence scores for different taste dimensions based on the updated profile.
   *
   * @param {UserTasteProfile} profile - Profile whose confidence values will be mapped to quiz dimensions.
   * @returns {TasteQuizResult['confidenceScores']} Array of confidence descriptors for display.
   */
  private buildConfidenceScores(
    profile: UserTasteProfile,
  ): TasteQuizResult['confidenceScores'] {
    return [
      { dimension: 'sweetness', confidence: profile.preferenceConfidence },
      { dimension: 'acidity', confidence: profile.preferenceConfidence },
      { dimension: 'bitterness', confidence: profile.preferenceConfidence },
      { dimension: 'body', confidence: profile.preferenceConfidence },
      { dimension: 'milk', confidence: profile.milkPreferences ? 0.6 : 0.3 },
      { dimension: 'diet', confidence: 0.4 },
      { dimension: 'budget', confidence: 0.5 },
    ];
  }

  /**
   * Constructs a personalized learning path with modules and actions informed by the updated profile and predictions.
   *
   * @param {UserTasteProfile} profile - Updated taste profile guiding module selection.
   * @param {PredictionResult[]} predictions - Predictions used to tailor actions and recommendations.
   * @returns {PersonalizedLearningModule[]} Ordered modules representing the suggested learning journey.
   */
  private buildLearningPath(
    profile: UserTasteProfile,
    predictions: PredictionResult[],
  ): PersonalizedLearningModule[] {
    const modules: PersonalizedLearningModule[] = [
      {
        id: uuid(),
        title: 'Objavuj filter metódy',
        description:
          'Na základe tvojich preferencií odporúčame prehĺbiť filter techniky.',
        estimatedDurationMinutes: 8,
        actions: [
          {
            id: 'brew-tonight',
            label: 'Priprav si V60 s citrusovým profilom',
            type: 'brew',
            payload: { recipeId: predictions[0]?.recipeId },
          },
          {
            id: 'challenge-notes',
            label: 'Zaznač si tri nové chuťové tóny do denníka',
            type: 'challenge',
          },
        ],
      },
      {
        id: uuid(),
        title: 'Mikropauza s cappuccinom',
        description: 'Optimalizuj energiu počas pracovného dňa.',
        estimatedDurationMinutes: 5,
        actions: [
          {
            id: 'schedule-break',
            label: 'Naplánuj mikropauzu v kalendári',
            type: 'challenge',
          },
        ],
      },
    ];

    if (profile.preferenceConfidence < 0.5) {
      modules.push({
        id: uuid(),
        title: 'Experimentuj so studeným brew',
        description: 'Rozšír chuťové horizonty s cold brew challenge.',
        estimatedDurationMinutes: 15,
        actions: [
          {
            id: 'prep-cold-brew',
            label: 'Nastav studené lúhovanie na noc',
            type: 'brew',
          },
        ],
      });
    }

    return modules;
  }

  /**
   * Writes current quiz answers to encrypted storage for recovery after interruptions.
   *
   * @returns {Promise<void>} Resolves after cache write completes or logs a warning on failure.
   */
  private async persistCache(): Promise<void> {
    try {
      const payload: CachedQuizState = {
        answers: this.answers,
        updatedAt: new Date().toISOString(),
      };
      await EncryptedStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('TasteProfileQuizEngine: persistCache failed', error);
    }
  }
}
