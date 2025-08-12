export const lightColors = {
  background: '#EFEBE9',
  cardBackground: '#FFFFFF',
  text: '#3E2723',
  textSecondary: '#6D4C41',
  primary: '#8B4513',
  primaryLight: '#D2691E',
  secondary: '#8BC34A',
  danger: '#D32F2F',
  warning: '#FFA000',
  info: '#17a2b8',
  border: 'rgba(0,0,0,0.1)',
};

export const darkColors = {
  background: '#3E2723',
  cardBackground: '#4E342E',
  text: '#FFFBF2',
  textSecondary: '#D7CCC8',
  primary: '#8B4513',
  primaryLight: '#D2691E',
  secondary: '#8BC34A',
  danger: '#D32F2F',
  warning: '#FFA000',
  info: '#17a2b8',
  border: 'rgba(255,255,255,0.1)',
};

export const getColors = (isDarkMode: boolean) => (
  isDarkMode ? darkColors : lightColors
);

export type Colors = ReturnType<typeof getColors>;
