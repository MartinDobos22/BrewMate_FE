/**
 * Material You Coffee Color Palette
 * Kávová farebná paleta podľa Material Design 3 princípov
 */

export const materialYouCoffee = {
  // Primárne farby
  primary: '#6F4E37', // espresso
  onPrimary: '#FFFFFF',
  primaryContainer: '#A67C52', // cappuccino
  onPrimaryContainer: '#2C1810',

  // Sekundárne farby
  secondary: '#D4A574', // latte
  onSecondary: '#3C2415',
  secondaryContainer: '#E8D3B0', // foam
  onSecondaryContainer: '#4A3728',

  // Terciárne farby (akcenty)
  tertiary: '#FFB085', // warm accent
  onTertiary: '#4A2C1A',
  tertiaryContainer: '#FFF4E6',
  onTertiaryContainer: '#5C3D2E',

  // Povrchy
  surface: '#FFF8F0',
  surfaceDim: '#F5E6D3',
  surfaceBright: '#FFFBF7',
  onSurface: '#3C1F1A',
  surfaceVariant: '#F5E6D3',
  onSurfaceVariant: '#6B4423',

  // Outline
  outline: '#A67C52',
  outlineVariant: '#D4A574',

  // Tienisté vrstvy
  shadow: '#000000',
  scrim: '#000000',

  // Gradienty
  gradients: {
    hero: ['#FFF8F0', '#E8D3B0', '#A67C52'] as const,
    card: ['rgba(255,255,255,0.95)', 'rgba(232,211,176,0.85)'] as const,
    accent: ['#FFB085', '##FF8F6B'] as const,
    liquid: ['#6F4E37', '#A67C52', '#D4A574'] as const,
    steam: ['rgba(255,255,255,0.4)', 'rgba(232,211,176,0.2)', 'rgba(255,255,255,0)'] as const,
  },

  // Stav farby
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Úspech
  success: '#4CAF50',
  onSuccess: '#FFFFFF',

  // Upozornenie
  warning: '#FF9800',
  onWarning: '#FFFFFF',
} as const;

export type MaterialYouCoffeeColors = typeof materialYouCoffee;
