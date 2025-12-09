import { Platform } from 'react-native';

/**
 * Base host used for API calls, adjusted per platform to support local device
 * emulators and production deployments on Render.
 *
 * Android emulators cannot resolve `localhost` to the development machine, so
 * we point to the loopback proxy `10.0.2.2`. iOS simulators can use localhost
 * directly. In production, calls are routed to the hosted Render backend.
 */
const LOCAL_DEV_API_HOST = Platform.OS === 'ios' ? 'http://localhost:3000' : 'http://10.0.2.2:3000';
const PROD_API_HOST = 'https://brewmate-fe.onrender.com';

// In local development we default to the hosted backend unless the developer
// explicitly opts into the local server. This avoids emulator networking
// issues when only the Render API is available.
const DEV_API_HOST =
  process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true' ? LOCAL_DEV_API_HOST : PROD_API_HOST;

// Allows overriding via Expo public envs if configured (e.g. when pointing a
// mobile emulator at the Render deployment, set EXPO_PUBLIC_API_HOST to the
// hosted URL).
export const API_HOST = process.env.EXPO_PUBLIC_API_HOST || (__DEV__ ? DEV_API_HOST : PROD_API_HOST);

/**
 * Root API path used by HTTP clients across the app.
 *
 * Concatenates {@link API_HOST} with the `/api` prefix expected by the
 * Express server.
 */
export const API_URL = `${API_HOST}/api`;
