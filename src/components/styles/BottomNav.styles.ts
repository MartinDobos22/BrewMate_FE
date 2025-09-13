import { StyleSheet, Platform } from 'react-native';
import { Colors } from '../../theme/colors';

// Estimated height of the bottom navigation bar used to offset scrollable
// content so it isn't hidden behind the menu.
export const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

export const bottomNavStyles = (colors: Colors) =>
  StyleSheet.create({
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: BOTTOM_NAV_HEIGHT,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 8,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,

      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      flexDirection: 'row',
      justifyContent: 'space-around',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 10,
    },
  navItem: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  navIcon: {
    fontSize: 24,
    lineHeight: 24,
    marginBottom: 2,
    color: colors.text,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
  },
  navActive: {
    color: colors.primary,
  },
});
