import type {
  CoffeeEvaluationDimensionDiff,
  CoffeeEvaluationInsight,
  CoffeeEvaluationInsightSection,
  CoffeeEvaluationReason,
  CoffeeEvaluationResult,
  CoffeeEvaluationStatus,
  CoffeeEvaluationVerdict,
  VerdictExplanation,
} from './types';
import { safeParseJSON } from './utils';

const normalizeEvaluationStatus = (value: unknown): CoffeeEvaluationStatus => {
  if (value === 'ok' || value === 'profile_missing' || value === 'insufficient_coffee_data') {
    return value;
  }
  return 'unknown';
};

const normalizeEvaluationVerdict = (value: unknown): CoffeeEvaluationVerdict | null => {
  if (value === 'suitable' || value === 'not_suitable' || value === 'uncertain') {
    return value;
  }
  return null;
};

const normalizeEvaluationReasons = (value: unknown): CoffeeEvaluationReason[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      return {
        signal: typeof record.signal === 'string' ? record.signal : '',
        user_preference: typeof record.user_preference === 'string' ? record.user_preference : '',
        coffee_attribute:
          typeof record.coffee_attribute === 'string' ? record.coffee_attribute : '',
        explanation: typeof record.explanation === 'string' ? record.explanation : '',
      };
    })
    .filter((entry): entry is CoffeeEvaluationReason => Boolean(entry));
};

const normalizePercentValue = (value: unknown): number | null => {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(',', '.'))
        : NaN;
  if (!Number.isFinite(raw)) {
    return null;
  }
  const scaled = raw <= 1 ? raw * 100 : raw;
  const bounded = Math.max(0, Math.min(100, scaled));
  return Number.isFinite(bounded) ? bounded : null;
};

const normalizeEvaluationDimensionDiffs = (value: unknown): CoffeeEvaluationDimensionDiff[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const dimension =
        typeof record.dimension === 'string'
          ? record.dimension
          : typeof record.key === 'string'
            ? record.key
            : '';
      const explanation =
        typeof record.explanation === 'string'
          ? record.explanation
          : typeof record.description === 'string'
            ? record.description
            : '';
      const percent = normalizePercentValue(
        record.percent ??
          record.percentage ??
          record.diff_percent ??
          record.difference_percent
      );
      if (!dimension || (!explanation && percent == null)) {
        return null;
      }
      return {
        dimension,
        percent,
        explanation,
      };
    })
    .filter((entry): entry is CoffeeEvaluationDimensionDiff => Boolean(entry));
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeEvaluationInsight = (value: unknown): CoffeeEvaluationInsight | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? { headline: trimmed, sections: [] } : null;
  }
  const parsed = safeParseJSON<Record<string, unknown>>(value);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const headline =
    typeof parsed.headline === 'string'
      ? parsed.headline
      : typeof parsed.title === 'string'
        ? parsed.title
        : '';
  const sectionsSource = Array.isArray(parsed.sections)
    ? parsed.sections
    : Array.isArray(parsed.blocks)
      ? parsed.blocks
      : [];
  const sections = sectionsSource
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const title =
        typeof record.title === 'string'
          ? record.title
          : typeof record.heading === 'string'
            ? record.heading
            : '';
      const bulletsSource = Array.isArray(record.bullets)
        ? record.bullets
        : Array.isArray(record.items)
          ? record.items
          : Array.isArray(record.points)
            ? record.points
            : [];
      const bullets = bulletsSource.filter((item): item is string => typeof item === 'string');
      if (!title && bullets.length === 0) {
        return null;
      }
      return { title, bullets };
    })
    .filter((entry): entry is CoffeeEvaluationInsightSection => Boolean(entry));
  const derivedSections: CoffeeEvaluationInsightSection[] = [];
  const pushSection = (title: string, items: string[]) => {
    if (items.length) {
      derivedSections.push({ title, bullets: items });
    }
  };
  const why = normalizeStringArray(parsed.why);
  const whatYoullLike = normalizeStringArray(parsed.what_youll_like);
  const whatMightBotherYou = normalizeStringArray(parsed.what_might_bother_you);
  const tipsToMakeItBetter = normalizeStringArray(parsed.how_to_brew_for_better_match);
  const recommendedAlternatives = normalizeStringArray(parsed.recommended_alternatives);
  pushSection('Prečo', why);
  pushSection('Čo ti bude chutiť', whatYoullLike);
  pushSection('Čo môže rušiť', whatMightBotherYou);
  pushSection('Tipy na lepšiu zhodu', tipsToMakeItBetter);
  pushSection('Odporúčané prípravy', recommendedAlternatives);
  const resolvedSections = sections.length ? sections : derivedSections;
  if (!headline.trim() && resolvedSections.length === 0) {
    return null;
  }
  return { headline, sections: resolvedSections };
};

