const toSnakeCaseKey = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

export const normalizeKeysToSnakeCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => normalizeKeysToSnakeCase(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  return Object.keys(record).reduce<Record<string, unknown>>((acc, key) => {
    acc[toSnakeCaseKey(key)] = normalizeKeysToSnakeCase(record[key]);
    return acc;
  }, {});
};

export const normalizeProfileResponse = (value: unknown): Record<string, unknown> | null => {
  const normalized = normalizeKeysToSnakeCase(value);
  if (!normalized || typeof normalized !== 'object') {
    return null;
  }

  const record = normalized as Record<string, unknown>;
  const existingPreferences =
    record.coffee_preferences && typeof record.coffee_preferences === 'object'
      ? (record.coffee_preferences as Record<string, unknown>)
      : null;
  const coffeePreferences: Record<string, unknown> = existingPreferences ? { ...existingPreferences } : {};

  if (record.taste_vector && coffeePreferences.taste_vector == null) {
    coffeePreferences.taste_vector = record.taste_vector;
  }
  if (record.ai_recommendation && coffeePreferences.ai_recommendation == null) {
    coffeePreferences.ai_recommendation = record.ai_recommendation;
  }
  if (record.ai_confidence && coffeePreferences.ai_confidence == null) {
    coffeePreferences.ai_confidence = record.ai_confidence;
  }
  if (record.consistency_score && coffeePreferences.consistency_score == null) {
    coffeePreferences.consistency_score = record.consistency_score;
  }
  if (record.quiz_answers && coffeePreferences.quiz_answers == null) {
    coffeePreferences.quiz_answers = record.quiz_answers;
  }
  if (record.ai_raw_response && coffeePreferences.ai_raw_response == null) {
    coffeePreferences.ai_raw_response = record.ai_raw_response;
  }

  if (Object.keys(coffeePreferences).length > 0) {
    record.coffee_preferences = coffeePreferences;
  }

  return record;
};
