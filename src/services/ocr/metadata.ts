import type { StructuredCoffeeMetadata } from './types';

const parseDelimitedList = (value: string): string[] | null => {
  const items = value
    .split(/[,;|/]+/)
    .map(item => item.replace(/[()\[\]]/g, '').trim())
    .filter(Boolean);
  return items.length ? items : null;
};

export const estimateCoffeeAttributesFromText = (
  text: string,
): Pick<StructuredCoffeeMetadata, 'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'varietals'> => {
  const normalizedText = text.replace(/\r/g, '');
  const lowerText = normalizedText.toLowerCase();

  const extractLabelValue = (labels: string[]): string | null => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i');
      const match = normalizedText.match(regex);
      if (match && match[1]) {
        const cleaned = match[1].replace(/\s+/g, ' ').trim();
        return cleaned.length ? cleaned : null;
      }
    }
    return null;
  };

  const origin = extractLabelValue(['origin', 'pôvod', 'povod', 'country', 'region']);
  const flavorNotesRaw = extractLabelValue([
    'flavor notes',
    'flavour notes',
    'tóny',
    'chut',
    'notes',
  ]);
  const varietalsRaw = extractLabelValue([
    'varietal',
    'varietals',
    'variety',
    'odroda',
    'odrody',
  ]);
  const processing =
    extractLabelValue(['processing', 'process', 'spracovanie']) ||
    (['washed', 'natural', 'honey', 'anaerobic', 'semi-washed', 'carbonic maceration'].find(
      keyword => lowerText.includes(keyword),
    ) ??
      null);
  const roastLevelRaw = extractLabelValue(['roast', 'praženie', 'prazenie']);
  const roastLevel =
    roastLevelRaw ||
    (['light', 'medium-dark', 'medium', 'dark'].find(keyword => lowerText.includes(keyword)) ??
      null);

  return {
    origin,
    roastLevel,
    processing,
    flavorNotes: flavorNotesRaw ? parseDelimitedList(flavorNotesRaw) : null,
    varietals: varietalsRaw ? parseDelimitedList(varietalsRaw) : null,
  };
};

export const normalizeStructuredMetadataPayload = (
  payload: Record<string, any> | null,
): StructuredCoffeeMetadata | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalizeString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const normalizeStringArray = (value: unknown): string[] | null => {
    if (Array.isArray(value)) {
      const cleaned = value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
    if (typeof value === 'string') {
      const parts = value
        .split(/[,;\n]/)
        .map(part => part.trim())
        .filter(Boolean);
      return parts.length ? parts : null;
    }
    return null;
  };

  const confidenceSource =
    payload.confidenceFlags ?? payload.confidence_flags ?? payload.flags ?? null;

  let confidenceFlags: StructuredCoffeeMetadata['confidenceFlags'] = null;
  if (confidenceSource && typeof confidenceSource === 'object') {
    confidenceFlags = {
      roaster:
        typeof confidenceSource.roaster === 'boolean'
          ? confidenceSource.roaster
          : null,
      origin:
        typeof confidenceSource.origin === 'boolean'
          ? confidenceSource.origin
          : null,
      roastLevel:
        typeof confidenceSource.roastLevel === 'boolean'
          ? confidenceSource.roastLevel
          : typeof confidenceSource.roast_level === 'boolean'
          ? confidenceSource.roast_level
          : null,
      processing:
        typeof confidenceSource.processing === 'boolean'
          ? confidenceSource.processing
          : null,
      flavorNotes:
        typeof confidenceSource.flavorNotes === 'boolean'
          ? confidenceSource.flavorNotes
          : typeof confidenceSource.flavor_notes === 'boolean'
          ? confidenceSource.flavor_notes
          : null,
      roastDate:
        typeof confidenceSource.roastDate === 'boolean'
          ? confidenceSource.roastDate
          : typeof confidenceSource.roast_date === 'boolean'
          ? confidenceSource.roast_date
          : null,
      varietals:
        typeof confidenceSource.varietals === 'boolean'
          ? confidenceSource.varietals
          : null,
    };
  }

  return {
    roaster: normalizeString(payload.roaster ?? payload.roaster_name) ?? null,
    origin: normalizeString(payload.origin),
    roastLevel: normalizeString(payload.roastLevel ?? payload.roast_level) ?? null,
    processing: normalizeString(payload.processing),
    flavorNotes: normalizeStringArray(payload.flavorNotes ?? payload.flavor_notes),
    roastDate: normalizeString(payload.roastDate ?? payload.roast_date) ?? null,
    varietals: normalizeStringArray(payload.varietals),
    confidenceFlags,
  };
};

export const mergeStructuredMetadata = (
  base: StructuredCoffeeMetadata | null,
  fallback: Pick<
    StructuredCoffeeMetadata,
    'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'varietals'
  >,
): StructuredCoffeeMetadata | null => {
  if (!base && !fallback) {
    return null;
  }
  const mergedBase = base ?? ({} as StructuredCoffeeMetadata);
  return {
    ...mergedBase,
    origin: mergedBase.origin ?? fallback.origin ?? null,
    roastLevel: mergedBase.roastLevel ?? fallback.roastLevel ?? null,
    processing: mergedBase.processing ?? fallback.processing ?? null,
    flavorNotes: mergedBase.flavorNotes ?? fallback.flavorNotes ?? null,
    varietals: mergedBase.varietals ?? fallback.varietals ?? null,
  };
};
