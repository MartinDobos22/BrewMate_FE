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
// Umožni veľké JSON payloady (kvôli base64 obrázku)
app.use(express.json({ limit: '20mb' }));
app.use(cors());

// Vlož si svoj kľúč do .env súboru alebo priamo sem
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || " ";

// Základný health check
app.get("/", (req, res) => {
  res.send("Google Vision OCR backend beží.");
});
const db = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});
app.get('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const result = await db.query(
        'SELECT id, email, name, coffee_preferences, experience_level, ai_recommendation, manual_input FROM user_profiles WHERE id = $1',
        [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil neexistuje' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Chyba načítania profilu:', err);
    res.status(500).json({ error: 'Nepodarilo sa načítať profil' });
  }
});


app.put('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    console.warn('⚠️ Token chýba v hlavičke');
    return res.status(401).json({ error: 'Token chýba' });
  }

  try {
    console.log('📥 Prijatý PUT /api/profile');
    console.log('🧾 Raw body:', JSON.stringify(req.body, null, 2));

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    console.log('🔐 Overený Firebase UID:', uid);

    const {
      name,
      bio,
      avatar_url,
      coffee_preferences,
      experience_level,
      ai_recommendation,
      manual_input,
    } = req.body;

    console.log('🧩 Extrahované polia:');
    console.log('name:', name);
    console.log('bio:', bio);
    console.log('avatar_url:', avatar_url);
    console.log('experience_level:', experience_level);
    console.log('coffee_preferences:', coffee_preferences);
    console.log('ai_recommendation:', ai_recommendation);
    console.log('manual_input:', manual_input);

    const safe = (val) => typeof val !== 'undefined' ? val : null;

    await db.query(
      `
        UPDATE user_profiles SET
                               name = COALESCE($1, name),
                               bio = COALESCE($2, bio),
                               avatar_url = COALESCE($3, avatar_url),
                               coffee_preferences = $4,
                               experience_level = $5,
                               ai_recommendation = $6,
                               manual_input = $7,
                               updated_at = now()
        WHERE id = $8
      `,
      [
        safe(name),
        safe(bio),
        safe(avatar_url),
        coffee_preferences,
        experience_level,
        ai_recommendation,
        manual_input,
        uid
      ]
    );

    console.log('✅ Úspešne aktualizované v DB');

    const log = `[${new Date().toISOString()}] PROFILE UPDATE: ${uid} (${decoded.email})
--- Preferences ---
${JSON.stringify(coffee_preferences, null, 2)}
--- AI ---
${ai_recommendation}
--- Manual ---
${manual_input}
--- Meta ---
name: ${name}, bio: ${bio}, avatar_url: ${avatar_url}
`;

    fs.appendFileSync(path.join('./logs', 'profile.log'), log);

    res.json({ message: 'Profil aktualizovaný' });
  } catch (err) {
    console.error('❌ Chyba pri update profilu:', err);
    res.status(500).json({ error: 'Chyba servera' });
  }
});



app.post('/api/auth', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ➕ VLOŽ PROFIL DO DB AK NEEXISTUJE
    try {
      await db.query(
          `INSERT INTO user_profiles (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [uid, email]
      );
      console.log('✅ Profil vložený (alebo už existoval)');
    } catch (dbErr) {
      console.warn('⚠️ Nepodarilo sa vložiť profil:', dbErr);
    }

    // Audit log
    const logEntry = `[${timestamp}] LOGIN: ${email} (${uid}) – ${userAgent}\n`;
    fs.appendFileSync(path.join('./logs', 'auth.log'), logEntry);
    console.log('✅ Audit log:', logEntry.trim());

    res.status(200).json({ message: 'Authenticated', uid, email });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});


app.post('/api/logout', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];

  if (!idToken) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // ✅ Zneplatni refresh tokeny pre tohto používateľa
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
    // ✅ Vytvor používateľa cez Admin SDK – NEprihlási ho
    const userRecord = await admin.auth().createUser({ email, password });

    const link = await admin.auth().generateEmailVerificationLink(email);

    // ✉️ Pošli verifikačný email – použiješ rovnaký nodemailer ako doteraz
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

    // Pošli email cez nodemailer
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
        <a href="${link}" style="padding:10px 20px; background:#ff6b35; color:white; text-decoration:none; border-radius:5px;">Resetovať heslo</a>
        <p>Ak si o obnovu nežiadal, ignoruj tento email.</p>
      `,
    });

    res.status(200).json({ message: 'Email na obnovu odoslaný' });
  } catch (err) {
    console.error('❌ Reset hesla error:', err);
    res.status(500).json({ error: 'Nepodarilo sa odoslať email na obnovu hesla' });
  }
});

