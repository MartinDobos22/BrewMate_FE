// HomeScreen.styles.ts
import { StyleSheet, Platform } from 'react-native';
import { scale, verticalScale } from '../../theme/responsive';

const colors = {
  primary: '#6B4423',
  primaryLight: '#8B6544',
  primaryDark: '#4A2F18',
  accent: '#D2691E',
  success: '#4CAF50',
  warning: '#FFA726',
  danger: '#EF5350',
  bgLight: '#FAF7F5',
  bgDark: '#1A1A1A',
  cardLight: '#FFFFFF',
  cardDark: '#2A2A2A',
  textPrimary: '#2C2C2C',
  textSecondary: '#666666',
  borderLight: '#E0E0E0',
};

export const homeStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgLight,
    },

    // Status Bar
    statusBar: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(8),
      paddingTop: Platform.OS === 'ios' ? verticalScale(44) : verticalScale(8),
    },
    statusTime: {
      color: 'white',
      fontSize: 13,
      fontWeight: '600',
    },
    statusIcons: {
      flexDirection: 'row',
      gap: 6,
    },

    // App Header
    appHeader: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(16),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    appLogo: {
      width: 32,
      height: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoIcon: {
      fontSize: 18,
    },
    appTitle: {
      color: 'white',
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    notificationBtn: {
      width: 36,
      height: 36,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    notificationIcon: {
      fontSize: 18,
    },
    notificationBadge: {
      position: 'absolute',
      top: verticalScale(-2),
      right: -2,
      width: 18,
      height: 18,
      backgroundColor: colors.danger,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    badgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    userAvatar: {
      width: 36,
      height: 36,
      backgroundColor: colors.accent,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },

    // Main Content
    mainContent: {
      flex: 1,
      backgroundColor: colors.bgLight,
    },

    // Hero Welcome Card
    heroWelcome: {
      backgroundColor: colors.accent,
      margin: 16,
      padding: 24,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    welcomeText: {
      color: 'white',
      fontSize: 14,
      opacity: 0.9,
      marginBottom: verticalScale(4),
    },
    welcomeName: {
      color: 'white',
      fontSize: 24,
      fontWeight: '700',
      marginBottom: verticalScale(8),
    },
    coffeeStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusIcon: {
      width: 20,
      height: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      color: 'white',
      fontSize: 14,
      opacity: 0.95,
    },

    statsSection: {
      marginHorizontal: 16,
      marginBottom: verticalScale(16),
      padding: 20,
      backgroundColor: colors.cardLight,
      borderRadius: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 5,
    },
    statsHeader: {
      marginBottom: verticalScale(16),
    },
    statsSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: verticalScale(4),
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#F3E4D7',
      borderRadius: 14,
      paddingVertical: verticalScale(16),
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    statValue: {
      marginTop: verticalScale(8),
      fontSize: 22,
      fontWeight: '700',
      color: colors.primaryDark,
    },
    statsFeedback: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    statsFeedbackText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    statsErrorText: {
      color: colors.danger,
      fontSize: 13,
      marginBottom: verticalScale(12),
    },

    // Weather Widget
    weatherWidget: {
      marginHorizontal: 16,
      marginBottom: verticalScale(16),
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    weatherSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    weatherIcon: {
      width: 48,
      height: 48,
      backgroundColor: '#FFB74D',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    weatherEmoji: {
      fontSize: 24,
    },
    weatherInfo: {
      justifyContent: 'center',
    },
    weatherLocation: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: verticalScale(2),
    },
    weatherTemp: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    coffeeSuggestion: {
      alignItems: 'flex-end',
    },
    suggestionLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: verticalScale(4),
    },
    suggestionName: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    suggestionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },

    coffeeTip: {
      marginHorizontal: 16,
      marginBottom: verticalScale(16),
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    coffeeTipText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    tipFeedback: {
      backgroundColor: colors.cardLight,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    tipFeedbackText: {
      color: colors.textPrimary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    tipRetry: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: verticalScale(10),
      borderRadius: 12,
    },
    tipRetryText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
    savedTipsLink: {
      marginTop: verticalScale(12),
      alignSelf: 'center',
    },
    savedTipsLinkText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
      textDecorationLine: 'underline',
    },

    // Quick Actions
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: 16,
      marginBottom: verticalScale(20),
      gap: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryAction: {
      backgroundColor: colors.primary,
    },
    actionIcon: {
      width: 56,
      height: 56,
      backgroundColor: 'rgba(107, 68, 35, 0.1)',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: verticalScale(12),
    },
    actionEmoji: {
      fontSize: 28,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: verticalScale(4),
      textAlign: 'center',
    },
    actionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      opacity: 0.8,
      textAlign: 'center',
    },
    primaryText: {
      color: 'white',
    },

    brewDiarySection: {
      marginHorizontal: 16,
      marginBottom: verticalScale(20),
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    brewDiaryActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: verticalScale(12),
    },
    brewDiaryButton: {
      flex: 1,
      paddingVertical: verticalScale(14),
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brewDiaryPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    brewDiaryButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
    brewDiaryButtonSecondaryText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },

    // Coffee Inventory
    coffeeInventory: {
      marginHorizontal: 16,
      marginBottom: verticalScale(20),
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      alignItems: 'center',
    },
    inventoryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: verticalScale(8),
    },
    inventoryCount: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.primary,
    },

    // Taste Profile
    tasteProfile: {
      marginHorizontal: 16,
      marginBottom: verticalScale(20),
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    profileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(16),
    },
    profileTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    editBtn: {
      paddingHorizontal: 8,
      paddingVertical: verticalScale(4),
      backgroundColor: 'rgba(107, 68, 35, 0.1)',
      borderRadius: 8,
    },
    editBtnText: {
      fontSize: 12,
      color: colors.primary,
    },
    tasteTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tasteTag: {
      paddingHorizontal: 14,
      paddingVertical: verticalScale(8),
      backgroundColor: colors.bgLight,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: verticalScale(8),
      marginRight: 8,
    },
    tasteTagActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tasteTagText: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    tasteTagTextActive: {
      color: 'white',
    },

    // Recommendations
    recommendations: {
      marginHorizontal: 16,
      marginBottom: verticalScale(100),
    },
    recentScans: {
      marginHorizontal: 16,
      marginBottom: verticalScale(24),
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(16),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    seeAllText: {
      fontSize: 13,
      color: colors.primary,
    },
    seeAllArrow: {
      fontSize: 13,
      color: colors.primary,
    },
    coffeeCards: {
      paddingBottom: verticalScale(8),
    },
    coffeeCard: {
      width: 150,
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    coffeeBadge: {
      position: 'absolute',
      top: verticalScale(8),
      right: 8,
      width: 24,
      height: 24,
      backgroundColor: colors.success,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    badgeCheck: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    coffeeImage: {
      width: 80,
      height: 80,
      backgroundColor: colors.accent,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: verticalScale(12),
    },
    coffeeEmoji: {
      fontSize: 36,
    },
    coffeeName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: verticalScale(4),
      textAlign: 'center',
    },
    coffeeOrigin: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: verticalScale(8),
    },
    coffeeMatch: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: verticalScale(8),
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    matchScore: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    coffeeRating: {
      fontSize: 12,
      color: colors.warning,
    },

  });
};
