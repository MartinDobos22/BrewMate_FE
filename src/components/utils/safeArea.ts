// utils/safeArea.ts
import { Platform, StatusBar } from 'react-native';
import type { ScaledSize } from 'react-native';

const fallbackDimensions: ScaledSize = {
  width: 390,
  height: 844,
  scale: 1,
  fontScale: 1,
};

let hasLoggedDimensionsWarning = false;

/**
 * Resolves current window dimensions while gracefully handling environments without native bindings.
 *
 * @returns {ScaledSize} The resolved screen dimensions or a predefined fallback when unavailable.
 */
const resolveDimensions = (): ScaledSize => {
  try {
    // Lazy require keeps us safe in environments where the native Dimensions
    // module has not been wired up yet (for example immediately on app boot
    // or during certain test runs).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Dimensions } = require('react-native');
    if (Dimensions?.get) {
      return Dimensions.get('window');
    }
  } catch (error) {
    if (!hasLoggedDimensionsWarning) {
      const inDev =
        typeof __DEV__ !== 'undefined'
          ? __DEV__
          : typeof process !== 'undefined'
            ? process.env.NODE_ENV !== 'production'
            : false;
      if (inDev) {
        // eslint-disable-next-line no-console
        console.warn('safeArea: Falling back to default dimensions', error);
      }
      hasLoggedDimensionsWarning = true;
    }
  }

  return fallbackDimensions;
};

/**
 * Retrieves the current screen height using safe dimension resolution.
 *
 * @returns {number} Screen height in pixels.
 */
const getScreenHeight = () => resolveDimensions().height;

// Pomocné funkcie pre bezpečné zóny (bez externých dependencies)
/**
 * Estimates the safe area inset for the top of the screen based on platform and device height.
 *
 * @returns {number} Top inset in pixels to avoid notches and status bars.
 */
export const getSafeAreaTop = () => {
  const screenHeight = getScreenHeight();
  if (Platform.OS === 'ios') {
    // iPhone X a novšie
    if (screenHeight >= 812) {
      return 44;
    }
    // Staršie iPhony
    return 20;
  }
  // Android
  return StatusBar.currentHeight || 24;
};

/**
 * Estimates the safe area inset for the bottom of the screen to avoid home indicator or navigation bar.
 *
 * @returns {number} Bottom inset in pixels appropriate for the device type.
 */
export const getSafeAreaBottom = () => {
  const screenHeight = getScreenHeight();
  if (Platform.OS === 'ios') {
    // iPhone X a novšie (s home indicator)
    if (screenHeight >= 812) {
      return 34;
    }
    return 0;
  }
  // Android - navigačný bar
  return 20;
};

// Detekcia malých zariadení
/**
 * Determines whether the device has a narrow screen width, indicating a small handset.
 *
 * @returns {boolean} True when the device width is smaller than 375 points.
 */
export const isSmallDevice = () => {
  const { width } = resolveDimensions();
  return width < 375;
};

// Detekcia tabletov
/**
 * Determines whether the device meets a minimal width threshold to be considered a tablet.
 *
 * @returns {boolean} True when the device width is at least 768 points.
 */
export const isTablet = () => {
  const { width } = resolveDimensions();
  return width >= 768;
};

// Získať responzívnu veľkosť
/**
 * Scales a base size proportionally to the device width within constrained bounds.
 *
 * @param {number} size - Baseline size value to adjust.
 * @returns {number} Rounded pixel size adapted to the current device width.
 */
export const scale = (size: number) => {
  const { width } = resolveDimensions();
  const baseWidth = 375; // iPhone 11 Pro
  const scaleFactor = width / baseWidth;

  // Obmedziť scaling pre tablety
  const maxScale = 1.3;
  const minScale = 0.85;

  const finalScale = Math.min(Math.max(scaleFactor, minScale), maxScale);
  return Math.round(size * finalScale);
};

/**
 * Scales a base size relative to device height while limiting extremes.
 *
 * @param {number} size - Baseline vertical size to adjust.
 * @returns {number} Rounded pixel size adapted to the current device height.
 */
export const verticalScale = (size: number) => {
  const { height } = resolveDimensions();
  const baseHeight = 812; // Reference height (iPhone 11 Pro)
  const scaleFactor = height / baseHeight;

  const maxScale = 1.3;
  const minScale = 0.85;

  const finalScale = Math.min(Math.max(scaleFactor, minScale), maxScale);
  return Math.round(size * finalScale);
};
