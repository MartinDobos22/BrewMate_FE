import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { normalizeTasteInput } from '../utils/coffee.js';
import { LOG_DIR } from '../utils/logging.js';

const router = express.Router();
const TASTE_VECTOR_KEYS = [
  'sweetness',
  'acidity',
  'bitterness',
  'body',
  'intensity',
  'experimentalism',
];

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Validate and clamp a taste vector payload.
 *
 * Ensures the payload is a plain object with numeric values for the expected keys
 * (sweetness, acidity, bitterness, body, intensity, experimentalism) and clamps
 * each value to a 0–1 or 0–10 range based on scale.
 *
 * @param {unknown} value - Incoming taste vector payload.
 * @returns {Record<string, number> | null} Sanitized taste vector or null when not provided.
 */
const validateTasteVector = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isPlainObject(value)) {
    throw new Error('Invalid taste_vector: expected a plain object.');
  }

  const sanitized = {};

  TASTE_VECTOR_KEYS.forEach((key) => {
    const rawValue = value[key];
    if (rawValue === undefined || rawValue === null) {
      return;
    }

    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
      throw new Error(`Invalid taste_vector.${key}: expected a number.`);
    }

    const clamped =
      rawValue <= 1
        ? clampNumber(rawValue, 0, 1)
        : clampNumber(rawValue, 0, 10);
    sanitized[key] = clamped;
  });

  return sanitized;
};

const validateQuizAnswers = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isPlainObject(value)) {
    throw new Error(
      'Invalid quiz_answers: expected a plain object with string values.'
    );
  }

  const sanitized = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue !== 'string') {
      throw new Error(`Invalid quiz_answers.${key}: expected a string.`);
    }
    sanitized[key] = entryValue;
  });

  return sanitized;
};

/**
 * Normalizuje DB záznam chuťového profilu do formátu používaného FE.
 *
 * @param {object | null | undefined} taste - DB záznam z user_taste_profiles.
 * @returns {object} Normalizovaný tvar pre FE, vrátane coffee_preferences.
 */
const serializeTasteProfile = (taste) => {
  if (!taste) {
    return {
      ai_recommendation: null,
      manual_input: null,
      taste_vector: null,
      is_complete: false,
      coffee_preferences: null,
    };
  }

  return {
    ai_recommendation: taste.ai_recommendation ?? null,
    manual_input: taste.manual_input ?? null,
    taste_vector: taste.taste_vector ?? null,
    is_complete: taste.is_complete ?? false,
    coffee_preferences: {
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
      taste_vector: taste.taste_vector ?? null,
    },
  };
};

/**
 * Zostaví odpoveď profilu podľa FE kontraktu.
 *
 * @param {object} params - Parametre na zostavenie profilu.
 * @param {string} params.uid - UID používateľa.
 * @param {string | null | undefined} params.email - Email používateľa.
 * @param {string | null | undefined} params.displayName - Zobrazené meno používateľa.
 * @param {object | null | undefined} params.taste - DB záznam chuťového profilu.
 * @returns {object} Plná odpoveď pre FE.
 */
