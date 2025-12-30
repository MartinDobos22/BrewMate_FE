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
const PROFILE_MISSING_RESPONSE = {
  status: 'profile_missing',
  verdict: null,
  confidence: null,
  summary:
    'Najprv dokonči kávový chuťový profil, aby sme vedeli vyhodnotiť zhodu.',
  reasons: [],
  what_youll_like: [],
  what_might_bother_you: [],
  tips_to_make_it_better: [],
  recommended_brew_methods: [],
  cta: {
    action: 'complete_taste_profile',
    label: 'Vyplniť chuťový profil',
  },
  disclaimer:
    'Vyhodnotenie bude dostupné po dokončení chuťového dotazníka.',
};

const EVALUATION_RESPONSE_SCHEMA = `JSON schema (strict):
{
  "status": "ok | profile_missing",
  "verdict": "likely_yes | likely_no | uncertain | null",
  "confidence": "number | null",
  "summary": "string",
  "reasons": [
    {
      "signal": "string",
      "user_preference": "string",
      "coffee_attribute": "string",
      "explanation": "string"
    }
  ],
  "what_youll_like": ["string"],
  "what_might_bother_you": ["string"],
  "tips_to_make_it_better": ["string"],
  "recommended_brew_methods": ["string"],
  "cta": {
    "action": "complete_taste_profile | null",
    "label": "string | null"
  },
  "disclaimer": "string"
}

Return JSON only. Do not include markdown fences or extra text.`;

const normalizeOpenAiJson = (value) => {
  if (!value) {
    return value;
  }
  return value.replace(/```json\s*/i, '').replace(/```$/i, '').trim();
};

const isValidEvaluationResponse = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const requiredKeys = [
    'status',
    'verdict',
    'confidence',
    'summary',
    'reasons',
    'what_youll_like',
    'what_might_bother_you',
    'tips_to_make_it_better',
    'recommended_brew_methods',
    'cta',
    'disclaimer',
  ];
  if (!requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return false;
  }

  const {
    status,
    verdict,
    confidence,
    summary,
    reasons,
    what_youll_like,
    what_might_bother_you,
    tips_to_make_it_better,
    recommended_brew_methods,
    cta,
    disclaimer,
  } = value;

  if (status !== 'ok' && status !== 'profile_missing') {
    return false;
  }

  const validVerdicts = ['likely_yes', 'likely_no', 'uncertain'];
  if (verdict !== null && !validVerdicts.includes(verdict)) {
    return false;
  }

  if (confidence !== null && (typeof confidence !== 'number' || Number.isNaN(confidence))) {
    return false;
  }

  if (typeof summary !== 'string') {
    return false;
  }

  if (!Array.isArray(reasons)) {
    return false;
  }

  if (
    !Array.isArray(what_youll_like) ||
    !Array.isArray(what_might_bother_you) ||
    !Array.isArray(tips_to_make_it_better) ||
    !Array.isArray(recommended_brew_methods)
  ) {
    return false;
  }

  if (typeof disclaimer !== 'string') {
    return false;
  }

  if (status === 'ok') {
    if (verdict === null || confidence === null || !cta || cta.action !== null) {
      return false;
    }
  } else {
    if (verdict !== null || confidence !== null || reasons.length !== 0) {
      return false;
    }
  }

  if (!cta || typeof cta !== 'object' || Array.isArray(cta)) {
    return false;
  }

  if (cta.action !== null && cta.action !== 'complete_taste_profile') {
    return false;
  }

  if (cta.label !== null && typeof cta.label !== 'string') {
    return false;
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

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const { corrected_text } = req.body;
    if (!corrected_text) return res.status(400).json({ error: 'Chýba text kávy' });

    const result = await db.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    const preferences = result.rows[0];
    // ⬇️ Use the DB completion flag/view to determine if we can safely evaluate.
    const isProfileComplete = Boolean(
      preferences?.is_complete ?? preferences?.taste_profile_completed ?? false
    );

    if (!isProfileComplete) {
      // ⬇️ Short-circuit with the strict JSON schema when profile is incomplete.
      return res.json(PROFILE_MISSING_RESPONSE);
    }

    const systemPrompt = `Si expert na kávu a chuťové profily.
Nikdy nehádaš preferencie používateľa. Ak profil chýba alebo je neúplný, vraciaš iba status "profile_missing".
Vráť striktne platný JSON podľa schémy, bez markdownu a bez dodatočného textu.
Vysvetlenia musia byť podložené konkrétnymi signálmi z preferencií a z atribútov kávy.`;
    const userPrompt = `Vyhodnoť, či používateľovi bude chutiť naskenovaná káva.

PRAVIDLÁ:
- Ak je user_taste_profile null alebo neúplný, vráť iba "profile_missing" odpoveď v JSON.
- Nehádať chýbajúce preferencie.
- Výstup musí byť striktne podľa schémy.

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
coffee_attributes: {
  "ocr_text": ${JSON.stringify(corrected_text)}
}

${EVALUATION_RESPONSE_SCHEMA}

Ak status="profile_missing":
- verdict a confidence musia byť null
- reasons musí byť prázdne pole
- cta.action musí byť "complete_taste_profile"`;

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
      // ⬇️ On any schema mismatch, return the safe fallback to keep UX consistent.
      return res.json(PROFILE_MISSING_RESPONSE);
    }

    return res.json(parsed);
  } catch (err) {
    console.error('❌ Chyba AI vyhodnotenia:', err);
    // ⬇️ Fallback to the safe profile-missing payload to avoid leaking errors to clients.
    return res.json(PROFILE_MISSING_RESPONSE);
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

    const { ocr_log_id, coffee_name, brand } = req.body;
    if (!ocr_log_id) return res.status(400).json({ error: 'Chýba ID záznamu OCR' });

    await db.query(
      `UPDATE scan_events SET is_recommended = true WHERE id = $1 AND user_id = $2`,
      [ocr_log_id, uid]
    );

    if (coffee_name) {
      await db.query(
        `INSERT INTO user_coffees (user_id, name, brand)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [uid, coffee_name, brand || null]
      );
    }

    res.json({ message: 'Nákup uložený' });
  } catch (err) {
    console.error('❌ Purchase error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní nákupu' });
  }
});

export default router;
