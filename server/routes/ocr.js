import express from 'express';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { calculateMatch, extractCoffeeName } from '../utils/coffee.js';
import { LOG_DIR } from '../utils/logging.js';

const router = express.Router();

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || ' ';
// Schema-compliant fallback returned when the taste profile is missing or incomplete.
const PROFILE_MISSING_RESPONSE = {
  status: 'profile_missing',
  verdict: null,
  confidence: null,
  verdict_explanation: {
    user_preferences_summary:
      'Tvoje preferencie: chuťový profil nie je dokončený, takže nemáme kompletné preferencie.',
    coffee_profile_summary: 'Profil kávy: údaje o káve sú dostupné, ale nie je s čím ich porovnať.',
    comparison_summary:
      'Porovnanie s tvojím profilom: dokonči chuťový profil, aby sme vedeli porovnať kávu s tvojimi preferenciami.',
  },
  insight: {
    headline: 'Dokonči chuťový profil',
    why: [
      'Potrebujeme tvoje preferencie sladkosti, acidity, horkosti a tela.',
      'Bez profilu by sme len hádali, čo ti chutí.',
    ],
    what_youll_like: [],
    what_might_bother_you: [],
    how_to_brew_for_better_match: [
      'Vyplň krátky dotazník s chuťovými preferenciami.',
    ],
    recommended_alternatives: [
      'Po dokončení profilu ti odporučíme vhodnejšie kávy.',
    ],
  },
  disclaimer: 'Vyhodnotenie bude dostupné po dokončení chuťového profilu.',
};

const INSUFFICIENT_COFFEE_DATA_RESPONSE = {
  status: 'insufficient_coffee_data',
  verdict: null,
  confidence: null,
  verdict_explanation: {
    user_preferences_summary:
      'Tvoje preferencie: chuťové preferencie máme uložené, ale chýbajú detaily o káve.',
    coffee_profile_summary:
      'Profil kávy: z dostupných údajov nevieme spoľahlivo zhrnúť profil kávy, preto zostávame opatrní.',
    comparison_summary:
      'Porovnanie s tvojím profilom: skús malý test (napr. cupping alebo jednu dávku) alebo rescan balenia a doplň pôvod, tóny a spracovanie.',
  },
  insight: {
    headline: 'Máme príliš málo údajov',
    why: [
      'Na presné hodnotenie potrebujeme viac údajov o káve.',
      'Bez nich by sme len hádali zhodu.',
    ],
    what_youll_like: [],
    what_might_bother_you: [],
    how_to_brew_for_better_match: [
      'Skús rescan balenia alebo urob malý test (cupping/jedna dávka) a doplň chuťové signály.',
    ],
    recommended_alternatives: [
      'Zatiaľ sa pozri na kávy s jasne uvedeným pôvodom a chuťovými tónmi.',
    ],
  },
  disclaimer: 'Vyhodnotenie bude možné po doplnení údajov o káve.',
};

const buildDeterministicFallbackResponse = ({ preferences, coffeeAttributes, correctedText }) => {
  const safePreferences = preferences || {};
  const matchScore = calculateMatch(correctedText || '', safePreferences);
  const normalizedScore =
    typeof matchScore === 'number' && Number.isFinite(matchScore) ? matchScore : 50;
  const verdict = normalizedScore >= 75 ? 'suitable' : 'not_suitable';
  const confidence = Number((normalizedScore / 100).toFixed(2));

  const structured =
    coffeeAttributes && typeof coffeeAttributes === 'object'
      ? coffeeAttributes.structured_metadata || {}
      : {};
  const origin = coffeeAttributes?.origin ?? structured?.origin;
  const roastLevel =
    coffeeAttributes?.roast_level ?? coffeeAttributes?.roastLevel ?? structured?.roast_level;
  const flavorNotes =
    coffeeAttributes?.flavor_notes ??
    coffeeAttributes?.flavorNotes ??
    structured?.flavor_notes ??
    structured?.flavorNotes;
  const processing = coffeeAttributes?.processing ?? structured?.processing;
  const varietals = coffeeAttributes?.varietals ?? structured?.varietals;

  const profileBits = [
    origin ? `pôvod: ${origin}` : null,
    roastLevel ? `praženie: ${roastLevel}` : null,
    processing ? `spracovanie: ${processing}` : null,
    Array.isArray(flavorNotes) && flavorNotes.length > 0
      ? `tóny: ${flavorNotes.join(', ')}`
      : null,
    Array.isArray(varietals) && varietals.length > 0
      ? `odrody: ${varietals.join(', ')}`
      : null,
  ].filter(Boolean);

  const coffeeProfileSummary =
    profileBits.length > 0
      ? `Profil kávy: obsahuje ${profileBits.join(', ')}.`
      : 'Profil kávy: máme len základné údaje z OCR textu a balenia.';

  const formatPreference = (value) =>
    value === null || value === undefined || value === '' ? 'neznáme' : value;
  const userPreferencesSummary = `Tvoje preferencie: sladkosť ${formatPreference(
    safePreferences.sweetness
  )}, acidita ${formatPreference(safePreferences.acidity)}, horkosť ${formatPreference(
    safePreferences.bitterness
  )}, telo ${formatPreference(safePreferences.body)}.`;
  const comparisonSummary =
    verdict === 'suitable'
      ? `Porovnanie s tvojím profilom: textová zhoda vychádza na ${Math.round(
          normalizedScore
        )} %, preto kávu hodnotíme ako vhodnú.`
      : `Porovnanie s tvojím profilom: textová zhoda vychádza na ${Math.round(
          normalizedScore
        )} %, preto kávu hodnotíme ako menej vhodnú.`;

  return {
    status: 'ok',
    verdict,
    confidence,
    verdict_explanation: {
      user_preferences_summary: userPreferencesSummary,
      coffee_profile_summary: coffeeProfileSummary,
      comparison_summary: comparisonSummary,
    },
    insight: {
      headline: verdict === 'suitable' ? 'Vyzerá to vhodne' : 'Zváž inú voľbu',
      why:
        verdict === 'suitable'
          ? [
              'Zistené údaje zodpovedajú preferovanému chuťovému profilu.',
              'Celkové skóre zhody je nad odporúčaným prahom.',
            ]
          : [
              'Zistené údaje sa zhodujú len čiastočne s preferenciami.',
              'Celkové skóre je pod odporúčaným prahom.',
            ],
      what_youll_like: verdict === 'suitable' ? ['Stabilný profil podľa tvojich preferencií.'] : [],
      what_might_bother_you:
        verdict === 'suitable' ? [] : ['Profil môže byť odlišný od tvojich preferencií.'],
      how_to_brew_for_better_match: [
        'Ak chceš vyššiu zhodu, dolaď mletie a dávku podľa chuti.',
      ],
      recommended_alternatives:
        verdict === 'suitable' ? [] : ['Pozri sa na kávy s podobnými chuťovými tónmi.'],
    },
    disclaimer: 'Výsledok je založený na dostupných údajoch z OCR.',
  };
};

