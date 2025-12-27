import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean) || [];

const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
const mergedConfiguredOrigins = renderExternalUrl
  ? [...configuredOrigins, renderExternalUrl]
  : configuredOrigins;

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.0.2.2:3000',
  'http://localhost:3001',
  'http://10.0.2.2:3001',
];

const allowedOrigins = mergedConfiguredOrigins.length > 0
  ? mergedConfiguredOrigins
  : NODE_ENV === 'production'
    ? []
    : defaultDevOrigins;

const allowAnyOrigin = NODE_ENV !== 'production' && allowedOrigins.length === 0;

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowAnyOrigin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

export {
  NODE_ENV,
  configuredOrigins,
  allowedOrigins,
  corsOptions,
};
