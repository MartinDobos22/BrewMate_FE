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

const getScreenHeight = () => resolveDimensions().height;

// Pomocné funkcie pre bezpečné zóny (bez externých dependencies)
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
export const isSmallDevice = () => {
  const { width } = resolveDimensions();
  return width < 375;
};

// Detekcia tabletov
export const isTablet = () => {
  const { width } = resolveDimensions();
  return width >= 768;
};

// Získať responzívnu veľkosť
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

export const verticalScale = (size: number) => {
  const { height } = resolveDimensions();
  const baseHeight = 812; // Reference height (iPhone 11 Pro)
  const scaleFactor = height / baseHeight;

  const maxScale = 1.3;
  const minScale = 0.85;

  const finalScale = Math.min(Math.max(scaleFactor, minScale), maxScale);
  return Math.round(size * finalScale);
};
