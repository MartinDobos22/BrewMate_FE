import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors } from './colors';

interface ThemeContextProps {
  isDark: boolean;
  colors: Colors;
  setScheme: (scheme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  isDark: false,
  colors: getColors(false),
  setScheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState<'light' | 'dark'>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    if (systemScheme) {
      setScheme(systemScheme === 'dark' ? 'dark' : 'light');
    }
  }, [systemScheme]);

  const colors = getColors(scheme === 'dark');

  return (
    <ThemeContext.Provider value={{ isDark: scheme === 'dark', colors, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
