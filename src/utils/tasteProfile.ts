import { UserTasteProfile } from '../types/Personalization';

export interface CoffeePreferenceSnapshot {
  intensity?: string | null;
  roast?: string | null;
  temperature?: string | null;
  milk?: boolean | null;
  sugar?: string | number | null;
  acidity?: string | null;
  body?: string | null;
  preferredDrinks: string[];
  flavorNotes: string[];
  experienceLevel?: string | null;
}

export interface TasteRadarScores {
  acidity: number;
  sweetness: number;
  body: number;
  bitterness: number;
  aroma: number;
  fruitiness: number;
}

interface TasteRadarSources {
  profile?: UserTasteProfile | null;
  preferences?: CoffeePreferenceSnapshot | null;
}

const DEFAULT_SCORE = 5;

const fruitKeywords = ['fruit', 'fruity', 'berry', 'berries', 'citrus', 'orange', 'lemon', 'lime', 'apple', 'pear', 'peach', 'stone', 'wine'];
const warmAromaKeywords = ['chocolate', 'cocoa', 'nut', 'nutty', 'caramel', 'spice', 'spicy', 'vanilla', 'floral', 'flower'];

function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback: number = DEFAULT_SCORE): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(value);
  }
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return clamp(parsed);
  }
  return fallback;
}

function blend(current: number, incoming: number | null, weight: number = 1): number {
  if (incoming === null) {
    return clamp(current);
  }
  const mixed = (current * weight + incoming) / (weight + 1);
  return clamp(Number(mixed.toFixed(1)));
}

function parseStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch (error) {
      // ignore JSON parse error, fallback to splitting by comma
    }
    return trimmed
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>);
  }
  return [];
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (['true', '1', 'yes', 'áno', 'ano'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'nie'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

export function normalizeCoffeePreferenceSnapshot(raw: any): CoffeePreferenceSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const snapshot: CoffeePreferenceSnapshot = {
    intensity: typeof raw.intensity === 'string' ? raw.intensity : typeof raw.strength === 'string' ? raw.strength : null,
    roast: typeof raw.roast === 'string' ? raw.roast : null,
    temperature: typeof raw.temperature === 'string' ? raw.temperature : null,
    milk: parseBoolean(raw.milk),
    sugar: raw.sugar ?? raw.sweetness ?? null,
    acidity: typeof raw.acidity === 'string' ? raw.acidity : typeof raw.acidity_preference === 'string' ? raw.acidity_preference : null,
    body: typeof raw.body === 'string' ? raw.body : typeof raw.body_preference === 'string' ? raw.body_preference : null,
    preferredDrinks: parseStringArray(raw.preferred_drinks ?? raw.preferredDrinks),
    flavorNotes: parseStringArray(raw.flavor_notes ?? raw.flavorNotes),
    experienceLevel: typeof raw.experience_level === 'string' ? raw.experience_level : typeof raw.experienceLevel === 'string' ? raw.experienceLevel : null,
  };

  return snapshot;
}

function mapSweetness(input: CoffeePreferenceSnapshot['sugar']): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'number') {
    return clamp(input);
  }

  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case 'none':
    case 'bez':
    case 'zero':
      return 1.5;
    case 'little':
    case 'low':
    case 'malo':
    case 'málo':
      return 3.5;
    case 'medium':
    case 'stredne':
    case 'stredná':
    case 'balanced':
      return 5.8;
    case 'sweet':
    case 'high':
    case 'vela':
    case 'veľa':
      return 8.4;
    default:
      return null;
  }
}

function mapAcidity(preferences: CoffeePreferenceSnapshot): number | null {
  if (preferences.acidity) {
    switch (preferences.acidity) {
      case 'low':
      case 'nízka':
        return 3.5;
      case 'medium':
      case 'stredná':
        return 5.5;
      case 'high':
      case 'vysoká':
        return 7.8;
      default:
        break;
    }
  }

  if (preferences.roast) {
    switch (preferences.roast) {
      case 'light':
        return 7.2;
      case 'medium':
        return 5.4;
      case 'dark':
        return 3.6;
      default:
        break;
    }
  }

  return null;
}

function mapBody(preferences: CoffeePreferenceSnapshot): number | null {
  if (preferences.body) {
    switch (preferences.body) {
      case 'light':
        return 4.2;
      case 'medium':
        return 6;
      case 'full':
        return 8.2;
      default:
        break;
    }
  }

  if (preferences.intensity) {
    switch (preferences.intensity) {
      case 'light':
        return 4.5;
      case 'medium':
        return 6.2;
      case 'strong':
        return 8;
      default:
        break;
    }
  }

  return null;
}

function mapBitterness(preferences: CoffeePreferenceSnapshot): number | null {
  let base: number | null = null;

  if (preferences.roast) {
    switch (preferences.roast) {
      case 'light':
        base = 4.2;
        break;
      case 'medium':
        base = 5.8;
        break;
      case 'dark':
        base = 7.6;
        break;
      default:
        break;
    }
  }

  if (preferences.intensity) {
    const intensityBoost = preferences.intensity === 'strong' ? 1.4 : preferences.intensity === 'medium' ? 0.6 : -0.4;
    base = (base ?? DEFAULT_SCORE) + intensityBoost;
  }

  const sweetnessImpact = mapSweetness(preferences.sugar);
  if (sweetnessImpact !== null) {
    base = (base ?? DEFAULT_SCORE) - (sweetnessImpact - DEFAULT_SCORE) * 0.5;
  }

  if (preferences.milk === true) {
    base = (base ?? DEFAULT_SCORE) - 0.8;
  }

  return base === null ? null : clamp(Number(base.toFixed(1)));
}