const normalizeEvaluationText = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
};

const normalizeVerdictExplanation = (
  value: unknown,
  fallback: VerdictExplanation = ''
): VerdictExplanation => {
  if (typeof value === 'string') {
    const fallbackText = typeof fallback === 'string' ? fallback : '';
    return normalizeEvaluationText(value, fallbackText);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const userPreferencesSummary = normalizeEvaluationText(
      record.user_preferences_summary
    );
    const coffeeProfileSummary = normalizeEvaluationText(
      record.coffee_profile_summary
    );
    const comparisonSummary = normalizeEvaluationText(record.comparison_summary);
    if (userPreferencesSummary || coffeeProfileSummary || comparisonSummary) {
      return {
        user_preferences_summary: userPreferencesSummary,
        coffee_profile_summary: coffeeProfileSummary,
        comparison_summary: comparisonSummary,
      };
    }
    if (typeof fallback === 'object') {
      return fallback;
    }
  }
  if (typeof fallback === 'string') {
    return normalizeEvaluationText(fallback);
  }
  return fallback;
};

export const resolveVerdictExplanationText = (value: VerdictExplanation | null | undefined): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return (
    value.comparison_summary ||
    value.user_preferences_summary ||
    value.coffee_profile_summary ||
    ''
  );
};

export const resolveInsightSummary = (insight: CoffeeEvaluationInsight | null | undefined): string => {
  if (!insight) {
    return '';
  }
  const headline = typeof insight.headline === 'string' ? insight.headline.trim() : '';
  if (headline) {
    return headline;
  }
  const sections = Array.isArray(insight.sections) ? insight.sections : [];
  for (const section of sections) {
    if (!section) {
      continue;
    }
    if (typeof section.title === 'string' && section.title.trim()) {
      return section.title.trim();
    }
    if (Array.isArray(section.bullets)) {
      const bullet = section.bullets.find((item) => typeof item === 'string' && item.trim());
      if (bullet) {
        return bullet.trim();
      }
    }
  }
  return '';
};

export const NEUTRAL_EVALUATION_COPY = {
  summary: 'Na spoľahlivé vyhodnotenie potrebujeme doplniť detaily o káve.',
  verdict_explanation:
    'Nevieme spoľahlivo určiť, či sa táto káva hodí k vášmu profilu.',
  disclaimer: 'Výsledok je orientačný a môže sa zmeniť po doplnení údajov.',
};

