import { Platform } from 'react-native';

export interface OnboardingPalette {
  backgroundGradient: string[];
  secondaryGradient: string[];
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  primarySurface: string;
  secondarySurface: string;
  tertiarySurface: string;
  surfaceBorder: string;
  shadowColor: string;
  primaryAccent: string;
  secondaryAccent: string;
  cta: string;
  ctaText: string;
  success: string;
  warning: string;
}

const lightPalette: OnboardingPalette = {
  backgroundGradient: ['#F6EFE9', '#EBD9CB', '#D7BFAA'],
  secondaryGradient: ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)'],
  primaryText: '#3C2A21',
  secondaryText: '#5B4636',
  mutedText: '#806E63',
  primarySurface: 'rgba(255, 255, 255, 0.78)',
  secondarySurface: 'rgba(245, 234, 226, 0.72)',
  tertiarySurface: 'rgba(235, 203, 178, 0.5)',
  surfaceBorder: 'rgba(120, 87, 64, 0.18)',
  shadowColor: 'rgba(77, 54, 39, 0.55)',
  primaryAccent: '#8FC8C2',
  secondaryAccent: '#F2A38A',
  cta: '#6F4E37',
  ctaText: '#FFF7F0',
  success: '#5D8A7A',
  warning: '#D66B40',
};

const darkPalette: OnboardingPalette = {
  backgroundGradient: ['#1F1410', '#271914', '#35221C'],
  secondaryGradient: ['rgba(90, 58, 44, 0.5)', 'rgba(90, 58, 44, 0)'],
  primaryText: '#F8ECE3',
  secondaryText: '#D9C3B8',
  mutedText: '#B59887',
  primarySurface: 'rgba(43, 28, 22, 0.82)',
  secondarySurface: 'rgba(64, 42, 33, 0.72)',
  tertiarySurface: 'rgba(86, 55, 41, 0.45)',
  surfaceBorder: 'rgba(222, 190, 171, 0.22)',
  shadowColor: 'rgba(12, 6, 4, 0.6)',
  primaryAccent: '#7FB7B3',
  secondaryAccent: '#E28D73',
  cta: '#E2A36B',
  ctaText: '#2C1A14',
  success: '#7FB59F',
  warning: '#F07F49',
};

export const getOnboardingPalette = (isDark: boolean): OnboardingPalette =>
  isDark ? darkPalette : lightPalette;

export type ElevationLevel = 'low' | 'medium' | 'high';

export const getElevationStyle = (palette: OnboardingPalette, level: ElevationLevel) => {
  const baseShadowRadius = level === 'high' ? 18 : level === 'medium' ? 12 : 6;
  const baseShadowOffset = level === 'high' ? 14 : level === 'medium' ? 8 : 4;
  const elevation = level === 'high' ? 16 : level === 'medium' ? 10 : 4;

  return Platform.select({
    ios: {
      shadowColor: palette.shadowColor,
      shadowOpacity: 0.32,
      shadowRadius: baseShadowRadius,
      shadowOffset: { width: 0, height: baseShadowOffset },
    },
    android: {
      elevation,
      shadowColor: palette.shadowColor,
    },
    default: {},
  });
};

export const radius = {
  xl: 32,
  lg: 28,
  md: 20,
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
};

