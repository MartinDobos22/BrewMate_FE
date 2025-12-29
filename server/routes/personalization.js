import express from 'express';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';

const router = express.Router();

const parseLimit = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
};

const requireUser = async (req) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) {
    const error = new Error('Token chýba');
    error.status = 401;
    throw error;
  }

  const decoded = await admin.auth().verifyIdToken(idToken);
  await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
    client: db,
    name: decoded.name || decoded.user?.name,
  });

  return decoded;
};

router.get('/api/personalization/brew-history', async (req, res, next) => {
  try {
    const decoded = await requireUser(req);
    const limit = parseLimit(req.query.limit, 200, 500);

    const { rows } = await db.query(
      `SELECT *
       FROM brew_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [decoded.uid, limit]
    );

    return res.json({ entries: rows });
  } catch (error) {
    return next(error);
  }
});

router.post('/api/personalization/brew-history', async (req, res, next) => {
  try {
    const decoded = await requireUser(req);
    const {
      recipe_id,
      beans,
      grind_size,
      water_temp,
      rating,
      taste_feedback,
      flavor_notes,
      context_time_of_day,
      context_weather,
      mood_before,
      mood_after,
      modifications,
      created_at,
      updated_at,
    } = req.body ?? {};

    const normalizedRating = Number.isFinite(rating)
      ? Math.max(1, Math.min(5, Math.round(rating)))
      : 1;

    const { rows } = await db.query(
      `INSERT INTO brew_history (
        user_id,
        recipe_id,
        beans,
        grind_size,
        water_temp,
        rating,
        taste_feedback,
        flavor_notes,
        context_time_of_day,
        context_weather,
        mood_before,
        mood_after,
        modifications,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        COALESCE($14, now()),
        COALESCE($15, now())
      )
      RETURNING *`,
      [
        decoded.uid,
        recipe_id ?? null,
        beans ?? {},
        grind_size ?? null,
        water_temp ?? null,
        normalizedRating,
        taste_feedback ?? {},
        flavor_notes ?? {},
        context_time_of_day ?? null,
        context_weather ?? null,
        mood_before ?? null,
        mood_after ?? null,
        modifications ?? [],
        created_at ?? null,
        updated_at ?? null,
      ]
    );

    return res.status(201).json({ entry: rows[0] ?? null });
  } catch (error) {
    return next(error);
  }
});

router.delete('/api/personalization/brew-history', async (req, res, next) => {
  try {
    const decoded = await requireUser(req);

    await db.query(`DELETE FROM brew_history WHERE user_id = $1`, [decoded.uid]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/api/personalization/learning-events', async (req, res, next) => {
  try {
    const decoded = await requireUser(req);
    const limit = parseLimit(req.query.limit, 500, 1000);

    const { rows } = await db.query(
      `SELECT *
       FROM learning_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [decoded.uid, limit]
    );

    return res.json({ events: rows });
  } catch (error) {
    return next(error);
  }
});

router.delete('/api/personalization/learning-events', async (req, res, next) => {
  try {
    const decoded = await requireUser(req);

    await db.query(`DELETE FROM learning_events WHERE user_id = $1`, [decoded.uid]);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