const buildProfileResponse = ({ uid, email, displayName, taste }) => {
  const normalizedTaste = serializeTasteProfile(taste);
  return {
    id: uid,
    email: email ?? null,
    name: displayName || email?.split('@')[0] || 'Kávoš',
    bio: null,
    avatar_url: null,
    experience_level: null,
    ...normalizedTaste,
  };
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
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1`,
      [uid]
    );

    const taste = tasteResult.rows[0];

    const response = buildProfileResponse({
      uid,
      email: decoded.email,
      displayName: decoded.name || decoded.user?.name,
      taste,
    });

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
      ai_confidence,
    } = req.body;

    const prefs = coffee_preferences || {};
    const confidenceOverride = preference_confidence ?? ai_confidence ?? null;

    // Načítaj existujúci záznam, aby sme pri partial update neprepísali dôležité JSON polia na null.
    const existingResult = await client.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1`,
      [uid]
    );
    const existing = existingResult.rows[0] ?? null;
    const flavorNotes = flavor_notes ?? prefs.flavor_notes ?? existing?.flavor_notes ?? {};
    const milkPrefs = milk_preferences ?? prefs.milk_preferences ?? existing?.milk_preferences ?? {};

    let validatedTasteVector;
    let validatedQuizAnswers;
    try {
      // Validate taste vector shape and clamp numeric values to safe ranges.
      validatedTasteVector = validateTasteVector(taste_vector ?? prefs.taste_vector);
      // Validate quiz answers shape and enforce string-only values.
      validatedQuizAnswers = validateQuizAnswers(prefs.quiz_answers);
    } catch (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError.message });
    }

    const hasExplicitTasteInputs = [sweetness, acidity, bitterness, body].some(
      (value) => value !== undefined && value !== null
    );
    const mappedTasteVector =
      !hasExplicitTasteInputs && validatedTasteVector
        ? {
            sweetness:
              validatedTasteVector.sweetness !== undefined &&
              validatedTasteVector.sweetness !== null
                ? validatedTasteVector.sweetness * 10
                : undefined,
            acidity:
              validatedTasteVector.acidity !== undefined &&
              validatedTasteVector.acidity !== null
                ? validatedTasteVector.acidity * 10
                : undefined,
            bitterness:
              validatedTasteVector.bitterness !== undefined &&
              validatedTasteVector.bitterness !== null
                ? validatedTasteVector.bitterness * 10
                : undefined,
            body:
              validatedTasteVector.body !== undefined &&
              validatedTasteVector.body !== null
                ? validatedTasteVector.body * 10
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
        prefs.sweetness ?? existing?.sweetness ?? 5,
        'sweetness'
      );
      normalizedAcidity = normalizeTasteInput(
        acidity ?? mappedTasteVector.acidity,
        prefs.acidity ?? existing?.acidity ?? 5,
        'acidity'
      );
      normalizedBitterness = normalizeTasteInput(
        bitterness ?? mappedTasteVector.bitterness,
        prefs.bitterness ?? existing?.bitterness ?? 5,
        'bitterness'
      );
      normalizedBody = normalizeTasteInput(
        body ?? mappedTasteVector.body,
        prefs.body ?? existing?.body ?? 5,
        'body'
      );
    } catch (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validationError.message });
    }

    // Normalizácia chutí, aby sme pri ukladaní dotazníka nepadali na 22P02
    // (invalid_text_representation) chybách, keď frontend pošle textové štítky
    // ako "little", "medium", "high" namiesto čísiel.
    const resolvedTasteVector =
      validatedTasteVector ?? existing?.taste_vector ?? {};
    const resolvedQuizAnswers =
      validatedQuizAnswers ?? existing?.quiz_answers ?? {};
    const resolvedQuizVersion = prefs.quiz_version ?? existing?.quiz_version ?? null;
    const resolvedConsistencyScore =
      prefs.consistency_score ??
      confidenceOverride ??
      existing?.consistency_score ??
      1;
    const resolvedAiRecommendation =
      ai_recommendation ?? existing?.ai_recommendation ?? null;
    const resolvedManualInput = manual_input ?? existing?.manual_input ?? null;
    const resolvedCaffeineSensitivity =
      caffeine_sensitivity ??
      prefs.caffeine_sensitivity ??
      existing?.caffeine_sensitivity ??
      null;
    const resolvedPreferredStrength =
      preferred_strength ??
      prefs.preferred_strength ??
      existing?.preferred_strength ??
      null;

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
        resolvedCaffeineSensitivity,
        resolvedPreferredStrength,
        confidenceOverride ?? existing?.preference_confidence ?? 0.35,
        resolvedQuizVersion,
        resolvedQuizAnswers,
        resolvedTasteVector,
        resolvedConsistencyScore,
        resolvedAiRecommendation,
        resolvedManualInput,
      ]
    );

    await client.query('COMMIT');

    const log = `[${new Date().toISOString()}] PROFILE UPDATE: ${uid} (${decoded.email})\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'profile.log'), log);

    const { rows: updatedRows } = await client.query(
      `SELECT * FROM user_taste_profiles_with_completion WHERE user_id = $1`,
      [uid]
    );
    const updatedTaste = updatedRows[0] ?? null;
    res.json(
      buildProfileResponse({
        uid,
        email: decoded.email,
        displayName: decoded.name || decoded.user?.name,
        taste: updatedTaste,
      })
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Chyba pri update profilu:', err);
    res.status(500).json({ error: 'Chyba servera' });
  } finally {
    client.release();
  }
});

export default router;
