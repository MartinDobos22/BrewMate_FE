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

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || " ";

app.get("/", (req, res) => {
  res.send("Google Vision OCR backend beží.");
});

const db = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

// Ensure log directory exists
const LOG_DIR = path.join('.', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ========== OPTIMALIZOVANÝ PROFILE ENDPOINT ==========
app.get('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Použitie pohľadu pre získanie kompletného profilu
    const result = await db.query(
      `SELECT 
        id, 
        email, 
        name, 
        bio,
        avatar_url,
        experience_level,
        intensity,
        roast,
        temperature,
        milk,
        sugar,
        preferred_drinks,
        flavor_notes,
        ai_recommendation,
        user_notes as manual_input,
        recommendation_version,
        recommendation_updated_at
      FROM user_complete_profile 
      WHERE id = $1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil neexistuje' });
    }

    const profile = result.rows[0];

    // Transformuj do starého formátu pre kompatibilitu s frontend
    const response = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      experience_level: profile.experience_level,
      ai_recommendation: profile.ai_recommendation,
      manual_input: profile.manual_input,
      coffee_preferences: profile.experience_level ? {
        intensity: profile.intensity,
        roast: profile.roast,
        temperature: profile.temperature,
        milk: profile.milk,
        sugar: profile.sugar,
        preferred_drinks: profile.preferred_drinks,
        flavor_notes: profile.flavor_notes
      } : null
    };

    fs.appendFileSync(path.join(LOG_DIR, 'profile.log'), `[${new Date().toISOString()}] GET profile ${uid}\n`);
    return res.json(response);
  } catch (err) {
    console.error('❌ Chyba načítania profilu:', err);
    res.status(500).json({ error: 'Nepodarilo sa načítať profil' });
  }
});

// ========== OPTIMALIZOVANÝ UPDATE PROFILE ENDPOINT ==========
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

    const {
      name,
      bio,
      avatar_url,
      coffee_preferences,
      experience_level,
      ai_recommendation,
      manual_input,
    } = req.body;

    // 1. Aktualizuj základný profil
    if (name !== undefined || bio !== undefined || avatar_url !== undefined) {
      await client.query(
        `UPDATE user_profiles SET
          name = COALESCE($1, name),
          bio = COALESCE($2, bio),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = now()
        WHERE id = $4`,
        [name, bio, avatar_url, uid]
      );
    }

    // 2. Aktualizuj kávové preferencie
    if (coffee_preferences || experience_level) {
      const prefs = coffee_preferences || {};

      await client.query(
        `INSERT INTO user_coffee_preferences (
          user_id, experience_level, intensity, roast, temperature, 
          milk, sugar, preferred_drinks, flavor_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          experience_level = COALESCE($2, user_coffee_preferences.experience_level),
          intensity = COALESCE($3, user_coffee_preferences.intensity),
          roast = COALESCE($4, user_coffee_preferences.roast),
          temperature = COALESCE($5, user_coffee_preferences.temperature),
          milk = COALESCE($6, user_coffee_preferences.milk),
          sugar = COALESCE($7, user_coffee_preferences.sugar),
          preferred_drinks = COALESCE($8, user_coffee_preferences.preferred_drinks),
          flavor_notes = COALESCE($9, user_coffee_preferences.flavor_notes),
          updated_at = now()`,
        [
          uid,
          experience_level,
          prefs.intensity,
          prefs.roast,
          prefs.temperature,
          prefs.milk,
          prefs.sugar,
          prefs.preferred_drinks,
          prefs.flavor_notes
        ]
      );
    }

    // 3. Aktualizuj AI odporúčanie (vytvor novú verziu)
    if (ai_recommendation !== undefined) {
      // Deaktivuj staré odporúčania
      await client.query(
        `UPDATE preference_updates SET is_current = false 
         WHERE user_id = $1 AND is_current = true`,
        [uid]
      );

      // Získaj najvyššiu verziu
      const versionResult = await client.query(
        `SELECT COALESCE(MAX(version), 0) as max_version 
         FROM preference_updates WHERE user_id = $1`,
        [uid]
      );

      const nextVersion = versionResult.rows[0].max_version + 1;

      // Vlož nové odporúčanie
      await client.query(
        `INSERT INTO preference_updates (
          user_id, ai_recommendation, user_notes, version, is_current
        ) VALUES ($1, $2, $3, $4, true)`,
        [uid, ai_recommendation, manual_input, nextVersion]
      );
    }

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
app.post('/api/auth', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Vlož profil do DB ak neexistuje
    try {
      await db.query(
        `INSERT INTO user_profiles (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [uid, email]
      );
      console.log('✅ Profil vložený (alebo už existoval)');
    } catch (dbErr) {
      console.warn('⚠️ Nepodarilo sa vložiť profil:', dbErr);
    }

    const logEntry = `[${timestamp}] LOGIN: ${email} (${uid}) — ${userAgent}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'auth.log'), logEntry);
    console.log('✅ Audit log:', logEntry.trim());

    res.status(200).json({ message: 'Authenticated', uid, email });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ========== OCR ENDPOINTS ==========
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

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const text = response.data.responses?.[0]?.fullTextAnnotation?.text || "";
    res.json({ text });
  } catch (error) {
    console.error("OCR server error:", error?.message ?? error);
    res.status(500).json({ error: "OCR failed", detail: error?.message ?? error });
  }
});

app.post('/api/ocr/save', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { original_text, corrected_text } = req.body;

    // Získaj preferencie používateľa z novej štruktúry
    const prefResult = await db.query(
      `SELECT * FROM user_coffee_preferences WHERE user_id = $1`,
      [uid]
    );

    const preferences = prefResult.rows[0];
    const matchPercentage = calculateMatch(corrected_text, preferences);
    const isRecommended = matchPercentage > 75;

    const result = await db.query(`
      INSERT INTO ocr_logs (user_id, original_text, corrected_text, match_percentage, is_recommended, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING id
    `, [uid, original_text, corrected_text, matchPercentage, isRecommended]);

    res.status(200).json({
      message: 'OCR uložené',
      id: result.rows[0].id,
      match_percentage: matchPercentage,
      is_recommended: isRecommended
    });
  } catch (err) {
    console.error('❌ Chyba pri ukladaní OCR:', err);
    res.status(500).json({ error: 'Chyba servera pri ukladaní OCR' });
  }
});

app.post('/api/ocr/evaluate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { corrected_text } = req.body;
    if (!corrected_text) return res.status(400).json({ error: 'Chýba text kávy' });

    // Získaj preferencie z novej štruktúry
    const result = await db.query(
      `SELECT * FROM user_coffee_preferences WHERE user_id = $1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Používateľ nemá nastavené preferencie' });
    }

    const preferences = result.rows[0];

    const prompt = `
Porovnaj preferencie používateľa s popisom kávy a vyhodnoť, či mu káva bude chutiť.
Používateľove preferencie:
- Intenzita: ${preferences.intensity}
- Praženie: ${preferences.roast}
- Teplota: ${preferences.temperature}
- Mlieko: ${preferences.milk ? 'áno' : 'nie'}
- Cukor: ${preferences.sugar ? 'áno' : 'nie'}
- Obľúbené nápoje: ${preferences.preferred_drinks?.join(', ')}
- Preferované chute: ${preferences.flavor_notes?.join(', ')}

Popis kávy (OCR výstup):
${corrected_text}

Výsledok napíš ako používateľovi:
- Začni vetou: "Táto káva ti pravdepodobne bude chutiť, pretože..." alebo "Zrejme ti chutiť nebude, lebo..."
- Pridaj stručné zdôvodnenie na základe chuti, praženia, spôsobu prípravy atď.
`;

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

    const recommendation = response.data.choices?.[0]?.message?.content?.trim();
    return res.json({ recommendation });
  } catch (err) {
    console.error('❌ Chyba AI vyhodnotenia:', err);
    return res.status(500).json({ error: 'Nepodarilo sa vyhodnotiť kávu' });
  }
});