const EVALUATION_RESPONSE_SCHEMA = `JSON schema (strict):
{
  "status": "ok" | "profile_missing" | "insufficient_coffee_data",
  "verdict": "suitable" | "not_suitable" | "uncertain" | null,
  "confidence": number | null,
  "verdict_explanation": {
    "user_preferences_summary": string,
    "coffee_profile_summary": string,
    "comparison_summary": string
  },
  "insight": {
    "headline": string,
    "why": string[],
    "what_youll_like": string[],
    "what_might_bother_you": string[],
    "how_to_brew_for_better_match": string[],
    "recommended_alternatives": string[]
  },
  "disclaimer": string
}

Return JSON only. Do not include markdown fences or extra text.`;

const EVALUATION_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'verdict',
    'confidence',
    'verdict_explanation',
    'insight',
    'disclaimer',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['ok', 'profile_missing', 'insufficient_coffee_data'],
    },
    verdict: {
      type: ['string', 'null'],
      enum: ['suitable', 'not_suitable', 'uncertain', null],
    },
    confidence: {
      type: ['number', 'null'],
    },
    verdict_explanation: {
      type: 'object',
      additionalProperties: false,
      required: [
        'user_preferences_summary',
        'coffee_profile_summary',
        'comparison_summary',
      ],
      properties: {
        user_preferences_summary: { type: 'string' },
        coffee_profile_summary: { type: 'string' },
        comparison_summary: { type: 'string' },
      },
    },
    insight: {
      type: 'object',
      additionalProperties: false,
      required: [
        'headline',
        'why',
        'what_youll_like',
        'what_might_bother_you',
        'how_to_brew_for_better_match',
        'recommended_alternatives',
      ],
      properties: {
        headline: { type: 'string' },
        why: { type: 'array', items: { type: 'string' } },
        what_youll_like: { type: 'array', items: { type: 'string' } },
        what_might_bother_you: { type: 'array', items: { type: 'string' } },
        how_to_brew_for_better_match: { type: 'array', items: { type: 'string' } },
        recommended_alternatives: { type: 'array', items: { type: 'string' } },
      },
    },
    disclaimer: {
      type: 'string',
    },
  },
};

const normalizeOpenAiJson = (value) => {
  if (!value) {
    return value;
  }
  return value.replace(/```json\s*/i, '').replace(/```$/i, '').trim();
};

const BRANDED_COFFEE_ALLOWLIST = ['Lavazza', 'Illy', 'Segafredo', 'Kimbo', 'Pellini', 'Bazzara'];

const normalizeCoffeeValue = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
};

const parseDelimitedList = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const items = value
    .split(/[,;|/]+/)
    .map((item) => item.replace(/[()\[\]]/g, '').trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
};

const resolveTasteVector = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }
  if (profile.taste_vector && typeof profile.taste_vector === 'object') {
    return profile.taste_vector;
  }
  if (profile.preferences && typeof profile.preferences === 'object') {
    return profile.preferences;
  }
  return profile;
};

const formatTasteProfileSummary = (profile) => {
  const vector = resolveTasteVector(profile);
  if (!vector || typeof vector !== 'object') {
    return null;
  }
  const { sweetness, acidity, bitterness, body } = vector;
  const values = [sweetness, acidity, bitterness, body];
  if (!values.some((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null;
  }
  const formatValue = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? `${value}/10` : 'neznáme';
  return `sladkosť ${formatValue(sweetness)}, acidita ${formatValue(
    acidity
  )}, horkosť ${formatValue(bitterness)}, telo ${formatValue(body)}`;
};

const formatCoffeeAttributesSummary = (attributes) => {
  if (!attributes || typeof attributes !== 'object') {
    return null;
  }
  const structured =
    attributes.structured_metadata && typeof attributes.structured_metadata === 'object'
      ? attributes.structured_metadata
      : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);

  const origin = getValue(attributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(attributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const processing =
    getValue(attributes, ['processing']) ?? getValue(structured, ['processing']);
  const roaster =
    getValue(attributes, ['roaster', 'roastery', 'brand']) ??
    getValue(structured, ['roaster', 'roastery', 'brand']);
  const flavorNotes =
    getValue(attributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const varietals =
    getValue(attributes, ['varietals']) ?? getValue(structured, ['varietals']);

  const summaryBits = [
    origin ? `pôvod ${origin}` : null,
    roastLevel ? `praženie ${roastLevel}` : null,
    processing ? `spracovanie ${processing}` : null,
    roaster ? `pražiareň ${roaster}` : null,
    Array.isArray(flavorNotes) && flavorNotes.length > 0
      ? `tóny ${flavorNotes.join(', ')}`
      : typeof flavorNotes === 'string' && flavorNotes.trim().length > 0
      ? `tóny ${flavorNotes}`
      : null,
    Array.isArray(varietals) && varietals.length > 0
      ? `odrody ${varietals.join(', ')}`
      : typeof varietals === 'string' && varietals.trim().length > 0
      ? `odrody ${varietals}`
      : null,
  ].filter(Boolean);

  return summaryBits.length > 0 ? summaryBits.join(', ') : null;
};

const extractCoffeeAttributesFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      origin: null,
      roast_level: null,
      flavor_notes: null,
      processing: null,
      varietals: null,
      brand: null,
      keywords: null,
    };
  }

  const normalizedText = text.replace(/\r/g, '');
  const lowerText = normalizedText.toLowerCase();

  const extractLabelValue = (labels) => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i');
      const match = normalizedText.match(regex);
      if (match && match[1]) {
        return normalizeCoffeeValue(match[1]);
      }
    }
    return null;
  };

  const origin = extractLabelValue(['origin', 'pôvod', 'povod', 'country', 'region']) || null;
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

  const processingKeywords = [
    { label: 'washed', keywords: ['washed', 'fully washed', 'wet process', 'mokre'] },
    { label: 'natural', keywords: ['natural', 'dry process', 'sušené', 'susene'] },
    { label: 'honey', keywords: ['honey', 'honey process', 'pulped natural'] },
    { label: 'anaerobic', keywords: ['anaerobic', 'anaeróbne', 'anaerobne'] },
    { label: 'semi-washed', keywords: ['semi-washed', 'semi washed', 'wet hulled'] },
    { label: 'carbonic maceration', keywords: ['carbonic', 'maceration'] },
  ];
  const processingKeywordMatch = processingKeywords.find(({ keywords }) =>
    keywords.some((keyword) => lowerText.includes(keyword))
  );
  const processing =
    extractLabelValue(['processing', 'process', 'spracovanie']) ||
    processingKeywordMatch?.label ||
    null;

  const roastLevelRaw = extractLabelValue(['roast', 'praženie', 'prazenie']);
  const roastLevelKeywords = [
    { label: 'light', keywords: ['light', 'svetla', 'cinnamon', 'blonde'] },
    { label: 'medium', keywords: ['medium', 'stredna', 'city'] },
    { label: 'medium-dark', keywords: ['medium-dark', 'medium dark', 'full city'] },
    { label: 'dark', keywords: ['dark', 'tmava', 'french', 'italian', 'espresso'] },
  ];
  const roastKeywordMatch = roastLevelKeywords.find(({ keywords }) =>
    keywords.some((keyword) => lowerText.includes(keyword))
  );
  const roastLevel =
    normalizeCoffeeValue(roastLevelRaw) ||
    roastKeywordMatch?.label ||
    null;

  const brandRaw = extractLabelValue([
    'brand',
    'roaster',
    'roastery',
    'roaster name',
    'pražiareň',
    'praziaren',
  ]);
  const brandAllowlistMatch = BRANDED_COFFEE_ALLOWLIST.find((brandName) =>
    lowerText.includes(brandName.toLowerCase())
  );
  const brand = normalizeCoffeeValue(brandRaw || brandAllowlistMatch);

  const keywordMatches = [
    roastKeywordMatch?.label,
    processingKeywordMatch?.label,
    brandAllowlistMatch ? `brand:${brandAllowlistMatch}` : null,
    lowerText.includes('single origin') ? 'single origin' : null,
    lowerText.includes('blend') ? 'blend' : null,
    lowerText.includes('arabica') ? 'arabica' : null,
    lowerText.includes('robusta') ? 'robusta' : null,
    lowerText.includes('espresso') ? 'espresso' : null,
    lowerText.includes('filter') ? 'filter' : null,
  ].filter(Boolean);

  return {
    origin,
    roast_level: roastLevel,
    flavor_notes: flavorNotesRaw ? parseDelimitedList(flavorNotesRaw) : null,
    processing: normalizeCoffeeValue(processing),
    varietals: varietalsRaw ? parseDelimitedList(varietalsRaw) : null,
    brand,
    keywords: keywordMatches.length > 0 ? keywordMatches : null,
  };
};

