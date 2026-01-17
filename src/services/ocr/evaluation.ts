import type {
  CoffeeEvaluationInsight,
  CoffeeEvaluationResult,
  VerdictExplanation,
} from './types';

// Evaluation logic intentionally disabled for now.
// Placeholder exports keep callers stable without running comparisons.

export const resolveVerdictExplanationText = (
  _value: VerdictExplanation | null | undefined,
): string => '';

export const resolveInsightSummary = (
  _insight: CoffeeEvaluationInsight | null | undefined,
): string => '';

export const NEUTRAL_EVALUATION_COPY = {
  summary: '',
  verdict_explanation: '',
  disclaimer: '',
};

export const normalizeEvaluationResponse = (_payload: unknown): CoffeeEvaluationResult => ({
  status: 'unknown',
  verdict: null,
  confidence: null,
  summary: '',
  reasons: [],
  dimension_diffs: [],
  what_youll_like: [],
  what_might_bother_you: [],
  tips_to_make_it_better: [],
  recommended_brew_methods: [],
  cta: { action: null, label: null },
  disclaimer: '',
  verdict_explanation: '',
  insight: null,
  raw: null,
});
