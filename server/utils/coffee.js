/**
 * Vypočíta percentuálnu zhodu medzi opisom kávy a preferenciami používateľa.
 * @param {string} coffeeText - Textový opis kávy.
 * @param {object} preferences - Preferencie používateľa z databázy.
 * @param {object} [structuredMetadata] - Štruktúrované metadáta kávy (origin, processing, roast_level, varietals).
 * @returns {number | null} Hodnota zhody v percentách alebo null pri neúplných preferenciách.
 */
export const calculateMatch = (coffeeText, preferences, structuredMetadata = null) => {
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
  const sweetnessValue = Number(preferences.sweetness);
  const hasSweetness = Number.isFinite(sweetnessValue);
  const acidityValue = Number(preferences.acidity);
  const hasAcidity = Number.isFinite(acidityValue);
  const flavorList = Array.isArray(preferences.flavor_notes)
    ? preferences.flavor_notes
    : Object.keys(preferences.flavor_notes || {});
  const hasFlavorNotes = flavorList.length > 0;

  const passesCompletionCheck =
    isProfileComplete !== null
      ? isProfileComplete
      : hasQuizAnswers || hasTasteVector;

  if (!passesCompletionCheck) return null;

  const normalizeStructuredValue = (value) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  const normalizeStructuredList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[,;\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  };

  const structured = structuredMetadata && typeof structuredMetadata === 'object'
    ? structuredMetadata
    : null;
  const structuredOrigin = normalizeStructuredValue(structured?.origin);
  const structuredProcessing = normalizeStructuredValue(structured?.processing);
  const structuredRoastLevel = normalizeStructuredValue(
    structured?.roast_level ?? structured?.roastLevel
  );
  const structuredVarietals = normalizeStructuredList(structured?.varietals);

  const derivedSignals = [];
  const roastLower = structuredRoastLevel?.toLowerCase() ?? '';
  if (roastLower) {
    if (/(light|blonde|svetl|light roast|omni)/.test(roastLower)) {
      derivedSignals.push('light', 'mild', 'bright');
    }
    if (/(medium|stred|omni)/.test(roastLower)) {
      derivedSignals.push('medium', 'balanced');
    }
    if (/(dark|espresso|tmav)/.test(roastLower)) {
      derivedSignals.push('dark', 'bold', 'strong', 'intense');
    }
  }

  const processingLower = structuredProcessing?.toLowerCase() ?? '';
  if (processingLower) {
    if (/(natural|dry)/.test(processingLower)) {
      derivedSignals.push('sweet', 'berry', 'fruit');
    }
    if (/(honey|pulped)/.test(processingLower)) {
      derivedSignals.push('sweet', 'caramel');
    }
    if (/(washed|wet)/.test(processingLower)) {
      derivedSignals.push('bright', 'citrus', 'clean');
    }
    if (/(anaerobic|ferment)/.test(processingLower)) {
      derivedSignals.push('intense', 'fruit');
    }
  }

  const structuredText = [
    coffeeText,
    structuredOrigin,
    structuredProcessing,
    structuredRoastLevel,
    ...structuredVarietals,
    ...derivedSignals,
  ]
    .filter(Boolean)
    .join(' ');

  const lower = structuredText.toLowerCase();

  const weights = {
    strength: 25,
    flavor: 35,
    sweetness: 20,
    acidity: 20,
  };

  const totalWeight =
    (hasStrength ? weights.strength : 0) +
    (hasFlavorNotes ? weights.flavor : 0) +
    (hasSweetness ? weights.sweetness : 0) +
    (hasAcidity ? weights.acidity : 0);

  if (totalWeight === 0) return null;

  let points = 0;
  let penalties = 0;

  const strengthKeywords = [
    'light',
    'mild',
    'medium',
    'balanced',
    'strong',
    'bold',
    'dark',
    'intense',
    'jemn',
    'stredn',
    'siln',
  ];
  const sweetKeywords = [
    'sweet',
    'caramel',
    'honey',
    'chocolate',
    'vanilla',
    'sugar',
    'candied',
    'sirup',
    'sladk',
  ];
  const bitterKeywords = [
    'bitter',
    'dry',
    'unsweetened',
    'dark chocolate',
    'astringent',
    'hork',
  ];
  const highAcidKeywords = [
    'acidic',
    'bright',
    'citrus',
    'lemon',
    'berry',
    'tart',
    'sharp',
    'wine',
    'vibrant',
    'sour',
    'kysl',
  ];
  const lowAcidKeywords = [
    'low acidity',
    'smooth',
    'mellow',
    'soft',
    'balanced',
    'jemn',
  ];

  const containsAny = (keywords) =>
    keywords.some((keyword) => lower.includes(keyword));

  if (hasStrength) {
    const preferredStrength = preferences.preferred_strength.toLowerCase();
    const hasPreferredStrength = lower.includes(preferredStrength);
    const hasAnyStrengthSignal = containsAny(strengthKeywords);

    if (hasPreferredStrength) {
      points += weights.strength;
    } else if (hasAnyStrengthSignal) {
      penalties += weights.strength * 0.6;
    } else {
      penalties += weights.strength * 0.3;
    }
  }

  if (hasFlavorNotes) {
    const flavorWeightPerNote = weights.flavor / flavorList.length;
    let matchedFlavors = 0;

    flavorList.forEach((flavor) => {
      if (typeof flavor === 'string' && lower.includes(flavor.toLowerCase())) {
        matchedFlavors += 1;
      }
    });

    points += Math.min(matchedFlavors * flavorWeightPerNote, weights.flavor);

    if (matchedFlavors === 0) {
      penalties += weights.flavor * 0.3;
    }
  }

  if (hasSweetness) {
    const hasSweetSignal = containsAny(sweetKeywords);
    const hasBitterSignal = containsAny(bitterKeywords);

    if (sweetnessValue >= 7) {
      if (hasSweetSignal) points += weights.sweetness;
      if (hasBitterSignal) penalties += weights.sweetness * 0.6;
      if (!hasSweetSignal && !hasBitterSignal) {
        penalties += weights.sweetness * 0.3;
      }
    } else if (sweetnessValue <= 3) {
      if (hasBitterSignal) points += weights.sweetness;
      if (hasSweetSignal) penalties += weights.sweetness * 0.6;
      if (!hasSweetSignal && !hasBitterSignal) {
        penalties += weights.sweetness * 0.3;
      }
    } else {
      if (hasSweetSignal || hasBitterSignal) {
        points += weights.sweetness * 0.5;
      } else {
        penalties += weights.sweetness * 0.2;
      }
    }
  }

  if (hasAcidity) {
    const hasHighAcidSignal = containsAny(highAcidKeywords);
    const hasLowAcidSignal = containsAny(lowAcidKeywords);

    if (acidityValue >= 7) {
      if (hasHighAcidSignal) points += weights.acidity;
      if (hasLowAcidSignal) penalties += weights.acidity * 0.6;
      if (!hasHighAcidSignal && !hasLowAcidSignal) {
        penalties += weights.acidity * 0.3;
      }
    } else if (acidityValue <= 3) {
      if (hasLowAcidSignal) points += weights.acidity;
      if (hasHighAcidSignal) penalties += weights.acidity * 0.6;
      if (!hasHighAcidSignal && !hasLowAcidSignal) {
        penalties += weights.acidity * 0.3;
      }
    } else {
      if (hasHighAcidSignal || hasLowAcidSignal) {
        points += weights.acidity * 0.5;
      } else {
        penalties += weights.acidity * 0.2;
      }
    }
  }

  const normalized = ((points - penalties) / totalWeight) * 100;
  return Math.max(0, Math.min(100, normalized));
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