const hasMeaningfulCoffeeData = (coffeeAttributes) => {
  if (!coffeeAttributes || typeof coffeeAttributes !== 'object') {
    return false;
  }

  const { structured_metadata } = coffeeAttributes;
  const structured =
    structured_metadata && typeof structured_metadata === 'object' ? structured_metadata : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);
  const hasValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  };

  const origin = getValue(coffeeAttributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(coffeeAttributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const flavorNotes =
    getValue(coffeeAttributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const processing =
    getValue(coffeeAttributes, ['processing']) ?? getValue(structured, ['processing']);
  const varietals =
    getValue(coffeeAttributes, ['varietals']) ?? getValue(structured, ['varietals']);
  const brand =
    getValue(coffeeAttributes, ['brand', 'roaster', 'roastery', 'roaster_name']) ??
    getValue(structured, ['brand', 'roaster', 'roastery', 'roaster_name']);
  const keywords =
    getValue(coffeeAttributes, ['keywords']) ?? getValue(structured, ['keywords']);

  const hasCoreProfileDetails = [origin, flavorNotes, varietals].some(hasValue);
  const hasRoastOrProcessing = [roastLevel, processing].some(hasValue);
  const brandLabel = typeof brand === 'string' ? brand.trim().toLowerCase() : '';
  const isAllowlistedBrand = BRANDED_COFFEE_ALLOWLIST.some((allowed) =>
    brandLabel.includes(allowed.toLowerCase())
  );
  const hasKeywordSignals = Array.isArray(keywords) && keywords.length > 0;
  const hasBrandSignal = hasValue(brand);

  // Require structured attributes before AI evaluation.
  // Allow recognized brands with roast/processing data to pass the check.
  return (
    hasCoreProfileDetails ||
    hasRoastOrProcessing ||
    hasKeywordSignals ||
    (isAllowlistedBrand && hasRoastOrProcessing) ||
    hasBrandSignal
  );
};

const isMinimumCoffeeData = (coffeeAttributes) => {
  if (!coffeeAttributes || typeof coffeeAttributes !== 'object') {
    return false;
  }

  const { structured_metadata } = coffeeAttributes;
  const structured =
    structured_metadata && typeof structured_metadata === 'object' ? structured_metadata : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);
  const hasValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  };

  const origin = getValue(coffeeAttributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(coffeeAttributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const flavorNotes =
    getValue(coffeeAttributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const processing =
    getValue(coffeeAttributes, ['processing']) ?? getValue(structured, ['processing']);
  const varietals =
    getValue(coffeeAttributes, ['varietals']) ?? getValue(structured, ['varietals']);

  const hasCoreProfileDetails = [origin, flavorNotes, varietals].some(hasValue);
  const hasRoastOrProcessing = [roastLevel, processing].some(hasValue);

  return hasRoastOrProcessing && !hasCoreProfileDetails;
};

const buildLowConfidenceFallbackResponse = ({ preferences, coffeeAttributes, correctedText }) => {
  const base = buildDeterministicFallbackResponse({
    preferences,
    coffeeAttributes,
    correctedText,
  });
  const loweredConfidence =
    typeof base.confidence === 'number' && Number.isFinite(base.confidence)
      ? Math.min(Number((base.confidence * 0.6).toFixed(2)), 0.45)
      : 0.3;

  return {
    ...base,
    confidence: loweredConfidence,
    verdict: base.verdict ?? 'uncertain',
    verdict_explanation: {
      ...base.verdict_explanation,
      coffee_profile_summary: `${base.verdict_explanation.coffee_profile_summary} Dáta sú slabšie, takže hodnotenie je orientačné.`,
    },
    insight: {
      ...base.insight,
      why: [
        ...base.insight.why,
        'Použité boli iba čiastočné signály z textu.',
      ],
    },
    disclaimer: 'Výsledok je orientačný a založený na obmedzených údajoch z OCR.',
  };
};

const applyLowDataAdjustments = (response) => {
  if (!response || typeof response !== 'object') {
    return response;
  }
  const loweredConfidence =
    typeof response.confidence === 'number' && Number.isFinite(response.confidence)
      ? Math.min(Number((response.confidence * 0.6).toFixed(2)), 0.45)
      : 0.3;
  const disclaimer = response.disclaimer || '';
  const lowDataSentence =
    'Máme len minimum údajov (napr. iba praženie alebo spracovanie), preto je hodnotenie orientačné.';
  const nextDisclaimer = disclaimer.includes('minimum údajov')
    ? disclaimer
    : `${disclaimer}${disclaimer ? ' ' : ''}${lowDataSentence} Skús prosím rescan etikety.`;

  return {
    ...response,
    confidence: loweredConfidence,
    verdict_explanation: response.verdict_explanation ?? {},
    disclaimer: nextDisclaimer,
  };
};

const isValidEvaluationResponse = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const requiredKeys = [
    'status',
    'verdict',
    'confidence',
    'verdict_explanation',
    'insight',
    'disclaimer',
  ];
  if (!requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return false;
  }

  const {
    status,
    verdict,
    confidence,
    verdict_explanation,
    insight,
    disclaimer,
  } = value;

  if (
    status !== 'ok' &&
    status !== 'profile_missing' &&
    status !== 'insufficient_coffee_data'
  ) {
    return false;
  }

  const validVerdicts = ['suitable', 'not_suitable', 'uncertain'];
  if (verdict !== null && !validVerdicts.includes(verdict)) {
    return false;
  }

  if (confidence !== null && (typeof confidence !== 'number' || Number.isNaN(confidence))) {
    return false;
  }

  if (!verdict_explanation || typeof verdict_explanation !== 'object') {
    return false;
  }

  if (
    typeof verdict_explanation.user_preferences_summary !== 'string' ||
    typeof verdict_explanation.coffee_profile_summary !== 'string' ||
    typeof verdict_explanation.comparison_summary !== 'string'
  ) {
    return false;
  }

  if (!insight || typeof insight !== 'object') {
    return false;
  }

  const isStringArray = (value) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

  if (
    typeof insight.headline !== 'string' ||
    !isStringArray(insight.why) ||
    !isStringArray(insight.what_youll_like) ||
    !isStringArray(insight.what_might_bother_you) ||
    !isStringArray(insight.how_to_brew_for_better_match) ||
    !isStringArray(insight.recommended_alternatives)
  ) {
    return false;
  }

  if (typeof disclaimer !== 'string') {
    return false;
  }

  if (status === 'ok') {
    if (verdict === null || confidence === null) {
      return false;
    }
  } else {
    if (verdict !== null || confidence !== null) {
      return false;
    }
  }

  return true;
};

const isTasteProfileComplete = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return false;
  }

  if (profile.is_complete === true || profile.taste_profile_completed === true) {
    return true;
  }

  const tasteVector =
    profile.taste_vector && typeof profile.taste_vector === 'object'
      ? profile.taste_vector
      : profile.preferences && typeof profile.preferences === 'object'
      ? profile.preferences
      : profile;

  const values = [
    tasteVector.sweetness,
    tasteVector.acidity,
    tasteVector.bitterness,
    tasteVector.body,
  ];

  return values.every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
  );
};

