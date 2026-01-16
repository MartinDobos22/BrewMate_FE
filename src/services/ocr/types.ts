export interface StructuredCoffeeMetadata {
  roaster: string | null;
  origin: string | null;
  roastLevel: string | null;
  processing: string | null;
  flavorNotes: string[] | null;
  roastDate: string | null;
  varietals: string[] | null;
  confidenceFlags?: {
    roaster?: boolean | null;
    origin?: boolean | null;
    roastLevel?: boolean | null;
    processing?: boolean | null;
    flavorNotes?: boolean | null;
    roastDate?: boolean | null;
    varietals?: boolean | null;
  } | null;
}

export interface ConfirmStructuredPayload {
  metadata: StructuredCoffeeMetadata | null;
  confidence?: Record<string, unknown> | null;
  uncertainty?: Record<string, unknown> | null;
  raw?: unknown;
}

export type CoffeeEvaluationStatus =
  | 'ok'
  | 'profile_missing'
  | 'insufficient_coffee_data'
  | 'unknown';

export type CoffeeEvaluationVerdict = 'suitable' | 'not_suitable' | 'uncertain';

export interface CoffeeEvaluationReason {
  signal: string;
  user_preference: string;
  coffee_attribute: string;
  explanation: string;
}

export interface CoffeeEvaluationDimensionDiff {
  dimension: string;
  percent: number | null;
  explanation: string;
}

export interface CoffeeEvaluationCta {
  action: 'complete_taste_profile' | null;
  label: string | null;
}

export interface CoffeeEvaluationInsightSection {
  title: string;
  bullets: string[];
}

export interface CoffeeEvaluationInsight {
  headline?: string;
  sections?: CoffeeEvaluationInsightSection[];
}

export type VerdictExplanation =
  | string
  | {
      user_preferences_summary?: string;
      coffee_profile_summary?: string;
      comparison_summary?: string;
    };

export interface CoffeeEvaluationResult {
  status: CoffeeEvaluationStatus;
  verdict: CoffeeEvaluationVerdict | null;
  confidence: number | null;
  summary: string;
  reasons: CoffeeEvaluationReason[];
  dimension_diffs: CoffeeEvaluationDimensionDiff[];
  what_youll_like: string[];
  what_might_bother_you: string[];
  tips_to_make_it_better: string[];
  recommended_brew_methods: string[];
  cta: CoffeeEvaluationCta;
  disclaimer: string;
  verdict_explanation: VerdictExplanation;
  insight: CoffeeEvaluationInsight | null;
  raw?: unknown;
}

export interface OCRResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number | null;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
  source?: 'offline' | 'online';
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  /**
   * Labels returned by Vision label detection (e.g., "coffee", "espresso").
   * Optional when the backend does not return label annotations.
   */
  detectionLabels?: string[];
  /**
   * Confidence score derived from label detection for coffee-related labels.
   * Optional and may be undefined when label detection is unavailable.
   */
  detectionConfidence?: number;
  /**
   * Structured metadata extracted from OCR text when available (e.g., origin, roast, notes).
   */
  structuredMetadata?: StructuredCoffeeMetadata | null;
  /**
   * Confidence flags for structured metadata extraction when provided by the backend.
   */
  structuredConfidence?: Record<string, unknown> | null;
  structuredUncertainty?: Record<string, unknown> | null;
  rawStructuredResponse?: unknown;
  evaluation?: CoffeeEvaluationResult | null;
  tasteProfileSent?: boolean;
  tasteProfileRejectedAsStale?: boolean;
}

export interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number | null;
  is_recommended?: boolean;
  is_purchased?: boolean;
  is_favorite?: boolean;
  brand?: string | null;
  origin?: string | null;
  roast_level?: string | null;
  flavor_notes?: string[] | string | null;
  processing?: string | null;
  roast_date?: string | null;
  varietals?: string[] | string | null;
  thumbnail_url?: string | null;
  structured_confidence?: Record<string, unknown> | null;
  structured_uncertainty?: Record<string, unknown> | null;
  confirmed_structured_metadata?: StructuredCoffeeMetadata | null;
  confirmed_structured_confidence?: Record<string, unknown> | null;
  confirmed_structured_raw?: unknown | null;
}
