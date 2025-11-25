import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors } from './colors';

/**
 * Shape of the shared theme context consumed by components.
 *
 * This interface captures the current theme mode, resolved color tokens, and a
 * setter that allows components to override the system scheme.
 */
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
 * Provides theme context values to the React component tree.
 *
 * The provider reads the system color scheme, exposes a manual override, and
 * computes the active palette using {@link getColors}. All nested components
 * can consume the theme via {@link useTheme}.
 *
 * @param children - Application subtree that should receive themed styling.
 * @returns Provider element wrapping the supplied children.
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
 * Hook for consuming the shared theme values within functional components.
 *
 * @returns The current theme context containing palette tokens and scheme
 *   controls.
 */
export const useTheme = () => useContext(ThemeContext);
