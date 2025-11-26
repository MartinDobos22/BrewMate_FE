import { BrewContext, PredictionResult, TasteProfileVector, UserTasteProfile, WeatherContext } from './Personalization';

/**
 * Supported quiz input styles rendered by the personalization questionnaire.
 */
export type TasteQuestionType =
  | 'single'
  | 'multiple'
  | 'slider'
  | 'image'
  | 'text';

/**
 * Selectable answer option for quiz questions.
 *
 * @typedef {object} TasteQuizOption
 * @property {string} id - Unique identifier used to correlate selections with backend.
 * @property {string} label - User-facing label describing the choice.
 * @property {string|number} value - Canonical value saved with quiz results.
 * @property {string} [image] - Optional image asset representing the option.
 * @property {string} [description] - Additional context or tasting note for the option.
 */
export interface TasteQuizOption {
  id: string;
  label: string;
  value: string | number;
  image?: string;
  description?: string;
}

/**
 * Defines a personalization quiz question, including adaptive logic and scoring hints.
 *
 * @typedef {object} TasteQuizQuestion
 * @property {string} id - Unique identifier used to map answers.
 * @property {number} order - Order index controlling presentation sequence.
 * @property {TasteQuestionType} type - Rendering mode for the question UI.
 * @property {string} title - Primary prompt shown to the user.
 * @property {string} [subtitle] - Optional supporting copy displayed below the title.
 * @property {string} [animation] - Optional animation asset key for Lottie or similar.
 * @property {TasteQuizOption[]} [options] - Answer choices for non-freeform questions.
 * @property {number} [min] - Minimum numeric value for slider questions.
 * @property {number} [max] - Maximum numeric value for slider questions.
 * @property {number} [step] - Incremental step for slider questions.
 * @property {(answer: TasteQuizAnswer, context: TasteQuizRuntimeContext) => Promise<TasteQuizQuestion|undefined>} [adaptiveLogic] -
 * Async function that determines the next question based on the provided answer and runtime context.
 * @property {boolean} [allowsMultiple] - Whether multiple options can be selected.
 * @property {boolean} [skippable] - Whether the user may skip the question without answering.
 * @property {Partial<TasteProfileVector>} [profileImpact] - Optional vector describing how answers inform taste dimensions.
 * @property {'basics' | 'flavor' | 'lifestyle' | 'equipment' | 'wellbeing'} category - Thematic grouping used for analytics and UI.
 */
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

/**
 * Captures a single response given during the personalization quiz.
 *
 * @typedef {object} TasteQuizAnswer
 * @property {string} questionId - Identifier of the answered question.
 * @property {string|number|Array<string|number>} value - Value recorded for the response.
 * @property {boolean} [skipped] - Indicates whether the question was intentionally skipped.
 * @property {string} timestamp - ISO timestamp when the answer was submitted.
 */
export interface TasteQuizAnswer {
  questionId: string;
  value: string | number | Array<string | number>;
  skipped?: boolean;
  timestamp: string;
}

/**
 * Runtime context provided to adaptive quiz logic for personalization decisions.
 *
 * @typedef {object} TasteQuizRuntimeContext
 * @property {TasteQuizAnswer[]} answers - Answers collected so far in the session.
 * @property {string} [userId] - Optional authenticated user ID.
 * @property {import('./Personalization').WeatherContext} [weather] - Weather data used for contextual recommendations.
 * @property {import('./Personalization').BrewContext['timeOfDay']} [timeOfDay] - Time-of-day classification aiding branching logic.
 */
export interface TasteQuizRuntimeContext {
  answers: TasteQuizAnswer[];
  userId?: string;
  weather?: WeatherContext;
  timeOfDay?: BrewContext['timeOfDay'];
}

/**
 * Aggregated personalization outputs produced after the quiz completes.
 *
 * @typedef {object} TasteQuizResult
 * @property {import('./Personalization').UserTasteProfile} profile - Normalized taste profile inferred from responses.
 * @property {Array<{ dimension: keyof TasteProfileVector | 'milk' | 'budget' | 'diet'; confidence: number; }>} confidenceScores -
 * Confidence values per taste dimension used for UI charts.
 * @property {import('./Personalization').PredictionResult[]} suggestedRecipes - Ranked recipe predictions personalized to the user.
 * @property {PersonalizedLearningModule[]} learningPath - Follow-up modules recommended to improve brewing skills.
 */
export interface TasteQuizResult {
  profile: UserTasteProfile;
  confidenceScores: Array<{
    dimension: keyof TasteProfileVector | 'milk' | 'budget' | 'diet';
    confidence: number;
  }>;
  suggestedRecipes: PredictionResult[];
  learningPath: PersonalizedLearningModule[];
}

