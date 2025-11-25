/**
 * Initializes a singleton Firebase Admin SDK instance for backend utilities.
 *
 * The service account file path must be replaced with an environment-specific
 * secret. The conditional guard prevents re-initialization when this module is
 * imported multiple times (e.g., across server handlers), ensuring credential
 * reuse and stable token caching.
 */
import admin from 'firebase-admin';
import serviceAccount from './path/to/serviceAccountKey.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
