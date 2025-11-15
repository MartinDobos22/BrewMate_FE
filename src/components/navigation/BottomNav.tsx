import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'src/theme/ThemeProvider';
import { bottomNavStyles } from '../styles/BottomNav.styles';

export type NavItem = 'home' | 'discover' | 'recipes' | 'favorites' | 'profile';

interface BottomNavProps {
  active: NavItem;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
  active,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}) => {
  const { colors } = useTheme();
  const styles = bottomNavStyles(colors);

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={onHomePress}>
        <Text style={[styles.navIcon, active === 'home' && styles.navActive]}>🏠</Text>
        <Text style={[styles.navLabel, active === 'home' && styles.navActive]}>Domov</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onDiscoverPress}>
        <Text style={[styles.navIcon, active === 'discover' && styles.navActive]}>🔍</Text>
        <Text style={[styles.navLabel, active === 'discover' && styles.navActive]}>Moje kávy</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onRecipesPress}>
        <Text style={[styles.navIcon, active === 'recipes' && styles.navActive]}>📖</Text>
        <Text style={[styles.navLabel, active === 'recipes' && styles.navActive]}>Recepty</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onFavoritesPress}>
        <Text style={[styles.navIcon, active === 'favorites' && styles.navActive]}>❤️</Text>
        <Text style={[styles.navLabel, active === 'favorites' && styles.navActive]}>Obľúbené</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onProfilePress}>
        <Text style={[styles.navIcon, active === 'profile' && styles.navActive]}>👤</Text>
        <Text style={[styles.navLabel, active === 'profile' && styles.navActive]}>Profil</Text>
      </TouchableOpacity>
    </View>
  );
};

export default BottomNav;

// Re-export height constant for convenience when offsetting screen content
export { BOTTOM_NAV_HEIGHT, BOTTOM_NAV_CONTENT_OFFSET } from '../styles/BottomNav.styles';