// ========== DASHBOARD ENDPOINT ==========
app.get('/api/dashboard', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Získaj profil používateľa z pohľadu
    const profileResult = await db.query(
      'SELECT name, email FROM user_profiles WHERE id = $1',
      [uid]
    );

    const profile = profileResult.rows[0] || {};

    // Získaj štatistiky
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as coffee_count,
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(DISTINCT coffee_id) FILTER (WHERE is_favorite = true) as favorites_count
      FROM coffee_ratings
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [uid]);

    const stats = {
      coffeeCount: parseInt(statsResult.rows[0]?.coffee_count || 0),
      avgRating: parseFloat(statsResult.rows[0]?.avg_rating || 0).toFixed(1),
      favoritesCount: parseInt(statsResult.rows[0]?.favorites_count || 0)
    };

    // Získaj históriu skenovaní (posledných 5)
    const scansResult = await db.query(`
      SELECT 
        id,
        corrected_text as coffee_name,
        COALESCE(rating, 4.0) as rating,
        COALESCE(match_percentage, 70) as match,
        created_at as timestamp,
        is_recommended
      FROM ocr_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [uid]);

    const recentScans = scansResult.rows.map(row => ({
      id: row.id.toString(),
      name: extractCoffeeName(row.coffee_name) || 'Neznáma káva',
      rating: parseFloat(row.rating),
      match: parseInt(row.match),
      timestamp: row.timestamp,
      isRecommended: row.is_recommended || row.match > 75
    }));

    // Získaj preferencie pre generovanie odporúčaní
    const prefResult = await db.query(
      'SELECT * FROM user_coffee_preferences WHERE user_id = $1',
      [uid]
    );

    const recommendations = await generateRecommendations(prefResult.rows[0]);
    const dailyTip = getDailyTip();

    res.json({
      profile: {
        name: profile.name || profile.email?.split('@')[0] || 'Kávoš',
        email: profile.email
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
app.get('/api/preference-history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const result = await db.query(`
      SELECT 
        id,
        ai_recommendation,
        user_notes,
        version,
        is_current,
        created_at
      FROM preference_updates
      WHERE user_id = $1
      ORDER BY version DESC
      LIMIT 10
    `, [uid]);

    res.json(result.rows);
  } catch (err) {
    console.error('❌ History error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní histórie' });
  }
});

// ========== OSTATNÉ ENDPOINTY (NEZMENENÉ) ==========
app.post('/api/logout', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await admin.auth().revokeRefreshTokens(uid);
    console.log('✅ Refresh tokeny zneplatnené pre UID:', uid);
    res.status(200).json({ message: 'Odhlásenie úspešné' });
  } catch (err) {
    console.error('❌ Chyba pri logout-e:', err);
    res.status(401).json({ error: 'Neplatný token' });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
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

app.delete('/api/ocr/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const recordId = req.params.id;

    const result = await db.query(
      'DELETE FROM ocr_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [recordId, uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Záznam neexistuje' });
    }

    await db.query(
      'DELETE FROM coffee_ratings WHERE coffee_id = $1 AND user_id = $2',
      [recordId, uid]
    );

    console.log(`✅ OCR záznam ${recordId} vymazaný`);
    res.json({ message: 'Záznam vymazaný' });
  } catch (err) {
    console.error('❌ Chyba pri mazaní:', err);
    res.status(500).json({ error: 'Chyba pri mazaní' });
  }
});

app.get('/api/ocr/history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(`
      SELECT 
        id,
        original_text,
        corrected_text,
        created_at,
        rating,
        match_percentage,
        is_recommended
      FROM ocr_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [uid, limit]);

    const history = result.rows.map(row => ({
      id: row.id.toString(),
      coffee_name: extractCoffeeName(row.corrected_text),
      original_text: row.original_text,
      corrected_text: row.corrected_text,
      created_at: row.created_at,
      rating: row.rating || 0,
      match_percentage: row.match_percentage || 0,
      is_recommended: row.is_recommended || false
    }));

    res.json(history);
  } catch (err) {
    console.error('❌ History error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní histórie' });
  }
});

