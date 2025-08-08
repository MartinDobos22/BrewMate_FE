// HomeScreen.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const homeStyles = (isDarkMode: boolean) => {
  const colors = {
    // Základné farby
    background: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    cardBackground: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#212529',
    textSecondary: isDarkMode ? '#adb5bd' : '#6c757d',

    // Akcentové farby
    primary: '#8B4513', // Hnedá káva
    primaryLight: '#D2691E',
    secondary: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',

    // Hranice a tiene
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    shadow: isDarkMode ? '#000000' : '#000000',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollView: {
      flex: 1,
    },

    // Header sekcia
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },

    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    avatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: `${colors.primary}88`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: colors.primary,
    },

    avatarText: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
    },

    greeting: {
      flex: 1,
    },

    greetingText: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },

    subGreeting: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    notificationBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },

    notificationIcon: {
      fontSize: 20,
    },

    notificationBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: colors.danger,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },

    badgeText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },

    logoutBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${colors.danger}22`,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.danger}44`,
    },

    logoutIcon: {
      fontSize: 20,
    },

    // Daily Tip Card
    tipCard: {
      marginHorizontal: 20,
      marginTop: 15,
      marginBottom: 20,
      padding: 18,
      backgroundColor: `${colors.primary}22`,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },

    tipTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },

    tipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },

    // Main Actions
    mainActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
      gap: 15,
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
        shadowColor: colors.shadow,
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
        shadowColor: colors.shadow,
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
      backgroundColor: isDarkMode ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.98)',
      paddingVertical: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      // Blur efekt
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
      fontSize: 24,
      marginBottom: 4,
    },

    navLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },

    activeNav: {
      color: colors.primaryLight,
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