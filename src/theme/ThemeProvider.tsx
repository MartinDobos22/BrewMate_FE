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

/**
 * Provides theme colors and scheme toggling based on system preference or manual overrides.
 *
 * @param {{ children: React.ReactNode }} props - Provider properties.
 * @param {React.ReactNode} props.children - React tree that consumes the theme context.
 * @returns {JSX.Element} Context provider exposing color palette and setter for scheme.
 */
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

/**
 * Accessor hook for the theme context to retrieve colors and scheme toggling.
 *
 * @returns {ThemeContextProps} Current theme state including palette and setter.
 */
export const useTheme = () => useContext(ThemeContext);
