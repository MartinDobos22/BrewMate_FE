export const lightColors = {
  background: '#F4ECE6',
  cardBackground: '#FFFFFF',
  text: '#4E342E',
  textSecondary: '#6D4C41',
  primary: '#795548',
  primaryLight: '#A98274',
  secondary: '#C69C6D',
  danger: '#D32F2F',
  warning: '#FFA000',
  info: '#17a2b8',
  border: 'rgba(0,0,0,0.1)',
};

export const darkColors = {
  background: '#3E2723',
  cardBackground: '#4E342E',
  text: '#F5F5F5',
  textSecondary: '#D7CCC8',
  primary: '#A98274',
  primaryLight: '#D7BCA8',
  secondary: '#C69C6D',
  danger: '#EF5350',
  warning: '#FFB74D',
  info: '#4DD0E1',
  border: 'rgba(255,255,255,0.1)',
};

export const getColors = (isDarkMode: boolean) => (
  isDarkMode ? darkColors : lightColors
);

export type Colors = ReturnType<typeof getColors>;