function evaluateFlavorNotes(notes: string[]): { aroma: number | null; fruitiness: number | null } {
  if (!notes.length) {
    return { aroma: null, fruitiness: null };
  }

  const unique = Array.from(new Set(notes.map(note => note.toLowerCase())));
  const aromaticCount = unique.filter(note => warmAromaKeywords.some(keyword => note.includes(keyword))).length;
  const fruityCount = unique.filter(note => fruitKeywords.some(keyword => note.includes(keyword))).length;

  const aromaScore = aromaticCount > 0 ? clamp(4.5 + aromaticCount * 1.2) : clamp(4 + unique.length * 0.8);
  const fruitScore = fruityCount > 0 ? clamp(4.8 + fruityCount * 1.6) : fruityCount === 0 ? null : clamp(4 + fruityCount * 1.2);

  return {
    aroma: Number(aromaScore.toFixed(1)),
    fruitiness: fruitScore === null ? null : Number(fruitScore.toFixed(1)),
  };
}

function mergeFruitiness(existing: number, incoming: number | null, notes: string[]): number {
  if (incoming !== null) {
    return blend(existing, incoming);
  }

  if (notes.some(note => fruitKeywords.some(keyword => note.toLowerCase().includes(keyword)))) {
    return blend(existing, 7.2);
  }

  return clamp(existing);
}

export function buildTasteRadarScores({ profile, preferences }: TasteRadarSources): TasteRadarScores | null {
  if (!profile && !preferences) {
    return null;
  }

  const base: TasteRadarScores = {
    acidity: DEFAULT_SCORE,
    sweetness: DEFAULT_SCORE,
    body: DEFAULT_SCORE,
    bitterness: DEFAULT_SCORE,
    aroma: DEFAULT_SCORE,
    fruitiness: DEFAULT_SCORE,
  };

  if (profile) {
    base.acidity = safeNumber(profile.preferences?.acidity, DEFAULT_SCORE);
    base.sweetness = safeNumber(profile.preferences?.sweetness, DEFAULT_SCORE);
    base.body = safeNumber(profile.preferences?.body, DEFAULT_SCORE);
    base.bitterness = safeNumber(profile.preferences?.bitterness, DEFAULT_SCORE);

    const flavorValues = profile.flavorNotes ? Object.values(profile.flavorNotes).map(value => safeNumber(value, DEFAULT_SCORE)) : [];
    if (flavorValues.length > 0) {
      const average = flavorValues.reduce((sum, value) => sum + value, 0) / flavorValues.length;
      base.aroma = clamp(Number(average.toFixed(1)));
    }
    const fruitVector = profile.flavorNotes?.fruity;
    if (typeof fruitVector === 'number') {
      base.fruitiness = clamp(Number(fruitVector.toFixed(1)));
    }
  }

  if (preferences) {
    const sweetnessScore = mapSweetness(preferences.sugar);
    base.sweetness = sweetnessScore === null ? base.sweetness : blend(base.sweetness, sweetnessScore, 2);

    const acidityScore = mapAcidity(preferences);
    base.acidity = acidityScore === null ? base.acidity : blend(base.acidity, acidityScore, 2);

    const bodyScore = mapBody(preferences);
    base.body = bodyScore === null ? base.body : blend(base.body, bodyScore, 2);

    const bitternessScore = mapBitterness(preferences);
    base.bitterness = bitternessScore === null ? base.bitterness : blend(base.bitterness, bitternessScore, 1.5);

    const { aroma, fruitiness } = evaluateFlavorNotes(preferences.flavorNotes);
    base.aroma = aroma === null ? blend(base.aroma, clamp(DEFAULT_SCORE + preferences.flavorNotes.length * 0.6)) : blend(base.aroma, aroma, 1.5);
    base.fruitiness = mergeFruitiness(base.fruitiness, fruitiness, preferences.flavorNotes);

    if (preferences.preferredDrinks.includes('espresso') || preferences.preferredDrinks.includes('ristretto')) {
      base.body = blend(base.body, clamp(base.body + 1.2));
      base.bitterness = blend(base.bitterness, clamp(base.bitterness + 0.8));
    }

    if (preferences.preferredDrinks.includes('latte') || preferences.preferredDrinks.includes('flatwhite')) {
      base.body = blend(base.body, clamp(base.body - 0.6));
      base.sweetness = blend(base.sweetness, clamp(base.sweetness + 0.5));
    }

    if (preferences.milk === true) {
      base.bitterness = blend(base.bitterness, clamp(base.bitterness - 0.6));
      base.body = blend(base.body, clamp(base.body + 0.4));
    }

    if (preferences.temperature === 'iced') {
      base.acidity = blend(base.acidity, clamp(base.acidity - 0.5));
      base.sweetness = blend(base.sweetness, clamp(base.sweetness + 0.3));
    }
  }

  return {
    acidity: clamp(Number(base.acidity.toFixed(1))),
    sweetness: clamp(Number(base.sweetness.toFixed(1))),
    body: clamp(Number(base.body.toFixed(1))),
    bitterness: clamp(Number(base.bitterness.toFixed(1))),
    aroma: clamp(Number(base.aroma.toFixed(1))),
    fruitiness: clamp(Number(base.fruitiness.toFixed(1))),
  };
}
