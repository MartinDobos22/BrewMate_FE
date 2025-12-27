import express from 'express';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';

const router = express.Router();

/**
 * Uloží vygenerovaný recept.
 */
router.post('/api/recipes', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
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
router.get('/api/recipes/history', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  const limit = parseInt(req.query.limit) || 10;
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
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

export default router;