const normalizeTasteProfileForEvaluation = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return profile;
  }

  const tasteVector =
    profile.taste_vector && typeof profile.taste_vector === 'object'
      ? profile.taste_vector
      : profile.preferences && typeof profile.preferences === 'object'
      ? profile.preferences
      : null;

  return tasteVector ? { ...profile, ...tasteVector } : profile;
};

// ========== OCR ENDPOINTS ==========

/**
 * Spracuje obrázok a pošle ho do Google Vision API na OCR.
 * Loguje dĺžku vstupného obrázka a meta-informácie z Vision API.
 */
router.post('/ocr', async (req, res) => {
  try {
    const { base64image } = req.body;
    if (!base64image) {
      return res.status(400).json({ error: 'Chýba obrázok v base64.' });
    }

    const payload = {
      requests: [
        {
          image: { content: base64image },
          features: [{ type: 'TEXT_DETECTION' }, { type: 'LABEL_DETECTION' }],
        },
      ],
    };
    console.log('📤 [Vision] Payload size:', base64image.length);

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const visionResponse = response.data.responses?.[0] || {};
    const text = visionResponse.fullTextAnnotation?.text || '';
    const labelAnnotations = Array.isArray(visionResponse.labelAnnotations)
      ? visionResponse.labelAnnotations
      : [];
    const labels = labelAnnotations
      .map((label) => label?.description)
      .filter((label) => typeof label === 'string' && label.trim().length > 0);

    const coffeeKeywords = [
      'coffee',
      'espresso',
      'cafe',
      'café',
      'latte',
      'cappuccino',
      'bean',
      'beans',
      'roast',
    ];
    const coffeeConfidenceCandidates = labelAnnotations
      .map((label) => ({
        description: label?.description,
        score: label?.score,
      }))
      .filter(({ description, score }) => {
        if (typeof description !== 'string' || typeof score !== 'number') {
          return false;
        }
        const normalized = description.toLowerCase();
        return coffeeKeywords.some((keyword) => normalized.includes(keyword));
      })
      .map(({ score }) => score)
      .filter((score) => Number.isFinite(score));

    const coffeeConfidence =
      coffeeConfidenceCandidates.length > 0
        ? Math.max(...coffeeConfidenceCandidates)
        : null;
    const isCoffee =
      typeof coffeeConfidence === 'number' ? coffeeConfidence >= 0.6 : undefined;

    console.log('📥 [Vision] Response meta:', {
      textLength: text.length,
      labelCount: labels.length,
    });
    res.json({ text, labels, coffeeConfidence, isCoffee });
  } catch (error) {
    console.error('OCR server error:', error?.message ?? error);
    res.status(500).json({ error: 'OCR failed', detail: error?.message ?? error });
  }
});

/**
 * Opraví OCR text pomocou OpenAI.
 */
router.post('/api/ocr/fix-text', async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Chýba OCR text' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ corrected_text: text });
  }

  const prompt = `Toto je text získaný OCR rozpoznávaním z etikety kávy.
Oprav všetky chyby, ktoré mohli vzniknúť zlým rozpoznaním znakov.
Zachovaj pôvodný význam a štruktúru, ale oprav OCR chyby.
Vráť iba opravený text.

OCR text:
${text}`;

  try {
    console.log('📤 [OpenAI] OCR prompt meta:', {
      model: 'gpt-4o',
      chars: prompt.length,
    });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Si expert na kávu a opravu textov z OCR. Opravuješ chyby v rozpoznaných textoch z etikiet káv.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 [OpenAI] OCR response meta:', {
      id: response.data?.id,
      model: response.data?.model,
      usage: response.data?.usage,
    });
    const corrected =
      response.data?.choices?.[0]?.message?.content?.trim() || text;
    return res.json({ corrected_text: corrected });
  } catch (error) {
    console.error('OCR fix error:', error?.message ?? error);
    return res.json({ corrected_text: text });
  }
});

/**
 * Navrhne spôsoby prípravy kávy na základe textu.
 */
router.post('/api/ocr/brewing-methods', async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Chýba text kávy' });
  }

  const fallback = ['Espresso', 'French press', 'V60', 'Cold brew'];
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ methods: fallback });
  }

  const prompt =
    `Na základe tohto popisu kávy navrhni presne 4 najvhodnejšie spôsoby prípravy kávy. ` +
    `Odpovedz len zoznamom metód oddelených novým riadkom. Popis: "${text}"`;

  try {
    console.log('📤 [OpenAI] Brewing prompt meta:', {
      model: 'gpt-4o',
      chars: prompt.length,
    });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Si barista, ktorý odporúča spôsoby prípravy kávy na základe popisu z etikety.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 [OpenAI] Brewing response meta:', {
      id: response.data?.id,
      model: response.data?.model,
      usage: response.data?.usage,
    });
    const content = response.data?.choices?.[0]?.message?.content || '';
    let methods = content
      .split('\n')
      .map((method) => method.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean);

    if (methods.length === 0) {
      methods = fallback;
    } else if (methods.length < 4) {
      methods = [...methods, ...fallback].slice(0, 4);
    } else {
      methods = methods.slice(0, 4);
    }

    return res.json({ methods });
  } catch (error) {
    console.error('Brewing suggestion error:', error?.message ?? error);
    return res.json({ methods: fallback });
  }
});

