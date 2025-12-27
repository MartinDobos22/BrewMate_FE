import express from 'express';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';

const router = express.Router();

/**
 * Vráti zoznam všetkých káv uložených v databáze.
 */
router.get('/api/coffees', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);

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
 * Uloží hodnotenie a poznámky k danej káve.
 */
router.post('/api/coffee/rate', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

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
router.post('/api/coffee/favorite/:id', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
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

export default router;
