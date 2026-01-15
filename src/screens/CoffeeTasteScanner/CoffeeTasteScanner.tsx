// CoffeeTasteScanner.tsx - Light & Optimized Design
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { scannerStyles } from './styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  markCoffeePurchased,
  confirmStructuredScan,
  extractCoffeeName,
  rateOCRResult,
  saveOCRResult,
  loadOCRResult,
  addRecentScan,
  fallbackCoffeeDiary,
  preferenceEngine,
  toggleFavorite,
  isCoffeeRelatedText,
} from './services';
import { getAuthToken } from '../../services/ocrServices';
import {
  loadCoffeeSignal,
  recordConsumptionSignal,
  recordFavoriteSignal,
  recordIgnoreSignal,
  recordScanSignal,
  SignalUpdateResult,
} from '../../services/userSignals';
import type {
  OCRHistory,
  StructuredCoffeeMetadata,
  ConfirmStructuredPayload,
  CoffeeEvaluationResult,
} from './services';
import { BrewContext } from '../../types/Personalization';
import type { TasteProfileVector, UserTasteProfile } from '../../types/Personalization';
import { usePersonalization } from '../../hooks/usePersonalization';
import { showToast } from '../../utils/toast';
import { buildScanPreferenceComparison } from '../../utils/scanPreferenceComparison';
import { API_URL } from '../../services/api';
import { recognizeCoffee } from 'services/VisionService.ts';

interface ScanResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number | null;
  isRecommended?: boolean;
  scanId?: string;
  source?: 'offline' | 'online';
  isFavorite?: boolean;
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  detectionLabels?: string[];
  detectionConfidence?: number;
  structuredMetadata?: StructuredCoffeeMetadata | null;
  structuredConfidence?: Record<string, unknown> | null;
  structuredUncertainty?: Record<string, unknown> | null;
  structuredRaw?: unknown;
  evaluation?: CoffeeEvaluationResult | null;
  tasteProfileSent?: boolean;
  tasteProfileRejectedAsStale?: boolean;
}

type ScanResultLike = ScanResult & { rawStructuredResponse?: unknown };

type CoffeePreferenceSnapshot = {
  ai_recommendation?: string | null;
  consistency_score?: number | null;
  taste_vector: Record<string, number> | null;
  updatedAt?: string | null;
  lastRecalculatedAt?: string | null;
};

type StructuredConfirmPayload = ConfirmStructuredPayload & {
  correctedText?: string | null;
  purchased?: boolean | null;
};

interface ProfessionalOCRScannerProps {
  onBack?: () => void;
  onHistoryPress?: () => void;
  onQuestionnairePress?: () => void;
}

const resolveTimeOfDay = (date: Date): BrewContext['timeOfDay'] => {
  const hour = date.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  if (hour < 22) {
    return 'evening';
  }
  return 'night';
};

const getIsoWeekday = (date: Date): number => {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
};

const buildBrewContext = (metadata?: Record<string, unknown>): BrewContext => {
  const now = new Date();
  const context: BrewContext = {
    timeOfDay: resolveTimeOfDay(now),
    weekday: getIsoWeekday(now),
  };

  if (metadata && Object.keys(metadata).length > 0) {
    context.metadata = { ...metadata };
  }

  return context;
};

const isOfflineError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === 'Offline' || error.message.includes('Network request failed');
};

const ensureFileUri = (path: string): string => {
  if (path.startsWith('file://')) {
    return path;
  }
  return `file://${path}`;
};

const stripFileUri = (path: string): string => {
  if (path.startsWith('file://')) {
    return path.replace('file://', '');
  }
  return path;
};

const extractPreferenceSnapshot = (
  payload?: Record<string, unknown> | null,
): CoffeePreferenceSnapshot | null => {
  if (!payload) {
    return null;
  }
  const rawCoffeePreferences =
    payload.coffee_preferences && typeof payload.coffee_preferences === 'object'
      ? (payload.coffee_preferences as Record<string, unknown>)
      : null;
  const coffeePreferences = rawCoffeePreferences ?? payload;
  const aiRecommendation =
    typeof payload.ai_recommendation === 'string' ? payload.ai_recommendation : null;
  const consistencyScore =
    typeof payload.consistency_score === 'number'
      ? payload.consistency_score
      : typeof payload.ai_confidence === 'number'
        ? payload.ai_confidence
        : null;
  const nestedTasteVector =
    coffeePreferences?.taste_vector && typeof coffeePreferences.taste_vector === 'object'
      ? (coffeePreferences.taste_vector as Record<string, number>)
      : null;
  const topLevelTasteVector =
    payload.taste_vector && typeof payload.taste_vector === 'object'
      ? (payload.taste_vector as Record<string, number>)
      : null;
  if (rawCoffeePreferences && topLevelTasteVector && !nestedTasteVector) {
    console.warn(
      'CoffeeTasteScanner: Received legacy top-level taste_vector; expected coffee_preferences.taste_vector.',
    );
  }
  const tasteVector = nestedTasteVector ?? topLevelTasteVector;
  const updatedAt =
    typeof payload.updated_at === 'string'
      ? payload.updated_at
      : typeof coffeePreferences.updated_at === 'string'
        ? coffeePreferences.updated_at
      : typeof payload.updatedAt === 'string'
        ? payload.updatedAt
        : null;
  const lastRecalculatedAt =
    typeof payload.last_recalculated_at === 'string'
      ? payload.last_recalculated_at
      : typeof coffeePreferences.last_recalculated_at === 'string'
        ? coffeePreferences.last_recalculated_at
      : typeof payload.lastRecalculatedAt === 'string'
        ? payload.lastRecalculatedAt
        : null;

  if (!aiRecommendation && consistencyScore == null && !tasteVector) {
    return null;
  }

  return {
    ai_recommendation: aiRecommendation,
    consistency_score: consistencyScore,
    taste_vector: tasteVector,
    updatedAt,
    lastRecalculatedAt,
  };
};

const normalizeReasonLine = (value: string): string => value.replace(/^•\s*/, '').trim();

const uniqueLines = (lines: string[]): string[] => Array.from(new Set(lines));

const isPositiveReasonLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  return POSITIVE_REASON_KEYWORDS.some(keyword => lower.includes(keyword))
    || INSIGHT_POSITIVE_CLAIMS.some(keyword => lower.includes(keyword));
};

const isCautionReasonLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  return CAUTION_REASON_KEYWORDS.some(keyword => lower.includes(keyword))
    || INSIGHT_NEGATIVE_CLAIMS.some(keyword => lower.includes(keyword));
};

const splitReasonLines = (
  lines: string[],
): { positive: string[]; caution: string[]; neutral: string[] } => {
  const normalized = lines.map(normalizeReasonLine).filter(Boolean);
  const positive = normalized.filter(isPositiveReasonLine);
  const caution = normalized.filter(line => !isPositiveReasonLine(line) && isCautionReasonLine(line));
  const neutral = normalized.filter(
    line => !isPositiveReasonLine(line) && !isCautionReasonLine(line),
  );

  return {
    positive: uniqueLines(positive),
    caution: uniqueLines(caution),
    neutral: uniqueLines(neutral),
  };
};

const formatReasonBlock = (title: string, lines: string[]): string | null => {
  const cleaned = uniqueLines(lines.map(normalizeReasonLine).filter(Boolean));
  if (!cleaned.length) {
    return null;
  }
  return `${title}\n${cleaned.map(line => `• ${line}`).join('\n')}`;
};

const extractVerdictExplanationLines = (
  payload: CoffeeEvaluationResult['verdict_explanation'] | null | undefined,
): string[] => {
  if (!payload) {
    return [];
  }
  if (typeof payload === 'string') {
    return [payload];
  }
  return [
    payload.user_preferences_summary,
    payload.coffee_profile_summary,
    payload.comparison_summary,
  ].filter((line): line is string => Boolean(line && line.trim()));
};

const extractInsightReasonLines = (
  insight: CoffeeEvaluationResult['insight'] | null | undefined,
): string[] => {
  if (!insight) {
    return [];
  }
  const sections = Array.isArray(insight.sections) ? insight.sections : [];
  const bullets = sections.flatMap(section =>
    Array.isArray(section?.bullets) ? section.bullets : [],
  );
  return bullets
    .filter((bullet): bullet is string => typeof bullet === 'string')
    .map(bullet => bullet.trim())
    .filter(Boolean);
};

const buildComparisonText = (
  evaluation: CoffeeEvaluationResult | null | undefined,
  preferenceSnapshot: CoffeePreferenceSnapshot | null | undefined,
  coffeePreferences: Record<string, unknown> | null | undefined,
): string => {
  if (!evaluation && !preferenceSnapshot) {
    return 'Zatiaľ nemáme dôvody prečo by káva sedela alebo nie.';
  }

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
  const {
    positive: positiveInsights,
    caution: cautionInsights,
    neutral: neutralInsights,
  } = splitReasonLines(comparison.reasons);

  const sections = [
    formatReasonBlock('Prečo sedí', [...matchLines, ...positiveInsights]),
    formatReasonBlock('Prečo nesedí', [...mismatchLines, ...cautionInsights]),
    formatReasonBlock('Ďalšie zistenia', neutralInsights),
  ].filter((section): section is string => Boolean(section));

  return sections.length
    ? sections.join('\n')
    : 'Zatiaľ nemáme dôvody prečo by káva sedela alebo nie.';
};

const WELCOME_GRADIENT = ['#FF9966', '#A86B8C'];
const COFFEE_GRADIENT = ['#8B6544', '#6B4423'];
const WARM_GRADIENT = ['#FFA000', '#FF6B6B'];

const FLAVOR_KEYWORDS = [
  { keyword: 'kvet', label: '🌺 Kvetinová' },
  { keyword: 'citr', label: '🍋 Citrusová' },
  { keyword: 'brosky', label: '🍑 Broskyňa' },
  { keyword: 'med', label: '🍯 Medová' },
  { keyword: 'čaj', label: '🍵 Čajová' },
  { keyword: 'čokol', label: '🍫 Čokoládová' },
  { keyword: 'karamel', label: '🍮 Karamelová' },
  { keyword: 'ovoc', label: '🍒 Ovocná' },
];

const POSITIVE_REASON_KEYWORDS = [
  'vyhovuje',
  'nízka horkosť',
  'nízku horkosť',
  'jemná',
  'čistá',
  'kvetin',
  'citrus',
  'čajov',
  'sladk',
  'doporuč',
  'odporúč',
  'ideál',
];

const CAUTION_REASON_KEYWORDS = ['pozor', 'ak preferuješ', 'môže', 'siln', 'hork', 'telo'];
const INSIGHT_POSITIVE_CLAIMS = ['sedí', 'zhod', 'match', 'vhod', 'vyhovuje', 'ideál', 'odporúč'];
const INSIGHT_NEGATIVE_CLAIMS = ['nevhod', 'nesedí', 'mimo', 'nezhod', 'neodporúč', 'rizik'];
const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.75;
const MAX_BASE64_LENGTH = 1300000;

type StructuredFieldKey = keyof Pick<
  StructuredCoffeeMetadata,
  'roaster' | 'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'roastDate' | 'varietals'
>;
type StructuredTextFieldKey = Exclude<StructuredFieldKey, 'flavorNotes' | 'varietals'>;
type StructuredListFieldKey = Extract<StructuredFieldKey, 'flavorNotes' | 'varietals'>;

type StructuredFieldState<T> = {
  value: T;
  isAutoFilled: boolean;
  confidence: number | null;
  warning: string | null;
};