/**
 * Vygeneruje recept na kávu podľa zvolenej metódy a preferovanej chuti.
 */
router.post('/api/ocr/brew-recipe', async (req, res) => {
  const { method, taste, taste_profile: tasteProfile, coffee_attributes: coffeeAttributes } =
    req.body ?? {};
  if (!method || typeof method !== 'string') {
    return res.status(400).json({ error: 'Chýba metóda prípravy' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ recipe: '' });
  }

  const tasteProfileSummary = formatTasteProfileSummary(tasteProfile);
  const coffeeSummary = formatCoffeeAttributesSummary(coffeeAttributes);
  const correctedText =
    typeof coffeeAttributes?.corrected_text === 'string'
      ? coffeeAttributes.corrected_text.trim()
      : '';
  const correctedTextSnippet =
    correctedText.length > 0 ? correctedText.slice(0, 600) : '';
  const promptSections = [
    `Priprav detailný recept na kávu pomocou metódy ${method}.`,
    `Používateľ preferuje ${taste || 'vyvážená'} chuť.`,
    tasteProfileSummary ? `Chuťový profil používateľa: ${tasteProfileSummary}.` : null,
    coffeeSummary ? `Profil kávy: ${coffeeSummary}.` : null,
    correctedTextSnippet ? `Text z etikety: "${correctedTextSnippet}".` : null,
    'Uveď ideálny pomer kávy k vode, teplotu vody a ďalšie dôležité kroky. Odpovedz stručne.',
  ].filter(Boolean);
  const prompt = promptSections.join(' ');

  try {
    console.log('📤 [OpenAI] Recipe prompt meta:', {
      model: 'gpt-4o',
      chars: prompt.length,
    });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Si skúsený barista, ktorý navrhuje recepty na kávu.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 [OpenAI] Recipe response meta:', {
      id: response.data?.id,
      model: response.data?.model,
      usage: response.data?.usage,
    });
    const recipe = response.data?.choices?.[0]?.message?.content?.trim() || '';
    return res.json({ recipe });
  } catch (error) {
    console.error('Brew recipe error:', error?.message ?? error);
    return res.json({ recipe: '' });
  }
});

/**
 * Uloží výsledok OCR do databázy a vypočíta zhodu s preferenciami používateľa.
 */
router.post('/api/ocr/save', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const {
      original_text,
      corrected_text,
      origin,
      roast_level,
      flavor_notes,
      processing,
      roast_date,
      varietals,
      thumbnail_url,
      structured_metadata,
      structuredMetadata,
      structured_confidence,
      structuredConfidence,
      structured_uncertainty,
      structuredUncertainty,
    } = req.body;

    const structured = structured_metadata || structuredMetadata || {};
    const confidenceFlags =
      structured_confidence ||
      structuredConfidence ||
      structured.confidenceFlags ||
      structured.confidence_flags ||
      null;
    const uncertaintyFlags =
      structured_uncertainty ||
      structuredUncertainty ||
      structured.uncertainty ||
      structured.uncertainty_flags ||
      null;

    const derivedAttributes = extractCoffeeAttributesFromText(
      corrected_text || original_text || ''
    );

    const normalizeTextField = (value) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
    const normalizeArrayField = (value) => {
      if (Array.isArray(value)) {
        const normalized = value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean);
        return normalized.length > 0 ? normalized : null;
      }
      if (typeof value === 'string') {
        const normalized = value
          .split(/[,;\n]/)
          .map((entry) => entry.trim())
          .filter(Boolean);
        return normalized.length > 0 ? normalized : null;
      }
      return null;
    };
    const normalizeJsonField = (value) =>
      value === undefined || value === null ? null : JSON.stringify(value);

    const normalizedOriginInput = normalizeTextField(origin);
    const normalizedRoastLevelInput = normalizeTextField(roast_level);
    const normalizedFlavorNotesInput = normalizeArrayField(flavor_notes);
    const normalizedProcessingInput = normalizeTextField(processing);
    const normalizedRoastDateInput = normalizeTextField(roast_date);
    const normalizedVarietalsInput = normalizeArrayField(varietals);
    const normalizedThumbnailInput = normalizeTextField(thumbnail_url);
    const hasStructuredMetadataInput = structured && Object.keys(structured).length > 0;
    const isTextOnlyScan =
      !hasStructuredMetadataInput &&
      !normalizedOriginInput &&
      !normalizedRoastLevelInput &&
      !normalizedFlavorNotesInput &&
      !normalizedProcessingInput &&
      !normalizedRoastDateInput &&
      !normalizedVarietalsInput &&
      !normalizedThumbnailInput;

    const prefResult = await db.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    const preferences = prefResult.rows[0];
    const isProfileComplete = Boolean(
      preferences?.is_complete ?? preferences?.taste_profile_completed ?? false
    );
    const matchPercentage = isProfileComplete
      ? calculateMatch(corrected_text, preferences)
      : null;
    const isRecommended = matchPercentage !== null ? matchPercentage > 75 : false;
    const coffeeName = extractCoffeeName(corrected_text || original_text);

    const resolvedOrigin = normalizeTextField(
      normalizedOriginInput ?? structured.origin ?? derivedAttributes.origin
    );
    const resolvedRoastLevel = normalizeTextField(
      normalizedRoastLevelInput ??
        structured.roast_level ??
        structured.roastLevel ??
        derivedAttributes.roast_level
    );
    const resolvedFlavorNotes = normalizeJsonField(
      normalizedFlavorNotesInput ??
        structured.flavor_notes ??
        structured.flavorNotes ??
        derivedAttributes.flavor_notes
    );
    const resolvedProcessing = normalizeTextField(
      normalizedProcessingInput ?? structured.processing ?? derivedAttributes.processing
    );
    const resolvedVarietals = normalizeJsonField(
      normalizedVarietalsInput ?? structured.varietals ?? derivedAttributes.varietals
    );

    const result = await db.query(
      `INSERT INTO scan_events (
        user_id,
        coffee_name,
        brand,
        barcode,
        image_url,
        original_text,
        corrected_text,
        origin,
        roast_level,
        flavor_notes,
        processing,
        roast_date,
        varietals,
        thumbnail_url,
        structured_confidence,
        structured_uncertainty,
        scan_quality,
        match_score,
        is_recommended,
        detected_at,
        created_at
      )
       VALUES (
        $1,
        $2,
        NULL,
        NULL,
        NULL,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        $8,
        $9,
        $10::jsonb,
        $11,
        $12::jsonb,
        $13::jsonb,
        $14,
        $15,
        $16,
        now(),
        now()
      )
       RETURNING id`,
      [
        uid,
        coffeeName,
        normalizeTextField(original_text),
        normalizeTextField(corrected_text),
        resolvedOrigin,
        resolvedRoastLevel,
        resolvedFlavorNotes,
        resolvedProcessing,
        normalizeTextField(
          normalizedRoastDateInput ?? structured.roast_date ?? structured.roastDate
        ),
        resolvedVarietals,
        normalizeTextField(
          normalizedThumbnailInput ?? structured.thumbnail_url ?? structured.thumbnailUrl
        ),
        normalizeJsonField(confidenceFlags),
        normalizeJsonField(uncertaintyFlags),
        isTextOnlyScan ? 'text_only' : null,
        matchPercentage,
        isRecommended,
      ]
    );

    const storedStructuredMetadata = {
      brand: normalizeTextField(
        structured.brand ??
          structured.roaster ??
          structured.roaster_name ??
          structured.roastery ??
          derivedAttributes.brand
      ),
      roaster: normalizeTextField(
        structured.roaster ??
          structured.roaster_name ??
          structured.roastery ??
          structured.brand ??
          derivedAttributes.brand
      ),
      origin: resolvedOrigin,
      roastLevel: resolvedRoastLevel,
      processing: resolvedProcessing,
      flavorNotes: normalizeArrayField(
        flavor_notes ??
          structured.flavor_notes ??
          structured.flavorNotes ??
          derivedAttributes.flavor_notes
      ),
      roastDate: normalizeTextField(roast_date ?? structured.roast_date ?? structured.roastDate),
      varietals: normalizeArrayField(
        varietals ?? structured.varietals ?? derivedAttributes.varietals
      ),
      confidenceFlags:
        confidenceFlags && typeof confidenceFlags === 'object' ? confidenceFlags : null,
    };
    const hasStructuredPayload = Object.entries(storedStructuredMetadata).some(([key, value]) => {
      if (key === 'confidenceFlags') {
        return value !== null;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return Boolean(value);
    });

    res.status(200).json({
      message: 'OCR uložené',
      id: result.rows[0].id,
      match_percentage: matchPercentage,
      is_recommended: isRecommended,
      structured_metadata: hasStructuredPayload ? storedStructuredMetadata : null,
      structured_confidence:
        storedStructuredMetadata.confidenceFlags &&
        typeof storedStructuredMetadata.confidenceFlags === 'object'
          ? storedStructuredMetadata.confidenceFlags
          : null,
    });
  } catch (err) {
    console.error('❌ Chyba pri ukladaní OCR:', err);
    res.status(500).json({ error: 'Chyba servera pri ukladaní OCR' });
  }
});

