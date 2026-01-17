import express from 'express';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { calculateMatch, extractCoffeeName } from '../utils/coffee.js';
import { LOG_DIR } from '../utils/logging.js';
import {
  extractCoffeeAttributesFromText,
  formatCoffeeAttributesSummary,
} from './ocr/coffee-attributes.js';
import { extractStructuredMetadataFromText } from './ocr/structured-metadata.js';

const router = express.Router();

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || ' ';

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
    const { structured_metadata, structured_confidence } =
      await extractStructuredMetadataFromText(text);
    res.json({
      text,
      labels,
      coffeeConfidence,
      isCoffee,
      structured_metadata,
      structured_confidence,
    });
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
  const { method, taste, coffee_attributes: coffeeAttributes } = req.body ?? {};
  if (!method || typeof method !== 'string') {
    return res.status(400).json({ error: 'Chýba metóda prípravy' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ recipe: '' });
  }

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
    const structuredMatchMetadata = {
      origin: normalizedOriginInput ?? structured.origin ?? derivedAttributes.origin,
      roast_level:
        normalizedRoastLevelInput ??
        structured.roast_level ??
        structured.roastLevel ??
        derivedAttributes.roast_level,
      processing: normalizedProcessingInput ?? structured.processing ?? derivedAttributes.processing,
      varietals: normalizedVarietalsInput ?? structured.varietals ?? derivedAttributes.varietals,
    };
    const matchPercentage = isProfileComplete
      ? calculateMatch(corrected_text, preferences, structuredMatchMetadata)
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
      uncertaintyFlags:
        uncertaintyFlags && typeof uncertaintyFlags === 'object' ? uncertaintyFlags : null,
    };
    const hasStructuredPayload = Object.entries(storedStructuredMetadata).some(([key, value]) => {
      if (key === 'confidenceFlags') {
        return value !== null;
      }
      if (key === 'uncertaintyFlags') {
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
      structured_uncertainty:
        storedStructuredMetadata.uncertaintyFlags &&
        typeof storedStructuredMetadata.uncertaintyFlags === 'object'
          ? storedStructuredMetadata.uncertaintyFlags
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
  return res.status(410).json({ error: 'evaluation disabled' });
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

export default router;
