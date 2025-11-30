import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import admin from "firebase-admin"
import nodemailer from 'nodemailer';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { Pool } from 'pg';

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json({ limit: '20mb' }));
app.use(cors());

// Global request logger to capture communication from frontend
app.use((req, _res, next) => {
  const base = `➡️  [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`;
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(base, req.body);
  } else {
    console.log(base);
  }
  next();
});

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || " ";

app.get("/", (req, res) => {
  res.send("Google Vision OCR backend beží.");
});

const db = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

// Ensure app_users shadow table is populated for any authenticated request
const ensureAppUser = async (client, decoded) => {
  const uid = decoded.uid;
  const email = decoded.email || decoded.user?.email || null;
  const name =
    decoded.name || decoded.user?.name || (email ? email.split('@')[0] : null);

  await client.query(
    `INSERT INTO app_users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, app_users.name)`,
    [uid, email, name]
  );

  await client.query(
    `INSERT INTO user_statistics (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [uid]
  );
};

const toNumberOrFallback = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

// Wrap default query method to log all interactions with Supabase
const originalQuery = db.query.bind(db);
db.query = async (text, params) => {
  console.log('📤 [Supabase] Query:', text, params);
  const start = Date.now();
  const res = await originalQuery(text, params);
  console.log('📥 [Supabase] Response:', {
    rows: res.rowCount,
    duration: Date.now() - start,
  });
  return res;
};

// Ensure log directory exists
const LOG_DIR = path.join('.', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ========== OPTIMALIZOVANÝ PROFILE ENDPOINT ==========

/**
 * Vráti profil prihláseného používateľa vrátane preferencií a odporúčaní.
 */
app.get('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

    const tasteResult = await db.query(
      `SELECT * FROM user_taste_profiles WHERE user_id = $1`,
      [uid]
    );

    const taste = tasteResult.rows[0];

    const response = {
      id: uid,
      email: decoded.email,
      name: decoded.name || decoded.email?.split('@')[0] || 'Kávoš',
      bio: null,
      avatar_url: null,
      experience_level: null,
      ai_recommendation: null,
      manual_input: null,
      coffee_preferences: taste
        ? {
            sweetness: Number(taste.sweetness),
            acidity: Number(taste.acidity),
            bitterness: Number(taste.bitterness),
            body: Number(taste.body),
            flavor_notes: taste.flavor_notes,
            milk_preferences: taste.milk_preferences,
            caffeine_sensitivity: taste.caffeine_sensitivity,
            preferred_strength: taste.preferred_strength,
          }
        : null,
    };

    fs.appendFileSync(path.join(LOG_DIR, 'profile.log'), `[${new Date().toISOString()}] GET profile ${uid}\n`);
    return res.json(response);
  } catch (err) {
    console.error('❌ Chyba načítania profilu:', err);
    res.status(500).json({ error: 'Nepodarilo sa načítať profil' });
  }
});

app.get('/api/home-stats', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { rows } = await db.query(
      `SELECT
        bh.id,
        bh.recipe_id,
        bh.flavor_notes,
        bh.beans,
        bh.created_at,
        ur.instructions AS recipe_text,
        ur.title AS recipe_taste,
        ur.method AS recipe_method
      FROM brew_history bh
      LEFT JOIN user_recipes ur ON ur.id = bh.recipe_id
      WHERE bh.user_id = $1
        AND bh.created_at >= $2::timestamptz
      ORDER BY bh.created_at DESC`,
      [uid, since.toISOString()]
    );

    const normalizeNoteName = (raw) => {
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      if (raw && typeof raw === 'object') {
        const candidate = raw.note || raw.name || raw.label;
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }

      return null;
    };

    const deriveRecipeDisplayName = (row) => {
      const fromRecipe =
        typeof row.recipe_text === 'string' ? row.recipe_text.trim() : '';
      if (fromRecipe.length > 0) {
        return fromRecipe.split('\n')[0].trim();
      }

      const fromTaste =
        typeof row.recipe_taste === 'string' ? row.recipe_taste.trim() : '';
      if (fromTaste.length > 0) {
        return fromTaste;
      }

      const fromMethod =
        typeof row.recipe_method === 'string' ? row.recipe_method.trim() : '';
      if (fromMethod.length > 0) {
        return fromMethod;
      }

      if (row.beans && typeof row.beans === 'object') {
        const beanInfo = row.beans;
        const beanCandidate =
          (typeof beanInfo.name === 'string' && beanInfo.name) ||
          (typeof beanInfo.label === 'string' && beanInfo.label) ||
          (typeof beanInfo.title === 'string' && beanInfo.title) ||
          null;
        if (beanCandidate && beanCandidate.trim().length > 0) {
          return beanCandidate.trim();
        }
      }

      return null;
    };

    const incrementMap = (map, key, amount = 1) => {
      const current = map.get(key) ?? 0;
      map.set(key, current + amount);
    };

    const recipeUsage = new Map();
    const tastingNoteTotals = new Map();

    rows.forEach((row) => {
      const recipeId = row.recipe_id ? String(row.recipe_id) : null;
      const displayName = deriveRecipeDisplayName(row);
      const key = recipeId || (displayName ? `beans:${displayName}` : null);

      if (key) {
        const current = recipeUsage.get(key) ?? {
          id: recipeId || key,
          name: displayName || 'Neznámy recept',
          count: 0,
        };
        current.count += 1;
        if (recipeId) {
          current.id = recipeId;
        }
        if (displayName) {
          current.name = displayName;
        }
        recipeUsage.set(key, current);
      }

      const notes = row.flavor_notes;

      if (Array.isArray(notes)) {
        notes.forEach((item) => {
          const name = normalizeNoteName(item);
          if (!name) {
            return;
          }

          let weight = 1;
          if (item && typeof item === 'object') {
            if (typeof item.count === 'number') {
              weight = item.count;
            } else if (typeof item.value === 'number') {
              weight = item.value;
            }
          }

          incrementMap(tastingNoteTotals, name, weight);
        });
        return;
      }

      if (notes && typeof notes === 'object') {
        Object.entries(notes).forEach(([nameCandidate, value]) => {
          const name = normalizeNoteName(nameCandidate);
          if (!name) {
            return;
          }

          const weight = typeof value === 'number' ? value : 1;
          incrementMap(tastingNoteTotals, name, weight);
        });
        return;
      }

      if (typeof notes === 'string' && notes.trim().length > 0) {
        notes.split(/[;,]/).forEach((chunk) => {
          const name = normalizeNoteName(chunk);
          if (name) {
            incrementMap(tastingNoteTotals, name);
          }
        });
      }
    });

    let topRecipe = null;
    recipeUsage.forEach((value) => {
      if (!topRecipe || value.count > topRecipe.count) {
        topRecipe = value;
      }
    });

    const serializedTopRecipe = topRecipe
      ? {
          id: topRecipe.id,
          name: topRecipe.name,
          brewCount: topRecipe.count,
        }
      : null;

    const topTastingNotes = Array.from(tastingNoteTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([note, occurrences]) => ({
        note,
        occurrences: Math.max(1, Math.round(occurrences)),
      }));

    return res.json({
      monthlyBrewCount: rows.length,
      topRecipe: serializedTopRecipe,
      topTastingNotes,
    });
  } catch (error) {
    console.error('❌ Home stats error:', error);
    return res
      .status(500)
      .json({ error: 'Nepodarilo sa načítať domovské štatistiky' });
  }
});

// ========== OPTIMALIZOVANÝ UPDATE PROFILE ENDPOINT ==========
/**
 * Aktualizuje profil používateľa a jeho preferencie kávy.
 */
app.put('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(client, decoded);

    const {
      coffee_preferences,
      sweetness,
      acidity,
      bitterness,
      body,
      flavor_notes,
      milk_preferences,
      caffeine_sensitivity,
      preferred_strength,
      preference_confidence,
    } = req.body;

    const prefs = coffee_preferences || {};
    const flavorNotes = flavor_notes ?? prefs.flavor_notes ?? {};
    const milkPrefs = milk_preferences ?? prefs.milk_preferences ?? {};

    await client.query(
      `INSERT INTO user_taste_profiles (
        user_id,
        sweetness,
        acidity,
        bitterness,
        body,
        flavor_notes,
        milk_preferences,
        caffeine_sensitivity,
        preferred_strength,
        seasonal_adjustments,
        preference_confidence,
        last_recalculated_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'medium'),COALESCE($9,'balanced'),'[]',$10,now(),now())
      ON CONFLICT (user_id) DO UPDATE SET
        sweetness = EXCLUDED.sweetness,
        acidity = EXCLUDED.acidity,
        bitterness = EXCLUDED.bitterness,
        body = EXCLUDED.body,
        flavor_notes = EXCLUDED.flavor_notes,
        milk_preferences = EXCLUDED.milk_preferences,
        caffeine_sensitivity = EXCLUDED.caffeine_sensitivity,
        preferred_strength = EXCLUDED.preferred_strength,
        preference_confidence = EXCLUDED.preference_confidence,
        last_recalculated_at = now(),
        updated_at = now()`
      , [
        uid,
        toNumberOrFallback(sweetness ?? prefs.sweetness, 5),
        toNumberOrFallback(acidity ?? prefs.acidity, 5),
        toNumberOrFallback(bitterness ?? prefs.bitterness, 5),
        toNumberOrFallback(body ?? prefs.body, 5),
        flavorNotes,
        milkPrefs,
        caffeine_sensitivity ?? prefs.caffeine_sensitivity,
        preferred_strength ?? prefs.preferred_strength,
        toNumberOrFallback(
          preference_confidence ?? prefs.preference_confidence,
          0.35
        ),
      ]
    );

    await client.query('COMMIT');

    const log = `[${new Date().toISOString()}] PROFILE UPDATE: ${uid} (${decoded.email})\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'profile.log'), log);

    res.json({ message: 'Profil aktualizovaný' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Chyba pri update profilu:', err);
    res.status(500).json({ error: 'Chyba servera' });
  } finally {
    client.release();
  }
});

