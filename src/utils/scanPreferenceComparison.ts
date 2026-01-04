import type { CoffeeEvaluationReason, CoffeeEvaluationResult } from '../services/ocrServices';

type TasteDimensionKey = 'sweetness' | 'acidity' | 'bitterness' | 'body';

type TasteLevel = 'low' | 'medium' | 'high';

type TasteVector = Record<string, number>;

type TasteLevelSummary = {
  preferenceLevel: TasteLevel | null;
  coffeeLevel: TasteLevel | null;
};

export type ScanPreferenceComparisonInput = {
  evaluation?: CoffeeEvaluationResult | null;
  coffeePreferences?: Record<string, unknown> | null;
  tasteVector?: TasteVector | null;
};

export type DimensionComparison = {
  key: TasteDimensionKey;
  label: string;
  preferenceLevel: TasteLevel | null;
  coffeeLevel: TasteLevel | null;
  match: 'match' | 'mismatch' | 'unknown';
  line: string | null;
};

export type ScanPreferenceComparisonResult = {
  dimensions: DimensionComparison[];
  reasons: string[];
};

type DimensionConfig = {
  key: TasteDimensionKey;
  label: string;
  noun: string;
  gender: 'feminine' | 'neuter';
  keywords: string[];
};

const DIMENSIONS: DimensionConfig[] = [
  {
    key: 'sweetness',
    label: 'Sladkosť',
    noun: 'sladkosť',
    gender: 'feminine',
    keywords: ['slad', 'cukr', 'med'],
  },
  {
    key: 'acidity',
    label: 'Acidita',
    noun: 'aciditu',
    gender: 'feminine',
    keywords: ['acid', 'kys', 'citrus'],
  },
  {
    key: 'bitterness',
    label: 'Horkosť',
    noun: 'horkosť',
    gender: 'feminine',
    keywords: ['hork', 'trpk'],
  },
  {
    key: 'body',
    label: 'Telo',
    noun: 'telo',
    gender: 'neuter',
    keywords: ['telo', 'body', 'pln', 'ľahk'],
  },
];

const LEVEL_ADJECTIVES: Record<DimensionConfig['gender'], Record<TasteLevel, string>> = {
  feminine: {
    low: 'nízku',
    medium: 'strednú',
    high: 'vysokú',
  },
  neuter: {
    low: 'nízke',
    medium: 'stredné',
    high: 'vysoké',
  },
};

const MATCH_LABELS: Record<'match' | 'mismatch' | 'unknown', string> = {
  match: 'zhoda',
  mismatch: 'nesúlad',
  unknown: 'nejasné',
};

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeVectorValue = (value: unknown): number | null => {
  const parsed = parseNumericValue(value);
  if (parsed == null) {
    return null;
  }
  const scaled = parsed <= 1 ? parsed * 10 : parsed;
  const bounded = Math.max(0, Math.min(10, scaled));
  return Number.isFinite(bounded) ? bounded : null;
};

const resolveTasteVector = (
  coffeePreferences?: Record<string, unknown> | null,
  tasteVector?: TasteVector | null,
): TasteVector | null => {
  const nestedVector = coffeePreferences?.taste_vector;
  if (nestedVector && typeof nestedVector === 'object') {
    return nestedVector as TasteVector;
  }
  return tasteVector ?? null;
};

const scoreToLevel = (value: number): TasteLevel => {
  if (value <= 4) {
    return 'low';
  }
  if (value >= 7) {
    return 'high';
  }
  return 'medium';
};

const detectLevelFromText = (text: string | null | undefined): TasteLevel | null => {
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  const numericMatch = lower.match(/(\d+(?:[.,]\d+)?)(?:\s*\/\s*10)?/);
  if (numericMatch) {
    const rawValue = Number(numericMatch[1].replace(',', '.'));
    if (Number.isFinite(rawValue)) {
      const normalized = rawValue <= 1 ? rawValue * 10 : rawValue;
      return scoreToLevel(Math.max(0, Math.min(10, normalized)));
    }
  }

  const highTokens = ['vysok', 'siln', 'intenz', 'výraz', 'pln', 'full'];
  const lowTokens = ['nízk', 'slab', 'jemn', 'ľahk', 'mild'];
  const mediumTokens = ['stred', 'vyváž', 'medium', 'mier'];

  if (highTokens.some(token => lower.includes(token))) {
    return 'high';
  }
  if (lowTokens.some(token => lower.includes(token))) {
    return 'low';
  }
  if (mediumTokens.some(token => lower.includes(token))) {
    return 'medium';
  }

  return null;
};

const detectDimensionKey = (text: string | null | undefined): TasteDimensionKey | null => {
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  for (const dimension of DIMENSIONS) {
    if (dimension.keywords.some(keyword => lower.includes(keyword))) {
      return dimension.key;
    }
  }
  return null;
};

const extractReasonSummaries = (reasons: CoffeeEvaluationReason[] | null | undefined): string[] => {
  if (!reasons?.length) {
    return [];
  }
  return reasons
    .map(reason => {
      const parts = [
        reason.signal ? reason.signal : null,
        reason.user_preference ? reason.user_preference : null,
        reason.coffee_attribute ? reason.coffee_attribute : null,
        reason.explanation ? reason.explanation : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' – ') : null;
    })
    .filter((reason): reason is string => Boolean(reason));
};