/**
 * Vyhodnotí text kávy pomocou OpenAI na základe preferencií používateľa.
 * Loguje meta-informácie o OpenAI požiadavke a odpovedi.
 */
router.post('/api/ocr/evaluate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  let preferences;
  let coffeeAttributes;
  let correctedText;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const {
      corrected_text,
      structured_metadata,
      structuredMetadata,
      coffee_attributes,
      taste_profile,
      taste_profile_source,
    } = req.body ?? {};
    if (!corrected_text) return res.status(400).json({ error: 'Chýba text kávy' });
    correctedText = corrected_text;

    const result = await db.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    const dbPreferences = result.rows[0];
    const requestTasteProfile =
      taste_profile && typeof taste_profile === 'object' ? taste_profile : null;
    const requestTasteProfileSource =
      typeof taste_profile_source === 'string' ? taste_profile_source : null;
    const requestUpdatedAtRaw =
      requestTasteProfile?.updated_at ?? requestTasteProfile?.last_recalculated_at ?? null;
    const requestHasTimestamp = Boolean(requestUpdatedAtRaw);
    const allowTimestamplessProfile =
      Boolean(requestTasteProfile) && (!dbPreferences || requestTasteProfileSource === 'client');
    if (requestTasteProfile && !requestHasTimestamp && !allowTimestamplessProfile) {
      console.warn('⚠️ [OCR] taste_profile missing timestamp; using DB profile.', {
        uid,
        hasTasteProfile: Boolean(requestTasteProfile),
      });
    }

    const parseTimestamp = (value) => {
      if (!value) {
        return null;
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const dbUpdatedAt = parseTimestamp(dbPreferences?.updated_at);
    const dbRecalculatedAt = parseTimestamp(dbPreferences?.last_recalculated_at);
    const dbLatestTimestamp =
      dbUpdatedAt && dbRecalculatedAt
        ? dbUpdatedAt > dbRecalculatedAt
          ? dbUpdatedAt
          : dbRecalculatedAt
        : dbUpdatedAt || dbRecalculatedAt;

    let requestUpdatedAt = null;
    if (requestTasteProfile) {
      if (requestUpdatedAtRaw) {
        requestUpdatedAt = parseTimestamp(requestUpdatedAtRaw);
        if (!requestUpdatedAt) {
          return res
            .status(400)
            .json({ error: 'Neplatný taste_profile.updated_at' });
        }
        if (
          requestTasteProfileSource !== 'client' &&
          dbLatestTimestamp &&
          requestUpdatedAt < dbLatestTimestamp
        ) {
          return res
            .status(409)
            .json({ error: 'Zastaralý chuťový profil' });
        }
      }
    }

    const normalizedRequestTasteProfile = normalizeTasteProfileForEvaluation(requestTasteProfile);
    const useRequestProfile =
      Boolean(requestTasteProfile) &&
      (requestTasteProfileSource === 'client' ||
        (requestUpdatedAt
          ? !dbLatestTimestamp || requestUpdatedAt >= dbLatestTimestamp
          : allowTimestamplessProfile));
    const candidatePreferences = useRequestProfile
      ? normalizedRequestTasteProfile
      : dbPreferences;

    const isProfileComplete = isTasteProfileComplete(candidatePreferences);
    preferences = candidatePreferences;

    if (!isProfileComplete) {
      // ⬇️ Short-circuit with the strict JSON schema when profile is incomplete.
      return res.json(PROFILE_MISSING_RESPONSE);
    }

    // Contract: `corrected_text` is canonical at top-level and may be mirrored
    // inside `coffee_attributes.corrected_text` for downstream normalization.
    // Accept structured metadata from the FE (or any upstream source) to ground the explanation.
    const structured = structured_metadata || structuredMetadata || {};
    const structuredRecord = structured && typeof structured === 'object' ? structured : {};
    coffeeAttributes =
      coffee_attributes && typeof coffee_attributes === 'object'
        ? coffee_attributes
        : {
            ocr_text: corrected_text,
            structured_metadata: structured,
          };

    const derivedAttributes = extractCoffeeAttributesFromText(corrected_text);
    // Expected format: snake_case keys (camelCase accepted only as a fallback).
    const normalizedStructured = {
      brand:
        structuredRecord.brand ??
        structuredRecord.roaster ??
        structuredRecord.roaster_name ??
        structuredRecord.roastery ??
        null,
      roaster:
        structuredRecord.roaster ??
        structuredRecord.roaster_name ??
        structuredRecord.roastery ??
        structuredRecord.brand ??
        null,
      origin: structuredRecord.origin ?? null,
      roast_level: structuredRecord.roast_level ?? structuredRecord.roastLevel ?? null,
      flavor_notes: structuredRecord.flavor_notes ?? structuredRecord.flavorNotes ?? null,
      processing: structuredRecord.processing ?? null,
      varietals: structuredRecord.varietals ?? null,
    };
    const mergedStructuredMetadata = {
      brand: normalizedStructured.brand ?? derivedAttributes.brand,
      roaster: normalizedStructured.roaster ?? derivedAttributes.brand,
      origin: normalizedStructured.origin ?? derivedAttributes.origin,
      roast_level: normalizedStructured.roast_level ?? derivedAttributes.roast_level,
      flavor_notes: normalizedStructured.flavor_notes ?? derivedAttributes.flavor_notes,
      processing: normalizedStructured.processing ?? derivedAttributes.processing,
      varietals: normalizedStructured.varietals ?? derivedAttributes.varietals,
    };
    coffeeAttributes = {
      ...coffeeAttributes,
      corrected_text: coffeeAttributes.corrected_text ?? correctedText,
      brand:
        coffeeAttributes.brand ??
        coffeeAttributes.roaster ??
        mergedStructuredMetadata.brand ??
        mergedStructuredMetadata.roaster ??
        derivedAttributes.brand,
      roaster:
        coffeeAttributes.roaster ??
        coffeeAttributes.brand ??
        mergedStructuredMetadata.roaster ??
        mergedStructuredMetadata.brand ??
        derivedAttributes.brand,
      origin:
        coffeeAttributes.origin ??
        mergedStructuredMetadata.origin ??
        derivedAttributes.origin,
      roast_level:
        coffeeAttributes.roast_level ??
        coffeeAttributes.roastLevel ??
        mergedStructuredMetadata.roast_level ??
        derivedAttributes.roast_level,
      flavor_notes:
        coffeeAttributes.flavor_notes ??
        coffeeAttributes.flavorNotes ??
        mergedStructuredMetadata.flavor_notes ??
        derivedAttributes.flavor_notes,
      processing:
        coffeeAttributes.processing ??
        mergedStructuredMetadata.processing ??
        derivedAttributes.processing,
      varietals:
        coffeeAttributes.varietals ??
        mergedStructuredMetadata.varietals ??
        derivedAttributes.varietals,
      structured_metadata: mergedStructuredMetadata,
    };

    if (!hasMeaningfulCoffeeData(coffeeAttributes)) {
      return res.json(INSUFFICIENT_COFFEE_DATA_RESPONSE);
    }
    const hasMinimumData = isMinimumCoffeeData(coffeeAttributes);

    // The comparison-based structure prevents contradictions because verdict and insight share the same summaries.
    const systemPrompt = `Si expert na kávu a chuťové profily.
Odpovedaj výhradne v slovenčine.
Vráť striktne platný JSON podľa zadanej schémy, bez markdownu a bez dodatočného textu.
Nikdy nehádaj chýbajúce dáta. Ak chýba profil alebo údaje o káve, priznaj neistotu podľa schémy.
Verdict a insight musia vychádzať z toho istého porovnania preferencií a atribútov kávy a nesmú si odporovať.`;
const userPrompt = `Vyhodnoť vhodnosť naskenovanej kávy pre používateľa.

PRAVIDLÁ:
- Výstup musí byť STRICT JSON podľa schémy nižšie.
- Ak chýba alebo je neúplný chuťový profil → status="profile_missing", verdict=null.
- Ak chýbajú kľúčové atribúty kávy → status="insufficient_coffee_data", verdict=null.
- Ak sú dáta dostatočné → status="ok" a verdict je "suitable" | "not_suitable" | "uncertain".
- Ak sú k dispozícii len roast_level a/alebo processing (bez pôvodu, odrôd, chuťových tónov),
  zhrň len všeobecný charakter (napr. vyššia acidita pri light/omni roaste),
  nezadávaj konkrétne chuťové tóny, explicitne priznaj neistotu a nastav nižší confidence.
- V prípade obmedzených údajov vždy uveď v coffee_profile_summary alebo disclaimer, že hodnotenie je orientačné.
- Každé pole verdict_explanation musí byť presne jedna veta v tomto formáte:
  - user_preferences_summary začína "Tvoje preferencie:" a stručne zhrnie chuťový profil.
  - coffee_profile_summary začína "Profil kávy:" a stručne zhrnie profil kávy.
  - comparison_summary začína "Porovnanie s tvojím profilom:" a jasne porovná oba profily.
- Insight musí byť konzistentný s verdictom (bez protichodných tvrdení).
- Použi jediný kontrakt: insight objekt s poliami zo schémy (žiadne top-level zoznamy).

VSTUP:
user_taste_profile: {
  "sweetness": ${preferences.sweetness},
  "acidity": ${preferences.acidity},
  "bitterness": ${preferences.bitterness},
  "body": ${preferences.body},
  "flavor_notes": ${JSON.stringify(preferences.flavor_notes ?? [])},
  "milk_preferences": ${JSON.stringify(preferences.milk_preferences || {})},
  "caffeine_sensitivity": ${JSON.stringify(preferences.caffeine_sensitivity ?? null)},
  "preferred_strength": ${JSON.stringify(preferences.preferred_strength ?? null)}
}
coffee_attributes: ${JSON.stringify(coffeeAttributes)}

SCHEMA:
${EVALUATION_RESPONSE_SCHEMA}
`;

    console.log('📤 [OpenAI] Prompt meta:', {
      model: 'gpt-4o',
      chars: userPrompt.length,
    });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          { role: 'user', content: userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'coffee_evaluation',
            schema: EVALUATION_RESPONSE_JSON_SCHEMA,
            strict: true,
          },
        },
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('📥 [OpenAI] Response meta:', {
      id: response.data?.id,
      model: response.data?.model,
      usage: response.data?.usage,
    });

    const aiMessage = response.data.choices?.[0]?.message?.content?.trim();
    let parsed;
    try {
      const normalized = normalizeOpenAiJson(aiMessage);
      parsed = normalized ? JSON.parse(normalized) : null;
    } catch (error) {
      parsed = null;
    }

    // ⬇️ Validate AI JSON strictly to prevent malformed payloads from breaking the FE.
    if (!isValidEvaluationResponse(parsed) || parsed.status !== 'ok') {
      return res.json(
        hasMinimumData
          ? buildLowConfidenceFallbackResponse({
              preferences,
              coffeeAttributes,
              correctedText,
            })
          : buildDeterministicFallbackResponse({
              preferences,
              coffeeAttributes,
              correctedText,
            })
      );
    }

    return res.json(hasMinimumData ? applyLowDataAdjustments(parsed) : parsed);
  } catch (err) {
    console.error('❌ Chyba AI vyhodnotenia:', err);
    return res.json(
      isMinimumCoffeeData(coffeeAttributes)
        ? buildLowConfidenceFallbackResponse({
            preferences,
            coffeeAttributes,
            correctedText,
          })
        : buildDeterministicFallbackResponse({
            preferences,
            coffeeAttributes,
            correctedText,
          })
    );
  }
});

