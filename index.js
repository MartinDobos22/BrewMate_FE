/**
 * Universal entry point.
 * - In React Native runtime we delegate to `index.native.js` (same behavior as the previous index).
 * - In Node.js (e.g., Render deploy) we start the Express server.
 */

const isReactNativeRuntime =
  typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';

if (isReactNativeRuntime) {
  // Lazy-load the native entry to keep server deployments lightweight.
  import('./index.native.js');
} else {
  // Node.js entrypoint for Render/server environments.
  import('./server.js');
}
