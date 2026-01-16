import type { BrewContext } from '../../types/Personalization';

export const resolveTimeOfDay = (date: Date): BrewContext['timeOfDay'] => {
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

export const getIsoWeekday = (date: Date): number => {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
};

export const buildBrewContext = (metadata?: Record<string, unknown>): BrewContext => {
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

export const isOfflineError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === 'Offline' || error.message.includes('Network request failed');
};

export const ensureFileUri = (path: string): string => {
  if (path.startsWith('file://')) {
    return path;
  }
  return `file://${path}`;
};

export const stripFileUri = (path: string): string => {
  if (path.startsWith('file://')) {
    return path.replace('file://', '');
  }
  return path;
};

export const normalizeConfidenceScore = (confidence?: number | null): number | null => {
  if (typeof confidence !== 'number') {
    return null;
  }
  const normalized = confidence <= 1 ? confidence * 100 : confidence;
  return Math.round(Math.max(0, Math.min(100, normalized)));
};