/**
 * Potvrdí štruktúrované údaje skenu a uchová ich pre budúce odporúčania.
 *
 * Endpoint len validuje vstup a uloží auditný log, aby FE vedel, že
 * potvrdenie prebehlo úspešne.
 */
router.post('/api/ocr/:id/structured/confirm', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const scanId = req.params.id;
    if (!scanId) {
      return res.status(400).json({ error: 'Chýba scanId' });
    }

    const { metadata, confidence, raw, correctedText, purchased } = req.body || {};
    const logPayload = {
      userId: decoded.uid,
      scanId,
      purchased: Boolean(purchased),
      hasMetadata: Boolean(metadata),
      hasConfidence: Boolean(confidence),
      hasRaw: Boolean(raw),
      hasCorrectedText: Boolean(correctedText),
      timestamp: new Date().toISOString(),
    };

    const logEntry = `${JSON.stringify(logPayload)}\n`;
    fs.appendFile(path.join(LOG_DIR, 'structured_confirm.log'), logEntry, (err) => {
      if (err) console.error('❌ Chyba pri logovaní structured confirm:', err);
    });

    const normalizeJsonField = (value) =>
      value === undefined || value === null ? null : JSON.stringify(value);
    const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : null;
    const normalizedConfidence = confidence && typeof confidence === 'object' ? confidence : null;

    const updateResult = await db.query(
      `UPDATE scan_events
       SET confirmed_structured_metadata = $1::jsonb,
           confirmed_structured_confidence = $2::jsonb,
           confirmed_structured_raw = $3::jsonb
       WHERE id = $4 AND user_id = $5
       RETURNING id`,
      [
        normalizeJsonField(normalizedMetadata),
        normalizeJsonField(normalizedConfidence),
        normalizeJsonField(raw),
        scanId,
        decoded.uid,
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Sken neexistuje' });
    }

    return res.status(200).json({
      message: 'Štruktúrované dáta potvrdené',
      ok: true,
    });
  } catch (err) {
    console.error('❌ Chyba pri potvrdení štruktúrovaných dát:', err);
    return res
      .status(500)
      .json({ error: 'Nepodarilo sa potvrdiť štruktúrované dáta' });
  }
});

