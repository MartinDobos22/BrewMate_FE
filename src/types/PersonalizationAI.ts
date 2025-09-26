import { BrewContext, PredictionResult, TasteProfileVector, UserTasteProfile, WeatherContext } from './Personalization';

export type TasteQuestionType =
  | 'single'
  | 'multiple'
  | 'slider'
  | 'image'
  | 'text';

export interface TasteQuizOption {
  id: string;
  label: string;
  value: string | number;
  image?: string;
  description?: string;
}

export interface TasteQuizQuestion {
  id: string;
  order: number;
  type: TasteQuestionType;
  title: string;
  subtitle?: string;
  animation?: string;
  options?: TasteQuizOption[];
  min?: number;
  max?: number;
  step?: number;
  adaptiveLogic?: (
    answer: TasteQuizAnswer,
    context: TasteQuizRuntimeContext,
  ) => Promise<TasteQuizQuestion | undefined>;
  allowsMultiple?: boolean;
  skippable?: boolean;
  profileImpact?: Partial<TasteProfileVector>;
  category: 'basics' | 'flavor' | 'lifestyle' | 'equipment' | 'wellbeing';
}

export interface TasteQuizAnswer {
  questionId: string;
  value: string | number | Array<string | number>;
  skipped?: boolean;
  timestamp: string;
}

export interface TasteQuizRuntimeContext {
  answers: TasteQuizAnswer[];
  userId?: string;
  weather?: WeatherContext;
  timeOfDay?: BrewContext['timeOfDay'];
}

export interface TasteQuizResult {
  profile: UserTasteProfile;
  confidenceScores: Array<{
    dimension: keyof TasteProfileVector | 'milk' | 'budget' | 'diet';
    confidence: number;
  }>;
  suggestedRecipes: PredictionResult[];
  learningPath: PersonalizedLearningModule[];
}

export interface PersonalizedLearningModule {
  id: string;
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  actions: Array<{
    id: string;
    label: string;
    type: 'brew' | 'read' | 'watch' | 'challenge';
    payload?: Record<string, unknown>;
  }>;
}

export interface RecommendationExplanation {
  reason: string;
  evidence: string[];
  confidence: number;
}

export interface RecommendationPayload {
  prediction: PredictionResult;
  explanation: RecommendationExplanation;
  alternatives: PredictionResult[];
  timestamp: string;
}

export interface MoodSignal {
  source: 'diary' | 'sleep' | 'usage' | 'calendar';
  value: 'energized' | 'focused' | 'relaxed' | 'stressed' | 'tired';
  confidence: number;
  timestamp: string;
}

export interface PrivacySettingState {
  analytics: boolean;
  dataSharing: boolean;
  moodTracking: boolean;
  federatedLearning: boolean;
}

export interface FlavorEmbeddingVector {
  embedding: number[];
  label: string;
  createdAt: string;
  source: 'quiz' | 'diary' | 'recipe' | 'scan';
}

export interface FlavorJourneyMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  embedding: FlavorEmbeddingVector;
}

export interface EncryptedCacheEntry<T> {
  key: string;
  expiresAt: number;
  payload: T;
}
