import React, { JSX } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'src/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomNavStyles, getBottomNavMetrics } from '../styles/BottomNav.styles';

export type NavItem = 'home' | 'discover' | 'recipes' | 'favorites' | 'profile';

interface BottomNavProps {
  active: NavItem;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
}

/**
 * Renders the primary bottom navigation bar for switching between main app sections.
 *
 * @param {BottomNavProps} props - Component props describing the active tab and navigation callbacks.
 * @param {NavItem} props.active - Identifier of the currently active navigation item.
 * @param {() => void} props.onHomePress - Handler invoked when the home tab is selected.
 * @param {() => void} props.onDiscoverPress - Handler invoked when the discover tab is selected.
 * @param {() => void} props.onRecipesPress - Handler invoked when the recipes tab is selected.
 * @param {() => void} props.onFavoritesPress - Handler invoked when the favorites tab is selected.
 * @param {() => void} props.onProfilePress - Handler invoked when the profile tab is selected.
 * @returns {JSX.Element} Rendered bottom navigation component with emojis representing each destination.
 */
const BottomNav: React.FC<BottomNavProps> = ({
  active,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}: BottomNavProps): JSX.Element => {
  const { bottom } = useSafeAreaInsets();
  const { inset } = getBottomNavMetrics(bottom);
  const { colors } = useTheme();
  const styles = bottomNavStyles(colors, inset);

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={onHomePress}>
        <Text style={[styles.navIcon, active === 'home' && styles.navActive]}>
          🏠
        </Text>
        <Text style={[styles.navLabel, active === 'home' && styles.navActive]}>
          Domov
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onDiscoverPress}>
        <Text
          style={[styles.navIcon, active === 'discover' && styles.navActive]}
        >
          🔍
        </Text>
        <Text
          style={[styles.navLabel, active === 'discover' && styles.navActive]}
        >
          Moje kávy
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onRecipesPress}>
        <Text
          style={[styles.navIcon, active === 'recipes' && styles.navActive]}
        >
          📖
        </Text>
        <Text
          style={[styles.navLabel, active === 'recipes' && styles.navActive]}
        >
          Recepty
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onFavoritesPress}>
        <Text
          style={[styles.navIcon, active === 'favorites' && styles.navActive]}
        >
          ❤️
        </Text>
        <Text
          style={[styles.navLabel, active === 'favorites' && styles.navActive]}
        >
          Tipy
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onProfilePress}>
        <Text
          style={[styles.navIcon, active === 'profile' && styles.navActive]}
        >
          👤
        </Text>
        <Text
          style={[styles.navLabel, active === 'profile' && styles.navActive]}
        >
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default BottomNav;

// Re-export height constant for convenience when offsetting screen content
export { BOTTOM_NAV_HEIGHT, BOTTOM_NAV_CONTENT_OFFSET } from '../styles/BottomNav.styles';
