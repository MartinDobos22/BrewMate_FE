import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { LOG_DIR } from '../utils/logging.js';

const router = express.Router();

const normalizeTasteInput = (raw, fallback, fieldName = 'taste') => {
  const clamp = (val) => Math.max(0, Math.min(10, val));
  const mappings = {
    none: 0,
    low: 3,
    little: 3,
    mild: 4,
    medium: 5,
    balanced: 5,
    'medium-high': 7,
    medium_high: 7,
    high: 8,
    strong: 8,
    'very-high': 10,
    very_high: 10,
  };

  const coerce = (value) => {
    if (value === undefined || value === null || value === '') return null;

    if (typeof value === 'number' && Number.isFinite(value)) {
      return clamp(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        return clamp(numeric);
      }

      const mapped = mappings[trimmed.toLowerCase()];
      if (mapped !== undefined) {
        return clamp(mapped);
      }
    }

    return undefined;
  };

  const normalized = coerce(raw);
  if (normalized !== null && normalized !== undefined) {
    return normalized;
  }

  const fallbackNormalized = coerce(fallback);
  if (fallbackNormalized !== null && fallbackNormalized !== undefined) {
    return fallbackNormalized;
  }

  throw new Error(`Neplatná hodnota pre ${fieldName}`);
};

/**
 * Vráti profil prihláseného používateľa vrátane preferencií a odporúčaní.
 */
router.get('/api/profile', async (req, res) => {
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
      ai_recommendation: taste?.ai_recommendation ?? null,
      manual_input: taste?.manual_input ?? null,
      taste_vector: taste?.taste_vector ?? null,
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
            quiz_version: taste.quiz_version ?? null,
            quiz_answers: taste.quiz_answers ?? {},
            consistency_score: taste.consistency_score ?? null,
          }
        : null,
    };

    fs.appendFileSync(
      path.join(LOG_DIR, 'profile.log'),
      `[${new Date().toISOString()}] GET profile ${uid}\n`
    );
    return res.json(response);
  } catch (err) {
    console.error('❌ Chyba načítania profilu:', err);
    res.status(500).json({ error: 'Nepodarilo sa načítať profil' });
  }
});

router.get('/api/home-stats', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

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
router.put('/api/profile', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Token chýba' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client,
      name: decoded.name || decoded.user?.name,
    });

    const {
      coffee_preferences,
      sweetness,
      acidity,
      bitterness,
      body,
      taste_vector,
      ai_recommendation,
      manual_input,
      flavor_notes,
      milk_preferences,
      caffeine_sensitivity,
      preferred_strength,
      preference_confidence,
    } = req.body;

    const prefs = coffee_preferences || {};
    const flavorNotes = flavor_notes ?? prefs.flavor_notes ?? {};
    const milkPrefs = milk_preferences ?? prefs.milk_preferences ?? {};

    const hasExplicitTasteInputs = [sweetness, acidity, bitterness, body].some(
      (value) => value !== undefined && value !== null
    );
    const mappedTasteVector =
      !hasExplicitTasteInputs && taste_vector
        ? {
            sweetness:
              taste_vector.sweetness !== undefined &&
              taste_vector.sweetness !== null
                ? taste_vector.sweetness * 10
                : undefined,
            acidity:
              taste_vector.acidity !== undefined && taste_vector.acidity !== null
                ? taste_vector.acidity * 10
                : undefined,
            bitterness:
              taste_vector.bitterness !== undefined &&
              taste_vector.bitterness !== null
                ? taste_vector.bitterness * 10
                : undefined,
            body:
              taste_vector.body !== undefined && taste_vector.body !== null
                ? taste_vector.body * 10
                : undefined,
          }
        : {};

    let normalizedSweetness;
    let normalizedAcidity;
    let normalizedBitterness;
    let normalizedBody;

    try {
      normalizedSweetness = normalizeTasteInput(
        sweetness ?? mappedTasteVector.sweetness,
        prefs.sweetness ?? 5,
        'sweetness'
      );
      normalizedAcidity = normalizeTasteInput(
        acidity ?? mappedTasteVector.acidity,
        prefs.acidity ?? 5,
        'acidity'
      );
      normalizedBitterness = normalizeTasteInput(
        bitterness ?? mappedTasteVector.bitterness,
        prefs.bitterness ?? 5,
        'bitterness'
      );
      normalizedBody = normalizeTasteInput(
        body ?? mappedTasteVector.body,
        prefs.body ?? 5,
        'body'
      );
    } catch (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError.message });
    }

    // Normalizácia chutí, aby sme pri ukladaní dotazníka nepadali na 22P02
    // (invalid_text_representation) chybách, keď frontend pošle textové štítky
    // ako "little", "medium", "high" namiesto čísiel.
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
        quiz_version,
        quiz_answers,
        taste_vector,
        consistency_score,
        ai_recommendation,
        manual_input,
        last_recalculated_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'medium'),COALESCE($9,'balanced'),'[]',$10,$11,$12,$13,$14,$15,$16,now(),now())
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
        quiz_version = EXCLUDED.quiz_version,
        quiz_answers = EXCLUDED.quiz_answers,
        taste_vector = EXCLUDED.taste_vector,
        consistency_score = EXCLUDED.consistency_score,
        ai_recommendation = EXCLUDED.ai_recommendation,
        manual_input = EXCLUDED.manual_input,
        last_recalculated_at = now(),
        updated_at = now()`,
      [
        uid,
        normalizedSweetness,
        normalizedAcidity,
        normalizedBitterness,
        normalizedBody,
        flavorNotes,
        milkPrefs,
        caffeine_sensitivity ?? prefs.caffeine_sensitivity,
        preferred_strength ?? prefs.preferred_strength,
        preference_confidence ?? 0.35,
        prefs.quiz_version,
        prefs.quiz_answers,
        taste_vector,
        prefs.consistency_score,
        ai_recommendation,
        manual_input,
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

export default router;
