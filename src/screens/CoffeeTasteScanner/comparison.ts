import type { CoffeeEvaluationResult } from './services';
import type { CoffeePreferenceSnapshot } from './preference';

// Comparison helpers are disabled; keep placeholders to avoid runtime errors.
export const normalizeReasonLine = (value: string): string => value.trim();

export const normalizeComparisonText = (value: string): string => value.trim().toLowerCase();

export const uniqueLines = (lines: string[]): string[] => Array.from(new Set(lines));

export const extractSentenceBlocks = (text: string): string[] => {
  if (!text) {
    return [];
  }
  return text
    .split(/[.!?\n]+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
};

export const buildComparisonText = (
  _evaluation: CoffeeEvaluationResult | null | undefined,
  _preferenceSnapshot: CoffeePreferenceSnapshot | null | undefined,
  _coffeePreferences: Record<string, unknown> | null | undefined,
): string => 'Porovnanie zhody je momentálne vypnuté.';

export const resolveVerdictExplanationText = (
  _payload: CoffeeEvaluationResult['verdict_explanation'] | null | undefined,
): string => '';

export const resolveInsightHeadline = (
  _insight: CoffeeEvaluationResult['insight'] | null | undefined,
): string => '';
