import { calculateMatch } from '../../utils/coffee.js';

const PROFILE_MISSING_RESPONSE = {
  status: 'profile_missing',
  verdict: null,
  confidence: null,
  verdict_explanation: {
    user_preferences_summary:
      'Tvoje preferencie: chuťový profil nie je dokončený, dáta chýbajú pre sladkosť, aciditu, horkosť a telo.',
    coffee_profile_summary:
      'Profil kávy: údaje o káve máme, ale bez preferencií nevieme zhrnúť chuťový profil pre sladkosť, aciditu, horkosť a telo.',
    comparison_summary:
      'Porovnanie s tvojím profilom: dáta chýbajú, doplň sladkosť, aciditu, horkosť, telo a 1–2 obľúbené tóny.',
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
      'Profil kávy: dáta chýbajú pre chuťový profil (sladkosť, acidita, horkosť, telo a tóny), preto zostávame opatrní.',
    comparison_summary:
      'Porovnanie s tvojím profilom: dáta chýbajú, doplň pôvod, chuťové tóny, praženie alebo spracovanie (napr. rescan alebo cupping).',
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

const resolveTasteHintLabel = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.toLowerCase().replace(/_/g, '-').trim();
  if (normalized.includes('medium-dark') || normalized.includes('medium dark')) {
    return 'medium-dark';
  }
  if (normalized.includes('dark')) {
    return 'dark';
  }
  if (normalized.includes('light')) {
    return 'light';
  }
  if (normalized.includes('medium')) {
    return 'medium';
  }
  if (normalized.includes('washed') || normalized.includes('fully washed') || normalized.includes('wet')) {
    return 'washed';
  }
  if (normalized.includes('natural') || normalized.includes('dry')) {
    return 'natural';
  }
  return null;
};

const buildTasteMappingSentences = ({ roastLevel, processing } = {}) => {
  const sentences = [];
  const roastLabel = resolveTasteHintLabel(roastLevel);
  const processingLabel = resolveTasteHintLabel(processing);

  if (roastLabel === 'dark' || roastLabel === 'medium-dark') {
    sentences.push('Tmavé alebo stredne tmavé praženie naznačuje vyššiu horkosť a nižšiu aciditu.');
  }
  if (roastLabel === 'light') {
    sentences.push('Svetlé praženie zvyčajne prináša vyššiu aciditu a ovocnejšie tóny.');
  }
  if (processingLabel === 'natural') {
    sentences.push('Natural spracovanie zvýrazňuje ovocnosť a sladkosť.');
  }
  if (processingLabel === 'washed') {
    sentences.push('Washed spracovanie prináša čistotu a vyššiu aciditu.');
  }

  return sentences;
};

const summaryHasKeywords = (summary, keywords) =>
  keywords.every((keyword) => summary.includes(keyword));

const addTasteMappingFallbackToSummary = (summary, coffeeAttributes) => {
  if (typeof summary !== 'string') {
    return summary;
  }
  const roastLevel =
    coffeeAttributes?.roast_level ?? coffeeAttributes?.roastLevel ?? coffeeAttributes?.structured_metadata?.roast_level;
  const processing = coffeeAttributes?.processing ?? coffeeAttributes?.structured_metadata?.processing;
  const mappingSentences = buildTasteMappingSentences({ roastLevel, processing });
  if (mappingSentences.length === 0) {
    return summary;
  }

  const loweredSummary = summary.toLowerCase();
  const keywordSets = [
    { sentence: mappingSentences.find((item) => item.includes('horkosť')) || null, keywords: ['horkosť', 'acidita'] },
    { sentence: mappingSentences.find((item) => item.includes('Svetlé')) || null, keywords: ['acidita', 'ovoc'] },
    { sentence: mappingSentences.find((item) => item.includes('Natural')) || null, keywords: ['ovoc', 'sladk'] },
    { sentence: mappingSentences.find((item) => item.includes('Washed')) || null, keywords: ['čist', 'acidita'] },
  ];

  const sentencesToAppend = keywordSets
    .filter(({ sentence }) => sentence)
    .filter(({ keywords }) => !summaryHasKeywords(loweredSummary, keywords))
    .map(({ sentence }) => sentence);

  if (sentencesToAppend.length === 0) {
    return summary;
  }

  return `${summary} ${sentencesToAppend.join(' ')}`.trim();
};

const buildDeterministicFallbackResponse = ({ preferences, coffeeAttributes, correctedText }) => {
  const structured =
    coffeeAttributes && typeof coffeeAttributes === 'object'
      ? coffeeAttributes.structured_metadata || {}
      : {};
  const safePreferences = preferences || {};
  const matchScore = calculateMatch(
    correctedText || '',
    safePreferences,
    structured
  );
  const normalizedScore =
    typeof matchScore === 'number' && Number.isFinite(matchScore) ? matchScore : 50;
  const verdict = normalizedScore >= 75 ? 'suitable' : 'not_suitable';
  const confidence = Number((normalizedScore / 100).toFixed(2));
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

  const baseCoffeeProfileSummary =
    profileBits.length > 0
      ? `Profil kávy: obsahuje ${profileBits.join(', ')}.`
      : 'Profil kávy: máme len základné údaje z OCR textu a balenia.';
  const coffeeProfileSummary = addTasteMappingFallbackToSummary(
    baseCoffeeProfileSummary,
    coffeeAttributes
  );

  const formatPreference = (value) =>
    value === null || value === undefined || value === '' ? 'neznáme' : value;
  const extraPreferenceBits = [];
  if (safePreferences.intensity !== undefined && safePreferences.intensity !== null) {
    extraPreferenceBits.push(`intenzita ${formatPreference(safePreferences.intensity)}`);
  }
  if (
    safePreferences.experimentalism !== undefined &&
    safePreferences.experimentalism !== null
  ) {
    extraPreferenceBits.push(
      `experimentalnosť ${formatPreference(safePreferences.experimentalism)}`
    );
  }
  const extraPreferenceSummary =
    extraPreferenceBits.length > 0 ? `, ${extraPreferenceBits.join(', ')}` : '';
  const userPreferencesSummary = `Tvoje preferencie: sladkosť ${formatPreference(
    safePreferences.sweetness
  )}, acidita ${formatPreference(safePreferences.acidity)}, horkosť ${formatPreference(
    safePreferences.bitterness
  )}, telo ${formatPreference(safePreferences.body)}${extraPreferenceSummary}.`;
  const extraComparisonSummary =
    extraPreferenceBits.length > 0
      ? ` Zohľadnili sme aj ${extraPreferenceBits.join(' a ')}.`
      : '';
  const comparisonSummary =
    verdict === 'suitable'
      ? `Porovnanie s tvojím profilom: textová zhoda vychádza na ${Math.round(
          normalizedScore
        )} %, preto kávu hodnotíme ako vhodnú.${extraComparisonSummary}`
      : `Porovnanie s tvojím profilom: textová zhoda vychádza na ${Math.round(
          normalizedScore
        )} %, preto kávu hodnotíme ako menej vhodnú.${extraComparisonSummary}`;

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

const resolveCorrectedText = ({ corrected_text, coffee_attributes } = {}) => {
  const normalizeText = (value) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  const topLevelText = normalizeText(corrected_text);
  if (topLevelText) {
    return topLevelText;
  }
  return normalizeText(coffee_attributes?.corrected_text);
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

const applyTasteMappingFallback = (response, coffeeAttributes) => {
  if (!response || typeof response !== 'object') {
    return response;
  }
  const verdictExplanation = response.verdict_explanation;
  if (!verdictExplanation || typeof verdictExplanation !== 'object') {
    return response;
  }
  const coffeeProfileSummary = verdictExplanation.coffee_profile_summary;
  const enrichedSummary = addTasteMappingFallbackToSummary(
    coffeeProfileSummary,
    coffeeAttributes
  );
  if (enrichedSummary === coffeeProfileSummary) {
    return response;
  }
  return {
    ...response,
    verdict_explanation: {
      ...verdictExplanation,
      coffee_profile_summary: enrichedSummary,
    },
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

export {
  EVALUATION_RESPONSE_JSON_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
  INSUFFICIENT_COFFEE_DATA_RESPONSE,
  PROFILE_MISSING_RESPONSE,
  addTasteMappingFallbackToSummary,
  applyLowDataAdjustments,
  applyTasteMappingFallback,
  buildDeterministicFallbackResponse,
  buildLowConfidenceFallbackResponse,
  isValidEvaluationResponse,
  normalizeOpenAiJson,
  resolveCorrectedText,
};
