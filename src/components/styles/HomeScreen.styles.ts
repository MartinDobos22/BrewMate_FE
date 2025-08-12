// HomeScreen.styles.ts
import { StyleSheet } from 'react-native';
import { getColors } from '../../theme/colors';
import { scale } from '../../theme/responsive';

export const homeStyles = (isDarkMode: boolean) => {
  const colors = getColors(isDarkMode);
  const shadow = '#000000';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollView: {
      flex: 1,
    },

    // Top App Bar
    appBar: {
      height: scale(56),
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scale(20),
    },

    appTitle: {
      color: '#ffffff',
      fontSize: scale(20),
      fontWeight: '600',
    },

    appBarActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    appAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    avatarText: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '600',
    },

    appLogout: {
      padding: 4,
    },

    logoutIcon: {
      fontSize: 20,
      color: '#ffffff',
    },

    // Hero greeting card
    heroCard: {
      margin: scale(20),
      marginTop: scale(16),
      padding: scale(20),
      backgroundColor: colors.primary,
      borderRadius: 16,
    },

    heroGreeting: {
      fontSize: scale(22),
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: scale(4),
    },

    heroSub: {
      fontSize: scale(14),
      color: '#ffffff',
    },

    // Daily Tip Card
    tipCard: {
      marginHorizontal: scale(20),
      marginTop: scale(15),
      marginBottom: scale(20),
      padding: scale(18),
      backgroundColor: `${colors.primary}22`,
      borderRadius: 16,
      borderLeftWidth: scale(4),
      borderLeftColor: colors.primary,
    },

    tipTitle: {
      fontSize: scale(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: scale(6),
    },

    tipText: {
      fontSize: scale(14),
      color: colors.textSecondary,
      fontStyle: 'italic',
    },

    // Main Actions
    mainActions: {
      flexDirection: 'row',
      paddingHorizontal: scale(20),
      marginBottom: scale(20),
      gap: scale(15),
    },

    actionCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      // Tiene pre svetlý režim
      ...(!isDarkMode && {
        shadowColor: shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }),
    },

    primaryAction: {
      backgroundColor: isDarkMode ? `${colors.primary}22` : `${colors.primary}11`,
      borderColor: `${colors.primary}44`,
    },

    actionIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },

    actionEmoji: {
      fontSize: 28,
    },

    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },

    actionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Stats sekcia
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 25,
      gap: 12,
    },

    statCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      padding: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primaryLight,
      marginBottom: 4,
    },

    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Sekcie
    section: {
      marginBottom: 25,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 15,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },

    seeAll: {
      fontSize: 14,
      color: colors.primaryLight,
      fontWeight: '500',
    },

    horizontalScroll: {
      paddingLeft: 20,
    },

    // Coffee Cards
    coffeeCard: {
      width: 140,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 15,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...(!isDarkMode && {
        shadowColor: shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }),
    },

    coffeeImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: `${colors.primary}22`,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 10,
    },

    scannedImage: {
      backgroundColor: `${colors.secondary}22`,
    },

    coffeeEmoji: {
      fontSize: 30,
    },

    coffeeName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 5,
      textAlign: 'center',
    },

    coffeeRating: {
      fontSize: 13,
      color: colors.warning,
      textAlign: 'center',
      marginBottom: 6,
    },

    matchBadge: {
      backgroundColor: `${colors.secondary}22`,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      alignSelf: 'center',
    },

    matchText: {
      fontSize: 11,
      color: colors.secondary,
      fontWeight: '500',
    },

    recommendStatus: {
      fontSize: 12,
      textAlign: 'center',
      fontWeight: '500',
    },

    recommended: {
      color: colors.secondary,
    },

    notRecommended: {
      color: colors.textSecondary,
    },

    // Bottom Navigation
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      paddingVertical: scale(12),
      paddingHorizontal: scale(20),
      paddingBottom: scale(20),
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...(isDarkMode && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }),
    },

    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 5,
    },

    navIcon: {
      fontSize: scale(24),
      marginBottom: 4,
    },

    navLabel: {
      fontSize: scale(11),
      color: colors.textSecondary,
    },

    activeNav: {
      color: colors.primary,
    },

    // Empty states
    emptyState: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed' as const,
    },

    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
};