/**
 * Vymaže konkrétny OCR záznam a prípadné hodnotenia.
 */
router.delete('/api/ocr/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
    const recordId = req.params.id;

    const result = await db.query(
      'DELETE FROM scan_events WHERE id = $1 AND user_id = $2 RETURNING id',
      [recordId, uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Záznam neexistuje' });
    }

    console.log(`✅ OCR záznam ${recordId} vymazaný`);
    res.json({ message: 'Záznam vymazaný' });
  } catch (err) {
    console.error('❌ Chyba pri mazaní:', err);
    res.status(500).json({ error: 'Chyba pri mazaní' });
  }
});

/**
 * Načíta históriu OCR skenovaní používateľa.
 */
router.get('/api/ocr/history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(
      `SELECT
        id,
        coffee_name,
        brand,
        original_text,
        corrected_text,
        origin,
        roast_level,
        flavor_notes,
        processing,
        roast_date,
        varietals,
        thumbnail_url,
        structured_confidence,
        structured_uncertainty,
        confirmed_structured_metadata,
        confirmed_structured_confidence,
        confirmed_structured_raw,
        match_score,
        is_recommended,
        created_at
       FROM scan_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [uid, limit]
    );

    const history = result.rows.map((row) => ({
      id: row.id.toString(),
      coffee_name: row.coffee_name,
      original_text: row.original_text,
      corrected_text: row.corrected_text,
      brand: row.brand,
      origin: row.origin,
      roast_level: row.roast_level,
      flavor_notes: row.flavor_notes,
      processing: row.processing,
      roast_date: row.roast_date,
      varietals: row.varietals,
      thumbnail_url: row.thumbnail_url,
      structured_confidence: row.structured_confidence,
      structured_uncertainty: row.structured_uncertainty,
      confirmed_structured_metadata: row.confirmed_structured_metadata,
      confirmed_structured_confidence: row.confirmed_structured_confidence,
      confirmed_structured_raw: row.confirmed_structured_raw,
      created_at: row.created_at,
      rating: null,
      match_percentage: row.match_score,
      is_recommended: row.is_recommended || false,
      is_purchased: false,
    }));

    res.json(history);
  } catch (err) {
    console.error('❌ History error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní histórie' });
  }
});

/**
 * Označí, že používateľ zakúpil danú kávu a uloží ju do knižnice používateľa.
 */
router.post('/api/ocr/purchase', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const { ocr_log_id, coffee_name, brand, metadata } = req.body;
    if (!ocr_log_id) return res.status(400).json({ error: 'Chýba ID záznamu OCR' });

    await db.query(
      `UPDATE scan_events SET is_recommended = true WHERE id = $1 AND user_id = $2`,
      [ocr_log_id, uid]
    );

    if (coffee_name) {
      // Pull structured metadata from the scan confirmation when available.
      const normalizedMetadata =
        metadata && typeof metadata === 'object' ? metadata : {};
      const origin =
        typeof normalizedMetadata.origin === 'string' ? normalizedMetadata.origin : null;
      const roastLevel =
        typeof normalizedMetadata.roastLevel === 'string'
          ? normalizedMetadata.roastLevel
          : typeof normalizedMetadata.roast_level === 'string'
          ? normalizedMetadata.roast_level
          : null;
      const flavorNotes =
        Array.isArray(normalizedMetadata.flavorNotes)
          ? normalizedMetadata.flavorNotes
          : Array.isArray(normalizedMetadata.flavor_notes)
          ? normalizedMetadata.flavor_notes
          : null;

      await db.query(
        `INSERT INTO user_coffees (user_id, name, brand, origin, roast_level, flavor_notes)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING`,
        [
          uid,
          coffee_name,
          brand || null,
          origin,
          roastLevel,
          flavorNotes ? JSON.stringify(flavorNotes) : null,
        ]
      );
    }

    res.json({ message: 'Nákup uložený' });
  } catch (err) {
    console.error('❌ Purchase error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní nákupu' });
  }
});

export { isValidEvaluationResponse };
export default router;
