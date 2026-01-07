import { normalizeVectorValue } from './scanPreferenceComparison';

type TasteVector = Record<string, unknown>;

type PreferenceSnapshot = {
  taste_vector?: Record<string, number> | null;
} | null;

type PreferenceSummaryInput = {
  profilePreferences?: TasteVector | null;
  preferenceSnapshot?: PreferenceSnapshot | null;
  coffeePreferences?: TasteVector | null;
};

type PreferenceSummaryResult = {
  summary: string | null;
  sourceLabel: 'dotazník' | 'uložené preferencie';
};

const SUMMARY_DIMENSIONS = [
  { key: 'acidity', label: 'Kyslosť' },
  { key: 'sweetness', label: 'Sladkosť' },
  { key: 'bitterness', label: 'Horkosť' },
  { key: 'body', label: 'Telo' },
];

const normalizePreferenceValue = (value: unknown): number | null => {
  const normalized = normalizeVectorValue(value);
  return normalized != null ? Math.round(normalized) : null;
};

const resolveVector = (source: TasteVector | null | undefined): TasteVector | null => {
  if (!source) {
    return null;
  }
  const nested = source.taste_vector;
  if (nested && typeof nested === 'object') {
    return nested as TasteVector;
  }
  return source;
};

const buildEntries = (vector: TasteVector | null | undefined) =>
  vector
    ? SUMMARY_DIMENSIONS
        .map(({ key, label }) => {
          const value = normalizePreferenceValue(vector[key]);
          return value != null ? { label, value } : null;
        })
        .filter((entry): entry is { label: string; value: number } => Boolean(entry))
    : [];

export const buildPreferenceSummary = ({
  profilePreferences,
  preferenceSnapshot,
  coffeePreferences,
}: PreferenceSummaryInput): PreferenceSummaryResult => {
  const primaryEntries = buildEntries(profilePreferences ?? null);
  let entries = primaryEntries;
  let sourceLabel: PreferenceSummaryResult['sourceLabel'] = 'dotazník';

  if (entries.length === 0) {
    const fallbackVector =
      preferenceSnapshot?.taste_vector ?? resolveVector(coffeePreferences ?? null);
    entries = buildEntries(fallbackVector);
    if (entries.length > 0) {
      sourceLabel = 'uložené preferencie';
    }
  }

  const summary = entries.length
    ? entries.map(entry => `${entry.label} ${entry.value}/10`).join(', ')
    : null;

  return { summary, sourceLabel };
};
