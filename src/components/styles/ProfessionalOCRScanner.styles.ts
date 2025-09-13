// ProfessionalOCRScanner.styles.ts - Coffee-themed Elegant Design
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

const colors = {
  // Coffee-inspired palette
  primary: '#8B6F47',  // Coffee brown
  primaryLight: '#A68B5B',  // Light coffee
  primaryDark: '#6F5339',  // Dark coffee

  accent: '#D4A574',  // Cream/Latte
  accentLight: '#F5E6D3',  // Light cream
  accentDark: '#B8935F',  // Dark cream

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#FAF8F5',  // Very light coffee tint
  backgroundTertiary: '#F5F2ED',  // Slightly darker coffee tint
  surface: '#FFFFFF',

  // Text
  textPrimary: '#2C2825',  // Almost black coffee
  textSecondary: '#5C5248',  // Medium brown
  textTertiary: '#8B7F72',  // Light brown
  textLight: '#FFFFFF',

  // Status
  success: '#7CB342',  // Green coffee bean
  warning: '#FFA726',  // Orange
  danger: '#E57373',  // Soft red

  // Borders & Shadows
  border: '#E8E4DE',  // Coffee cream border
  borderLight: '#F2EFE9',
  shadow: 'rgba(139, 111, 71, 0.08)',  // Coffee-tinted shadow
};

export const scannerStyles = (isDarkMode: boolean = false) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 20,
    },

    connectionBanner: {
      padding: 6,
      alignItems: 'center',
    },
    bannerOnline: {
      backgroundColor: colors.success,
    },
    bannerOffline: {
      backgroundColor: colors.danger,
    },
    bannerText: {
      color: colors.textLight,
      fontWeight: '600',
    },
    offlineModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    offlineModalContent: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 10,
      width: '80%',
      alignItems: 'center',
    },
    offlineModalText: {
      fontSize: 16,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 20,
    },

    // Elegant Header
    header: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: colors.background,
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },

    coffeeIcon: {
      fontSize: 20,
      marginRight: 8,
    },

    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },

    headerSubtitle: {
      fontSize: 13,
      color: colors.textTertiary,
      marginTop: 2,
    },

    // Elegant Action Cards
    actionSection: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },

    actionGrid: {
      flexDirection: 'row',
      gap: 12,
    },

    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,

      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 2,
    },

    actionCardPrimary: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },

    actionIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },

    actionIconContainerPrimary: {
      backgroundColor: colors.accent,
    },

    actionIcon: {
      fontSize: 24,
    },

    actionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 2,
    },

    actionSublabel: {
      fontSize: 11,
      color: colors.textTertiary,
      textAlign: 'center',
    },

    // Compact Action Buttons Alternative
    compactActions: {
      paddingHorizontal: 16,
      marginBottom: 20,
      gap: 10,
    },

    compactActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    compactActionPrimary: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },

    compactActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },

    compactActionIconPrimary: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },

    compactActionText: {
      flex: 1,
    },

    compactActionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 1,
    },

    compactActionDesc: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    compactActionArrow: {
      fontSize: 16,
      color: colors.textTertiary,
    },

    // Statistics Bar
    statsContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 16,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },

    statItem: {
      flex: 1,
      alignItems: 'center',
    },

    statNumber: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 2,
    },

    statLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    statDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginHorizontal: 12,
    },

    // History Section
    historySection: {
      paddingHorizontal: 16,
    },

    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },

    historyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    historyFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
    },

    historyFilterText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },

    // History Grid
    historyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -5,
    },

    historyCard: {
      width: '50%',
      paddingHorizontal: 5,
      marginBottom: 10,
    },

    historyCardInner: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
      minHeight: 85,
    },

    historyCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },

    historyCardName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginRight: 6,
    },

    historyCardPercentage: {
      backgroundColor: colors.accentLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },

    historyCardPercentageText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primaryDark,
    },

    historyCardDate: {
      fontSize: 11,
      color: colors.textTertiary,
      marginBottom: 4,
    },

    historyCardRating: {
      fontSize: 11,
      marginTop: 4,
    },

    // Empty State
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 40,
    },

    emptyStateImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },

    emptyStateIcon: {
      fontSize: 40,
    },

    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 6,
    },

    emptyStateDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },

    // Camera View
    cameraContainer: {
      flex: 1,
      backgroundColor: '#000',
    },

    camera: {
      flex: 1,
    },

    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
    },

    cameraHeader: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingHorizontal: 20,
      alignItems: 'flex-end',
    },

    cameraCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    cameraCloseText: {
      color: colors.textLight,
      fontSize: 18,
    },

    scanFrame: {
      position: 'absolute',
      top: height * 0.25,
      left: width * 0.1,
      right: width * 0.1,
      height: height * 0.35,
    },

    scanCorner: {
      position: 'absolute',
      width: 40,
      height: 40,
    },

    scanCornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderColor: colors.accent,
    },

    scanCornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderColor: colors.accent,
    },

    scanCornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderColor: colors.accent,
    },

    scanCornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderColor: colors.accent,
    },

    cameraInstructions: {
      position: 'absolute',
      bottom: 200,
      left: 20,
      right: 20,
      alignItems: 'center',
    },

    cameraInstructionText: {
      color: colors.textLight,
      fontSize: 14,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },

    cameraControls: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
    },

    captureButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },

    captureInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
    },

    // Results Section
    resultContainer: {
      padding: 16,
    },

    resultCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },

    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },

    resultTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    matchBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },

    matchBadgeGood: {
      backgroundColor: colors.success,
    },

    matchBadgeFair: {
      backgroundColor: colors.warning,
    },

    matchText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textLight,
    },

    resultTextInput: {
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 80,
      textAlignVertical: 'top',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },

    resultLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    // Recommendation
    recommendationCard: {
      backgroundColor: colors.accentLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },

    recommendationTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 6,
    },

    recommendationText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },

    purchaseContainer: {
      marginTop: 12,
    },

    purchaseLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    // Action Buttons
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },

    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },

    buttonSecondary: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },

    buttonSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
    },

    submitButton: {
      marginTop: 10,
    },

    buttonDisabled: {
      opacity: 0.5,
    },

    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textLight,
    },

    buttonTextSecondary: {
      color: colors.textPrimary,
    },

    // Rating
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      marginBottom: 12,
    },

    ratingLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginRight: 10,
    },

    ratingStars: {
      flexDirection: 'row',
      gap: 4,
    },

    starButton: {
      padding: 2,
    },

    starText: {
      fontSize: 20,
    },

    // Brewing Methods
    brewingSection: {
      padding: 16,
      paddingTop: 0,
    },

    brewingTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 10,
    },

    brewingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },

    brewingMethod: {
      width: '25%',
      paddingHorizontal: 4,
      marginBottom: 8,
    },

    brewingButton: {
      paddingVertical: 9,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    brewingButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    brewingText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textPrimary,
    },

    brewingTextSelected: {
      color: colors.textLight,
    },

    // Taste Input
    tasteSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },

    tasteLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    tasteInput: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // Generate Button
    generateButton: {
      backgroundColor: colors.accent,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',

      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },

    generateButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    // Loading
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      minWidth: 180,
    },

    loadingText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      marginTop: 10,
    },

    // Mini header for scanner pages
    miniHeader: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: colors.background,
    },

    miniTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
  });
};