type StructuredTextFieldState = StructuredFieldState<string | null>;
type StructuredListFieldState = StructuredFieldState<string[] | null>;

interface StructuredFieldsState {
  roaster: StructuredTextFieldState;
  origin: StructuredTextFieldState;
  roastLevel: StructuredTextFieldState;
  processing: StructuredTextFieldState;
  flavorNotes: StructuredListFieldState;
  roastDate: StructuredTextFieldState;
  varietals: StructuredListFieldState;
}

const STRUCTURED_CONFIDENCE_KEYS: Record<StructuredFieldKey, string[]> = {
  roaster: ['roaster', 'roaster_name', 'brand'],
  origin: ['origin'],
  roastLevel: ['roastLevel', 'roast_level'],
  processing: ['processing', 'process'],
  flavorNotes: ['flavorNotes', 'flavor_notes', 'notes'],
  roastDate: ['roastDate', 'roast_date'],
  varietals: ['varietals', 'variety', 'varieties'],
};

const STRUCTURED_FIELD_LABELS: Record<StructuredFieldKey, string> = {
  roaster: 'Pražiareň',
  origin: 'Pôvod',
  roastLevel: 'Stupeň praženia',
  processing: 'Spracovanie',
  flavorNotes: 'Chuťové tóny',
  roastDate: 'Dátum praženia',
  varietals: 'Odrody',
};

