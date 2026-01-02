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
      'Používateľský chuťový profil nie je dokončený, takže nemáme kompletné preferencie.',
    coffee_profile_summary: 'Profil kávy je k dispozícii, no nie je s čím ho porovnať.',
    comparison_summary:
      'Dokonči chuťový profil, aby sme vedeli porovnať kávu s tvojimi preferenciami.',
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
      'Tvoje chuťové preferencie máme uložené, ale chýbajú detaily o káve.',
    coffee_profile_summary:
      'Z dostupných údajov nevieme spoľahlivo zhrnúť profil kávy, preto zostávame opatrní.',
    comparison_summary:
      'Skús malý test (napr. cupping alebo jednu dávku) alebo rescan balenia a doplň pôvod, tóny a spracovanie.',
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
      ? `Profil kávy obsahuje ${profileBits.join(', ')}.`
      : 'Káva má základné údaje z OCR textu a balenia.';

  const formatPreference = (value) =>
    value === null || value === undefined || value === '' ? 'neznáme' : value;
  const userPreferencesSummary = `Profil používateľa: sladkosť ${formatPreference(
    safePreferences.sweetness
  )}, acidita ${formatPreference(safePreferences.acidity)}, horkosť ${formatPreference(
    safePreferences.bitterness
  )}, telo ${formatPreference(safePreferences.body)}.`;
  const comparisonSummary =
    verdict === 'suitable'
      ? `Textová zhoda vychádza na ${Math.round(
          normalizedScore
        )} %, preto kávu hodnotíme ako vhodnú.`
      : `Textová zhoda vychádza na ${Math.round(
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

const normalizeOpenAiJson = (value) => {
  if (!value) {
    return value;
  }
  return value.replace(/```json\s*/i, '').replace(/```$/i, '').trim();
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
  const ocrText =
    getValue(coffeeAttributes, ['corrected_text', 'ocr_text', 'original_text']) ??
    getValue(structured, ['corrected_text', 'ocr_text', 'original_text']);

  // Require at least one core attribute or OCR text before AI evaluation.
  // OCR text allows AI to stay uncertain without claiming specifics.
  return [origin, roastLevel, flavorNotes, processing, varietals, ocrText].some(hasValue);
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

// ========== OCR ENDPOINTS ==========

/**
 * Spracuje obrázok a pošle ho do Google Vision API na OCR.
 * Loguje dĺžku vstupného obrázka a odpoveď z Vision API.
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
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    };
    console.log('📤 [Vision] Payload size:', base64image.length);

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('📥 [Vision] Response:', response.data);

    const text = response.data.responses?.[0]?.fullTextAnnotation?.text || '';
    res.json({ text });
  } catch (error) {
    console.error('OCR server error:', error?.message ?? error);
    res.status(500).json({ error: 'OCR failed', detail: error?.message ?? error });
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
    } = req.body;

    const structured = structured_metadata || structuredMetadata || {};

    const normalizeTextField = (value) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
    const normalizeJsonField = (value) =>
      value === undefined || value === null ? null : JSON.stringify(value);

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
        $12,
        $13,
        now(),
        now()
      )
       RETURNING id`,
      [
        uid,
        coffeeName,
        normalizeTextField(original_text),
        normalizeTextField(corrected_text),
        normalizeTextField(origin ?? structured.origin),
        normalizeTextField(roast_level ?? structured.roast_level ?? structured.roastLevel),
        normalizeJsonField(flavor_notes ?? structured.flavor_notes ?? structured.flavorNotes),
        normalizeTextField(processing ?? structured.processing),
        normalizeTextField(roast_date ?? structured.roast_date ?? structured.roastDate),
        normalizeJsonField(varietals ?? structured.varietals),
        normalizeTextField(thumbnail_url ?? structured.thumbnail_url ?? structured.thumbnailUrl),
        matchPercentage,
        isRecommended,
      ]
    );

    res.status(200).json({
      message: 'OCR uložené',
      id: result.rows[0].id,
      match_percentage: matchPercentage,
      is_recommended: isRecommended,
    });
  } catch (err) {
    console.error('❌ Chyba pri ukladaní OCR:', err);
    res.status(500).json({ error: 'Chyba servera pri ukladaní OCR' });
  }
});

/**
 * Vyhodnotí text kávy pomocou OpenAI na základe preferencií používateľa.
 * Loguje odoslaný prompt a odpoveď z OpenAI.
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

    const { corrected_text, structured_metadata, structuredMetadata, coffee_attributes } = req.body;
    if (!corrected_text) return res.status(400).json({ error: 'Chýba text kávy' });
    correctedText = corrected_text;

    const result = await db.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    preferences = result.rows[0];
    // ⬇️ Use the DB completion flag/view to determine if we can safely evaluate.
    const isProfileComplete = Boolean(
      preferences?.is_complete ?? preferences?.taste_profile_completed ?? false
    );

    if (!isProfileComplete) {
      // ⬇️ Short-circuit with the strict JSON schema when profile is incomplete.
      return res.json(PROFILE_MISSING_RESPONSE);
    }

    // Accept structured metadata from the FE (or any upstream source) to ground the explanation.
    const structured = structured_metadata || structuredMetadata || {};
    coffeeAttributes =
      coffee_attributes && typeof coffee_attributes === 'object'
        ? coffee_attributes
        : {
            ocr_text: corrected_text,
            structured_metadata: structured,
          };

    if (!hasMeaningfulCoffeeData(coffeeAttributes)) {
      return res.json(INSUFFICIENT_COFFEE_DATA_RESPONSE);
    }

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
- Vysvetlenie musí byť porovnávacie: zhrň používateľove preferencie, zhrň profil kávy, porovnaj ich.
- Insight musí byť konzistentný s verdictom (bez protichodných tvrdení).

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
{ ... (schema from task stub #2) ... }
`;

    console.log('📤 [OpenAI] Prompt:', userPrompt);
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
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('📥 [OpenAI] Response:', response.data);

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
        buildDeterministicFallbackResponse({
          preferences,
          coffeeAttributes,
          correctedText,
        })
      );
    }

    return res.json(parsed);
  } catch (err) {
    console.error('❌ Chyba AI vyhodnotenia:', err);
    return res.json(
      buildDeterministicFallbackResponse({
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
 * potvrdenie prebehlo úspešne. DB schéma aktuálne neobsahuje
 * dedikované polia na štruktúrované dáta, preto hodnoty iba logujeme.
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

    return res
      .status(200)
      .json({ message: 'Štruktúrované dáta potvrdené', ok: true });
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
      created_at: row.created_at,
      rating: null,
      match_percentage: row.match_score || 0,
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

export default router;