// ========== AUTH ENDPOINT ==========

/**
 * Overí platnosť Firebase ID tokenu a zaloguje prihlásenie používateľa.
 */
app.post('/api/auth', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  const provider = req.headers['x-auth-provider'];

  if (!idToken || !provider) {
    return res.status(400).json({ error: 'Token alebo provider chýba' });
  }

  const providerMap = {
    google: 'google.com',
    email: 'password',
    apple: 'apple.com',
  };

  if (!providerMap[provider]) {
    return res.status(400).json({ error: 'Neznámy provider' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.firebase?.sign_in_provider !== providerMap[provider]) {
      return res.status(401).json({ error: 'Neplatný token pre daného poskytovateľa' });
    }
    const uid = decoded.uid;
    const email = decoded.email;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';

    await ensureAppUser(db, decoded);

    const logEntry = `[${timestamp}] LOGIN ${provider}: ${email} (${uid}) — ${userAgent}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'auth.log'), logEntry);
    console.log('✅ Audit log:', logEntry.trim());

    res.status(200).json({ message: 'Authenticated', uid, email, provider });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ========== OCR ENDPOINTS ==========

/**
 * Spracuje obrázok a pošle ho do Google Vision API na OCR.
 * Loguje dĺžku vstupného obrázka a odpoveď z Vision API.
 */
app.post("/ocr", async (req, res) => {
  try {
    const { base64image } = req.body;
    if (!base64image) {
      return res.status(400).json({ error: "Chýba obrázok v base64." });
    }

    const payload = {
      requests: [
        {
          image: { content: base64image },
          features: [{ type: "TEXT_DETECTION" }]
        }
      ]
    };
    console.log('📤 [Vision] Payload size:', base64image.length);

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });
    console.log('📥 [Vision] Response:', response.data);

    const text = response.data.responses?.[0]?.fullTextAnnotation?.text || "";
    res.json({ text });
  } catch (error) {
    console.error("OCR server error:", error?.message ?? error);
    res.status(500).json({ error: "OCR failed", detail: error?.message ?? error });
  }
});

/**
 * Uloží výsledok OCR do databázy a vypočíta zhodu s preferenciami používateľa.
 */
app.post('/api/ocr/save', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

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
app.post('/api/ocr/evaluate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

    const { corrected_text } = req.body;
    if (!corrected_text) return res.status(400).json({ error: 'Chýba text kávy' });

    const result = await db.query(
      `SELECT * FROM user_taste_profiles WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Používateľ nemá nastavené preferencie' });
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
          { role: 'system', content: 'Si expert na kávu. Porovnávaš preferencie s popisom kávy.' },
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

// ========== DASHBOARD ENDPOINT ==========

/**
 * Vráti profil, štatistiky a odporúčania pre domovskú obrazovku.
 */
app.get('/api/dashboard', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

    const tasteResult = await db.query(
      'SELECT * FROM user_taste_profiles WHERE user_id = $1',
      [uid]
    );
    const taste = tasteResult.rows[0];

    const statsResult = await db.query(
      'SELECT brew_count, recipe_count, scan_count, coffee_count, updated_at FROM user_statistics WHERE user_id = $1',
      [uid]
    );
    const statsRow = statsResult.rows[0] || {};
    const stats = {
      coffeeCount: parseInt(statsRow.coffee_count || 0),
      avgRating: '0.0',
      favoritesCount: parseInt(statsRow.scan_count || 0),
    };

    const scansResult = await db.query(
      `SELECT id, coffee_name, match_score, is_recommended, created_at
       FROM scan_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [uid]
    );

    const recentScans = scansResult.rows.map((row) => ({
      id: row.id.toString(),
      name: row.coffee_name || 'Neznáma káva',
      rating: null,
      match: row.match_score ? parseFloat(row.match_score) : 0,
      timestamp: row.created_at,
      isRecommended: row.is_recommended || (row.match_score ?? 0) > 75,
    }));

    const recommendations = await generateRecommendations(taste);
    const dailyTip = getDailyTip();

    res.json({
      profile: {
        name: decoded.name || decoded.email?.split('@')[0] || 'Kávoš',
        email: decoded.email
      },
      stats,
      recentScans,
      recommendations,
      dailyTip
    });

  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní dashboard' });
  }
});

// ========== HISTORY ENDPOINT ==========

/**
 * Vráti históriu AI odporúčaní pre aktuálneho používateľa.
 */
app.get('/api/preference-history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const result = await db.query(
      `SELECT user_id, sweetness, acidity, bitterness, body, flavor_notes, milk_preferences, caffeine_sensitivity, preferred_strength, updated_at
       FROM user_taste_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [uid]
    );

    res.json(
      result.rows.map((row) => ({
        id: row.user_id,
        ai_recommendation: null,
        user_notes: null,
        version: 1,
        is_current: true,
        created_at: row.updated_at,
      }))
    );
  } catch (err) {
    console.error('❌ History error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní histórie' });
  }
});

