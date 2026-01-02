/**
 * Vypočíta percentuálnu zhodu medzi opisom kávy a preferenciami používateľa.
 * @param {string} coffeeText - Textový opis kávy.
 * @param {object} preferences - Preferencie používateľa z databázy.
 * @returns {number | null} Hodnota zhody v percentách alebo null pri neúplných preferenciách.
 */
export const calculateMatch = (coffeeText, preferences) => {
  if (!preferences) return null;

  const hasCompletionFlag =
    'is_complete' in preferences || 'taste_profile_completed' in preferences;
  const isProfileComplete = hasCompletionFlag
    ? Boolean(preferences.is_complete ?? preferences.taste_profile_completed)
    : null;

  const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const hasQuizAnswers =
    isPlainObject(preferences.quiz_answers) &&
    Object.keys(preferences.quiz_answers).length > 0;
  const hasTasteVector =
    isPlainObject(preferences.taste_vector) &&
    Object.values(preferences.taste_vector).some(
      (value) => typeof value === 'number' && !Number.isNaN(value)
    );

  const hasStrength =
    typeof preferences.preferred_strength === 'string' &&
    preferences.preferred_strength.trim().length > 0;
  const hasSweetness =
    preferences.sweetness !== null &&
    preferences.sweetness !== undefined &&
    !Number.isNaN(Number(preferences.sweetness));
  const hasAcidity =
    preferences.acidity !== null &&
    preferences.acidity !== undefined &&
    !Number.isNaN(Number(preferences.acidity));
  const flavorList = Array.isArray(preferences.flavor_notes)
    ? preferences.flavor_notes
    : Object.keys(preferences.flavor_notes || {});
  const hasFlavorNotes = flavorList.length > 0;

  const passesCompletionCheck =
    isProfileComplete !== null
      ? isProfileComplete
      : hasQuizAnswers || hasTasteVector;

  if (!passesCompletionCheck) return null;

  let score = 50;
  const lower = (coffeeText || '').toLowerCase();

  if (preferences.preferred_strength) {
    if (lower.includes(preferences.preferred_strength.toLowerCase())) {
      score += 10;
    }
  }

  flavorList.forEach((flavor) => {
    if (typeof flavor === 'string' && lower.includes(flavor.toLowerCase())) {
      score += 5;
    }
  });

  if (preferences.sweetness && preferences.sweetness >= 7) score += 5;
  if (preferences.acidity && preferences.acidity <= 3) score += 5;

  return Math.min(score, 100);
};

/**
 * Extrahuje názov kávy z dodaného textu.
 * @param {string} text - Text z ktorého chceme získať názov.
 * @returns {string} Zistený názov kávy alebo generický text.
 */
export const extractCoffeeName = (text) => {
  if (!text) return 'Neznáma káva';

  const brands = ['Lavazza', 'Illy', 'Segafredo', 'Kimbo', 'Pellini', 'Bazzara'];
  for (const brand of brands) {
    if (text.includes(brand)) {
      const regex = new RegExp(`${brand}\\s+\\w+`, 'i');
      const match = text.match(regex);
      if (match) return match[0];
    }
  }

  const words = text.split(/\s+/).slice(0, 3).join(' ');
  return words.substring(0, 50);
};

/**
 * Vráti denný tip na prípravu kávy.
 * @returns {string} Krátky tip na daný deň.
 */
export const getDailyTip = () => {
  const tips = [
    'Espresso Lungo - perfektné pre produktívne ráno',
    'Flat White - keď potrebuješ jemnú chuť s energiou',
    'V60 - pre objavovanie nových chutí',
    'Cold Brew - osvieženie na horúce dni',
    'Cappuccino - klasika ktorá nikdy nesklame',
    'Americano - pre tých čo majú radi jemnú kávu',
    'Macchiato - malé potešenie s veľkou chuťou',
  ];
  const today = new Date().getDay();
  return tips[today % tips.length];
};

export const toNumberOrFallback = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeTasteInput = (raw, fallback, fieldName = 'taste') => {
  const clamp = (val) => Math.max(0, Math.min(10, val));
  const mappings = {
    none: 0,
    low: 3,
    little: 3,
    mild: 4,
    medium: 5,
    balanced: 5,
    'medium-high': 7,
    medium_high: 7,
    high: 8,
    strong: 8,
    'very-high': 10,
    very_high: 10,
  };

  const coerce = (value) => {
    if (value === undefined || value === null || value === '') return null;

    if (typeof value === 'number' && Number.isFinite(value)) {
      return clamp(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        return clamp(numeric);
      }

      const mapped = mappings[trimmed.toLowerCase()];
      if (mapped !== undefined) {
        return clamp(mapped);
      }
    }

    return undefined;
  };

  const normalized = coerce(raw);
  if (normalized !== null && normalized !== undefined) {
    return normalized;
  }

  const fallbackNormalized = coerce(fallback);
  if (fallbackNormalized !== null && fallbackNormalized !== undefined) {
    return fallbackNormalized;
  }

  throw new Error(`Neplatná hodnota pre ${fieldName}`);
};
