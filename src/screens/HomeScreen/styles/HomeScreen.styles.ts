// HomeScreen.styles.ts
import { StyleSheet, Platform } from 'react-native';
import { scale, verticalScale } from '../../../theme/responsive';

const palette = {
  coffeeBlack: '#1A0F08',
  espresso: '#6B4423',
  mocha: '#8B6544',
  latte: '#C8A882',
  cappuccino: '#D4A574',
  cream: '#F5EFE9',
  foam: '#FFF8ED',
  surfacePrimary: '#FAF8F5',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#FFF9F5',
  accentOrange: '#FF8C42',
  accentCoral: '#FF6B6B',
  accentAmber: '#FFA000',
  accentTeal: '#00897B',
  accentPurple: '#7E57C2',
  textPrimary: '#2C1810',
  textSecondary: '#5D4E37',
  textTertiary: '#8B7355',
  borderGlass: 'rgba(139, 111, 71, 0.12)',
};

export const homeStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.surfacePrimary,
      position: 'relative',
    },
    gradientBackground: {
      flex: 1,
      paddingBottom: verticalScale(12),
    },

    // App Header
    appHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(24),
      paddingVertical: verticalScale(12),
      backgroundColor: palette.surfacePrimary,
    },
    logoSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: palette.espresso,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoIcon: {
      fontSize: 20,
      color: '#FFFFFF',
    },
    logoText: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.espresso,
      letterSpacing: -0.3,
      marginLeft: 12,
    },
    appTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.espresso,
      letterSpacing: -0.3,
      marginLeft: 12,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notificationBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderWidth: 1,
      borderColor: palette.borderGlass,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationIcon: {
      fontSize: 18,
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: palette.accentCoral,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: palette.surfacePrimary,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    profileAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: palette.accentAmber,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },

    // Main Content
    mainContent: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: verticalScale(140),
      paddingHorizontal: scale(20),
    },
    ritualWrapper: {
      marginTop: verticalScale(8),
      marginBottom: verticalScale(16),
    },

    // Welcome Card
    welcomeCard: {
      borderRadius: 28,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
      marginBottom: verticalScale(16),
    },
    welcomeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    welcomeLeft: {
      flex: 1,
      marginRight: 12,
    },
    greetingTime: {
      color: '#FFFFFF',
      fontSize: 13,
      opacity: 0.9,
      marginBottom: 4,
    },
    userName: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 12,
    },
    coffeeSuggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    coffeeSuggestionIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    coffeeSuggestionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    weatherDisplay: {
      alignItems: 'flex-end',
    },
    weatherIconLarge: {
      fontSize: 48,
      marginBottom: 4,
    },
    weatherTemp: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    // Weather Widget
    weatherWidget: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderWidth: 1,
      borderColor: palette.borderGlass,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: verticalScale(16),
    },
    weatherLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    weatherLocationIcon: {
      marginRight: 6,
      fontSize: 14,
    },
    weatherLocation: {
      fontSize: 13,
      color: palette.textSecondary,
      fontWeight: '600',
    },
    weatherDetails: {
      fontSize: 14,
      color: palette.textPrimary,
      fontWeight: '600',
    },
    idealCoffee: {
      alignItems: 'flex-end',
    },
    idealLabel: {
      fontSize: 11,
      color: palette.textTertiary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    idealType: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.espresso,
    },

    // Tips
    tipSection: {
      marginBottom: verticalScale(16),
    },
    tipFeedback: {
      padding: 20,
      borderRadius: 20,
      backgroundColor: palette.surfaceCard,
      borderWidth: 1,
      borderColor: palette.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipFeedbackText: {
      color: palette.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    tipRetry: {
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: palette.accentOrange,
    },
    tipRetryText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    savedTipsLink: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      marginTop: 12,
    },
    savedTipsLinkText: {
      color: palette.espresso,
      fontWeight: '600',
      fontSize: 13,
    },

    // Stats
    statsCard: {
      backgroundColor: palette.surfaceCard,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.borderGlass,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: verticalScale(16),
    },
    statsHeader: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: palette.textTertiary,
      marginTop: 4,
    },
    statsFeedback: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    statsFeedbackText: {
      color: palette.textSecondary,
      marginTop: 8,
    },
    statsErrorText: {
      color: palette.accentCoral,
      fontSize: 12,
      marginBottom: 8,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statItem: {
      flex: 1,
      backgroundColor: palette.surfaceElevated,
      padding: 16,
      borderRadius: 18,
      marginHorizontal: 6,
    },
    statsActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
    },
    statsLink: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      alignItems: 'center',
      marginRight: 12,
    },
    statsLinkText: {
      color: palette.espresso,
      fontWeight: '600',
      fontSize: 13,
    },
    statsLinkPrimary: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: palette.accentOrange,
      alignItems: 'center',
    },
    statsLinkPrimaryText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    statLabel: {
      fontSize: 12,
      color: palette.textTertiary,
      marginBottom: 8,
      fontWeight: '600',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.espresso,
    },

    // Quick Actions
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: verticalScale(8),
    },
    actionCardWrapper: {
      width: '48%',
      marginBottom: 12,
    },
    actionCard: {
      borderRadius: 22,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    actionIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    actionTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 4,
    },
    actionSubtitle: {
      color: '#FFFFFF',
      fontSize: 11,
      opacity: 0.9,
    },

    // Taste profile
    tasteProfileSection: {
      marginTop: 4,
      marginBottom: verticalScale(16),
    },
    tasteProfileCard: {
      backgroundColor: palette.surfaceCard,
      borderRadius: 28,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.borderGlass,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    tasteProfileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    tasteProfileTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    tasteProfileSubtitle: {
      fontSize: 12,
      color: palette.textTertiary,
      marginTop: 4,
    },
    tasteProfileEditButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: palette.cream,
    },
    tasteProfileEditButtonText: {
      color: palette.espresso,
      fontWeight: '600',
    },
    tasteProfileLoading: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    tasteProfileLoadingText: {
      color: palette.textSecondary,
      marginTop: 12,
    },
    tasteProfileError: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    tasteProfileErrorText: {
      color: palette.accentCoral,
      textAlign: 'center',
      fontSize: 13,
      marginBottom: 12,
    },
    tasteProfileRetryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: palette.accentOrange,
    },
    tasteProfileRetryText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    tasteProfileEmpty: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    tasteProfileEmptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 8,
    },
    tasteProfileEmptyText: {
      fontSize: 13,
      color: palette.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    tasteProfileChartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 12,
    },

    // Inventory / Coffee cards
    inventorySection: {
      marginTop: 4,
      marginBottom: verticalScale(16),
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: palette.accentOrange,
    },
    sectionBadgeText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    emptyStateText: {
      color: palette.textTertiary,
      fontSize: 13,
    },
    coffeeCarousel: {
      paddingRight: scale(8),
    },
    coffeeCard: {
      width: scale(240),
      backgroundColor: palette.surfaceCard,
      borderRadius: 22,
      padding: 18,
      marginRight: 12,
      borderWidth: 1,
      borderColor: palette.borderGlass,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    coffeeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    coffeeBrand: {
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: palette.textTertiary,
      fontWeight: '700',
    },
    coffeeRating: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.accentAmber,
    },
    coffeeName: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
      marginBottom: 8,
    },
    coffeeTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    coffeeTag: {
      backgroundColor: palette.cream,
      color: palette.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 6,
    },
    coffeeOrigin: {
      fontSize: 12,
      color: palette.textSecondary,
      marginBottom: 4,
    },
    coffeeMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    coffeeMatch: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    matchScore: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.accentOrange,
    },
    brewButton: {
      marginTop: 4,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: palette.espresso,
      alignItems: 'center',
    },
    brewButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    coffeeImage: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: palette.cream,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    coffeeEmoji: {
      fontSize: 24,
    },

    // Insight
    insightCard: {
      backgroundColor: palette.surfaceElevated,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.borderGlass,
      marginBottom: verticalScale(16),
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    insightIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: palette.accentAmber,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    insightLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    insightText: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.textPrimary,
      fontStyle: 'italic',
      marginBottom: 12,
    },
    insightFooter: {
      fontSize: 13,
      color: palette.textSecondary,
      fontWeight: '600',
    },

    // Activity
    activitySection: {
      marginBottom: verticalScale(16),
    },
    sectionLink: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
    },
    sectionLinkText: {
      color: palette.espresso,
      fontWeight: '600',
      fontSize: 12,
    },
    activityList: {
      backgroundColor: palette.surfaceCard,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.borderGlass,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.cream,
    },
    activityIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: palette.cream,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    activityIcon: {
      fontSize: 22,
    },
    activityDetails: {
      flex: 1,
    },
    activityName: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.textPrimary,
      marginBottom: 4,
    },
    activityTime: {
      fontSize: 12,
      color: palette.textTertiary,
    },
    activityScore: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.accentOrange,
    },

    // Floating action button
    fab: {
      position: 'absolute',
      right: scale(24),
      bottom: verticalScale(104),
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: palette.accentCoral,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 10,
    },
    fabIcon: {
      fontSize: 26,
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // Legacy helpers for other screens
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
  });