// ========== OSTATNÉ ENDPOINTY (NEZMENENÉ) ==========

/**
 * Zneplatní refresh tokeny používateľa a tým ho odhlási.
 */
app.post('/api/logout', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);
    await admin.auth().revokeRefreshTokens(uid);
    console.log('✅ Refresh tokeny zneplatnené pre UID:', uid);
    res.status(200).json({ message: 'Odhlásenie úspešné' });
  } catch (err) {
    console.error('❌ Chyba pri logout-e:', err);
    res.status(401).json({ error: 'Neplatný token' });
  }
});

/**
 * Zaregistruje nového používateľa a odošle mu overovací email.
 */
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const link = await admin.auth().generateEmailVerificationLink(email);

    // Persist shadow user so DB tables with FK to app_users work even with Firebase Auth
    await db.query(
      `INSERT INTO app_users (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name`,
      [userRecord.uid, userRecord.email, userRecord.displayName || null]
    );

    await db.query(
      `INSERT INTO user_statistics (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userRecord.uid]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"BrewMate" <noreply@brewmate.sk>',
      to: email,
      subject: 'Overenie účtu',
      html: `
        <h2>Vitaj v BrewMate!</h2>
        <p>Klikni na odkaz nižšie a over svoju emailovú adresu:</p>
        <a href="${link}">Overiť email</a>
        <p>Po overení sa môžeš prihlásiť.</p>
      `,
    });

    console.log('✅ Používateľ vytvorený a email odoslaný:', email);
    res.status(200).json({ message: 'Používateľ vytvorený a email odoslaný' });
  } catch (err) {
    console.error('❌ Chyba pri registrácii:', err);
    res.status(500).json({ error: 'Zlyhala registrácia' });
  }
});

/**
 * Odošle email s odkazom na reset hesla pre zadanú adresu.
 */
app.post('/api/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email je povinný' });

  try {
    const link = await admin.auth().generatePasswordResetLink(email);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"BrewMate" <noreply@brewmate.sk>',
      to: email,
      subject: 'Obnova hesla – BrewMate',
      html: `
        <h2>Obnova hesla</h2>
        <p>Klikni na odkaz nižšie na reset hesla:</p>
        <a href="${link}">Resetovať heslo</a>
        <p>Ak si o obnovu nežiadal, ignoruj tento email.</p>
      `,
    });

    res.status(200).json({ message: 'Email na obnovu odoslaný' });
  } catch (err) {
    console.error('❌ Reset hesla error:', err);
    res.status(500).json({ error: 'Nepodarilo sa odoslať email' });
  }
});

/**
 * Znovu odošle verifikačný email na potvrdenie adresy.
 */
app.post('/api/send-verification-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email je povinný' });

  try {
    const link = await admin.auth().generateEmailVerificationLink(email);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"BrewMate" <noreply@brewmate.sk>',
      to: email,
      subject: 'Overenie emailu pre BrewMate ☕',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Vitaj v BrewMate!</h2>
          <p>Pre overenie tvojej emailovej adresy klikni na nasledujúci odkaz:</p>
          <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #ff6b35; color: white; text-decoration: none; border-radius: 5px;">
            Overiť email
          </a>
          <p>Ak si tento účet nevytvoril ty, tento email ignoruj.</p>
        </div>
      `,
    });

    console.log('✅ Verifikačný email odoslaný:', email);
    res.status(200).json({ message: 'Verifikačný email odoslaný' });
  } catch (err) {
    console.error('❌ Chyba pri odosielaní emailu:', err);
    res.status(500).json({ error: 'Zlyhalo odoslanie emailu' });
  }
});

