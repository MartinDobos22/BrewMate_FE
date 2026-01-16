import type { CoffeeEvaluationResult } from './services';
import { buildScanPreferenceComparison } from '../../utils/scanPreferenceComparison';
import { parseAIResponse } from '../../components/utils/AITextFormatter.ts';
import type { CoffeePreferenceSnapshot } from './preference';

export const normalizeReasonLine = (value: string): string => value.replace(/^•\s*/, '').trim();

export const normalizeComparisonText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const uniqueLines = (lines: string[]): string[] => Array.from(new Set(lines));

export const extractSentenceBlocks = (text: string): string[] => {
  if (!text) {
    return [];
  }
  const parsed = parseAIResponse(text);
  const parsedLines = parsed.sections.flatMap(section => [
    ...(section.content ?? []),
    ...(section.bullets ?? []),
  ]);
  const sourceLines = parsedLines.length ? parsedLines : text.split('\n');
  const sentences = sourceLines.flatMap(line => line.split(/[.!?]+/));
  return uniqueLines(sentences.map(sentence => sentence.trim()).filter(Boolean));
};

export const buildComparisonText = (
  evaluation: CoffeeEvaluationResult | null | undefined,
  preferenceSnapshot: CoffeePreferenceSnapshot | null | undefined,
  coffeePreferences: Record<string, unknown> | null | undefined,
): string => {
  if (!evaluation && !preferenceSnapshot) {
    return 'Zatiaľ nemáme dôvody prečo by káva sedela alebo nie.';
  }

  const verdictExplanation = evaluation?.verdict_explanation;
  const comparisonSummary =
    verdictExplanation && typeof verdictExplanation === 'object'
      && typeof verdictExplanation.comparison_summary === 'string'
      ? verdictExplanation.comparison_summary.trim()
      : '';
  const comparisonSummaryLines = comparisonSummary
    ? extractSentenceBlocks(comparisonSummary)
    : [];
  const normalizedSummaryLines = comparisonSummaryLines.map(line =>
    normalizeComparisonText(normalizeReasonLine(line)),
  );
  const normalizedSummaryText = comparisonSummary
    ? normalizeComparisonText(comparisonSummary)
    : '';
  const shouldOmitDuplicateLine = (line: string): boolean => {
    if (!normalizedSummaryLines.length) {
      return false;
    }
    const normalizedLine = normalizeComparisonText(normalizeReasonLine(line));
    if (!normalizedLine) {
      return false;
    }
    return normalizedSummaryLines.some(summaryLine =>
      summaryLine.includes(normalizedLine) || normalizedLine.includes(summaryLine),
    );
  };

  const shouldOmitGenericTip = (line: string): boolean => {
    const lower = line.toLowerCase();
    return [
      'mlet',
      'grind',
      'podobn',
      'podobné kávy',
      'podobne kavy',
    ].some(keyword => lower.includes(keyword));
  };

  const comparison = buildScanPreferenceComparison({
    evaluation,
    coffeePreferences: preferenceSnapshot ?? coffeePreferences ?? null,
    tasteVector: preferenceSnapshot?.taste_vector ?? null,
  });

  const matchLines = comparison.dimensions
    .filter(dimension => dimension.match === 'match')
    .map(dimension => dimension.line)
    .filter((line): line is string => Boolean(line));
  const mismatchLines = comparison.dimensions
    .filter(dimension => dimension.match === 'mismatch')
    .map(dimension => dimension.line)
    .filter((line): line is string => Boolean(line));
  const filteredMatchLines = matchLines.filter(
    line => !shouldOmitDuplicateLine(line) && !shouldOmitGenericTip(line),
  );
  const filteredMismatchLines = mismatchLines.filter(
    line => !shouldOmitDuplicateLine(line) && !shouldOmitGenericTip(line),
  );
  const summaryHasMatchSentence = matchLines.some(line => {
    const normalizedLine = normalizeComparisonText(normalizeReasonLine(line));
    if (!normalizedLine || !normalizedSummaryText) {
      return false;
    }
    return (
      normalizedSummaryText.includes(normalizedLine)
      || normalizedLine.includes(normalizedSummaryText)
    );
  });
  const supplementalLines = summaryHasMatchSentence
    ? []
    : uniqueLines([
        ...filteredMatchLines,
        ...filteredMismatchLines,
      ]).slice(0, 2);

  const primaryText = comparisonSummary
    ? comparisonSummary
    : 'Zatiaľ nemáme dôvody prečo by káva sedela alebo nie.';

  return supplementalLines.length
    ? `${primaryText}\n${supplementalLines.join('\n')}`
    : primaryText;
};

export const resolveVerdictExplanationText = (
  payload: CoffeeEvaluationResult['verdict_explanation'] | null | undefined,
): string => {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload.trim();
  }
  return (
    payload.comparison_summary
    || payload.user_preferences_summary
    || payload.coffee_profile_summary
    || ''
  ).trim();
};

export const resolveInsightHeadline = (
  insight: CoffeeEvaluationResult['insight'] | null | undefined,
): string => {
  if (!insight || typeof insight.headline !== 'string') {
    return '';
  }
  return insight.headline.trim();
};
