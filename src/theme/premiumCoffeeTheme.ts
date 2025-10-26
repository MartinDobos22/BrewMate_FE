/**
 * Premium Coffee Theme - Luxusná farebná paleta
 * Inšpirované high-end coffee shops a minimalistickým dizajnom
 */

export const premiumCoffeeTheme = {
  // Hlavné farby - soft a jemné
  background: {
    primary: '#FFFBF5',      // Soft cream
    secondary: '#F8F4EE',    // Warm white
    tertiary: '#FFF8EF',     // Lightest cream
  },

  // Kávové tóny - jemnejšie a luxusnejšie
  coffee: {
    darkest: '#4A2C2A',      // Rich espresso
    dark: '#6B4423',         // Dark roast
    medium: '#8B6F47',       // Medium roast
    light: '#B8956A',        // Light roast
    cream: '#D4C4B0',        // Coffee cream
    milk: '#E8DED2',         // Milk foam
  },

  // Accent farby - soft peachy/coral
  accent: {
    primary: '#E8C4A5',      // Soft peach
    secondary: '#F4D9C6',    // Light peach
    tertiary: '#FFE8D6',     // Peachy cream
    warm: '#FFD7BA',         // Warm apricot
  },

  // Glassmorphism farby
  glass: {
    white: 'rgba(255, 255, 255, 0.7)',
    whiteLight: 'rgba(255, 255, 255, 0.5)',
    whiteUltraLight: 'rgba(255, 255, 255, 0.3)',
    dark: 'rgba(74, 44, 42, 0.1)',
    darkMedium: 'rgba(74, 44, 42, 0.05)',
  },

  // Gradienty - soft a jemné
  gradients: {
    background: ['#FFFBF5', '#F8F4EE', '#FFE8D6'],
    card: ['rgba(255, 255, 255, 0.9)', 'rgba(248, 244, 238, 0.8)'],
    hero: ['#FFFBF5', '#FFE8D6', '#E8C4A5'],
    liquid: ['#8B6F47', '#B8956A', '#D4C4B0'],
    steam: ['rgba(255, 255, 255, 0.6)', 'rgba(228, 220, 210, 0.3)', 'rgba(255, 255, 255, 0)'],
    shine: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)'],
  },

  // Text farby
  text: {
    primary: '#2C1810',
    secondary: '#4A2C2A',
    tertiary: '#6B4423',
    light: '#8B6F47',
    extraLight: '#B8956A',
  },

  // Shadows - soft a jemné
  shadows: {
    small: {
      shadowColor: '#4A2C2A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#4A2C2A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    large: {
      shadowColor: '#4A2C2A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 8,
    },
  },

  // Blur hodnoty pre glassmorphism
  blur: {
    light: 10,
    medium: 20,
    strong: 30,
  },
} as const;

export type PremiumCoffeeTheme = typeof premiumCoffeeTheme;
