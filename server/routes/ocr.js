import express from 'express';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { LOG_DIR } from '../utils/logging.js';

const router = express.Router();

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || ' ';

/**
 * Vypočíta percentuálnu zhodu medzi opisom kávy a preferenciami používateľa.
 * @param {string} coffeeText - Textový opis kávy.
 * @param {object} preferences - Preferencie používateľa z databázy.
 * @returns {number} Hodnota zhody v percentách.
 */
const calculateMatch = (coffeeText, preferences) => {
  if (!preferences) return 70;

  let score = 50;
  const lower = (coffeeText || '').toLowerCase();

  if (preferences.preferred_strength) {
    if (lower.includes(preferences.preferred_strength.toLowerCase())) {
      score += 10;
    }
  }

  const flavorList = Array.isArray(preferences.flavor_notes)
    ? preferences.flavor_notes
    : Object.keys(preferences.flavor_notes || {});

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
const extractCoffeeName = (text) => {
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

    const { original_text, corrected_text } = req.body;

    const prefResult = await db.query(
      `SELECT * FROM user_taste_profiles WHERE user_id = $1`,
      [uid]
    );

    const preferences = prefResult.rows[0];
    const matchPercentage = calculateMatch(corrected_text, preferences);
    const isRecommended = matchPercentage > 75;
    const coffeeName = extractCoffeeName(corrected_text || original_text);

    const result = await db.query(
      `INSERT INTO scan_events (user_id, coffee_name, brand, barcode, image_url, match_score, is_recommended, detected_at, created_at)
       VALUES ($1, $2, NULL, NULL, NULL, $3, $4, now(), now())
       RETURNING id`,
      [uid, coffeeName, matchPercentage, isRecommended]
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
      `SELECT * FROM user_taste_profiles WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Používateľ nemá nastavené preferencie' });
    }

    const preferences = result.rows[0];

    const prompt = `
Porovnaj preferencie používateľa s popisom kávy a vyhodnoť, či mu káva bude chutiť.
Používateľove preferencie:
- Sladkosť: ${preferences.sweetness}
- Kyslosť: ${preferences.acidity}
- Horkosť: ${preferences.bitterness}
- Telo: ${preferences.body}
- Chuťové poznámky: ${Array.isArray(preferences.flavor_notes) ? preferences.flavor_notes.join(', ') : ''}
- Mliečne preferencie: ${JSON.stringify(preferences.milk_preferences || {})}
- Sila: ${preferences.preferred_strength}

Popis kávy (OCR výstup):
${corrected_text}

Výsledok napíš ako používateľovi:
- Začni vetou: "Táto káva ti pravdepodobne bude chutiť, pretože..." alebo "Zrejme ti chutiť nebude, lebo..."
- Pridaj stručné zdôvodnenie na základe chuti, praženia, spôsobu prípravy atď.
`;

    console.log('📤 [OpenAI] Prompt:', prompt);
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Si expert na kávu. Porovnávaš preferencie s popisom kávy.',
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
    console.log('📥 [OpenAI] Response:', response.data);

    const recommendation = response.data.choices?.[0]?.message?.content?.trim();
    return res.json({ recommendation });
  } catch (err) {
    console.error('❌ Chyba AI vyhodnotenia:', err);
    return res.status(500).json({ error: 'Nepodarilo sa vyhodnotiť kávu' });
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
      `SELECT id, coffee_name, match_score, is_recommended, created_at
       FROM scan_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [uid, limit]
    );

    const history = result.rows.map((row) => ({
      id: row.id.toString(),
      coffee_name: row.coffee_name,
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
