import express from 'express';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { generateRecommendations } from '../services/recommendations.js';
import { getDailyTip } from '../utils/coffee.js';

const router = express.Router();

// ========== DASHBOARD ENDPOINT ==========

/**
 * Vráti profil, štatistiky a odporúčania pre domovskú obrazovku.
 */
router.get('/api/dashboard', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    // Pre-create app_users záznam, aby sme predišli pádu na FK pri neskorších zápisoch.
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
    const uid = decoded.uid;

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
        email: decoded.email,
      },
      stats,
      recentScans,
      recommendations,
      dailyTip,
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
router.get('/api/preference-history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Pre-create app_users záznam, aby sme predišli FK porušeniam pri neskorších zápisoch.
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

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

export default router;
