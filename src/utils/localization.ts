const DEFAULT_LOCALE = 'sk-SK';

const getDeviceLocale = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || DEFAULT_LOCALE;
  } catch (error) {
    console.warn('Unable to resolve device locale, using default.', error);
    return DEFAULT_LOCALE;
  }
};

const normalizeLocale = (locale: string): string => locale.split(/[-_]/)[0]?.toLowerCase() ?? '';

const uniqParts = (parts: string[]): string[] => {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = part.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const resolveLocalizedLabel = (
  value: string | null | undefined,
  locale: string = getDeviceLocale(),
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parts = uniqParts(
    value
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean),
  );

  if (parts.length <= 1) {
    return value.trim();
  }

  const language = normalizeLocale(locale);

  if (language === 'en') {
    return parts[1] ?? parts[0];
  }

  return parts[0];
};

export const getResolvedLocale = (): string => getDeviceLocale();
