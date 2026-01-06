import express from 'express';
import cors from 'cors';

import { corsOptions } from './config.js';
import authRouter from './routes/auth.js';
import coffeesRouter from './routes/coffees.js';
import dashboardRouter from './routes/dashboard.js';
import ocrRouter from './routes/ocr.js';
import profileRouter from './routes/profile.js';
import personalizationRouter from './routes/personalization.js';
import recipesRouter from './routes/recipes.js';
import signalsRouter from './routes/signals.js';

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use(cors(corsOptions));

const MAX_LOG_BODY_BYTES = 5000;
const MAX_LOG_VALUE_LENGTH = 200;
const SENSITIVE_KEY_PATTERN =
  /(password|token|secret|authorization|base64image|prompt|image|ocr|text)/i;

const truncateValue = (value) => {
  if (typeof value !== 'string') return value;
  if (value.length <= MAX_LOG_VALUE_LENGTH) return value;
  return `${value.slice(0, MAX_LOG_VALUE_LENGTH)}…[truncated ${value.length - MAX_LOG_VALUE_LENGTH} chars]`;
};

const sanitizeForLog = (value, key) => {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    if (typeof value === 'string') {
      return `[REDACTED ${value.length} chars]`;
    }
    return '[REDACTED]';
  }

  if (Array.isArray(value)) {
    const preview = value.slice(0, 20).map((entry) => sanitizeForLog(entry));
    return value.length > 20
      ? [...preview, `…(${value.length - 20} more items)`]
      : preview;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [childKey, childValue]) => {
      acc[childKey] = sanitizeForLog(childValue, childKey);
      return acc;
    }, {});
  }

  return truncateValue(value);
};

const summarizeBody = (body) => {
  const keys = Object.keys(body || {});
  const base64image = typeof body?.base64image === 'string' ? body.base64image : null;
  const mimeTypeMatch = base64image?.match(/^data:([^;]+);base64,/);
  return {
    bodySizeBytes: Buffer.byteLength(JSON.stringify(body || {})),
    keys,
    base64image: base64image
      ? {
          length: base64image.length,
          mimeType: mimeTypeMatch?.[1] ?? 'unknown',
        }
      : undefined,
  };
};

// Global request logger to capture communication from frontend
app.use((req, _res, next) => {
  const base = `➡️  [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`;
  if (req.body && Object.keys(req.body).length > 0) {
    const bodySize = Buffer.byteLength(JSON.stringify(req.body));
    const isOcrRoute =
      req.originalUrl.startsWith('/ocr') || req.originalUrl.startsWith('/api/ocr');
    const shouldSummarize = isOcrRoute || bodySize > MAX_LOG_BODY_BYTES;
    const payload = shouldSummarize ? summarizeBody(req.body) : sanitizeForLog(req.body);
    console.log(base, payload);
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
app.use(personalizationRouter);
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

export default app;