// Hlavný OCR endpoint
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

    // Extrahuj text z odpovede Vision API
    const text = response.data.responses?.[0]?.fullTextAnnotation?.text || "";

    res.json({ text });
  } catch (error) {
    // Pre debug vypíš viac, aj keď API zlyhá
    console.error("OCR server error:", error?.message ?? error);
    if (error?.response?.data) {
      console.error("Google response:", JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({ error: "OCR failed", detail: error?.message ?? error });
  }
});

// OLD ONE
// app.post('/api/ocr/save', async (req, res) => {
//   const idToken = req.headers.authorization?.split(' ')[1];
//   if (!idToken) return res.status(401).json({ error: 'Token chýba' });
//
//   try {
//     const decoded = await admin.auth().verifyIdToken(idToken);
//     const uid = decoded.uid;
//
//     const { original_text, corrected_text } = req.body;
//
//     await db.query(`
//       INSERT INTO ocr_logs (user_id, original_text, corrected_text, created_at)
//       VALUES ($1, $2, $3, now())
//     `, [uid, original_text, corrected_text]);
//
//     res.status(200).json({ message: 'OCR uložené' });
//   } catch (err) {
//     console.error('❌ Chyba pri ukladaní OCR:', err);
//     res.status(500).json({ error: 'Chyba servera pri ukladaní OCR' });
//   }
// });

