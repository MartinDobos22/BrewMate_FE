import type { CoffeeEvaluationResult } from '../services/ocrServices';

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

// Placeholder implementation to disable comparisons while keeping exports stable.
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

export const normalizeVectorValue = (value: unknown): number | null => {
  const parsed = parseNumericValue(value);
  if (parsed == null) {
    return null;
  }
  const scaled = parsed <= 1 ? parsed * 10 : parsed;
  const bounded = Math.max(0, Math.min(10, scaled));
  return Number.isFinite(bounded) ? bounded : null;
};

export const buildScanPreferenceComparison = (
  _input: ScanPreferenceComparisonInput,
): ScanPreferenceComparisonResult => ({
  dimensions: [],
  reasons: [],
});
