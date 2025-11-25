import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Configures the Google Sign-In client used across the application.
 *
 * The `webClientId` must match the OAuth client configured in Firebase Console
 * for Android and iOS; otherwise, authentication requests will fail with
 * invalid client errors. This configuration is executed at module import time
 * so that any screens or services using `GoogleSignin` inherit the same
 * settings.
 */
GoogleSignin.configure({
  webClientId: '710124351148-o9ef2tv7ne5e9qv6f8s9l01gtqgnufpc.apps.googleusercontent.com', // z Firebase Console
});
