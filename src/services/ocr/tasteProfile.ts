import type { TasteProfileVector, UserTasteProfile } from '../../types/Personalization';

type ExtendedTasteVector = TasteProfileVector & {
  intensity?: number;
  experimentalism?: number;
};

const extractTasteVector = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): TasteProfileVector | null => {
  if (!profile) {
    return null;
  }
  if ('preferences' in profile) {
    return profile.preferences ?? null;
  }
  return profile;
};

const extractExtendedDimensions = (vector: TasteProfileVector): ExtendedTasteVector => {
  const record = vector as Record<string, unknown>;
  return {
    sweetness: vector.sweetness,
    acidity: vector.acidity,
    bitterness: vector.bitterness,
    body: vector.body,
    ...(typeof record.intensity === 'number' ? { intensity: record.intensity } : {}),
    ...(typeof record.experimentalism === 'number'
      ? { experimentalism: record.experimentalism }
      : {}),
  };
};

const mapOcrTasteVector = (vector: TasteProfileVector): ExtendedTasteVector =>
  extractExtendedDimensions(vector);

const extractTasteProfileTimestamps = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): { updatedAt: string | null; lastRecalculatedAt: string | null } => {
  if (!profile || typeof profile !== 'object') {
    return { updatedAt: null, lastRecalculatedAt: null };
  }
  const record = profile as Record<string, unknown>;
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim().length > 0
      ? record.updatedAt
      : typeof record.updated_at === 'string' && record.updated_at.trim().length > 0
        ? record.updated_at
        : null;
  const lastRecalculatedAt =
    typeof record.lastRecalculatedAt === 'string' && record.lastRecalculatedAt.trim().length > 0
      ? record.lastRecalculatedAt
      : typeof record.last_recalculated_at === 'string'
        && record.last_recalculated_at.trim().length > 0
        ? record.last_recalculated_at
        : null;
  return { updatedAt, lastRecalculatedAt };
};

export const needsTasteProfileTimestamps = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): boolean => {
  const { updatedAt, lastRecalculatedAt } = extractTasteProfileTimestamps(profile);
  return !updatedAt || !lastRecalculatedAt;
};

export const isServerTasteProfile = (
  profile?: TasteProfileVector | UserTasteProfile | null,
): boolean => {
  if (!profile || typeof profile !== 'object') {
    return false;
  }
  if ('preferences' in profile) {
    return true;
  }
  const record = profile as Record<string, unknown>;
  return (
    typeof record.userId === 'string' ||
    typeof record.user_id === 'string' ||
    typeof record.updatedAt === 'string' ||
    typeof record.updated_at === 'string' ||
    typeof record.lastRecalculatedAt === 'string' ||
    typeof record.last_recalculated_at === 'string'
  );
};

export const mapTasteProfilePayload = (
  profile?: TasteProfileVector | UserTasteProfile | null,
  options?: {
    tasteProfileSource?: 'client' | 'server';
    dbProfile?: UserTasteProfile | null;
  },
): Record<string, unknown> | null => {
  if (!profile) {
    return null;
  }

  const tasteVector = extractTasteVector(profile);
  if (!tasteVector) {
    return null;
  }
  // OCR hodnotenie používa základné 4D, ale ak existujú, pošleme aj extra dimenzie.
  const ocrTasteVector = mapOcrTasteVector(tasteVector);
  const extraDimensions = {
    ...(typeof ocrTasteVector.intensity === 'number'
      ? { intensity: ocrTasteVector.intensity }
      : {}),
    ...(typeof ocrTasteVector.experimentalism === 'number'
      ? { experimentalism: ocrTasteVector.experimentalism }
      : {}),
  };
  const resolvedTimestamps =
    options?.tasteProfileSource !== 'client' && options?.dbProfile
      ? extractTasteProfileTimestamps(options.dbProfile)
      : extractTasteProfileTimestamps(profile);

  if ('preferences' in profile) {
    const flavorNoteEntries = profile.flavorNotes ?? {};
    const flavorNotes = Object.keys(flavorNoteEntries).filter(Boolean);
    return {
      user_id: profile.userId,
      taste_vector: ocrTasteVector,
      sweetness: ocrTasteVector.sweetness,
      acidity: ocrTasteVector.acidity,
      bitterness: ocrTasteVector.bitterness,
      body: ocrTasteVector.body,
      ...extraDimensions,
      flavor_notes: flavorNotes,
      flavor_note_weights: flavorNoteEntries,
      milk_preferences: profile.milkPreferences,
      caffeine_sensitivity: profile.caffeineSensitivity,
      preferred_strength: profile.preferredStrength,
      seasonal_adjustments: profile.seasonalAdjustments?.map((adjustment) => ({
        key: adjustment.key,
        delta: adjustment.delta,
        last_applied: adjustment.lastApplied,
      })),
      preference_confidence: profile.preferenceConfidence,
      last_recalculated_at: resolvedTimestamps.lastRecalculatedAt ?? null,
      updated_at: resolvedTimestamps.updatedAt ?? null,
    };
  }

  const { updatedAt, lastRecalculatedAt } = resolvedTimestamps;
  const timestampPayload = {
    updated_at: updatedAt ?? null,
    last_recalculated_at: lastRecalculatedAt ?? null,
  };
  return {
    taste_vector: ocrTasteVector,
    sweetness: ocrTasteVector.sweetness,
    acidity: ocrTasteVector.acidity,
    bitterness: ocrTasteVector.bitterness,
    body: ocrTasteVector.body,
    ...extraDimensions,
    ...timestampPayload,
  };
};

export const isTasteProfileComplete = (profile?: TasteProfileVector | UserTasteProfile | null): boolean => {
  const tasteVector = extractTasteVector(profile);
  if (!tasteVector) {
    return false;
  }

  const values = [
    tasteVector.sweetness,
    tasteVector.acidity,
    tasteVector.bitterness,
    tasteVector.body,
  ];

  return values.every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
  );
};
