import express from 'express';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';

const router = express.Router();

const normalizeSignalRow = (row) => ({
  id: row.coffee_id,
  name: row.coffee_name,
  scans: Number(row.scans) || 0,
  repeats: Number(row.repeats) || 0,
  favorites: Number(row.favorites) || 0,
  ignores: Number(row.ignores) || 0,
  consumed: Number(row.consumed) || 0,
  lastFeedback: row.last_feedback || null,
  lastFeedbackReason: row.last_feedback_reason || null,
  lastSeen: row.last_seen,
  updatedAt: row.updated_at,
  version: Number(row.version) || 0,
});

const applySignalEvent = (current, payload) => {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const next = {
    ...current,
    coffee_name: payload.coffeeName || current.coffee_name || 'Neznáma káva',
    last_seen: timestamp,
    updated_at: timestamp,
    version: (current.version || 0) + 1,
  };

  switch (payload.event) {
    case 'scan': {
      const scans = (current.scans || 0) + 1;
      next.scans = scans;
      next.repeats = scans > 1 ? (current.repeats || 0) + 1 : current.repeats || 0;
      break;
    }
    case 'ignore':
      next.ignores = (current.ignores || 0) + 1;
      break;
    case 'favorite':
      if (payload.isFavorite) {
        next.favorites = (current.favorites || 0) + 1;
      }
      break;
    case 'consumption':
      next.consumed = (current.consumed || 0) + 1;
      break;
    case 'feedback':
      next.last_feedback = payload.feedback || null;
      next.last_feedback_reason = payload.feedbackReason || null;
      break;
    default:
      break;
  }

  return next;
};

/**
 * Načíta agregované signály používateľa pre personalizáciu odporúčaní.
 */
router.get('/api/user-signals/:userId', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.uid !== req.params.userId) {
      return res.status(403).json({ error: 'Nesprávny používateľ' });
    }

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const result = await db.query(
      `SELECT coffee_id, coffee_name, scans, repeats, favorites, ignores, consumed,
              last_feedback, last_feedback_reason, last_seen, updated_at, version
       FROM user_signals
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [decoded.uid]
    );

    res.json(result.rows.map(normalizeSignalRow));
  } catch (err) {
    console.error('❌ User signals fetch error:', err);
    res.status(500).json({ error: 'Chyba pri načítaní používateľských signálov' });
  }
});

/**
 * Uloží nový signál o interakcii s kávou a vráti agregát.
 */
router.post('/api/user-signals/events', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const payload = req.body;
    if (payload.userId !== decoded.uid) {
      return res.status(403).json({ error: 'Nesprávny používateľ' });
    }

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });

    const baseResult = await db.query(
      `SELECT coffee_id, coffee_name, scans, repeats, favorites, ignores, consumed,
              last_feedback, last_feedback_reason, last_seen, updated_at, version
       FROM user_signals
       WHERE user_id = $1 AND coffee_id = $2`,
      [decoded.uid, payload.coffeeId]
    );

    const existing = baseResult.rows[0] || {
      coffee_id: payload.coffeeId,
      coffee_name: payload.coffeeName || 'Neznáma káva',
      scans: 0,
      repeats: 0,
      favorites: 0,
      ignores: 0,
      consumed: 0,
      last_feedback: null,
      last_feedback_reason: null,
      last_seen: new Date(),
      updated_at: new Date(),
      version: 0,
    };

    const updated = applySignalEvent(existing, payload);

    const upserted = await db.query(
      `INSERT INTO user_signals (
         user_id, coffee_id, coffee_name, scans, repeats, favorites, ignores, consumed,
         last_feedback, last_feedback_reason, last_seen, updated_at, version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (user_id, coffee_id)
       DO UPDATE SET
         coffee_name = EXCLUDED.coffee_name,
         scans = EXCLUDED.scans,
         repeats = EXCLUDED.repeats,
         favorites = EXCLUDED.favorites,
         ignores = EXCLUDED.ignores,
         consumed = EXCLUDED.consumed,
         last_feedback = EXCLUDED.last_feedback,
         last_feedback_reason = EXCLUDED.last_feedback_reason,
         last_seen = EXCLUDED.last_seen,
         updated_at = EXCLUDED.updated_at,
         version = EXCLUDED.version
       RETURNING coffee_id, coffee_name, scans, repeats, favorites, ignores, consumed,
                 last_feedback, last_feedback_reason, last_seen, updated_at, version`,
      [
        decoded.uid,
        updated.coffee_id,
        updated.coffee_name,
        updated.scans,
        updated.repeats,
        updated.favorites,
        updated.ignores,
        updated.consumed,
        updated.last_feedback,
        updated.last_feedback_reason,
        updated.last_seen,
        updated.updated_at,
        updated.version,
      ]
    );

    res.json(normalizeSignalRow(upserted.rows[0]));
  } catch (err) {
    console.error('❌ User signals event error:', err);
    res.status(500).json({ error: 'Chyba pri ukladaní používateľských signálov' });
  }
});

export default router;
