import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

import { admin } from '../firebase.js';
import { db, ensureAppUserExists } from '../db.js';
import { LOG_DIR } from '../utils/logging.js';

const router = express.Router();

// ========== AUTH ENDPOINT ==========

/**
 * Overí platnosť Firebase ID tokenu a zaloguje prihlásenie používateľa.
 */
router.post('/api/auth', async (req, res) => {
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
      return res
        .status(401)
        .json({ error: 'Neplatný token pre daného poskytovateľa' });
    }
    const uid = decoded.uid;
    const email = decoded.email;
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || 'unknown';

    await ensureAppUserExists(uid, email, {
      name: decoded.name || decoded.user?.name,
    });

    const logEntry = `[${timestamp}] LOGIN ${provider}: ${email} (${uid}) — ${userAgent}\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'auth.log'), logEntry);
    console.log('✅ Audit log:', logEntry.trim());

    res.status(200).json({ message: 'Authenticated', uid, email, provider });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * Zneplatní refresh tokeny používateľa a tým ho odhlási.
 */
router.post('/api/logout', async (req, res) => {
  const idToken = req.headers.authorization?.split(' ')[1];
  if (!idToken) return res.status(401).json({ error: 'Token chýba' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    await ensureAppUserExists(decoded.uid, decoded.email || decoded.user?.email, {
      client: db,
      name: decoded.name || decoded.user?.name,
    });
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
router.post('/api/register', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const link = await admin.auth().generateEmailVerificationLink(email);

    await ensureAppUserExists(userRecord.uid, userRecord.email, {
      name: userRecord.displayName,
    });

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
router.post('/api/reset-password', async (req, res) => {
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
router.post('/api/send-verification-email', async (req, res) => {
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

export default router;
