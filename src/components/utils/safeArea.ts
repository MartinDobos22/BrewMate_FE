// utils/safeArea.ts
import { Platform, Dimensions, StatusBar } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Pomocné funkcie pre bezpečné zóny (bez externých dependencies)
export const getSafeAreaTop = () => {
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
  const { width } = Dimensions.get('window');
  return width < 375;
};

// Detekcia tabletov
export const isTablet = () => {
  const { width } = Dimensions.get('window');
  return width >= 768;
};

// Získať responzívnu veľkosť
export const scale = (size: number) => {
  const { width } = Dimensions.get('window');
  const baseWidth = 375; // iPhone 11 Pro
  const scaleFactor = width / baseWidth;

  // Obmedziť scaling pre tablety
  const maxScale = 1.3;
  const minScale = 0.85;

  const finalScale = Math.min(Math.max(scaleFactor, minScale), maxScale);
  return Math.round(size * finalScale);
};