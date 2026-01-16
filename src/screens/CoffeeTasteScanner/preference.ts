export type CoffeePreferenceSnapshot = {
  ai_recommendation?: string | null;
  consistency_score?: number | null;
  taste_vector: Record<string, number> | null;
  updatedAt?: string | null;
  lastRecalculatedAt?: string | null;
};

export const extractPreferenceSnapshot = (
  payload?: Record<string, unknown> | null,
): CoffeePreferenceSnapshot | null => {
  if (!payload) {
    return null;
  }
  const rawCoffeePreferences =
    payload.coffee_preferences && typeof payload.coffee_preferences === 'object'
      ? (payload.coffee_preferences as Record<string, unknown>)
      : null;
  const coffeePreferences = rawCoffeePreferences ?? payload;
  const aiRecommendation =
    typeof payload.ai_recommendation === 'string' ? payload.ai_recommendation : null;
  const consistencyScore =
    typeof payload.consistency_score === 'number'
      ? payload.consistency_score
      : typeof payload.ai_confidence === 'number'
        ? payload.ai_confidence
        : null;
  const nestedTasteVector =
    coffeePreferences?.taste_vector && typeof coffeePreferences.taste_vector === 'object'
      ? (coffeePreferences.taste_vector as Record<string, number>)
      : null;
  const topLevelTasteVector =
    payload.taste_vector && typeof payload.taste_vector === 'object'
      ? (payload.taste_vector as Record<string, number>)
      : null;
  if (rawCoffeePreferences && topLevelTasteVector && !nestedTasteVector) {
    console.warn(
      'CoffeeTasteScanner: Received legacy top-level taste_vector; expected coffee_preferences.taste_vector.',
    );
  }
  const tasteVector = nestedTasteVector ?? topLevelTasteVector;
  const updatedAt =
    typeof payload.updated_at === 'string'
      ? payload.updated_at
      : typeof coffeePreferences.updated_at === 'string'
        ? coffeePreferences.updated_at
      : typeof payload.updatedAt === 'string'
        ? payload.updatedAt
        : null;
  const lastRecalculatedAt =
    typeof payload.last_recalculated_at === 'string'
      ? payload.last_recalculated_at
      : typeof coffeePreferences.last_recalculated_at === 'string'
        ? coffeePreferences.last_recalculated_at
      : typeof payload.lastRecalculatedAt === 'string'
        ? payload.lastRecalculatedAt
        : null;

  if (!aiRecommendation && consistencyScore == null && !tasteVector) {
    return null;
  }

  return {
    ai_recommendation: aiRecommendation,
    consistency_score: consistencyScore,
    taste_vector: tasteVector,
    updatedAt,
    lastRecalculatedAt,
  };
};
