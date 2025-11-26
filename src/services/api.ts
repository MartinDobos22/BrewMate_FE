import { Platform } from 'react-native';

/**
 * Base host used for API calls, adjusted per platform to support local device
 * emulators.
 *
 * Android emulators cannot resolve `localhost` to the development machine, so
 * we point to the loopback proxy `10.0.2.2`. iOS simulators can use localhost
 * directly. Update these values when pointing to staging or production APIs.
 */
const API_HOST = Platform.OS === 'ios' ? 'http://localhost:3001' : 'http://10.0.2.2:3001';

/**
 * Root API path used by HTTP clients across the app.
 *
 * Concatenates {@link API_HOST} with the `/api` prefix expected by the
 * Express server.
 */
export const API_URL = `${API_HOST}/api`;
export { API_HOST };