app.post('/api/ocr/save', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { original_text, corrected_text } = req.body;

    // Získaj preferencie používateľa
    const prefResult = await db.query(
      'SELECT coffee_preferences FROM user_profiles WHERE id = $1',
      [uid]
    );

    const preferences = prefResult.rows[0]?.coffee_preferences;

    // Vypočítaj zhodu (tu môžete pridať AI vyhodnotenie)
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

function calculateMatch(coffeeText, preferences) {
  // Jednoduchý algoritmus na výpočet zhody
  // V reálnej aplikácii by ste použili AI alebo zložitejší algoritmus

  if (!preferences) return 70; // Predvolená hodnota

  let score = 50; // Základné skóre

  // Príklad: kontrola intenzity
  if (preferences.intensity) {
    if (coffeeText.toLowerCase().includes(preferences.intensity.toLowerCase())) {
      score += 20;
    }
  }

  // Kontrola typu praženia
  if (preferences.roast_type) {
    if (coffeeText.toLowerCase().includes(preferences.roast_type.toLowerCase())) {
      score += 15;
    }
  }

  // Kontrola chutí
  if (preferences.flavor_notes && Array.isArray(preferences.flavor_notes)) {
    preferences.flavor_notes.forEach(flavor => {
      if (coffeeText.toLowerCase().includes(flavor.toLowerCase())) {
        score += 10;
      }
    });
  }

  return Math.min(score, 100); // Max 100%
}

app.post('/api/send-verification-email', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Email je povinný' });

  try {
    // 1. Vygeneruj verifikačný link
    const link = await admin.auth().generateEmailVerificationLink(email);

    // 2. Nastav SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3. Obsah e-mailu
    const mailOptions = {
      from: '"BrewMate" <noreply@brewmate.sk>',
      to: email,
      subject: 'Overenie emailu pre BrewMate 🍺',
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
    };

    // 4. Pošli e-mail
    await transporter.sendMail(mailOptions);
    console.log('✅ Verifikačný email odoslaný:', email);

    res.status(200).json({ message: 'Verifikačný email odoslaný' });
  } catch (err) {
    console.error('❌ Chyba pri odosielaní emailu:', err);
    res.status(500).json({ error: 'Zlyhalo odoslanie verifikačného emailu' });
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

    const result = await db.query(
      'SELECT coffee_preferences FROM user_profiles WHERE id = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Používateľ nenájdený' });
    }

    const coffeePreferences = result.rows[0].coffee_preferences;

    const prompt = `
Porovnaj preferencie používateľa s popisom kávy a vyhodnoť, či mu káva bude chutiť. Používateľove preferencie (JSON):
${JSON.stringify(coffeePreferences, null, 2)}

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

    // Získaj profil používateľa
    const profileResult = await db.query(
      'SELECT name, email, coffee_preferences FROM user_profiles WHERE id = $1',
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

    // Získaj odporúčania na základe preferencií
    const recommendations = await generateRecommendations(profile.coffee_preferences);

    // Denný tip
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

// ========== VYMAZAŤ OCR ZÁZNAM ==========
app.delete('/api/ocr/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const recordId = req.params.id;

    // Vymaž záznam iba ak patrí používateľovi
    const result = await db.query(
      'DELETE FROM ocr_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [recordId, uid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Záznam neexistuje alebo nemáte oprávnenie' });
    }

    // Vymaž aj súvisiace hodnotenie ak existuje
    await db.query(
      'DELETE FROM coffee_ratings WHERE coffee_id = $1 AND user_id = $2',
      [recordId, uid]
    );

    console.log(`✅ OCR záznam ${recordId} vymazaný používateľom ${uid}`);
    res.json({ message: 'Záznam vymazaný' });
  } catch (err) {
    console.error('❌ Chyba pri mazaní OCR záznamu:', err);
    res.status(500).json({ error: 'Chyba pri mazaní záznamu' });
  }
});

// ========== HISTÓRIA OCR SKENOVANÍ ==========
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

// ========== HODNOTENIE KÁVY ==========
app.post('/api/coffee/rate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { coffee_id, rating, notes } = req.body;

    // Vlož alebo aktualizuj hodnotenie
    await db.query(`
      INSERT INTO coffee_ratings (user_id, coffee_id, rating, notes, created_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (user_id, coffee_id) 
      DO UPDATE SET 
        rating = $3,
        notes = $4,
        updated_at = now()
    `, [uid, coffee_id, rating, notes]);

    // Aktualizuj hodnotenie v OCR logoch ak existuje
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

// ========== PRIDAŤ/ODOBRAŤ Z OBĽÚBENÝCH ==========
app.post('/api/coffee/favorite/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const coffeeId = req.params.id;

    // Skontroluj či už existuje
    const existing = await db.query(
      'SELECT is_favorite FROM coffee_ratings WHERE user_id = $1 AND coffee_id = $2',
      [uid, coffeeId]
    );

    if (existing.rows.length > 0) {
      // Toggle existujúci záznam
      const newFavorite = !existing.rows[0].is_favorite;
      await db.query(
        'UPDATE coffee_ratings SET is_favorite = $3, updated_at = now() WHERE user_id = $1 AND coffee_id = $2',
        [uid, coffeeId, newFavorite]
      );
      res.json({ is_favorite: newFavorite });
    } else {
      // Vytvor nový záznam
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
function extractCoffeeName(text) {
  if (!text) return 'Neznáma káva';

  // Pokús sa extrahovať názov kávy z textu
  // Hľadaj známe značky alebo vzory
  const brands = ['Lavazza', 'Illy', 'Segafredo', 'Kimbo', 'Pellini', 'Bazzara'];
  for (const brand of brands) {
    if (text.includes(brand)) {
      // Vráť značku + nasledujúce slovo
      const regex = new RegExp(`${brand}\\s+\\w+`, 'i');
      const match = text.match(regex);
      if (match) return match[0];
    }
  }

  // Ak nenájde značku, vráť prvých pár slov
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
  // Základné odporúčania podľa preferencií
  const recommendations = [];

  // Tu môžete pridať logiku na generovanie odporúčaní
  // na základe používateľových preferencií

  // Zatiaľ vrátime statické odporúčania
  const coffees = [
    { name: 'Colombia Geisha', rating: 4.8, match: 95, origin: 'Colombia' },
    { name: 'Ethiopia Yirgacheffe', rating: 4.6, match: 88, origin: 'Ethiopia' },
    { name: 'Brazil Santos', rating: 4.5, match: 82, origin: 'Brazil' },
    { name: 'Guatemala Antigua', rating: 4.7, match: 90, origin: 'Guatemala' },
    { name: 'Kenya AA', rating: 4.9, match: 93, origin: 'Kenya' },
  ];

  // Ak má používateľ preferencie, filtruj podľa nich
  if (preferences) {
    // Tu pridajte logiku filtrovania podľa preferencií
  }

  return coffees.slice(0, 3).map(coffee => ({
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
