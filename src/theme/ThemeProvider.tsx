import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors } from './colors';

interface ThemeContextProps {
  isDark: boolean;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextProps>({
  isDark: false,
  colors: getColors(false),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDark = useColorScheme() === 'dark';
  const colors = getColors(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