/**
 * Vymaže konkrétny OCR záznam a prípadné hodnotenia.
 */
app.delete('/api/ocr/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUser(db, decoded);
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
app.get('/api/ocr/history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);
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
app.post('/api/ocr/purchase', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

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

/**
 * Uloží hodnotenie a poznámky k danej káve.
 */
app.post('/api/coffee/rate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUser(db, decoded);

    const { coffee_id, rating, name, brand } = req.body;

    await db.query(
      `INSERT INTO user_coffees (id, user_id, name, brand, rating, added_at)
       VALUES ($1, $2, COALESCE($3,'Neznáma káva'), $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, name = EXCLUDED.name, brand = EXCLUDED.brand`,
      [coffee_id, uid, name, brand || null, rating]
    );

    res.json({ message: 'Hodnotenie uložené' });
  } catch (err) {
    console.error('❌ Rating error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní hodnotenia' });
  }
});

/**
 * Prepne stav obľúbenosti konkrétnej kávy.
 */
app.post('/api/coffee/favorite/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUser(db, decoded);
    const coffeeId = req.params.id;

    const existing = await db.query(
      'SELECT is_favorite FROM user_coffees WHERE user_id = $1 AND id = $2',
      [uid, coffeeId]
    );

    if (existing.rows.length > 0) {
      const newFavorite = !existing.rows[0].is_favorite;
      await db.query(
        'UPDATE user_coffees SET is_favorite = $3 WHERE user_id = $1 AND id = $2',
        [uid, coffeeId, newFavorite]
      );
      res.json({ is_favorite: newFavorite });
    } else {
      await db.query(
        'INSERT INTO user_coffees (id, user_id, name, is_favorite) VALUES ($1, $2, $3, true)',
        [coffeeId, uid, 'Neznáma káva']
      );
      res.json({ is_favorite: true });
    }
  } catch (err) {
    console.error('❌ Favorite error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní obľúbenej kávy' });
  }
});