const buildReasonLevelMap = (
  evaluation?: CoffeeEvaluationResult | null,
): Record<TasteDimensionKey, TasteLevelSummary> => {
  const base: Record<TasteDimensionKey, TasteLevelSummary> = {
    sweetness: { preferenceLevel: null, coffeeLevel: null },
    acidity: { preferenceLevel: null, coffeeLevel: null },
    bitterness: { preferenceLevel: null, coffeeLevel: null },
    body: { preferenceLevel: null, coffeeLevel: null },
  };

  if (!evaluation?.reasons?.length) {
    return base;
  }

  evaluation.reasons.forEach(reason => {
    const combinedText = [
      reason.signal,
      reason.user_preference,
      reason.coffee_attribute,
      reason.explanation,
    ]
      .filter(Boolean)
      .join(' ');
    const dimension = detectDimensionKey(combinedText);
    if (!dimension) {
      return;
    }
    const entry = base[dimension];
    if (!entry.preferenceLevel) {
      entry.preferenceLevel = detectLevelFromText(reason.user_preference);
    }
    if (!entry.coffeeLevel) {
      entry.coffeeLevel =
        detectLevelFromText(reason.coffee_attribute)
        || detectLevelFromText(reason.explanation)
        || detectLevelFromText(reason.signal);
    }
  });

  return base;
};

const fillFromVerdictExplanation = (
  evaluation: CoffeeEvaluationResult | null | undefined,
  targetMap: Record<TasteDimensionKey, TasteLevelSummary>,
): void => {
  if (!evaluation) {
    return;
  }
  const verdict = evaluation.verdict_explanation;
  const preferenceSummary =
    typeof verdict === 'object' ? verdict.user_preferences_summary : null;
  const coffeeSummary =
    typeof verdict === 'object' ? verdict.coffee_profile_summary : null;

  if (preferenceSummary) {
    const dimension = detectDimensionKey(preferenceSummary);
    if (dimension && !targetMap[dimension].preferenceLevel) {
      targetMap[dimension].preferenceLevel = detectLevelFromText(preferenceSummary);
    }
  }

  if (coffeeSummary) {
    const dimension = detectDimensionKey(coffeeSummary);
    if (dimension && !targetMap[dimension].coffeeLevel) {
      targetMap[dimension].coffeeLevel = detectLevelFromText(coffeeSummary);
    }
  }
};

const buildDimensionLine = (
  config: DimensionConfig,
  preferenceLevel: TasteLevel | null,
  coffeeLevel: TasteLevel | null,
): string | null => {
  if (!preferenceLevel && !coffeeLevel) {
    return null;
  }
  const preferenceAdj = preferenceLevel ? LEVEL_ADJECTIVES[config.gender][preferenceLevel] : null;
  const coffeeAdj = coffeeLevel ? LEVEL_ADJECTIVES[config.gender][coffeeLevel] : null;
  const match = preferenceLevel && coffeeLevel
    ? preferenceLevel === coffeeLevel
      ? 'match'
      : 'mismatch'
    : 'unknown';

  if (preferenceAdj && coffeeAdj) {
    return `Profil preferuje ${preferenceAdj} ${config.noun}, káva má ${coffeeAdj} → ${MATCH_LABELS[match]}.`;
  }
  if (preferenceAdj) {
    return `Profil preferuje ${preferenceAdj} ${config.noun}, no profil kávy je nejasný.`;
  }
  if (coffeeAdj) {
    return `Káva má ${coffeeAdj} ${config.noun}, no preferencia nie je známa.`;
  }
  return null;
};

export const buildScanPreferenceComparison = (
  input: ScanPreferenceComparisonInput,
): ScanPreferenceComparisonResult => {
  const evaluation = input.evaluation ?? null;
  const tasteVector = resolveTasteVector(input.coffeePreferences, input.tasteVector);
  const normalizedTasteVector = tasteVector
    ? Object.fromEntries(
        Object.entries(tasteVector)
          .map(([key, value]) => [key, normalizeVectorValue(value)])
          .filter(([, value]) => value != null),
      )
    : null;

  const reasonLevelMap = buildReasonLevelMap(evaluation);
  fillFromVerdictExplanation(evaluation, reasonLevelMap);

  const dimensions = DIMENSIONS.map(config => {
    const rawPreferenceValue = normalizedTasteVector?.[config.key] ?? null;
    const preferenceLevel = rawPreferenceValue != null
      ? scoreToLevel(rawPreferenceValue)
      : reasonLevelMap[config.key].preferenceLevel;
    const coffeeLevel = reasonLevelMap[config.key].coffeeLevel;
    const line = buildDimensionLine(config, preferenceLevel, coffeeLevel);
    const match = preferenceLevel && coffeeLevel
      ? preferenceLevel === coffeeLevel
        ? 'match'
        : 'mismatch'
      : 'unknown';

    return {
      key: config.key,
      label: config.label,
      preferenceLevel,
      coffeeLevel,
      match,
      line,
    };
  });

  return {
    dimensions,
    reasons: extractReasonSummaries(evaluation?.reasons ?? null),
  };
};