/**
 * Structured learning module suggested after quiz completion.
 *
 * @typedef {object} PersonalizedLearningModule
 * @property {string} id - Unique identifier for progress tracking.
 * @property {string} title - Name displayed in the learning path UI.
 * @property {string} description - Summary of the module contents.
 * @property {number} estimatedDurationMinutes - Approximate duration to complete the module.
 * @property {Array<{ id: string; label: string; type: 'brew' | 'read' | 'watch' | 'challenge'; payload?: Record<string, unknown>; }>} actions -
 * Actionable steps such as brewing tasks or educational content.
 */
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

/**
 * Explanation metadata accompanying a recommendation prediction.
 *
 * @typedef {object} RecommendationExplanation
 * @property {string} reason - Human-readable rationale for the recommendation.
 * @property {string[]} evidence - Data points or signals that influenced the prediction.
 * @property {number} confidence - Confidence score between 0 and 1.
 */
export interface RecommendationExplanation {
  reason: string;
  evidence: string[];
  confidence: number;
}

/**
 * Container for personalized recommendation payloads delivered to the UI.
 *
 * @typedef {object} RecommendationPayload
 * @property {import('./Personalization').PredictionResult} prediction - Primary recipe or coffee recommendation.
 * @property {RecommendationExplanation} explanation - Supporting explanation for transparency.
 * @property {import('./Personalization').PredictionResult[]} alternatives - Alternative suggestions when the primary is unsuitable.
 * @property {string} timestamp - ISO timestamp when the payload was generated.
 */
export interface RecommendationPayload {
  prediction: PredictionResult;
  explanation: RecommendationExplanation;
  alternatives: PredictionResult[];
  timestamp: string;
}

/**
 * Mood signal derived from diary entries, usage, or integrations to influence recommendations.
 *
 * @typedef {object} MoodSignal
 * @property {'diary' | 'sleep' | 'usage' | 'calendar'} source - Origin of the signal.
 * @property {'energized' | 'focused' | 'relaxed' | 'stressed' | 'tired'} value - Mood classification.
 * @property {number} confidence - Confidence score between 0 and 1 indicating reliability.
 * @property {string} timestamp - ISO timestamp when the signal was captured.
 */
export interface MoodSignal {
  source: 'diary' | 'sleep' | 'usage' | 'calendar';
  value: 'energized' | 'focused' | 'relaxed' | 'stressed' | 'tired';
  confidence: number;
  timestamp: string;
}

/**
 * Stored privacy preferences used to toggle data collection features.
 *
 * @typedef {object} PrivacySettingState
 * @property {boolean} analytics - Whether anonymized analytics events are enabled.
 * @property {boolean} dataSharing - Whether data can be shared for experiments.
 * @property {boolean} moodTracking - Whether mood detection is permitted.
 * @property {boolean} federatedLearning - Whether the device can participate in federated updates.
 */
export interface PrivacySettingState {
  analytics: boolean;
  dataSharing: boolean;
  moodTracking: boolean;
  federatedLearning: boolean;
}

/**
 * Embedding vector representing a flavor insight extracted from user actions.
 *
 * @typedef {object} FlavorEmbeddingVector
 * @property {number[]} embedding - Numeric embedding values representing flavor space coordinates.
 * @property {string} label - Human label for the embedding (e.g., "citrus-forward").
 * @property {string} createdAt - ISO timestamp when the embedding was recorded.
 * @property {'quiz' | 'diary' | 'recipe' | 'scan'} source - Originating data source for the embedding.
 */
export interface FlavorEmbeddingVector {
  embedding: number[];
  label: string;
  createdAt: string;
  source: 'quiz' | 'diary' | 'recipe' | 'scan';
}

/**
 * Milestone on the user's flavor journey timeline used to render progress.
 *
 * @typedef {object} FlavorJourneyMilestone
 * @property {string} id - Unique identifier for the milestone entry.
 * @property {string} date - ISO date when the milestone was achieved.
 * @property {string} title - Milestone title displayed in the UI.
 * @property {string} description - Additional detail about the insight.
 * @property {FlavorEmbeddingVector} embedding - Embedding capturing the flavor signature at that time.
 */
export interface FlavorJourneyMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  embedding: FlavorEmbeddingVector;
}

/**
 * Describes cached payloads stored with expiration metadata for personalization flows.
 *
 * @template T
 * @typedef {object} EncryptedCacheEntry
 * @property {string} key - Cache identifier used for lookup and invalidation.
 * @property {number} expiresAt - Epoch milliseconds when the cached payload should be considered stale.
 * @property {T} payload - Encrypted payload data to decrypt on retrieval.
 */
export interface EncryptedCacheEntry<T> {
  key: string;
  expiresAt: number;
  payload: T;
}
