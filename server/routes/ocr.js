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
  hasMeaningfulCoffeeData,
  isMinimumCoffeeData,
} from './ocr/coffee-attributes.js';
import {
  EVALUATION_RESPONSE_JSON_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA,
  INSUFFICIENT_COFFEE_DATA_RESPONSE,
  PROFILE_MISSING_RESPONSE,
  applyLowDataAdjustments,
  applyTasteMappingFallback,
  buildDeterministicFallbackResponse,
  buildLowConfidenceFallbackResponse,
  isValidEvaluationResponse,
  normalizeOpenAiJson,
  resolveCorrectedText,
} from './ocr/evaluation.js';
import { extractStructuredMetadataFromText } from './ocr/structured-metadata.js';
import {
  formatTasteProfileSummary,
  isTasteProfileComplete,
  normalizeTasteProfileForEvaluation,
} from './ocr/taste-profile.js';

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
    const resolvedCorrectedText = resolveCorrectedText({
      corrected_text,
      coffee_attributes,
    });
    if (!resolvedCorrectedText) {
      return res.status(400).json({ error: 'Chýba text kávy' });
    }
    correctedText = resolvedCorrectedText;

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
      Boolean(requestTasteProfile) && !dbPreferences;
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
            ocr_text: correctedText,
            structured_metadata: structured,
          };

    const derivedAttributes = extractCoffeeAttributesFromText(correctedText);
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
- Každé pole verdict_explanation musí mať predpísaný formát:
  - user_preferences_summary je presne jedna veta, začína "Tvoje preferencie:" a stručne zhrnie chuťový profil.
  - coffee_profile_summary obsahuje presne tri vety v pevnom formáte (viď nižšie) a nič iné.
  - comparison_summary začína "Porovnanie s tvojím profilom:" a obsahuje presne tri vety v pevnom formáte (viď nižšie) a nič iné.
- POVINNÝ TROJ-VETNÝ FORMÁT pre coffee_profile_summary aj comparison_summary (vždy presne tri vety, bez ďalších viet):
  1. „Táto káva má tendenciu byť <horkejšia/ovocnejšia/sladšia>, pretože <praženie/spracovanie/odroda>.“
  2. „Tvoje preferencie sú: <nižšia horkosť / vyššia acidita / …>.“
  3. „Keďže <konflikt/súlad>, bude/nebude ti pravdepodobne chutiť.“
- Zakázané sú generické frázy bez dôvodu (napr. „textová zhoda“, „celkové skóre“, „menej vhodnú“).
- Ak sú dostupné roast_level alebo processing alebo odroda, dôvod musí byť explicitne uvedený (napr. „tmavé praženie → horkosť“, „natural → ovocnosť“).
- Použi mapovanie: dark/medium-dark → vyššia horkosť, nižšia acidita; light → vyššia acidita, ovocnejšie tóny; natural → ovocnosť, sladkosť; washed → čistota, vyššia acidita.
- Ak dáta chýbajú, explicitne uveď, že dôvod sa nedá určiť, a čo treba doplniť (napr. roast_level, processing, flavor_notes).
- V 1. vete uveď krátky chuťový profil kávy (sladkosť, acidita, horkosť, telo + 1–2 chuťové tóny), ak sú dáta dostupné.
- Ak nie sú údaje, v 1. vete explicitne uveď „dáta chýbajú“ a navrhni, čo doplniť (roast_level, processing, flavor_notes).
- Ak sú v chuťovom profile dostupné intensity alebo experimentalism, explicitne ich zahrň do user_preferences_summary a comparison_summary.
- Insight musí byť konzistentný s verdictom (bez protichodných tvrdení).
- Použi jediný kontrakt: insight objekt s poliami zo schémy (žiadne top-level zoznamy).

VSTUP:
user_taste_profile: {
  "sweetness": ${preferences.sweetness},
  "acidity": ${preferences.acidity},
  "bitterness": ${preferences.bitterness},
  "body": ${preferences.body},
  "intensity": ${preferences.intensity ?? null},
  "experimentalism": ${preferences.experimentalism ?? null},
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

    const enrichedResponse = applyTasteMappingFallback(parsed, coffeeAttributes);
    return res.json(
      hasMinimumData ? applyLowDataAdjustments(enrichedResponse) : enrichedResponse
    );
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

export { isValidEvaluationResponse, resolveCorrectedText, formatTasteProfileSummary };
export default router;
