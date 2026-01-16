import type { TasteProfileVector, UserTasteProfile } from '../../types/Personalization';

export const clampTasteValue = (value: number): number => {
  if (Number.isNaN(value)) {
    return 5;
  }
  return Math.min(10, Math.max(0, value));
};

export const normalizeTasteVectorTo10 = (
  value?: Record<string, number> | null,
): TasteProfileVector | null => {
  if (!value) {
    return null;
  }

  const parseValue = (entry: unknown): number | null => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      return clampTasteValue(entry <= 1 ? entry * 10 : entry);
    }
    if (typeof entry === 'string') {
      const parsed = Number(entry);
      if (Number.isFinite(parsed)) {
        return clampTasteValue(parsed <= 1 ? parsed * 10 : parsed);
      }
    }
    return null;
  };

  const sweetness = parseValue(value.sweetness);
  const acidity = parseValue(value.acidity);
  const bitterness = parseValue(value.bitterness);
  const body = parseValue(value.body);

  if (![sweetness, acidity, bitterness, body].some(entry => entry !== null)) {
    return null;
  }

  return {
    sweetness: sweetness ?? 5,
    acidity: acidity ?? 5,
    bitterness: bitterness ?? 5,
    body: body ?? 5,
  };
};

export const extractTasteVectorFromPayload = (payload: unknown): TasteProfileVector | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedTasteVector = (input: unknown): Record<string, number> | null => {
    if (!input || typeof input !== 'object') {
      return null;
    }
    return input as Record<string, number>;
  };

  const directCandidate =
    nestedTasteVector(record.taste_vector) ??
    nestedTasteVector(record.tasteVector) ??
    nestedTasteVector(record.taste_profile) ??
    nestedTasteVector(record.tasteProfile) ??
    nestedTasteVector(
      typeof record.taste_profile === 'object'
        ? (record.taste_profile as Record<string, unknown>).taste_vector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.tasteProfile === 'object'
        ? (record.tasteProfile as Record<string, unknown>).taste_vector ??
          (record.tasteProfile as Record<string, unknown>).tasteVector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.coffee_attributes === 'object'
        ? (record.coffee_attributes as Record<string, unknown>).taste_vector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.coffeeAttributes === 'object'
        ? (record.coffeeAttributes as Record<string, unknown>).taste_vector ??
          (record.coffeeAttributes as Record<string, unknown>).tasteVector
        : null,
    );

  return directCandidate ? normalizeTasteVectorTo10(directCandidate) : null;
};

export const hasCompleteTasteVector = (vector?: TasteProfileVector | null): boolean => {
  if (!vector) {
    return false;
  }
  return ['sweetness', 'acidity', 'bitterness', 'body'].every(key => {
    const value = vector[key as keyof TasteProfileVector];
    return typeof value === 'number' && Number.isFinite(value);
  });
};

export const resolveTasteProfile = (
  profile?: TasteProfileVector | UserTasteProfile | null,
  snapshotVector?: TasteProfileVector | null,
): TasteProfileVector | UserTasteProfile | null => {
  if (profile && 'preferences' in profile) {
    if (hasCompleteTasteVector(profile.preferences ?? null)) {
      return profile;
    }
  } else if (hasCompleteTasteVector(profile ?? null)) {
    return profile ?? null;
  }

  if (hasCompleteTasteVector(snapshotVector ?? null)) {
    return snapshotVector ?? null;
  }

  return null;
};
