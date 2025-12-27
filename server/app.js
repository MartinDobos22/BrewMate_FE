import express from 'express';
import cors from 'cors';

import { corsOptions } from './config.js';
import authRouter from './routes/auth.js';
import coffeesRouter from './routes/coffees.js';
import dashboardRouter from './routes/dashboard.js';
import ocrRouter from './routes/ocr.js';
import profileRouter from './routes/profile.js';
import recipesRouter from './routes/recipes.js';
import signalsRouter from './routes/signals.js';

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use(cors(corsOptions));

// Global request logger to capture communication from frontend
app.use((req, _res, next) => {
  const base = `➡️  [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`;
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(base, req.body);
  } else {
    console.log(base);
  }
  next();
});

app.get('/', (req, res) => {
  res.send('Google Vision OCR backend beží.');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(authRouter);
app.use(profileRouter);
app.use(dashboardRouter);
app.use(ocrRouter);
app.use(coffeesRouter);
app.use(recipesRouter);
app.use(signalsRouter);

// Central error handler to surface issues in logs and return coherent JSON.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled server error:', err);
  const status = err?.status || 500;
  const message = err?.message || 'Internal server error';
  res.status(status).json({ error: message });
});

export { app };