const resolveVerdictExplanationText = (
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

const resolveInsightHeadline = (insight: CoffeeEvaluationResult['insight'] | null | undefined): string => {
  if (!insight || typeof insight.headline !== 'string') {
    return '';
  }
  return insight.headline.trim();
};

const STRUCTURED_FIELD_ORDER: Array<{
  key: StructuredFieldKey;
  type: 'text' | 'list';
  placeholder: string;
}> = [
  { key: 'roaster', type: 'text', placeholder: 'Napr. pražiareň alebo brand' },
  { key: 'origin', type: 'text', placeholder: 'Napr. krajina alebo región pôvodu' },
  { key: 'roastLevel', type: 'text', placeholder: 'Napr. light, medium, dark' },
  { key: 'processing', type: 'text', placeholder: 'Napr. washed, natural, honey' },
  { key: 'flavorNotes', type: 'list', placeholder: 'Oddeluj čiarkou: čokoláda, čerešňa' },
  { key: 'roastDate', type: 'text', placeholder: 'Napr. 12.02.2024' },
  { key: 'varietals', type: 'list', placeholder: 'Oddeluj čiarkou: Bourbon, Typica' },
];

const normalizeStructuredStringValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeStructuredStringArrayValue = (
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

const isStructuredValueFilled = <T,>(value: T): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value != null;
};

const resolveConfidenceEntry = (
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

const createStructuredFieldsFromMetadata = (
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

const structuredFieldsToMetadata = (
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

const structuredFieldsToConfidence = (
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

const clampTasteValue = (value: number): number => {
  if (Number.isNaN(value)) {
    return 5;
  }
  return Math.min(10, Math.max(0, value));
};

const normalizeTasteVectorTo10 = (
  value?: Record<string, number> | null,
): TasteProfileVector | null => {
  if (!value) {
    return null;
  }

  const parseValue = (entry: unknown): number | null => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      return clampTasteValue(entry <= 1 ? entry * 10 : entry);
    }
    if (typeof entry === 'string') {
      const parsed = Number(entry);
      if (Number.isFinite(parsed)) {
        return clampTasteValue(parsed <= 1 ? parsed * 10 : parsed);
      }
    }
    return null;
  };

  const sweetness = parseValue(value.sweetness);
  const acidity = parseValue(value.acidity);
  const bitterness = parseValue(value.bitterness);
  const body = parseValue(value.body);

  if (![sweetness, acidity, bitterness, body].some(entry => entry !== null)) {
    return null;
  }

  return {
    sweetness: sweetness ?? 5,
    acidity: acidity ?? 5,
    bitterness: bitterness ?? 5,
    body: body ?? 5,
  };
};

const extractTasteVectorFromPayload = (payload: unknown): TasteProfileVector | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedTasteVector = (input: unknown): Record<string, number> | null => {
    if (!input || typeof input !== 'object') {
      return null;
    }
    return input as Record<string, number>;
  };

  const directCandidate =
    nestedTasteVector(record.taste_vector) ??
    nestedTasteVector(record.tasteVector) ??
    nestedTasteVector(record.taste_profile) ??
    nestedTasteVector(record.tasteProfile) ??
    nestedTasteVector(
      typeof record.taste_profile === 'object'
        ? (record.taste_profile as Record<string, unknown>).taste_vector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.tasteProfile === 'object'
        ? (record.tasteProfile as Record<string, unknown>).taste_vector ??
          (record.tasteProfile as Record<string, unknown>).tasteVector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.coffee_attributes === 'object'
        ? (record.coffee_attributes as Record<string, unknown>).taste_vector
        : null,
    ) ??
    nestedTasteVector(
      typeof record.coffeeAttributes === 'object'
        ? (record.coffeeAttributes as Record<string, unknown>).taste_vector ??
          (record.coffeeAttributes as Record<string, unknown>).tasteVector
        : null,
    );

  return directCandidate ? normalizeTasteVectorTo10(directCandidate) : null;
};

const hasCompleteTasteVector = (vector?: TasteProfileVector | null): boolean => {
  if (!vector) {
    return false;
  }
  return ['sweetness', 'acidity', 'bitterness', 'body'].every(key => {
    const value = vector[key as keyof TasteProfileVector];
    return typeof value === 'number' && Number.isFinite(value);
  });
};

const resolveTasteProfile = (
  profile?: TasteProfileVector | UserTasteProfile | null,
  snapshotVector?: TasteProfileVector | null,
): TasteProfileVector | UserTasteProfile | null => {
  if (profile && 'preferences' in profile) {
    if (hasCompleteTasteVector(profile.preferences ?? null)) {
      return profile;
    }
  } else if (hasCompleteTasteVector(profile ?? null)) {
    return profile ?? null;
  }

  if (hasCompleteTasteVector(snapshotVector ?? null)) {
    return snapshotVector ?? null;
  }

  return null;
};

type CompatibilityBucket = 'SAFE' | 'RISKY' | 'NO-GO';

const normalizeConfidenceScore = (confidence?: number | null): number | null => {
  if (typeof confidence !== 'number') {
    return null;
  }
  const normalized = confidence <= 1 ? confidence * 100 : confidence;
  return Math.round(Math.max(0, Math.min(100, normalized)));
};


const CoffeeTasteScanner: React.FC<ProfessionalOCRScannerProps> = ({
  onBack,
  onHistoryPress,
  onQuestionnairePress,
}) => {
  const {
    coffeeDiary: personalizationDiary,
    refreshInsights,
    profile,
    userId,
    ready: personalizationReady,
  } = usePersonalization();
  const diary = personalizationDiary ;
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrHistory, setOcrHistory] = useState<OCRHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [purchaseSelection, setPurchaseSelection] = useState<boolean | null>(null);
  const [purchased, setPurchased] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [offlineModalVisible, setOfflineModalVisible] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<'prompt' | 'modelUsed'>('prompt');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHistoryReadOnly, setIsHistoryReadOnly] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'scan'>('home');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('Analyzujem...');
  const [nonCoffeeModalVisible, setNonCoffeeModalVisible] = useState(false);
  const [nonCoffeeDetails, setNonCoffeeDetails] = useState<{
    reason?: string;
    labels?: string[];
    confidence?: number;
  }>({});
  const [nonCoffeeAllowConfirm, setNonCoffeeAllowConfirm] = useState(false);
  const [nonCoffeePendingResult, setNonCoffeePendingResult] = useState<ScanResultLike | null>(null);
  const [nonCoffeePendingImage, setNonCoffeePendingImage] = useState<string | null>(null);
  const [structuredFields, setStructuredFields] = useState<StructuredFieldsState>(() =>
    createStructuredFieldsFromMetadata(null, null)
  );
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<StructuredConfirmPayload | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [signalWarning, setSignalWarning] = useState<string | null>(null);
  const [preferenceSnapshot, setPreferenceSnapshot] = useState<CoffeePreferenceSnapshot | null>(null);

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isDarkMode = useColorScheme() === 'dark';

  const styles = scannerStyles(isDarkMode);
  const backgroundGradient = useMemo(
    () => ({
      colors: ['#FFE8D1', '#FFF3E4', '#FAF8F5'],
      locations: [0, 0.28, 0.7],
    }),
    [],
  );

  const contextPreferenceSnapshot = useMemo(() => {
    const profileRecord = profile as unknown as {
      coffee_preferences?: Record<string, unknown> | null;
    };
    return extractPreferenceSnapshot(profileRecord?.coffee_preferences ?? null);
  }, [profile]);

  const preferenceSnapshotVector = useMemo(
    () => normalizeTasteVectorTo10(preferenceSnapshot?.taste_vector ?? null),
    [preferenceSnapshot],
  );
  const preferenceSnapshotProfile = useMemo(() => {
    if (!preferenceSnapshotVector) {
      return null;
    }
    const updatedAt = preferenceSnapshot?.updatedAt ?? null;
    const lastRecalculatedAt = preferenceSnapshot?.lastRecalculatedAt ?? null;
    if (!updatedAt && !lastRecalculatedAt) {
      return preferenceSnapshotVector;
    }
    return {
      ...preferenceSnapshotVector,
      updatedAt: updatedAt ?? undefined,
      lastRecalculatedAt: lastRecalculatedAt ?? undefined,
    };
  }, [preferenceSnapshot, preferenceSnapshotVector]);

  const loadPreferenceSnapshot = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        showToast('Prihlás sa, prosím.');
        return;
      }
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.warn('CoffeeTasteScanner: Failed to load preference profile', response.status);
        return;
      }
      const data = (await response.json()) as Record<string, unknown> | null;
      const coffeePreferences =
        (data?.coffee_preferences as Record<string, unknown> | null) ?? null;
      const snapshot = extractPreferenceSnapshot(coffeePreferences);
      if (snapshot) {
        setPreferenceSnapshot(snapshot);
      }
    } catch (error) {
      console.warn('CoffeeTasteScanner: Failed to load preference profile', error);
    }
  }, []);

  const handleSignalOutcome = useCallback(
    (result: SignalUpdateResult, context: string) => {
      if (!result.synced) {
        const message =
          result.error && result.error.length > 0
            ? `Signály čakajú na synchronizáciu (${result.error})`
            : 'Signály čakajú na synchronizáciu. Uložené offline.';
        if (!signalWarning) {
          showToast('Signály uložené offline, synchronizujeme neskôr.');
        }
        setSignalWarning(message);
        console.warn(`CoffeeTasteScanner: ${context} signal queued`, result.error);
      } else if (signalWarning) {
        setSignalWarning(null);
      }
    },
    [signalWarning],
  );

  const nonCoffeeConfidence = useMemo(() => {
    if (typeof nonCoffeeDetails.confidence !== 'number') {
      return null;
    }
    const raw = nonCoffeeDetails.confidence;
    const percent = raw <= 1 ? raw * 100 : raw;
    const bounded = Math.round(Math.max(0, Math.min(100, percent)));
    return Number.isNaN(bounded) ? null : bounded;
  }, [nonCoffeeDetails.confidence]);

  // Structured metadata is populated from AI/DB (scan response or history) and editable by the user.
  const structuredMetadata = useMemo(
    () => structuredFieldsToMetadata(structuredFields),
    [structuredFields],
  );
  const structuredConfidencePayload = useMemo(
    () => structuredFieldsToConfidence(structuredFields),
    [structuredFields],
  );
  const hasStructuredMetadata = useMemo(
    () => structuredMetadata !== null,
    [structuredMetadata],
  );
  const flavorNotesInputValue = useMemo(() => {
    const value = structuredFields.flavorNotes.value;
    return value && value.length ? value.join(', ') : '';
  }, [structuredFields.flavorNotes.value]);
  const varietalsInputValue = useMemo(() => {
    const value = structuredFields.varietals.value;
    return value && value.length ? value.join(', ') : '';
  }, [structuredFields.varietals.value]);
  const structuredRoasterName = useMemo(
    () => normalizeStructuredStringValue(structuredFields.roaster.value),
    [structuredFields.roaster.value],
  );
  const combinedStructuredConfidence = useMemo(() => {
    const base = scanResult?.structuredConfidence ?? null;
    if (!base && !structuredConfidencePayload) {
      return null;
    }
    if (!base) {
      return structuredConfidencePayload;
    }
    if (!structuredConfidencePayload) {
      return base;
    }
    return {
      ...base,
      ...structuredConfidencePayload,
    };
  }, [scanResult, structuredConfidencePayload]);
  const confirmMetadataEntries = useMemo(() => {
    if (!confirmPayload?.metadata) {
      return [] as Array<{ key: StructuredFieldKey; value: string }>;
    }
    const metadata = confirmPayload.metadata;
    const entries: Array<{ key: StructuredFieldKey; value: string }> = [];

    STRUCTURED_FIELD_ORDER.forEach(field => {
      const metadataValue = metadata[field.key];
      if (Array.isArray(metadataValue) && metadataValue.length) {
        entries.push({ key: field.key, value: metadataValue.join(', ') });
      } else if (typeof metadataValue === 'string' && metadataValue.trim().length > 0) {
        entries.push({ key: field.key, value: metadataValue });
      }
    });

    return entries;
  }, [confirmPayload]);
  const structuredBadgeLabel = useMemo(() => {
    if (!hasStructuredMetadata) {
      return 'Pripravené na doplnenie';
    }
    const anyAutoFilled = STRUCTURED_FIELD_ORDER.some(field => {
      const fieldState = structuredFields[field.key];
      return fieldState.isAutoFilled && isStructuredValueFilled(fieldState.value);
    });
    if (anyAutoFilled) {
      return 'AI vyplnila';
    }
    return 'Upravené';
  }, [hasStructuredMetadata, structuredFields]);

  const formatConfidenceLabel = (value: number | null): string | null => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    const normalized = value > 1 ? Math.min(value, 100) : value * 100;
    const rounded = Math.round(normalized);
    if (!Number.isFinite(rounded)) {
      return null;
    }
    return `${rounded}% istota`;
  };

  const updateStructuredField = <K extends keyof StructuredFieldsState>(
    key: K,
    updater: (field: StructuredFieldsState[K]) => StructuredFieldsState[K],
  ) => {
    setStructuredFields(prev => {
      const nextField = updater(prev[key]);
      if (nextField === prev[key]) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextField,
      };
    });
  };

  const handleStructuredTextChange = (key: StructuredTextFieldKey, value: string) => {
    const nextValue = value.length > 0 ? value : null;
    updateStructuredField(key, field => ({
      ...field,
      value: nextValue,
      isAutoFilled: false,
    }));
  };

  const handleStructuredListChange = (key: StructuredListFieldKey, value: string) => {
    updateStructuredField(key, field => ({
      ...field,
      value: normalizeStructuredStringArrayValue(value),
      isAutoFilled: false,
    }));
  };

  const applyScanResult = useCallback(
    (result: ScanResultLike | null) => {
      if (!result) {
        setScanResult(null);
        setStructuredFields(createStructuredFieldsFromMetadata(null, null));
        return;
      }

      const structuredRaw =
        result.structuredRaw !== undefined
          ? result.structuredRaw
          : result.rawStructuredResponse ?? result.structuredMetadata ?? null;

      const normalizedResult: ScanResult = {
        ...result,
        structuredMetadata: result.structuredMetadata ?? null,
        structuredConfidence: result.structuredConfidence ?? null,
        structuredUncertainty: result.structuredUncertainty ?? null,
        structuredRaw,
        evaluation: result.evaluation ?? null,
      };

      setScanResult(normalizedResult);
      setStructuredFields(
        createStructuredFieldsFromMetadata(
          normalizedResult.structuredMetadata,
          normalizedResult.structuredConfidence,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    if (scanResult?.structuredUncertainty) {
      console.info('CoffeeTasteScanner: structured uncertainty signals', {
        scanId: scanResult.scanId,
        uncertainty: scanResult.structuredUncertainty,
      });
    }
  }, [scanResult]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    loadHistory();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) {
        setOfflineStatus('prompt');
        setOfflineModalVisible(true);
      } else {
        setOfflineModalVisible(false);
        setOfflineStatus('prompt');
      }
    });
    return () => {
      unsubscribe();
      setIsConnected(null);
    };
  }, []);

  useEffect(() => {
    if (contextPreferenceSnapshot) {
      setPreferenceSnapshot(contextPreferenceSnapshot);
      return;
    }
    loadPreferenceSnapshot();
  }, [contextPreferenceSnapshot, loadPreferenceSnapshot]);

  const closeNonCoffeeModal = () => {
    setNonCoffeeModalVisible(false);
    setNonCoffeeDetails({});
    setNonCoffeeAllowConfirm(false);
    setNonCoffeePendingResult(null);
    setNonCoffeePendingImage(null);
  };

  const handleNonCoffeeDetected = (details?: {
    reason?: string;
    labels?: string[];
    confidence?: number;
    refreshHistory?: boolean;
    allowConfirm?: boolean;
    pendingResult?: ScanResultLike | null;
    pendingImage?: string | null;
  }) => {
    applyScanResult(null);
    setEditedText('');
    setPurchaseSelection(null);
    setPurchased(null);
    setUserRating(0);
    setIsFavorite(false);
    setIsHistoryReadOnly(false);
    setShowCamera(false);
    setOverlayVisible(false);
    setOverlayText('Analyzujem...');
    setConfirmModalVisible(false);
    setConfirmPayload(null);
    setIsConfirming(false);
    setIsLoading(false);
    setCurrentView('home');
    const derivedReason =
      details?.reason ||
      (details?.labels && details.labels.length > 0
        ? `Rozpoznané: ${details.labels.slice(0, 3).join(', ')}`
        : undefined);
    setNonCoffeeDetails({
      reason: derivedReason,
      labels: details?.labels,
      confidence: details?.confidence,
    });
    setNonCoffeeAllowConfirm(details?.allowConfirm ?? false);
    setNonCoffeePendingResult(details?.pendingResult ?? null);
    setNonCoffeePendingImage(details?.pendingImage ?? null);
    setNonCoffeeModalVisible(true);
    showToast('Skús prosím naskenovať etiketu kávy.');
    if (details?.refreshHistory) {
      void loadHistory();
    }
  };

  const MAX_RECENT_SCAN_THUMBNAIL_LENGTH = 8000;

  const selectRecentScanImage = (imagePath?: string, base64image?: string) => {
    if (imagePath) {
      return imagePath;
    }

    if (!base64image) {
      return undefined;
    }

    const dataUri = `data:image/jpeg;base64,${base64image}`;
    return dataUri.length <= MAX_RECENT_SCAN_THUMBNAIL_LENGTH ? dataUri : undefined;
  };

  const finalizeCoffeeScan = async (
    normalizedResult: ScanResultLike,
    base64image: string,
    imagePath?: string,
  ) => {
    applyScanResult(normalizedResult);
    setIsFavorite(normalizedResult.isFavorite ?? false);
    setEditedText(normalizedResult.corrected);
    setPurchaseSelection(null);
    setPurchased(null);
    setIsHistoryReadOnly(false);
    setConfirmModalVisible(false);
    setConfirmPayload(null);

    await saveOCRResult(normalizedResult.scanId || 'last', normalizedResult);

    setCurrentView('scan');
    setOverlayVisible(false);
    setOverlayText('Analyzujem...');

    const name = extractCoffeeName(normalizedResult.corrected || normalizedResult.original);
    const scanIdentifier = normalizedResult.scanId || Date.now().toString();
    const recentImage = selectRecentScanImage(imagePath, base64image);
    await addRecentScan({
      id: scanIdentifier,
      name,
      imageUrl: recentImage,
    });

    const identity = resolveCoffeeIdentity(normalizedResult as ScanResult, name);
    if (identity) {
      try {
        const signalResult = await recordScanSignal(userId ?? null, identity.id, identity.name);
        handleSignalOutcome(signalResult, 'scan');
      } catch (signalError) {
        console.warn('CoffeeTasteScanner: failed to record scan signal', signalError);
      }
    }

    await loadHistory();
  };

  const handleConfirmNonCoffee = async () => {
    const pendingResult = nonCoffeePendingResult;
    const pendingImage = nonCoffeePendingImage;
    closeNonCoffeeModal();

    if (!pendingResult || !pendingImage) {
      return;
    }

    const confirmedResult: ScanResultLike = {
      ...pendingResult,
      isCoffee: true,
    };

    setIsLoading(true);
    try {
        await finalizeCoffeeScan(confirmedResult, pendingImage);
    } catch (error) {
      console.error('CoffeeTasteScanner: confirm anyway failed', error);
      Alert.alert('Chyba', 'Nepodarilo sa potvrdiť sken.');
    } finally {
      setIsLoading(false);
    }
  };

  const resolveCoffeeIdentity = (result: ScanResult | null, nameHint: string): { id: string; name: string } | null => {
    if (!result && !nameHint) {
      return null;
    }
    const id = result?.scanId ?? `coffee-${nameHint.toLowerCase().replace(/\s+/g, '-') || Date.now()}`;
    const name = nameHint || extractCoffeeName(result?.corrected || result?.original || '');
    return { id, name };
  };

  const buildMetadataFromHistory = useCallback((item: OCRHistory): StructuredCoffeeMetadata | null => {
    const confirmed = item.confirmed_structured_metadata;
    const confirmedFlavorNotes =
      confirmed && 'flavor_notes' in confirmed
        ? (confirmed as StructuredCoffeeMetadata & { flavor_notes?: string[] | null }).flavor_notes
        : null;
    const confirmedRoastLevel =
      confirmed && 'roast_level' in confirmed
        ? (confirmed as StructuredCoffeeMetadata & { roast_level?: string | null }).roast_level
        : null;

    const roaster = normalizeStructuredStringValue(confirmed?.roaster ?? item.brand);
    const origin = normalizeStructuredStringValue(confirmed?.origin ?? item.origin);
    const roastLevel = normalizeStructuredStringValue(
      confirmed?.roastLevel ?? confirmedRoastLevel ?? item.roast_level
    );
    const processing = normalizeStructuredStringValue(confirmed?.processing ?? item.processing);
    const roastDate = normalizeStructuredStringValue(confirmed?.roastDate ?? item.roast_date);
    const flavorNotes = normalizeStructuredStringArrayValue(
      confirmed?.flavorNotes ?? confirmedFlavorNotes ?? item.flavor_notes
    );
    const varietals = normalizeStructuredStringArrayValue(
      confirmed?.varietals ?? item.varietals
    );

    const metadata: StructuredCoffeeMetadata = {
      roaster,
      origin,
      roastLevel,
      processing,
      flavorNotes,
      roastDate,
      varietals,
      confidenceFlags: confirmed?.confidenceFlags ?? null,
    };

    const hasAnyLabelValue =
      [metadata.roaster, metadata.origin, metadata.roastLevel, metadata.processing, metadata.roastDate].some(Boolean) ||
      (metadata.flavorNotes?.length ?? 0) > 0 ||
      (metadata.varietals?.length ?? 0) > 0;

    return hasAnyLabelValue ? metadata : null;
  }, []);

  /**
   * Načíta nedávne OCR skeny pre používateľa.
   */
  const loadHistory = async () => {
    try {
      const history = await fetchOCRHistory(10);
      setOcrHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  /**
   * Obnoví históriu potiahnutím.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const compressImageForUpload = useCallback(async (imagePath: string) => {
    const resized = await ImageResizer.createResizedImage(
      ensureFileUri(imagePath),
      MAX_IMAGE_DIMENSION,
      MAX_IMAGE_DIMENSION,
      'JPEG',
      Math.round(IMAGE_QUALITY * 100),
      0,
    );

    const resizedPath = stripFileUri(resized.path ?? resized.uri ?? '');
    if (!resizedPath) {
      throw new Error('Resized image path is missing');
    }

    const base64 = await RNFS.readFile(resizedPath, 'base64');
    if (base64.length > MAX_BASE64_LENGTH) {
      Alert.alert('Upozornenie', 'Obrázok je príliš veľký, skúste zbližiť alebo nafotiť znova.');
      return null;
    }

    return { base64, path: resizedPath };
  }, []);

  /**
   * Odfotí etiketu a odošle ju na OCR spracovanie.
   */
  const takePhoto = async () => {
    if (!camera.current || !device) {
      Alert.alert('Chyba', 'Kamera nie je pripravená');
      return;
    }

    try {
      closeNonCoffeeModal();
      setIsLoading(true);
      const photo: PhotoFile = await camera.current.takePhoto({
        flash: 'auto',
      });

      setShowCamera(false);
      const compressed = await compressImageForUpload(photo.path);
      if (!compressed) {
        return;
      }

      if (isConnected === false) {
        await handleOfflineScan(photo.path, compressed.base64);
        return;
      }

      await processImage(compressed.base64, { imagePath: photo.path, base64: compressed.base64 });
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa urobiť fotografiu');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vyberie fotku z galérie a odošle ju na spracovanie.
   */
  const pickImageFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1.0,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;

      const asset = response.assets?.[0];
      if (!asset) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
        return;
      }

      try {
        closeNonCoffeeModal();
        setShowCamera(false);

        let originalPath = asset.uri ? stripFileUri(asset.uri) : '';
        if (!originalPath && asset.base64) {
          const cacheDir =
            RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath || RNFS.DocumentDirectoryPath;
          if (!cacheDir) {
            throw new Error('Temporary directory is not available');
          }
          const tempPath = `${cacheDir}/brew-offline-${Date.now()}.jpg`;
          await RNFS.writeFile(tempPath, asset.base64, 'base64');
          originalPath = tempPath;
        }

        if (!originalPath) {
          Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
          return;
        }

        const compressed = await compressImageForUpload(originalPath);
        if (!compressed) {
          return;
        }

        if (isConnected === false) {
          setIsLoading(true);
          try {
            await handleOfflineScan(originalPath, compressed.base64);
          } finally {
            setIsLoading(false);
          }
          return;
        }

        await processImage(compressed.base64, { imagePath: originalPath, base64: compressed.base64 });
      } catch (err) {
        console.error('Gallery processing error:', err);
        Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
      }
    });
  };

  /**
   * Vykoná OCR pipeline a uloží výsledok do stavu.
   */
  type ProcessImageExtra = { imagePath?: string; base64?: string };

  const processImage = async (base64image: string, extra?: ProcessImageExtra) => {
    if (!personalizationReady) {
      showToast('Počkajte na načítanie profilu');
      void refreshInsights?.();
      return;
    }

    try {
      setIsLoading(true);
      setShowCamera(false);
      setOverlayText('Analyzujem...');
      setOverlayVisible(true);

      const tasteProfile = resolveTasteProfile(profile, preferenceSnapshotProfile);
      const result = await processOCR(base64image, {
        imagePath: extra?.imagePath,
        tasteProfile,
      });

      if (result) {
        if (result.source === 'offline') {
          await handleOfflineScan(extra?.imagePath || '', extra?.base64 ?? base64image, result);
          return;
        }

        const detectionLabels = result.detectionLabels?.filter(Boolean) ?? [];
        const normalizedResult: ScanResultLike = {
          ...result,
          structuredRaw:
            (result as ScanResultLike).structuredRaw ??
            (result as ScanResultLike).rawStructuredResponse ??
            result.structuredMetadata ??
            null,
        };

        const computedIsCoffee =
          typeof result.isCoffee === 'boolean'
            ? result.isCoffee
            : detectionLabels.some(label => isCoffeeRelatedText(label)) ||
              isCoffeeRelatedText(result.corrected) ||
              isCoffeeRelatedText(result.original);

        if (!computedIsCoffee) {
          handleNonCoffeeDetected({
            reason: result.nonCoffeeReason,
            labels: detectionLabels.length ? detectionLabels : undefined,
            confidence: result.detectionConfidence,
            refreshHistory: Boolean(result.scanId),
            allowConfirm: result.isCoffee === false,
            pendingResult: result.isCoffee === false ? normalizedResult : null,
            pendingImage: result.isCoffee === false ? base64image : null,
          });
          return;
        }

        await finalizeCoffeeScan(normalizedResult, base64image, extra?.imagePath);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          Alert.alert('Chyba', 'Analýza trvala príliš dlho, skús to znova.');
          return;
        }
        if (/upload aborted/i.test(error.message)) {
          Alert.alert('Chyba', 'Obrázok je príliš veľký, skús menší.');
          return;
        }
      }
      if (
        extra?.imagePath &&
        error instanceof Error &&
        /offline|network request failed/i.test(error.message)
      ) {
        await handleOfflineScan(extra.imagePath, extra.base64 ?? base64image);
        return;
      }
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
  };

  const handleOfflineScan = async (
    imagePath: string,
    base64image: string,
    existingResult?: ScanResult | null
  ) => {
    try {
      setOverlayText('Analyzujem offline...');
      setOverlayVisible(true);
      if (existingResult?.isCoffee === false) {
        handleNonCoffeeDetected({
          reason: existingResult.nonCoffeeReason,
          labels: existingResult.detectionLabels,
          confidence: existingResult.detectionConfidence,
          refreshHistory: Boolean(existingResult.scanId),
        });
        return;
      }

      const label = existingResult?.corrected || (await recognizeCoffee(imagePath));
      if (!label) {
        handleNonCoffeeDetected({
          reason: 'Nepodarilo sa rozpoznať kávu. Skús to znova.',
          refreshHistory: Boolean(existingResult?.scanId),
        });
        return;
      }

      const labelIsCoffee = isCoffeeRelatedText(label);
      if (!labelIsCoffee) {
        handleNonCoffeeDetected({
          reason: existingResult?.nonCoffeeReason ?? `Rozpoznané: ${label}`,
          labels: existingResult?.detectionLabels ?? [label],
          confidence: existingResult?.detectionConfidence,
          refreshHistory: Boolean(existingResult?.scanId),
        });
        return;
      }

      const timestamp = Date.now();
      const scanId = existingResult?.scanId || `offline-${timestamp}`;
      const detectionLabels = existingResult?.detectionLabels ?? [label];
      const offlineResult: ScanResultLike = existingResult
        ? {
            ...existingResult,
            source: 'offline',
            isCoffee: true,
            detectionLabels,
            structuredRaw:
              existingResult.structuredRaw ??
              (existingResult as ScanResultLike).rawStructuredResponse ??
              existingResult.structuredMetadata ??
              null,
          }
        : {
            original: '',
            corrected: label,
            recommendation: 'Výsledok z lokálneho modelu.',
            scanId,
            source: 'offline',
            isCoffee: true,
            detectionLabels,
            structuredMetadata: null,
            structuredConfidence: null,
            structuredRaw: null,
          };

      applyScanResult(offlineResult);
      setIsFavorite(offlineResult.isFavorite ?? false);
      setEditedText(offlineResult.corrected);
      setPurchaseSelection(null);
      setPurchased(null);
      setIsHistoryReadOnly(false);
      setConfirmModalVisible(false);
      setConfirmPayload(null);
      setCurrentView('scan');
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');

      try {
        const payload = imagePath
          ? { ...offlineResult, imagePath, createdAt: timestamp }
          : { ...offlineResult, createdAt: timestamp };
      } catch (cacheError) {
        console.error('Failed to cache offline scan', cacheError);
      }

      try {
        await saveOCRResult(scanId, offlineResult);
      } catch (cacheError) {
        console.error('Failed to save offline result', cacheError);
      }

      try {
        const name = extractCoffeeName(label);
        await addRecentScan({
          id: scanId,
          name,
          imageUrl: selectRecentScanImage(imagePath, base64image),
        });

        const identity = resolveCoffeeIdentity(offlineResult as ScanResult, name);
        if (identity) {
          try {
            const signalResult = await recordScanSignal(userId ?? null, identity.id, identity.name);
            handleSignalOutcome(signalResult, 'offline-scan');
          } catch (signalError) {
            console.warn('CoffeeTasteScanner: failed to record offline scan signal', signalError);
          }
        }
      } catch (recentError) {
        console.error('Failed to store offline recent scan', recentError);
      }

      setOfflineStatus('modelUsed');
      setOfflineModalVisible(true);
    } catch (err) {
      console.error('Offline recognition failed:', err);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok offline');
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
  };

  /**
   * Uloží hodnotenie vybranej kávy.
   */
  // const rateCoffee = async (rating: number) => {
  //   if (!scanResult?.scanId) return;
  //
  //   try {
  //     const success = await rateOCRResult(scanResult.scanId, rating);
  //     if (success) {
  //       setUserRating(rating);
  //       Alert.alert('Hodnotenie uložené', `Ohodnotil si kávu na ${rating}/5 ⭐`);
  //       await loadHistory();
  //     }
  //   } catch (error) {
  //     console.error('Error rating coffee:', error);
  //   }
  // };

  /**
   * Zdieľa text prostredníctvom natívneho dialógu.
   */
  // const exportText = async () => {
  //   if (editedText) {
  //     try {
  //       await Share.share({
  //         message: editedText,
  //         title: 'Skenovaná káva - BrewMate',
  //       });
  //     } catch (error) {
  //       Alert.alert('Chyba', 'Nepodarilo sa zdieľať text');
  //     }
  //   }
  // };

  /**
   * Načíta záznam z histórie do editora.
   */
  const loadFromHistory = (item: OCRHistory) => {
    const historyMetadata = buildMetadataFromHistory(item);
    const historyResult: ScanResultLike = {
      original: item.original_text,
      corrected: item.corrected_text,
      recommendation: '',
      matchPercentage: item.match_percentage,
      isRecommended: item.is_recommended,
      isFavorite: item.is_favorite,
      structuredMetadata: historyMetadata,
      structuredConfidence: null,
      structuredRaw: historyMetadata,
    };

    applyScanResult(historyResult);
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setPurchaseSelection(item.is_purchased ?? null);
    setPurchased(item.is_purchased ?? null);
    setIsFavorite(item.is_favorite ?? false);
    setCurrentView('scan');
    setIsHistoryReadOnly(true);
    setConfirmModalVisible(false);
    setConfirmPayload(null);

    // Scroll to top to show loaded result
    // scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const deleteFromHistory = async (id: string) => {
    Alert.alert(
      'Vymazať záznam',
      'Naozaj chcete vymazať tento záznam?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOCRRecord(id);
              await loadHistory();
            } catch (error) {
              Alert.alert('Chyba', 'Nepodarilo sa vymazať záznam');
            }
          },
        },
      ]
    );
  };

  /**
   * Skontroluje povolenia a otvorí kameru.
   */
  const openCamera = () => {
    if (!hasPermission) {
      Alert.alert(
        'Povolenie kamery',
        'Na skenovanie kávy potrebujeme prístup ku kamere',
        [
          { text: 'Zrušiť', style: 'cancel' },
          { text: 'Povoliť', onPress: requestPermission },
        ]
      );
      return;
    }
    setShowCamera(true);
  };
  const handleRating = async (rating: number) => {
    if (!scanResult || isHistoryReadOnly) {
      return;
    }

    if (!diary) {
      Alert.alert('Chyba', 'Denník nie je dostupný. Skús to neskôr.');
      return;
    }

    const previousRating = userRating;
    setUserRating(rating);

    const fallbackId = `taste-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const noteParts = [scanResult.recommendation, editedText].filter(
      (part): part is string => Boolean(part),
    );
    const notes = noteParts.length > 0 ? noteParts.join('\n\n') : undefined;

    let queuedOffline = false;

    if (scanResult.scanId) {
      try {
        const success = await rateOCRResult(scanResult.scanId, rating);
        if (!success) {
          throw new Error('RATE_FAILED');
        }
      } catch (error) {
        if (isOfflineError(error) || isConnected === false) {
          try {
            const payload = notes
              ? { coffeeId: scanResult.scanId, rating, notes }
              : { coffeeId: scanResult.scanId, rating };
            queuedOffline = true;
          } catch (queueError) {
            console.error('Failed to enqueue rating for offline sync', queueError);
            setUserRating(previousRating);
            Alert.alert('Chyba', 'Nepodarilo sa uložiť hodnotenie offline');
            return;
          }
        } else {
          console.error('Error rating result:', error);
          setUserRating(previousRating);
          Alert.alert('Chyba', 'Nepodarilo sa uložiť hodnotenie');
          return;
        }
      }
    } else {
      queuedOffline = true;
    }

    try {
      const metadata: Record<string, unknown> = {
        source: 'taste-scanner',
        scanId: scanResult.scanId,
        matchPercentage: scanResult.matchPercentage,
        isRecommended: scanResult.isRecommended,
      };

      if (scanResult.recommendation) {
        metadata.recommendation = scanResult.recommendation;
      }
      if (editedText) {
        metadata.correctedText = editedText;
      }

      const context = buildBrewContext(metadata);
      const recipeLabel = extractCoffeeName(editedText || scanResult.corrected || scanResult.original);
      await diary.addManualEntry({
        recipe: recipeLabel,
        notes,
        brewedAt: new Date(),
        rating,
        recipeId: recordId,
        metadata,
        context,
      });

      if (refreshInsights) {
        refreshInsights().catch((error) => {
          console.warn('CoffeeTasteScanner: failed to refresh diary insights', error);
        });
      }

      const learningEvent = await preferenceEngine.recordBrew(recordId, rating, context);
      await preferenceEngine.saveEvents(learningEvent);

      const identity = resolveCoffeeIdentity(scanResult, recipeLabel);
      if (identity) {
        try {
          const signalResult = await recordConsumptionSignal(
            userId ?? null,
            identity.id,
            identity.name,
          );
          handleSignalOutcome(signalResult, 'consumption');
        } catch (error) {
          console.warn('CoffeeTasteScanner: failed to record consumption', error);
        }
      }

      await loadHistory();

      Alert.alert('Hodnotenie uložené', `Ohodnotil si kávu na ${rating}/5 ⭐`);
      if (queuedOffline || isConnected === false) {
        showToast('Hodnotenie uložené offline. Synchronizujeme neskôr.');
      }
    } catch (error) {
      console.error('Error rating result:', error);
      setUserRating(previousRating);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať hodnotenie');
    }
  };

  const handleFavoriteToggle = async () => {
    if (!scanResult || isHistoryReadOnly) {
      return;
    }

    const fallbackId = `taste-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);

    try {
      const success = await toggleFavorite(recordId);
      if (!success) {
        setIsFavorite(!nextValue);
        Alert.alert('Chyba', 'Nepodarilo sa aktualizovať obľúbenú kávu');
        return;
      }

      setScanResult(prev => (prev ? { ...prev, isFavorite: nextValue } : prev));

      try {
        await loadHistory();
      } catch (historyError) {
        console.warn('CoffeeTasteScanner: failed to refresh history after favorite toggle', historyError);
      }

      const identity = resolveCoffeeIdentity(scanResult, coffeeName);
      if (identity) {
        try {
          const signalResult = await recordFavoriteSignal(
            userId ?? null,
            identity.id,
            identity.name,
            nextValue,
          );
          handleSignalOutcome(signalResult, 'favorite');
        } catch (error) {
          console.warn('CoffeeTasteScanner: failed to record favorite signal', error);
        }
      }

      if (isConnected === false) {
        showToast('Zmena obľúbených uložená offline.');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorite(!nextValue);
      Alert.alert('Chyba', 'Nepodarilo sa aktualizovať obľúbenú kávu');
    }
  };

  const handleFlavorPress = (tag: string) => {
    if (tag === 'N/A') {
      return;
    }
    showToast(`Pripravujeme tipy pre ${tag}.`);
  };

  const handlePurchaseSelect = (answer: boolean) => {
    if (isHistoryReadOnly) {
      return;
    }
    setPurchaseSelection(answer);
  };

  const submitPurchaseAnswer = () => {
    if (isHistoryReadOnly) {
      showToast('Záznam z histórie nie je možné upraviť.');
      return;
    }

    if (purchaseSelection === null) {
      showToast('Najprv vyber, či si kávu kúpil alebo nie.');
      return;
    }

    if (!scanResult?.scanId) {
      setPurchased(purchaseSelection);
      showToast('Odpoveď uložená.');
      return;
    }

    const payload: StructuredConfirmPayload = {
      metadata: structuredMetadata ?? scanResult.structuredMetadata ?? null,
      confidence: combinedStructuredConfidence,
      raw: scanResult.structuredRaw ?? scanResult.structuredMetadata ?? null,
      correctedText: recognizedText || null,
      purchased: purchaseSelection,
    };

    setConfirmPayload(payload);
    setConfirmModalVisible(true);
  };

  const handleConfirmModalClose = () => {
    if (isConfirming) {
      return;
    }
    setConfirmModalVisible(false);
    setConfirmPayload(null);
  };

  const handleConfirmModalConfirm = async () => {
    if (!scanResult?.scanId || !confirmPayload) {
      setConfirmModalVisible(false);
      return;
    }

    const payloadToSend: StructuredConfirmPayload = {
      ...confirmPayload,
      metadata: confirmPayload.metadata ?? structuredMetadata ?? scanResult.structuredMetadata ?? null,
      confidence: confirmPayload.confidence ?? combinedStructuredConfidence ?? null,
      raw: confirmPayload.raw ?? scanResult.structuredRaw ?? scanResult.structuredMetadata ?? null,
    };

    setIsConfirming(true);
    try {
      const success = await confirmStructuredScan(scanResult.scanId, payloadToSend);
      if (!success) {
        showToast('Nepodarilo sa potvrdiť údaje skenu.');
        return;
      }

      const currentSelection = purchaseSelection;
      const metadataForPurchase = payloadToSend.metadata ?? null;

      setConfirmModalVisible(false);
      setConfirmPayload(null);
      setPurchased(currentSelection);

      if (scanResult) {
        applyScanResult({
          ...scanResult,
          structuredMetadata: payloadToSend.metadata ?? null,
          structuredConfidence: payloadToSend.confidence ?? null,
          structuredRaw: payloadToSend.raw ?? scanResult.structuredRaw ?? null,
        });
      }

      let purchaseRecorded = false;

      if (currentSelection) {
        const baseName = extractCoffeeName(recognizedText || scanResult.corrected);
        const preferredName = structuredRoasterName
          ? baseName.toLowerCase().includes(structuredRoasterName.toLowerCase())
            ? baseName
            : `${structuredRoasterName} ${baseName}`.trim()
          : baseName;

        try {
          await markCoffeePurchased(
            scanResult.scanId,
            preferredName,
            structuredRoasterName ?? undefined,
            metadataForPurchase,
          );
          purchaseRecorded = true;
        } catch (error) {
          console.error('Error marking purchase:', error);
          showToast('Kávu sa nepodarilo uložiť do databázy. Skús to znova.');
        }
      }

      showToast(purchaseRecorded ? 'Káva bola uložená do databázy.' : 'Údaje skenu potvrdené.');
    } catch (error) {
      console.error('Error confirming structured scan:', error);
      if (error instanceof Error && isOfflineError(error)) {
        showToast('Nie si pripojený k internetu. Skús to znova neskôr.');
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa potvrdiť údaje skenu');
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUseLastResult = async () => {
    setOfflineModalVisible(false);
    setOfflineStatus('prompt');
    const cached = await loadOCRResult();
    if (cached) {
      const normalizedCached: ScanResultLike = {
        ...cached,
        structuredRaw:
          cached.structuredRaw ??
          (cached as ScanResultLike).rawStructuredResponse ??
          cached.structuredMetadata ??
          null,
      };

      applyScanResult(normalizedCached);
      setEditedText(normalizedCached.corrected);
      setIsFavorite(normalizedCached.isFavorite ?? false);
      setIsHistoryReadOnly(false);
      setConfirmModalVisible(false);
      setConfirmPayload(null);
    } else {
      Alert.alert('Chyba', 'Žiadny uložený výsledok');
    }
  };

  /**
   * Vymaže aktuálny výsledok skenovania.
   */
  const clearAll = () => {
    if (scanResult && userRating === 0) {
      const identity = resolveCoffeeIdentity(scanResult, coffeeName);
      if (identity) {
        recordIgnoreSignal(userId ?? null, identity.id, identity.name)
          .then(result => handleSignalOutcome(result, 'ignore'))
          .catch(error => console.warn('CoffeeTasteScanner: failed to record ignore', error));
      }
    }
    applyScanResult(null);
    setEditedText('');
    setUserRating(0);
    setPurchaseSelection(null);
    setPurchased(null);
    setIsFavorite(false);
    setCurrentView('home');
    setOverlayVisible(false);
    setOverlayText('Analyzujem...');
    setIsHistoryReadOnly(false);
    setConfirmModalVisible(false);
    setConfirmPayload(null);
    setIsConfirming(false);
  };

  const handleBack = () => {
    if (currentView === 'scan') {
      clearAll();
      return;
    }

    if (onBack) {
      onBack();
    }
  };

  const handleQuestionnaireCTA = useCallback(() => {
    // Keep a stable callback so the CTA does not trigger unnecessary re-renders.
    if (onQuestionnairePress) {
      onQuestionnairePress();
      return;
    }
    showToast('Vyplň dotazník preferencií v profile.');
  }, [onQuestionnairePress]);

  const showBackButton = currentView !== 'home';
  const evaluation = scanResult?.evaluation ?? null;
  const evaluationStatus = evaluation?.status ?? 'unknown';
  const profileCoffeePreferences =
    (profile as unknown as { coffee_preferences?: Record<string, unknown> | null })
      ?.coffee_preferences ?? null;
  const comparisonText = useMemo(
    () => buildComparisonText(
      evaluation,
      preferenceSnapshot,
      profileCoffeePreferences,
    ),
    [
      evaluation,
      preferenceSnapshot,
      profileCoffeePreferences,
    ],
  );
  const neutralVerdictCopy = 'Čakáme na AI hodnotenie';
  const didSendTasteProfile = Boolean(scanResult?.tasteProfileSent);
  const isProfileMissing = evaluationStatus === 'profile_missing' && !didSendTasteProfile;
  const profileMissingText =
    resolveVerdictExplanationText(evaluation?.verdict_explanation)
    || resolveInsightHeadline(evaluation?.insight)
    || evaluation?.disclaimer
    || 'Vyplň krátky dotazník a získaš osobné hodnotenie zhody pre každú kávu.';
  const profileMissingCtaLabel = evaluation?.cta?.label || 'Vyplniť dotazník';
  const lowDataWarning = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return null;
    }
    const sources = [
      evaluation?.disclaimer ?? '',
      resolveVerdictExplanationText(evaluation?.verdict_explanation),
    ];
    const combined = sources.join(' ').toLowerCase();
    if (!combined) {
      return null;
    }
    const isLowData = /minimum údajov|obmedzených údajov|málo údajov|len (praženie|spracovanie)/i.test(
      combined,
    );
    if (!isLowData) {
      return null;
    }
    return evaluation?.disclaimer
      || 'Máme len minimum údajov z etikety, odporúčame rescan alebo doplnenie detailov.';
  }, [evaluation, evaluationStatus]);
  // Normalize AI confidence to a readable percentage label for the verdict section.
  const evaluationConfidenceLabel = useMemo(() => {
    const normalized = normalizeConfidenceScore(evaluation?.confidence);
    if (normalized === null) {
      return null;
    }
    return `${normalized}% istota`;
  }, [evaluation?.confidence]);
  // AI recommendation sentences coming from the scan response; reused for the insight section.
  const recommendationSentences = useMemo(() => {
    if (!scanResult?.recommendation) {
      return [];
    }
    return scanResult.recommendation
      .split(/[\.\n]/)
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }, [scanResult]);

  const reasonSentences = recommendationSentences.slice(1);

  const positiveReasons = useMemo(() => {
    if (!reasonSentences.length && recommendationSentences.length) {
      return recommendationSentences;
    }

    return reasonSentences.filter(sentence => {
      return isPositiveReasonLine(sentence);
    });
  }, [reasonSentences, recommendationSentences]);

  const cautionReasons = useMemo(() => {
    if (!reasonSentences.length) {
      return [];
    }
    return reasonSentences.filter(sentence => {
      return !isPositiveReasonLine(sentence) && isCautionReasonLine(sentence);
    });
  }, [reasonSentences]);

  const neutralReasons = useMemo(() => {
    if (!reasonSentences.length) {
      return [];
    }
    return reasonSentences.filter(
      sentence => !isPositiveReasonLine(sentence) && !isCautionReasonLine(sentence),
    );
  }, [reasonSentences]);
  const verdictReasonBuckets = useMemo(() => {
    const verdictLines = [
      ...extractVerdictExplanationLines(evaluation?.verdict_explanation),
      ...extractInsightReasonLines(evaluation?.insight),
    ];
    const {
      positive: extractedPositive,
      caution: extractedCaution,
      neutral: extractedNeutral,
    } = splitReasonLines(verdictLines);
    return {
      positive: uniqueLines([...positiveReasons, ...extractedPositive]),
      caution: uniqueLines([...cautionReasons, ...extractedCaution]),
      neutral: uniqueLines([...neutralReasons, ...extractedNeutral]),
    };
  }, [
    evaluation?.insight,
    evaluation?.verdict_explanation,
    positiveReasons,
    cautionReasons,
    neutralReasons,
  ]);
  const verdictReasonText = useMemo(() => {
    const sections = [
      formatReasonBlock('Prečo sedí', verdictReasonBuckets.positive),
      formatReasonBlock('Prečo nesedí', verdictReasonBuckets.caution),
      formatReasonBlock('Ďalšie zistenia', verdictReasonBuckets.neutral),
    ].filter((section): section is string => Boolean(section));
    return sections.length
      ? sections.join('\n')
      : 'Zatiaľ nemáme dôvody prečo je káva vhodná alebo nie.';
  }, [verdictReasonBuckets]);
  const refreshControl =
    currentView === 'home'
      ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        )
      : undefined;

  const recognizedText = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    return (editedText || scanResult.corrected || scanResult.original || '').trim();
  }, [editedText, scanResult]);

  const coffeeName = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    const extractedName = extractCoffeeName(recognizedText);
    if (extractedName && extractedName.length > 2) {
      return extractedName;
    }
    const lines = recognizedText.split('\n').map(line => line.trim()).filter(Boolean);
    return lines[0] ?? 'Neznáma káva';
  }, [recognizedText, scanResult]);

  const coffeeSubtitle = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    const lines = recognizedText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.slice(1, 3).join(' • ');
    }
    return scanResult.corrected?.length ? 'Rozpoznaná etiketa' : 'Pripravené na úpravy';
  }, [recognizedText, scanResult]);

  useEffect(() => {
    if (!scanResult) {
      return;
    }
    const identity = resolveCoffeeIdentity(scanResult, coffeeName);
    if (!identity) {
      return;
    }
    loadCoffeeSignal(userId ?? null, identity.id, identity.name)
      .then(record => {
        if (signalWarning && record?.lastSyncedAt) {
          setSignalWarning(null);
        }
      })
      .catch(error => console.warn('CoffeeTasteScanner: failed to load implicit signals', error));
  }, [coffeeName, scanResult, signalWarning, userId]);

  const compatibility = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return null;
    }

    const score = normalizeConfidenceScore(evaluation?.confidence);
    const bucket: CompatibilityBucket =
      evaluation?.verdict === 'suitable'
        ? 'SAFE'
        : evaluation?.verdict === 'not_suitable'
          ? 'NO-GO'
          : 'RISKY';
    const label =
      evaluation?.verdict === 'suitable'
        ? 'Vhodná'
        : evaluation?.verdict === 'not_suitable'
          ? 'Nevhodná'
          : 'Neisté';
    const descriptionMap: Record<CompatibilityBucket, string> = {
      SAFE: 'AI hodnotí zhodu ako vysokú',
      RISKY: 'AI vidí zmiešanú zhodu',
      'NO-GO': 'AI hodnotí zhodu ako nízku',
    } as const;
    const description =
      resolveVerdictExplanationText(evaluation?.verdict_explanation)
      || resolveInsightHeadline(evaluation?.insight)
      || evaluation?.disclaimer
      || descriptionMap[bucket];

    return {
      score,
      bucket,
      badge: score !== null ? `AI · ${score}%` : 'AI verdikt',
      description,
      label,
    } as const;
  }, [evaluation, evaluationStatus]);

  const evaluationVerdictLabel = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return neutralVerdictCopy;
    }
    if (evaluation?.verdict === 'suitable') {
      return 'Vhodná';
    }
    if (evaluation?.verdict === 'not_suitable') {
      return 'Nevhodná';
    }
    if (evaluation?.verdict === 'uncertain') {
      return 'Neisté';
    }
    return 'Neisté';
  }, [evaluation, evaluationStatus, neutralVerdictCopy]);
  // Map verdict intent to existing badge styles for consistent color cues.
  const evaluationVerdictTone = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return 'RISKY';
    }
    if (evaluationStatus === 'ok') {
      if (evaluation?.verdict === 'not_suitable') {
        return 'NO';
      }
      if (evaluation?.verdict === 'uncertain') {
        return 'RISKY';
      }
      if (evaluation?.verdict === 'suitable') {
        return 'YES';
      }
    }
    return 'RISKY';
  }, [evaluation, evaluationStatus]);
  const aiMatchScore = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return null;
    }
    return normalizeConfidenceScore(evaluation?.confidence);
  }, [evaluation?.confidence, evaluationStatus]);
  const aiMatchLabel = aiMatchScore !== null ? `AI zhoda ${aiMatchScore}%` : null;
  const shouldHideCompatibilityUI = !compatibility;
  const matchLabel = aiMatchLabel
    ? aiMatchLabel
    : compatibility?.label ?? (evaluationStatus !== 'ok' ? neutralVerdictCopy : undefined);

  const structuredTasteVector = useMemo(() => {
    return extractTasteVectorFromPayload(scanResult?.evaluation?.raw);
  }, [scanResult?.evaluation?.raw]);

  const tasteAttributes = useMemo(() => {
    if (structuredTasteVector) {
      return [
        {
          key: 'acidity',
          label: 'Kyslosť',
          value: clampTasteValue(structuredTasteVector.acidity),
          style: styles.tasteFillAcidity,
        },
        {
          key: 'sweetness',
          label: 'Sladkosť',
          value: clampTasteValue(structuredTasteVector.sweetness),
          style: styles.tasteFillSweetness,
        },
        {
          key: 'bitterness',
          label: 'Horkosť',
          value: clampTasteValue(structuredTasteVector.bitterness),
          style: styles.tasteFillBitterness,
        },
        {
          key: 'body',
          label: 'Telo',
          value: clampTasteValue(structuredTasteVector.body),
          style: styles.tasteFillBody,
        },
      ];
    }
    return null;
  }, [
    structuredTasteVector,
    styles.tasteFillAcidity,
    styles.tasteFillSweetness,
    styles.tasteFillBitterness,
    styles.tasteFillBody,
  ]);

  const insightBadgeStyle =
    evaluation?.verdict === 'not_suitable'
      ? styles.reasonBadgeNegative
      : styles.reasonBadgePositive;
  const insightContent = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return null;
    }
    const verdict = evaluation?.verdict ?? null;
    const rawInsight = evaluation?.insight;
    const insightHeadline = rawInsight?.headline ?? '';
    const insightSections = rawInsight?.sections ?? [];
    const isContradictoryClaim = (text: string) => {
      const lower = text.toLowerCase();
      if (verdict === 'not_suitable') {
        return INSIGHT_POSITIVE_CLAIMS.some(keyword => lower.includes(keyword));
      }
      if (verdict === 'suitable') {
        return INSIGHT_NEGATIVE_CLAIMS.some(keyword => lower.includes(keyword));
      }
      return false;
    };
    const filteredSections = insightSections
      .map(section => {
        if (section.title && isContradictoryClaim(section.title)) {
          return null;
        }
        const bullets = section.bullets.filter(bullet => !isContradictoryClaim(bullet));
        return bullets.length ? { title: section.title, bullets } : null;
      })
      .filter((section): section is typeof insightSections[number] => Boolean(section));
    // If the verdict says "not_suitable", drop any "match" copy to avoid insight/verdict contradictions.
    const sanitizedHeadline = insightHeadline && isContradictoryClaim(insightHeadline)
      ? ''
      : insightHeadline;
    // Fall back to verdict_explanation when filtered insight would conflict with the verdict.
    const verdictExplanationText =
      typeof evaluation?.verdict_explanation === 'string'
        ? evaluation.verdict_explanation
        : evaluation?.verdict_explanation?.comparison_summary
          || evaluation?.verdict_explanation?.user_preferences_summary
          || evaluation?.verdict_explanation?.coffee_profile_summary
          || '';
    const resolvedHeadline =
      sanitizedHeadline
      || verdictExplanationText
      || '';
    return {
      headline: resolvedHeadline,
      sections: filteredSections,
    };
  }, [
    evaluation,
    evaluationStatus,
  ]);
  const insightStatusContent = useMemo(() => {
    if (evaluationStatus === 'profile_missing' && !didSendTasteProfile) {
      return {
        headline: 'Získaj presnejší insight',
        body: profileMissingText,
        ctaLabel: profileMissingCtaLabel,
      };
    }
    if (evaluationStatus === 'insufficient_coffee_data') {
      return {
        headline: 'Potrebujeme viac detailov',
        body:
          resolveVerdictExplanationText(evaluation?.verdict_explanation)
          || resolveInsightHeadline(evaluation?.insight)
          || evaluation?.disclaimer
          || 'Z etikety sme nezískali dosť údajov na personalizovaný insight. Skús ostriejší záber alebo viac informácií.',
      };
    }
    if (evaluationStatus && evaluationStatus !== 'ok') {
      return {
        headline: 'Insight zatiaľ nie je pripravený',
        body:
          resolveVerdictExplanationText(evaluation?.verdict_explanation)
          || resolveInsightHeadline(evaluation?.insight)
          || evaluation?.disclaimer
          || 'Insight sa nepodarilo pripraviť, skús to prosím neskôr.',
      };
    }
    return null;
  }, [didSendTasteProfile, evaluation, evaluationStatus, profileMissingCtaLabel, profileMissingText]);

  const verdictLabel = evaluationVerdictLabel;
  const evaluationIntroText = useMemo(() => {
    if (evaluationStatus !== 'ok') {
      return '';
    }
    return (
      resolveVerdictExplanationText(evaluation?.verdict_explanation)
      || resolveInsightHeadline(evaluation?.insight)
      || ''
    );
  }, [evaluation, evaluationStatus]);

  const editorHint = isHistoryReadOnly
    ? 'História je len na čítanie'
    : 'Uprav, ak niečo nesedí';

  const metrics = useMemo(
    () => [{ icon: '🛡️', value: matchLabel ?? '—', label: 'Kompatibilita' }],
    [matchLabel],
  );

  // Camera View
  if (showCamera && device) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={showCamera}
          photo={true}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>

          <View style={styles.cameraInstructions}>
            <Text style={styles.cameraInstructionText}>
              Zarovnaj etiketu kávy do rámčeka
            </Text>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#8B6F47" size="large" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Main Scanner View
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <LinearGradient
          colors={backgroundGradient.colors}
          locations={backgroundGradient.locations}
          style={styles.backgroundGradient}
        />
      <Modal
        visible={offlineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOfflineModalVisible(false);
          setOfflineStatus('prompt');
        }}
      >
        <View style={styles.offlineModalOverlay}>
          <View style={styles.offlineModalContent}>
            <Text style={styles.offlineModalText}>
              {offlineStatus === 'modelUsed'
                ? 'Použitý lokálny model'
                : 'Ste offline, chcete použiť posledný výsledok?'}
            </Text>
              {offlineStatus === 'modelUsed' ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setOfflineModalVisible(false);
                    setOfflineStatus('prompt');
                  }}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={handleUseLastResult}>
                  <Text style={styles.buttonText}>Použiť naposledy uložený výsledok</Text>
                </TouchableOpacity>
              )}
            </View>
        </View>
      </Modal>

      <Modal
        visible={nonCoffeeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNonCoffeeModal}
      >
        <View style={styles.validationModalOverlay}>
          <LinearGradient colors={['#FFF8F4', '#FFE0D9']} style={styles.validationModalContent}>
            <View style={styles.validationModalIconCircle}>
              <Text style={styles.validationModalIcon}>🚫</Text>
            </View>
            <Text style={styles.validationModalTitle}>Ups, toto nevyzerá ako káva</Text>
            <Text style={styles.validationModalMessage}>
              AI nerozpoznala na fotke kávu. Naskenuj prosím etiketu alebo balenie kávy v lepšom svetle.
            </Text>
            {nonCoffeeConfidence !== null ? (
              <Text style={styles.validationModalConfidence}>
                Istota modelu: {nonCoffeeConfidence}%
              </Text>
            ) : null}
            {nonCoffeeDetails.reason ? (
              <Text style={styles.validationModalReason}>{nonCoffeeDetails.reason}</Text>
            ) : null}
            {nonCoffeeDetails.labels?.length ? (
              <View style={styles.validationModalChips}>
                {nonCoffeeDetails.labels.slice(0, 4).map(label => (
                  <View key={label} style={styles.validationModalChip}>
                    <Text style={styles.validationModalChipText}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.validationModalHint}>
              Tip: Uisti sa, že etiketa kávy je ostrá a zaberá väčšinu fotografie.
            </Text>
            <View style={styles.validationModalActions}>
              {nonCoffeeAllowConfirm ? (
                <TouchableOpacity
                  style={[styles.validationModalButton, styles.validationModalButtonSecondary]}
                  onPress={handleConfirmNonCoffee}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.validationModalButtonText, styles.validationModalButtonTextSecondary]}>
                    Potvrdiť aj tak
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.validationModalButton}
                onPress={closeNonCoffeeModal}
                activeOpacity={0.85}
              >
                <Text style={styles.validationModalButtonText}>Skúsiť znova</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleConfirmModalClose}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Potvrdiť údaje</Text>
            <Text style={styles.confirmModalSubtitle}>
              Odošleme upravený text, štruktúrované polia a informáciu o kúpe.
            </Text>
            <View style={styles.confirmModalSection}>
              <Text style={styles.confirmModalSectionTitle}>Nákup</Text>
              <Text style={styles.confirmModalSectionValue}>
                {confirmPayload?.purchased ? 'Áno, kávu som kúpil' : 'Nie, zatiaľ som nekúpil'}
              </Text>
            </View>
            {confirmPayload?.correctedText ? (
              <View style={styles.confirmModalSection}>
                <Text style={styles.confirmModalSectionTitle}>Upravený text</Text>
                <Text style={styles.confirmModalSectionText} numberOfLines={4}>
                  {confirmPayload.correctedText}
                </Text>
              </View>
            ) : null}
            <View style={styles.confirmModalSection}>
              <Text style={styles.confirmModalSectionTitle}>Detaily o káve</Text>
              {confirmMetadataEntries.length > 0 ? (
                confirmMetadataEntries.map(entry => (
                  <View key={entry.key} style={styles.confirmModalFieldRow}>
                    <Text style={styles.confirmModalFieldLabel}>
                      {STRUCTURED_FIELD_LABELS[entry.key]}
                    </Text>
                    <Text style={styles.confirmModalFieldValue}>{entry.value}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.confirmModalSectionHint}>Žiadne doplnené štruktúrované údaje.</Text>
              )}
            </View>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalButtonSecondary]}
                onPress={handleConfirmModalClose}
                disabled={isConfirming}
              >
                <Text style={[styles.confirmModalButtonText, styles.confirmModalButtonTextSecondary]}>Zrušiť</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={handleConfirmModalConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmModalButtonText}>Potvrdiť</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.phoneContainer}>
              <View style={styles.appHeader}>
                <TouchableOpacity
                  style={[styles.backButton, showBackButton ? styles.backButtonVisible : null]}
                  onPress={handleBack}
                  activeOpacity={0.8}
                  disabled={!showBackButton}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.coffeeIcon}>☕</Text>
                    <Text style={styles.headerTitle}>Analýza kávy</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    Zisti, či ti káva bude chutiť pomocou AI
                  </Text>
                </View>
              </View>

              <View style={styles.mainContent}>
                {currentView === 'home' && (
                  <>
                    <LinearGradient colors={WELCOME_GRADIENT} style={styles.welcomeCard}>
                      <Text style={styles.welcomeEmoji}>✨</Text>
                      <Text style={styles.welcomeText}>Vitaj v analyzátore chutí!</Text>
                      <Text style={styles.welcomeDesc}>
                        Naskenuj etiketu kávy a získaj personalizovaný rozbor chuti.
                      </Text>
                    </LinearGradient>

                    <View style={styles.actionSection}>
                      <View style={styles.actionGrid}>
                        <TouchableOpacity
                          style={[styles.actionCard, styles.actionCardPrimary]}
                          onPress={openCamera}
                          activeOpacity={0.9}
                        >
                          <LinearGradient
                            colors={COFFEE_GRADIENT}
                            style={[styles.actionIconContainer, styles.actionIconContainerPrimary]}
                          >
                            <Text style={styles.actionIcon}>📸</Text>
                          </LinearGradient>
                          <Text style={styles.actionLabel}>Odfotiť kávu</Text>
                          <Text style={styles.actionSublabel}>Použiť kameru</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionCard}
                          onPress={pickImageFromGallery}
                          activeOpacity={0.9}
                        >
                          <View style={styles.actionIconContainer}>
                            <Text style={styles.actionIcon}>🖼️</Text>
                          </View>
                          <Text style={styles.actionLabel}>Vybrať z galérie</Text>
                          <Text style={styles.actionSublabel}>Nahrať fotku</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.historySection}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>📚 História skenovaní</Text>
                        {ocrHistory.length > 0 && (
                          <TouchableOpacity
                            style={styles.historySeeAll}
                            onPress={onHistoryPress}
                          >
                            <Text style={styles.historySeeAllText}>Zobraziť všetky →</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {ocrHistory.length > 0 ? (
                        <View style={styles.historyGrid}>
                          {ocrHistory.slice(0, 6).map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.historyCard}
                              onPress={() => loadFromHistory(item)}
                              onLongPress={() => deleteFromHistory(item.id)}
                              activeOpacity={0.85}
                            >
                              <View style={styles.historyCardAccent} />
                              <View style={styles.historyCardContent}>
                                <Text style={styles.historyCardName} numberOfLines={1}>
                                  {item.coffee_name || 'Neznáma káva'}
                                </Text>
                                <Text style={styles.historyCardDate}>
                                  {new Date(item.created_at).toLocaleDateString('sk-SK')}
                                </Text>
                                {item.rating ? (
                                  <Text style={styles.historyCardRating}>
                                    {'⭐'.repeat(item.rating)}
                                  </Text>
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <View style={styles.emptyStateImage}>
                            <Text style={styles.emptyStateIcon}>☕</Text>
                          </View>
                          <Text style={styles.emptyStateTitle}>Žiadne skenovania</Text>
                          <Text style={styles.emptyStateDesc}>
                            Začni analyzovať svoje kávy a objav nové chute.
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {currentView === 'scan' && scanResult && (
                  <>
                    <View style={styles.scanResultContainer}>
                      {signalWarning ? (
                        <View style={styles.signalWarningBanner}>
                          <Text style={styles.signalWarningIcon}>⚠️</Text>
                          <View style={styles.signalWarningCopy}>
                            <Text style={styles.signalWarningTitle}>Synchronizácia čaká</Text>
                            <Text style={styles.signalWarningText}>{signalWarning}</Text>
                          </View>
                        </View>
                      ) : null}
                      <LinearGradient colors={['#FFFFFF', '#F5E9E0']} style={styles.scanHeroCard}>
                        <View style={styles.scanHeroBadge}>
                          <Text style={styles.scanHeroBadgeIcon}>✓</Text>
                          <Text style={styles.scanHeroBadgeText}>Výsledok skenu</Text>
                        </View>
                        <Text style={styles.scanHeroTitle}>{coffeeName}</Text>
                        <Text style={styles.scanHeroSubtitle} numberOfLines={2}>
                          {coffeeSubtitle}
                        </Text>
                        <View style={styles.scanMetricsRow}>
                          {metrics.map(metric => (
                            <View key={metric.label} style={styles.scanMetricCard}>
                              <Text style={styles.scanMetricIcon}>{metric.icon}</Text>
                              <Text style={styles.scanMetricValue}>{metric.value}</Text>
                              <Text style={styles.scanMetricLabel}>{metric.label}</Text>
                            </View>
                          ))}
                        </View>
                        {compatibility && !shouldHideCompatibilityUI ? (
                          <View
                            style={[
                              styles.compatibilityBanner,
                              compatibility.bucket === 'SAFE'
                                ? styles.compatibilitySafe
                                : compatibility.bucket === 'RISKY'
                                  ? styles.compatibilityRisky
                                  : styles.compatibilityNogo,
                            ]}
                          >
                            <Text style={styles.compatibilityBadgeText}>{compatibility.badge}</Text>
                            <Text style={styles.compatibilityCopy}>{compatibility.description}</Text>
                          </View>
                        ) : null}
                      </LinearGradient>

                      <View style={styles.comparisonCard}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Porovnanie s dotazníkom</Text>
                        </View>
                        <Text style={styles.comparisonText}>{comparisonText}</Text>
                      </View>

                      <View style={styles.compatibilityCardModern}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>AI hodnotenie zhody</Text>
                        </View>
                        {isProfileMissing ? (
                          <>
                            <Text style={styles.profileMissingTitle}>Chýba chuťový profil</Text>
                            <Text style={styles.profileMissingText}>
                              {profileMissingText}
                            </Text>
                            <TouchableOpacity
                              style={styles.profileMissingButton}
                              onPress={handleQuestionnaireCTA}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.profileMissingButtonText}>
                                {profileMissingCtaLabel}
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <View style={styles.sectionHeaderRow}>
                              <Text style={styles.verdictDiffsTitle}>Verdikt</Text>
                              <View
                                style={[
                                  styles.verdictBadge,
                                  evaluationVerdictTone === 'NO'
                                    ? styles.verdictBadgeNo
                                    : evaluationVerdictTone === 'RISKY'
                                      ? styles.verdictBadgeRisky
                                      : styles.verdictBadgeYes,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.verdictBadgeText,
                                    evaluationVerdictTone === 'NO'
                                      ? styles.verdictBadgeTextNo
                                      : evaluationVerdictTone === 'RISKY'
                                        ? styles.verdictBadgeTextRisky
                                        : styles.verdictBadgeTextYes,
                                  ]}
                                >
                                  {verdictLabel}
                                </Text>
                              </View>
                            </View>
                            {evaluationConfidenceLabel ? (
                              <Text style={styles.verdictConfidence}>{evaluationConfidenceLabel}</Text>
                            ) : null}
                            <Text style={styles.verdictDescription}>{verdictReasonText}</Text>
                            {lowDataWarning ? (
                              <View style={styles.lowDataCard}>
                                <View style={styles.lowDataBadge}>
                                  <Text style={styles.lowDataBadgeText}>Minimum údajov</Text>
                                </View>
                                <Text style={styles.lowDataText}>{lowDataWarning}</Text>
                                <TouchableOpacity
                                  style={styles.lowDataButton}
                                  onPress={openCamera}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.lowDataButtonText}>Rescanovať etiketu</Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                          </>
                        )}

                        {evaluationStatus === 'ok' ? (
                          <View style={styles.aiSummarySection}>
                            {evaluationIntroText ? (
                              <Text style={styles.compatibilityIntro}>{evaluationIntroText}</Text>
                            ) : null}
                            {insightContent?.sections.length ? (
                              <View style={styles.reasonBlocksWrapper}>
                                {insightContent.sections.map((section, index) => (
                                  <View key={`${section.title}-${index}`} style={styles.reasonBlock}>
                                    {section.title ? (
                                      <Text style={styles.reasonTitle}>{section.title}</Text>
                                    ) : null}
                                    {section.bullets.map(bullet => (
                                      <View key={bullet} style={styles.reasonRow}>
                                        <View style={[styles.reasonBadge, insightBadgeStyle]}>
                                          <Text style={styles.reasonBadgeText}>•</Text>
                                        </View>
                                        <Text style={styles.reasonText}>{bullet}</Text>
                                      </View>
                                    ))}
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}

                        <View style={styles.aiSummarySection}>
                          <Text style={styles.sectionSubtitle}>AI insight</Text>
                          {insightStatusContent ? (
                            <>
                              {insightStatusContent.headline ? (
                                <Text style={styles.verdictDescription}>
                                  {insightStatusContent.headline}
                                </Text>
                              ) : null}
                              <Text style={styles.verdictDescription}>{insightStatusContent.body}</Text>
                              {insightStatusContent.ctaLabel ? (
                                <TouchableOpacity
                                  style={styles.profileMissingButton}
                                  onPress={handleQuestionnaireCTA}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.profileMissingButtonText}>
                                    {insightStatusContent.ctaLabel}
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {insightContent?.headline ? (
                                <Text style={styles.verdictDescription}>{insightContent.headline}</Text>
                              ) : null}
                              {evaluationStatus !== 'ok' && insightContent?.sections.length ? (
                                <View style={styles.reasonBlocksWrapper}>
                                  {insightContent.sections.map((section, index) => (
                                    <View key={`${section.title}-${index}`} style={styles.reasonBlock}>
                                      {section.title ? (
                                        <Text style={styles.reasonTitle}>{section.title}</Text>
                                      ) : null}
                                      {section.bullets.map(bullet => (
                                        <View key={bullet} style={styles.reasonRow}>
                                          <View style={[styles.reasonBadge, insightBadgeStyle]}>
                                            <Text style={styles.reasonBadgeText}>•</Text>
                                          </View>
                                          <Text style={styles.reasonText}>{bullet}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </>
                          )}
                        </View>
                      </View>

                      <View style={styles.ownershipCardModern}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Kúpil si túto kávu?</Text>
                          {purchased ? (
                            <View style={styles.ownershipStatePill}>
                              <Text style={styles.ownershipStateText}>✓ Pridané do zbierky</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.sectionSubtitle}>
                          Po potvrdení sa pridá do tvojej zbierky BrewMate.
                        </Text>
                        <View style={styles.ownershipActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.ownershipButton,
                              purchaseSelection === true && styles.ownershipButtonActive,
                              isHistoryReadOnly && { opacity: 0.5 },
                            ]}
                            onPress={() => handlePurchaseSelect(true)}
                            disabled={isHistoryReadOnly}
                          >
                            <Text
                              style={[
                                styles.ownershipButtonText,
                                purchaseSelection === true && styles.ownershipButtonTextActive,
                              ]}
                            >
                              Áno
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.ownershipButton,
                              styles.ownershipButtonSecondary,
                              purchaseSelection === false && styles.ownershipButtonActive,
                              isHistoryReadOnly && { opacity: 0.5 },
                            ]}
                            onPress={() => handlePurchaseSelect(false)}
                            disabled={isHistoryReadOnly}
                          >
                            <Text
                              style={[
                                styles.ownershipButtonText,
                                styles.ownershipButtonTextSecondary,
                                purchaseSelection === false && styles.ownershipButtonTextActive,
                              ]}
                            >
                              Nie
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.ownershipConfirmButton,
                              purchaseSelection === null && styles.ownershipConfirmDisabled,
                              isHistoryReadOnly && { opacity: 0.5 },
                            ]}
                            onPress={submitPurchaseAnswer}
                            disabled={purchaseSelection === null || isHistoryReadOnly}
                          >
                            <Text style={styles.ownershipConfirmText}>Potvrdiť</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.tasteProfileCard}>
                        <View style={styles.profileHeaderRow}>
                          <Text style={styles.sectionTitle}>Chuťový profil</Text>
                          {matchLabel ? (
                            <Text style={styles.profileScore}>{matchLabel}</Text>
                          ) : null}
                        </View>
                        <View style={styles.tasteAttributesGrid}>
                          {tasteAttributes ? (
                            tasteAttributes.map(attribute => (
                              <View key={attribute.key} style={styles.tasteAttributeItem}>
                                <View style={styles.tasteAttributeHeader}>
                                  <Text style={styles.tasteAttributeName}>{attribute.label}</Text>
                                  <Text style={styles.tasteAttributeValue}>
                                    {Math.round(attribute.value)}/10
                                  </Text>
                                </View>
                                <View style={styles.tasteBar}>
                                  <View
                                    style={[
                                      styles.tasteFill,
                                      attribute.style,
                                      { width: `${attribute.value * 10}%` },
                                    ]}
                                  />
                                </View>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.emptyTasteText}>
                              Chuťový profil z AI hodnotenia zatiaľ nie je dostupný.
                            </Text>
                          )}
                        </View>
                      </View>


                      <View style={styles.structuredCard}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Detaily etikety</Text>
                          {hasStructuredMetadata ? (
                            <View style={styles.structuredBadge}>
                              <Text style={styles.structuredBadgeText}>{structuredBadgeLabel}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.sectionSubtitle}>
                          Skontroluj a doplň štruktúrované údaje o káve. Pomôže nám to lepšie pochopiť tvoje chute.
                        </Text>
                        {STRUCTURED_FIELD_ORDER.map(field => {
                          const fieldState = structuredFields[field.key];
                          const confidenceLabel = formatConfidenceLabel(fieldState.confidence);
                          const value =
                            field.type === 'list'
                              ? field.key === 'flavorNotes'
                                ? flavorNotesInputValue
                                : varietalsInputValue
                              : (fieldState.value as string | null) ?? '';
                          const hasValue = isStructuredValueFilled(fieldState.value);
                          const chipLabel = fieldState.isAutoFilled && hasValue
                            ? 'AI údaj'
                            : hasValue
                            ? 'Upravené'
                            : 'Prázdne';

                          const onChange = (text: string) => {
                            if (field.type === 'list') {
                              handleStructuredListChange(field.key as StructuredListFieldKey, text);
                            } else {
                              handleStructuredTextChange(field.key as StructuredTextFieldKey, text);
                            }
                          };

                          return (
                            <View key={field.key} style={styles.structuredFieldRow}>
                              <Text style={styles.structuredFieldLabel}>
                                {STRUCTURED_FIELD_LABELS[field.key]}
                              </Text>
                              <TextInput
                                style={[
                                  styles.structuredFieldInput,
                                  field.type === 'list' && styles.structuredFieldInputMultiline,
                                  isHistoryReadOnly && { opacity: 0.6 },
                                ]}
                                value={value}
                                onChangeText={onChange}
                                placeholder={field.placeholder}
                                editable={!isHistoryReadOnly}
                                multiline={field.type === 'list'}
                              />
                              <View style={styles.structuredFieldMetaRow}>
                                <View
                                  style={[
                                    styles.structuredFieldChip,
                                    !fieldState.isAutoFilled && hasValue && styles.structuredFieldChipManual,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.structuredFieldChipText,
                                      !fieldState.isAutoFilled && hasValue && styles.structuredFieldChipTextManual,
                                    ]}
                                  >
                                    {chipLabel}
                                  </Text>
                                </View>
                                {confidenceLabel ? (
                                  <View style={styles.structuredFieldConfidenceChip}>
                                    <Text style={styles.structuredFieldConfidenceText}>{confidenceLabel}</Text>
                                  </View>
                                ) : null}
                              </View>
                              {fieldState.warning ? (
                                <Text style={styles.structuredFieldWarning}>{fieldState.warning}</Text>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>

                      <View style={styles.editorCard}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Rozpoznaný text</Text>
                          <Text style={styles.editorHint}>{editorHint}</Text>
                        </View>
                        <TextInput
                          style={styles.editorInput}
                          multiline
                          value={editedText}
                          onChangeText={setEditedText}
                          placeholder="Uprav rozpoznaný text..."
                          textAlignVertical="top"
                          editable={!isHistoryReadOnly}
                        />
                      </View>

                    </View>

                    <View style={styles.bottomSpacer} />
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {(overlayVisible || isLoading) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B4423" />
              <Text style={styles.loadingText}>{overlayText}</Text>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );

};

export default CoffeeTasteScanner;
