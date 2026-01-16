import type { StructuredCoffeeMetadata } from './services';
import type {
  StructuredFieldKey,
  StructuredFieldsState,
  StructuredListFieldKey,
  StructuredListFieldState,
  StructuredTextFieldKey,
  StructuredTextFieldState,
} from './types';
import { STRUCTURED_CONFIDENCE_KEYS } from './constants';

export const normalizeStructuredStringValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStructuredStringArrayValue = (
  value: string[] | string | null | undefined,
): string[] | null => {
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

export const isStructuredValueFilled = <T,>(value: T): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value != null;
};

export const resolveConfidenceEntry = (
  source: Record<string, unknown> | null | undefined,
  key: StructuredFieldKey,
  fallbackFlag?: boolean | null,
): { confidence: number | null; warning: string | null } => {
  const booleanConfidenceEstimate = 0.8;
  const lowConfidenceThreshold = 0.85;
  const aliases = STRUCTURED_CONFIDENCE_KEYS[key] ?? [key];
  let confidence: number | null = null;
  let warning: string | null = null;

  const assignFromValue = (entry: unknown) => {
    if (typeof entry === 'number') {
      confidence = entry;
      return;
    }
    if (typeof entry === 'boolean') {
      confidence = entry ? booleanConfidenceEstimate : null;
      return;
    }
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (!trimmed) {
        return;
      }
      const normalized = Number.parseFloat(trimmed.replace(',', '.'));
      if (!Number.isNaN(normalized)) {
        confidence = normalized;
        return;
      }
      warning = trimmed;
      return;
    }
    if (entry && typeof entry === 'object') {
      const container = entry as Record<string, unknown>;
      if (container.confidence != null) {
        assignFromValue(container.confidence);
      } else if (container.score != null) {
        assignFromValue(container.score);
      } else if (container.value != null) {
        assignFromValue(container.value);
      }
      if (warning == null && typeof container.warning === 'string') {
        warning = container.warning;
      }
    }
  };

  if (source) {
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(source, alias)) {
        assignFromValue(source[alias]);
        break;
      }
    }
  }

  if (confidence == null && typeof fallbackFlag === 'boolean') {
    confidence = fallbackFlag ? booleanConfidenceEstimate : null;
  }

  if (confidence != null) {
    const normalized = confidence > 1 ? confidence / 100 : confidence;
    if (normalized < lowConfidenceThreshold && warning == null) {
      warning = 'AI si nie je isté';
    }
  }

  return { confidence, warning };
};

export const createStructuredFieldsFromMetadata = (
  metadata: StructuredCoffeeMetadata | null | undefined,
  confidence: Record<string, unknown> | null | undefined,
): StructuredFieldsState => {
  const buildTextField = (
    key: StructuredTextFieldKey,
    value: string | null | undefined,
  ): StructuredTextFieldState => {
    const normalized = normalizeStructuredStringValue(value);
    const flag = metadata?.confidenceFlags?.[key] ?? null;
    const { confidence: parsedConfidence, warning } = resolveConfidenceEntry(confidence, key, flag);
    return {
      value: normalized,
      isAutoFilled: isStructuredValueFilled(normalized),
      confidence: parsedConfidence,
      warning,
    };
  };

  const buildListField = (
    key: StructuredListFieldKey,
    value: string[] | null | undefined,
  ): StructuredListFieldState => {
    const normalized = normalizeStructuredStringArrayValue(value);
    const flag = metadata?.confidenceFlags?.[key] ?? null;
    const { confidence: parsedConfidence, warning } = resolveConfidenceEntry(confidence, key, flag);
    return {
      value: normalized,
      isAutoFilled: isStructuredValueFilled(normalized),
      confidence: parsedConfidence,
      warning,
    };
  };

  return {
    roaster: buildTextField('roaster', metadata?.roaster),
    origin: buildTextField('origin', metadata?.origin),
    roastLevel: buildTextField('roastLevel', metadata?.roastLevel),
    processing: buildTextField('processing', metadata?.processing),
    flavorNotes: buildListField('flavorNotes', metadata?.flavorNotes ?? null),
    roastDate: buildTextField('roastDate', metadata?.roastDate),
    varietals: buildListField('varietals', metadata?.varietals ?? null),
  };
};

export const structuredFieldsToMetadata = (
  fields: StructuredFieldsState,
): StructuredCoffeeMetadata | null => {
  const metadata: StructuredCoffeeMetadata = {
    roaster: normalizeStructuredStringValue(fields.roaster.value),
    origin: normalizeStructuredStringValue(fields.origin.value),
    roastLevel: normalizeStructuredStringValue(fields.roastLevel.value),
    processing: normalizeStructuredStringValue(fields.processing.value),
    flavorNotes: normalizeStructuredStringArrayValue(fields.flavorNotes.value) ?? null,
    roastDate: normalizeStructuredStringValue(fields.roastDate.value),
    varietals: normalizeStructuredStringArrayValue(fields.varietals.value) ?? null,
    confidenceFlags: null,
  };

  const hasValues = [
    metadata.roaster,
    metadata.origin,
    metadata.roastLevel,
    metadata.processing,
    metadata.roastDate,
  ].some(Boolean) ||
    (metadata.flavorNotes?.length ?? 0) > 0 ||
    (metadata.varietals?.length ?? 0) > 0;

  if (!hasValues) {
    return null;
  }

  const confidenceFlags: StructuredCoffeeMetadata['confidenceFlags'] = {};

  (['roaster', 'origin', 'roastLevel', 'processing', 'flavorNotes', 'roastDate', 'varietals'] as StructuredFieldKey[])
    .forEach(key => {
      const field = fields[key];
      const hasValue = isStructuredValueFilled(field.value);
      if (!hasValue) {
        return;
      }
      confidenceFlags[key] = field.isAutoFilled ? true : false;
    });

  metadata.confidenceFlags = Object.keys(confidenceFlags).length > 0 ? confidenceFlags : null;

  return metadata;
};

export const structuredFieldsToConfidence = (
  fields: StructuredFieldsState,
): Record<string, unknown> | null => {
  const result: Record<string, unknown> = {};

  (['roaster', 'origin', 'roastLevel', 'processing', 'flavorNotes', 'roastDate', 'varietals'] as StructuredFieldKey[])
    .forEach(key => {
      const field = fields[key];
      const payload: Record<string, unknown> = {};

      if (field.confidence != null) {
        payload.confidence = field.confidence;
      }
      if (!field.isAutoFilled) {
        payload.isManual = true;
      }
      if (field.warning) {
        payload.warning = field.warning;
      }

      if (Object.keys(payload).length > 0) {
        result[key] = payload;
      }
    });

  return Object.keys(result).length > 0 ? result : null;
};
