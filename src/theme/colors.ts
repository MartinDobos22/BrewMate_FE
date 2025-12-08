/**
 * Color palette for light-mode surfaces and text.
 *
 * Values are used by themed components and should maintain sufficient
 * contrast against light backgrounds for accessibility.
 */
export const lightColors = {
  background: '#F4ECE6',
  cardBackground: '#FFFFFF',
  text: '#4E342E',
  textSecondary: '#6D4C41',
  primary: '#795548',
  primaryLight: '#A98274',
  secondary: '#C69C6D',
  accent: '#C69C6D',
  danger: '#D32F2F',
  warning: '#FFA000',
  info: '#17a2b8',
  border: 'rgba(0,0,0,0.1)',
};

/**
 * Color palette for dark-mode surfaces and text.
 *
 * Colors favor warmer browns to align with the coffee brand identity while
 * preserving readability on dark backgrounds.
 */
export const darkColors = {
  background: '#3E2723',
  cardBackground: '#4E342E',
  text: '#F5F5F5',
  textSecondary: '#D7CCC8',
  primary: '#A98274',
  primaryLight: '#D7BCA8',
  secondary: '#C69C6D',
  accent: '#C69C6D',
  danger: '#EF5350',
  warning: '#FFB74D',
  info: '#4DD0E1',
  border: 'rgba(255,255,255,0.1)',
};

/**
 * Returns the appropriate color palette based on whether dark mode is enabled.
 *
 * @param {boolean} isDarkMode - Flag indicating if dark mode should be used.
 * @returns {typeof lightColors|typeof darkColors} Color token map for the current theme.
 */
export const getColors = (isDarkMode: boolean) => (
  isDarkMode ? darkColors : lightColors
);

/**
 * Derived type representing the shape of the active color palette returned by
 * {@link getColors}. Keep in sync when adding new theme tokens.
 */
export type Colors = ReturnType<typeof getColors>;
