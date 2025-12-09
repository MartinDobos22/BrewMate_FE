import { StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { getSafeAreaBottom } from '../utils/safeArea';

const BASE_NAV_HEIGHT = 60;
const CONTENT_GAP = 12;

const createMetrics = (safeBottom: number) => {
  const inset = Math.max(0, safeBottom);
  const height = BASE_NAV_HEIGHT + inset;
  const contentOffset = Math.max(height - CONTENT_GAP, 0);

  return { inset, height, contentOffset };
};

// Estimated height of the bottom navigation bar used to offset scrollable
// content so it isn't hidden behind the menu.
export const BOTTOM_NAV_HEIGHT = createMetrics(getSafeAreaBottom()).height;

// Recommended padding value for scrollable screens so content sits just above
// the bottom navigation while keeping a small visual gap.
export const BOTTOM_NAV_CONTENT_OFFSET = createMetrics(getSafeAreaBottom()).contentOffset;

export const getBottomNavMetrics = (safeBottom: number = getSafeAreaBottom()) =>
  createMetrics(safeBottom);

/**
 * Creates styled definitions for the bottom navigation bar with safe-area awareness.
 *
 * @param {Colors} colors - Current theme palette to align navigation colors with the rest of the UI.
 * @returns {ReturnType<typeof StyleSheet.create>} StyleSheet containing container and navigation item styles.
 */
export const bottomNavStyles = (
  colors: Colors,
  safeBottom: number = getSafeAreaBottom(),
): ReturnType<typeof StyleSheet.create> => {
  const metrics = createMetrics(safeBottom);

  return StyleSheet.create({
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: metrics.height,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 12,
      paddingBottom: metrics.inset,
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
};
