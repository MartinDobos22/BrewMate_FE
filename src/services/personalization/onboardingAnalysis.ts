import type { TasteDimension, TasteProfileVector, UserTasteProfile } from '../../types/Personalization';
import type { TasteQuizAnswer } from '../../types/PersonalizationAI';

/**
 * Resulting taste profile and embeddings derived from onboarding answers.
 */
export interface OnboardingAnalysis {
  profile: {
    preferences?: Partial<TasteProfileVector>;
    milkPreferences?: UserTasteProfile['milkPreferences'];
    preferredStrength?: UserTasteProfile['preferredStrength'];
    caffeineSensitivity?: UserTasteProfile['caffeineSensitivity'];
  };
  embeddings: TasteQuizAnswer[];
}

const dimensionKeys: TasteDimension[] = ['sweetness', 'acidity', 'bitterness', 'body'];

/**
 * Normalizes onboarding quiz answers into structured taste preferences and
 * embedding-friendly payloads.
 *
 * @param answers - Key/value pairs captured from the onboarding questionnaire.
 * @param timestamp - ISO timestamp applied to generated embedding records.
 * @returns Combined profile hints and embedding rows ready for downstream ML
 *   services.
 */
export function analyzeOnboardingAnswers(
  answers: Record<string, string>,
  timestamp = new Date().toISOString(),
): OnboardingAnalysis {
  const preferences: Partial<TasteProfileVector> = {};
  const embeddings: TasteQuizAnswer[] = [];
  const profile: OnboardingAnalysis['profile'] = {};

  dimensionKeys.forEach((dimension) => {
    const key = `dimension:${dimension}`;
    const rawValue = answers[key];
    if (rawValue) {
      const numeric = Number(rawValue);
      if (Number.isFinite(numeric)) {
        preferences[dimension] = clampTasteValue(numeric);
      }
      embeddings.push(buildEmbeddingAnswer(key, rawValue, timestamp));
    }
  });

  if (Object.keys(preferences).length > 0) {
    profile.preferences = preferences;
  }

  const milk = answers.milk;
  if (milk) {
    profile.milkPreferences = {
      types: [milk],
      texture: milk === 'black' ? 'bez mlieka' : milk,
    };
    embeddings.push(buildEmbeddingAnswer('milk', milk, timestamp));
  }

  const strength = answers.strength;
  if (strength === 'light' || strength === 'balanced' || strength === 'strong') {
    profile.preferredStrength = strength;
    embeddings.push(buildEmbeddingAnswer('strength', strength, timestamp));
  }

  const wakeUp = answers['wake-up'];
  if (wakeUp === 'fast') {
    profile.caffeineSensitivity = 'high';
    embeddings.push(buildEmbeddingAnswer('wake-up', wakeUp, timestamp));
  } else if (wakeUp === 'slow') {
    profile.caffeineSensitivity = 'low';
    embeddings.push(buildEmbeddingAnswer('wake-up', wakeUp, timestamp));
  }

  return { profile, embeddings };
}

/**
 * Creates a standardized embedding answer object for the recommendation
 * pipeline.
 *
 * @param questionId - Identifier of the onboarding question.
 * @param value - User-provided value to encode.
 * @param timestamp - Timestamp to associate with the response.
 * @returns Structured quiz answer with metadata.
 */
function buildEmbeddingAnswer(
  questionId: string,
  value: string,
  timestamp: string,
): TasteQuizAnswer {
  return {
    questionId,
    value,
    timestamp,
    skipped: false,
  };
}

/**
 * Clamps raw taste slider inputs into the expected 0–10 range.
 *
 * @param value - Numeric taste value provided by the user.
 * @returns Value constrained between 0 and 10 inclusive.
 */
function clampTasteValue(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 10) {
    return 10;
  }
  return value;
}