/**
 * Vráti zoznam všetkých káv uložených v databáze.
 */
app.get('/api/coffees', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

    await ensureAppUser(db, decoded);

    const result = await db.query(
      `SELECT id, name, brand, origin, roast_level, flavor_notes, rating, is_favorite, added_at
       FROM user_coffees
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [decoded.uid]
    );

    const coffees = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      brand: row.brand,
      origin: row.origin,
      roast_level: row.roast_level,
      intensity: null,
      flavor_notes: row.flavor_notes,
      rating: row.rating ? parseFloat(row.rating) : null,
      is_favorite: row.is_favorite,
      added_at: row.added_at,
    }));

    res.json(coffees);
  } catch (err) {
    console.error('❌ Coffees fetch error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní káv' });
  }
});

/**
 * Uloží vygenerovaný recept.
 */
app.post('/api/recipes', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUser(db, decoded);
    const { method, taste, recipe, title } = req.body;
    const result = await db.query(
      `INSERT INTO user_recipes (user_id, title, method, instructions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now()) RETURNING id`,
      [uid, title || taste || method || 'Recept', method, recipe]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('❌ Recipe save error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní receptu' });
  }
});

/**
 * Vráti históriu receptov používateľa.
 */
app.get('/api/recipes/history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  const limit = parseInt(req.query.limit) || 10;
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUser(db, decoded);
    const result = await db.query(
      'SELECT id, title, method, instructions, created_at FROM user_recipes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [uid, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Recipe history error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní histórie receptov' });
  }
});

// ========== HELPER FUNKCIE ==========

/**
 * Vypočíta percentuálnu zhodu medzi opisom kávy a preferenciami používateľa.
 * @param {string} coffeeText - Textový opis kávy.
 * @param {object} preferences - Preferencie používateľa z databázy.
 * @returns {number} Hodnota zhody v percentách.
 */
function calculateMatch(coffeeText, preferences) {
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
}

/**
 * Extrahuje názov kávy z dodaného textu.
 * @param {string} text - Text z ktorého chceme získať názov.
 * @returns {string} Zistený názov kávy alebo generický text.
 */
function extractCoffeeName(text) {
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
}

/**
 * Vráti denný tip na prípravu kávy.
 * @returns {string} Krátky tip na daný deň.
 */
function getDailyTip() {
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
}

/**
 * Generuje zoznam odporúčaných káv na základe preferencií používateľa.
 * @param {object} preferences - Preferencie používateľa.
 * @returns {Promise<Array>} Zoznam odporúčaní.
 */
async function generateRecommendations(preferences) {
  const recommendations = [];

  const coffees = [
    { name: 'Colombia Geisha', rating: 4.8, match: 95, origin: 'Colombia' },
    { name: 'Ethiopia Yirgacheffe', rating: 4.6, match: 88, origin: 'Ethiopia' },
    { name: 'Brazil Santos', rating: 4.5, match: 82, origin: 'Brazil' },
    { name: 'Guatemala Antigua', rating: 4.7, match: 90, origin: 'Guatemala' },
    { name: 'Kenya AA', rating: 4.9, match: 93, origin: 'Kenya' },
  ];

  // Filtruj podľa preferencií ak existujú
  let filtered = coffees;
  if (preferences) {
    // Tu môžete pridať logiku filtrovania
  }

  return filtered.slice(0, 3).map(coffee => ({
    id: Math.random().toString(),
    name: coffee.name,
    rating: coffee.rating,
    match: coffee.match,
    timestamp: new Date(),
    isRecommended: true
  }));
}

app.listen(PORT, () => {
  console.log(`OCR server beží na porte ${PORT}`);
});