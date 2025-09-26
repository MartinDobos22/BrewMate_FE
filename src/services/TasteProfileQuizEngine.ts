import { v4 as uuid } from 'uuid';
import { differenceInMinutes } from 'date-fns';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  BrewContext,
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
import { FlavorEmbeddingService } from './flavor/FlavorEmbeddingService';

const QUIZ_CACHE_KEY = 'brewmate:taste_quiz:cache_v1';

export interface TasteProfileQuizEngineConfig {
  learningEngine: PreferenceLearningEngine;
  recommendationEngine: RecommendationEngine;
  flavorEmbeddingService: FlavorEmbeddingService;
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

export class TasteProfileQuizEngine {
  private readonly questions = BASE_QUESTIONS;
  private answers: TasteQuizAnswer[] = [];

  constructor(private readonly config: TasteProfileQuizEngineConfig) {}

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

  public getCurrentQuestion(index: number): TasteQuizQuestion | undefined {
    return this.questions[index];
  }

  public getAnswer(questionId: string): TasteQuizAnswer | undefined {
    return this.answers.find((answer) => answer.questionId === questionId);
  }

  public async submitAnswer(answer: Omit<TasteQuizAnswer, 'timestamp'>): Promise<void> {
    const payload: TasteQuizAnswer = { ...answer, timestamp: new Date().toISOString() };
    this.answers = [...this.answers.filter((existing) => existing.questionId !== answer.questionId), payload];
    await this.persistCache();
  }

  public async skipQuestion(questionId: string): Promise<void> {
    await this.submitAnswer({ questionId, value: '', skipped: true });
  }

  public getProgress(): number {
    return this.answers.length / this.questions.length;
  }

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

  public async completeQuiz(context: TasteQuizRuntimeContext): Promise<TasteQuizResult> {
    const baseProfile = await this.config.learningEngine.getUserTasteProfile(this.config.userId);
    const updatedProfile = this.mergeAnswersIntoProfile(baseProfile, context);
    await this.config.learningEngine.updateProfile(updatedProfile);

    const predictions = await this.config.recommendationEngine.getTopPredictions({
      userId: this.config.userId,
      context,
      limit: 3,
    });

    const learningPath = this.buildLearningPath(updatedProfile, predictions.predictions);

    await this.config.flavorEmbeddingService.recordQuizEmbeddings(this.config.userId, this.answers);

    await EncryptedStorage.removeItem(QUIZ_CACHE_KEY);
    this.answers = [];

    return {
      profile: updatedProfile,
      confidenceScores: this.buildConfidenceScores(updatedProfile),
      suggestedRecipes: predictions.predictions,
      learningPath,
    };
  }

  public explainPrediction(prediction: PredictionResult): RecommendationExplanation {
    const reasons: string[] = [];
    if (prediction.contextBonuses?.length) {
      reasons.push(...prediction.contextBonuses);
    }

    if (prediction.contributingRecipes?.length) {
      reasons.push(
        `Podobá sa na ${prediction.contributingRecipes.length} obľúbené recepty: ${prediction.contributingRecipes
          .slice(0, 3)
          .join(', ')}`,
      );
    }

    return {
      reason: 'Personalizované odporúčanie na základe tvojho profilu a kontextu.',
      evidence: reasons,
      confidence: Math.round(prediction.confidence * 100) / 100,
    };
  }

  public buildSuggestionPayload(prediction: PredictionResult, alternatives: PredictionResult[]): RecommendationPayload {
    return {
      prediction,
      alternatives,
      explanation: this.explainPrediction(prediction),
      timestamp: new Date().toISOString(),
    };
  }

  private mergeAnswersIntoProfile(
    profile: UserTasteProfile,
    context: TasteQuizRuntimeContext,
  ): UserTasteProfile {
    const answersById = new Map(this.answers.map((answer) => [answer.questionId, answer] as const));
    const vector: TasteProfileVector = { ...profile.preferences };
    const flavorNotes = { ...profile.flavorNotes };

    const strength = answersById.get('strength-slider');
    if (strength && typeof strength.value === 'number') {
      const normalized = Number(strength.value) / 10;
      vector.body = Math.min(1, Math.max(0, vector.body * 0.6 + normalized * 0.4));
    }

    const flavor = answersById.get('flavor-wheel');
    if (flavor && Array.isArray(flavor.value)) {
      flavor.value.forEach((note) => {
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

  private buildConfidenceScores(profile: UserTasteProfile): TasteQuizResult['confidenceScores'] {
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

  private buildLearningPath(
    profile: UserTasteProfile,
    predictions: PredictionResult[],
  ): PersonalizedLearningModule[] {
    const modules: PersonalizedLearningModule[] = [
      {
        id: uuid(),
        title: 'Objavuj filter metódy',
        description: 'Na základe tvojich preferencií odporúčame prehĺbiť filter techniky.',
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
          { id: 'prep-cold-brew', label: 'Nastav studené lúhovanie na noc', type: 'brew' },
        ],
      });
    }

    return modules;
  }

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