// Normalize the evaluation payload to align with the backend schema
// (verdict_explanation, insight, disclaimer) while keeping contradiction-safe defaults.
export const normalizeEvaluationResponse = (payload: unknown): CoffeeEvaluationResult => {
  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const insightRecord =
    record.insight && typeof record.insight === 'object'
      ? (record.insight as Record<string, unknown>)
      : null;
  const normalizedStatus = normalizeEvaluationStatus(record.status);
  const verdict =
    normalizeEvaluationVerdict(record.verdict) ??
    (normalizedStatus === 'insufficient_coffee_data' ? 'uncertain' : null);
  const useNeutralCopy =
    verdict === 'uncertain' ||
    normalizedStatus === 'insufficient_coffee_data' ||
    normalizedStatus === 'unknown';
  const whatYoullLike = normalizeStringArray(
    record.what_youll_like ?? insightRecord?.what_youll_like
  );
  const whatMightBotherYou = normalizeStringArray(
    record.what_might_bother_you ?? insightRecord?.what_might_bother_you
  );
  const tipsToMakeItBetter = normalizeStringArray(
    record.tips_to_make_it_better ?? insightRecord?.how_to_brew_for_better_match
  );
  const recommendedBrewMethods = normalizeStringArray(
    record.recommended_brew_methods ?? insightRecord?.recommended_alternatives
  );
  const fallbackInsightSections: CoffeeEvaluationInsightSection[] = [];
  const addFallbackSection = (title: string, items: string[]) => {
    if (items.length) {
      fallbackInsightSections.push({ title, bullets: items });
    }
  };
  addFallbackSection('Čo ti bude chutiť', whatYoullLike);
  addFallbackSection('Čo môže rušiť', whatMightBotherYou);
  addFallbackSection('Tipy na lepšiu zhodu', tipsToMakeItBetter);
  addFallbackSection('Odporúčané prípravy', recommendedBrewMethods);
  const normalizedInsight =
    normalizeEvaluationInsight(record.insight) ??
    (fallbackInsightSections.length ? { headline: '', sections: fallbackInsightSections } : null);
  const dimensionDiffs = normalizeEvaluationDimensionDiffs(record.dimension_diffs);
  if (normalizedStatus === 'profile_missing') {
    // Preserve profile-missing payloads so the UI can display the CTA and guidance text.
    return {
      status: normalizedStatus,
      verdict: null,
      confidence: null,
      summary: typeof record.summary === 'string' ? record.summary : '',
      reasons: [],
      what_youll_like: whatYoullLike,
      what_might_bother_you: whatMightBotherYou,
      tips_to_make_it_better: tipsToMakeItBetter,
      recommended_brew_methods: recommendedBrewMethods,
      dimension_diffs: dimensionDiffs,
      cta: {
        action:
          record.cta && typeof record.cta === 'object' && record.cta.action === 'complete_taste_profile'
            ? 'complete_taste_profile'
            : 'complete_taste_profile',
        label:
          record.cta && typeof record.cta === 'object' && typeof record.cta.label === 'string'
            ? record.cta.label
            : 'Vyplniť chuťový profil',
      },
      disclaimer: normalizeEvaluationText(record.disclaimer),
      verdict_explanation: normalizeVerdictExplanation(record.verdict_explanation),
      insight: normalizedInsight,
      raw: payload,
    };
  }
  if (normalizedStatus !== 'ok') {
    const summary = useNeutralCopy
      ? normalizeEvaluationText(record.summary, NEUTRAL_EVALUATION_COPY.summary)
      : normalizeEvaluationText(record.summary);
    // Unknown payloads remain neutral so the UI can display a generic fallback state.
    return {
      status: normalizedStatus,
      verdict: null,
      confidence: null,
      summary,
      reasons: [],
      what_youll_like: whatYoullLike,
      what_might_bother_you: whatMightBotherYou,
      tips_to_make_it_better: tipsToMakeItBetter,
      recommended_brew_methods: recommendedBrewMethods,
      dimension_diffs: dimensionDiffs,
      cta: { action: null, label: null },
      disclaimer: useNeutralCopy
        ? normalizeEvaluationText(record.disclaimer, NEUTRAL_EVALUATION_COPY.disclaimer)
        : normalizeEvaluationText(record.disclaimer),
      verdict_explanation: useNeutralCopy
        ? normalizeVerdictExplanation(
            record.verdict_explanation,
            NEUTRAL_EVALUATION_COPY.verdict_explanation
          )
        : normalizeVerdictExplanation(record.verdict_explanation),
      insight: normalizedInsight,
      raw: payload,
    };
  }
  const confidenceValue =
    typeof record.confidence === 'number' ? record.confidence : null;
  const summary = useNeutralCopy
    ? normalizeEvaluationText(record.summary, NEUTRAL_EVALUATION_COPY.summary)
    : normalizeEvaluationText(record.summary);
  const reasons = normalizeEvaluationReasons(record.reasons);

  return {
    status: normalizedStatus,
    verdict,
    confidence: confidenceValue,
    summary,
    reasons,
    dimension_diffs: dimensionDiffs,
    what_youll_like: whatYoullLike,
    what_might_bother_you: whatMightBotherYou,
    tips_to_make_it_better: tipsToMakeItBetter,
    recommended_brew_methods: recommendedBrewMethods,
    cta:
      record.cta && typeof record.cta === 'object'
        ? {
            action:
              record.cta.action === 'complete_taste_profile'
                ? 'complete_taste_profile'
                : null,
            label: typeof record.cta.label === 'string' ? record.cta.label : null,
          }
        : { action: null, label: null },
    disclaimer: useNeutralCopy
      ? normalizeEvaluationText(record.disclaimer, NEUTRAL_EVALUATION_COPY.disclaimer)
      : normalizeEvaluationText(record.disclaimer),
    verdict_explanation: useNeutralCopy
      ? normalizeVerdictExplanation(
          record.verdict_explanation,
          NEUTRAL_EVALUATION_COPY.verdict_explanation
        )
      : normalizeVerdictExplanation(record.verdict_explanation),
    insight: normalizedInsight,
    raw: payload,
  };
};