app.post('/api/coffee/rate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { coffee_id, rating, notes } = req.body;

    await db.query(`
      INSERT INTO coffee_ratings (user_id, coffee_id, rating, notes, created_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (user_id, coffee_id) 
      DO UPDATE SET 
        rating = $3,
        notes = $4,
        updated_at = now()
    `, [uid, coffee_id, rating, notes]);

    await db.query(`
      UPDATE ocr_logs 
      SET rating = $2 
      WHERE id = $1 AND user_id = $3
    `, [coffee_id, rating, uid]);

    res.json({ message: 'Hodnotenie uložené' });
  } catch (err) {
    console.error('❌ Rating error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní hodnotenia' });
  }
});

app.post('/api/coffee/favorite/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const coffeeId = req.params.id;

    const existing = await db.query(
      'SELECT is_favorite FROM coffee_ratings WHERE user_id = $1 AND coffee_id = $2',
      [uid, coffeeId]
    );

    if (existing.rows.length > 0) {
      const newFavorite = !existing.rows[0].is_favorite;
      await db.query(
        'UPDATE coffee_ratings SET is_favorite = $3, updated_at = now() WHERE user_id = $1 AND coffee_id = $2',
        [uid, coffeeId, newFavorite]
      );
      res.json({ is_favorite: newFavorite });
    } else {
      await db.query(
        'INSERT INTO coffee_ratings (user_id, coffee_id, is_favorite, created_at) VALUES ($1, $2, true, now())',
        [uid, coffeeId]
      );
      res.json({ is_favorite: true });
    }
  } catch (err) {
    console.error('❌ Favorite error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní obľúbenej kávy' });
  }
});

// ========== HELPER FUNKCIE ==========
function calculateMatch(coffeeText, preferences) {
  if (!preferences) return 70;

  let score = 50;

  // Kontrola intenzity
  if (preferences.intensity && coffeeText.toLowerCase().includes(preferences.intensity.toLowerCase())) {
    score += 20;
  }

  // Kontrola typu praženia
  if (preferences.roast && coffeeText.toLowerCase().includes(preferences.roast.toLowerCase())) {
    score += 15;
  }

  // Kontrola chutí
  if (preferences.flavor_notes && Array.isArray(preferences.flavor_notes)) {
    preferences.flavor_notes.forEach(flavor => {
      if (coffeeText.toLowerCase().includes(flavor.toLowerCase())) {
        score += 10;
      }
    });
  }

  return Math.min(score, 100);
}

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