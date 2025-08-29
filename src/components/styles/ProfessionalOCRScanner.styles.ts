// ProfessionalOCRScanner.styles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

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

export const scannerStyles = (isDarkMode: boolean = false) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgLight,
    },

    scrollView: {
      flex: 1,
    },

    // Header - matching HomeScreen hero style
    header: {
      backgroundColor: colors.accent,
      margin: 16,
      padding: 24,
      borderRadius: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },

    title: {
      fontSize: 24,
      fontWeight: '700',
      color: 'white',
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 14,
      color: 'white',
      opacity: 0.95,
      textAlign: 'center',
    },

    // Main Actions - matching HomeScreen quick actions
    mainActions: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 20,
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

    cameraAction: {
      backgroundColor: colors.primary,
    },

    galleryAction: {
      backgroundColor: 'white',
    },

    actionIcon: {
      width: 56,
      height: 56,
      backgroundColor: 'rgba(107, 68, 35, 0.1)',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },

    primaryActionIcon: {
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    actionEmoji: {
      fontSize: 28,
    },

    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    cameraCloseText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    },

    scanFrame: {
      position: 'absolute',
      top: height * 0.25,
      left: width * 0.1,
      right: width * 0.1,
      height: height * 0.35,
      borderWidth: 2,
      borderColor: 'transparent',
    },

    scanCorner: {
      position: 'absolute',
      width: 40,
      height: 40,
      borderColor: colors.accent,
    },

    scanCornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: 3,
      borderLeftWidth: 3,
    },

    scanCornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
    },

    scanCornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
    },

    scanCornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
    },

    cameraInstructions: {
      position: 'absolute',
      top: height * 0.62,
      left: 0,
      right: 0,
      alignItems: 'center',
    },

    cameraInstructionText: {
      color: '#fff',
      fontSize: 14,
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },

    cameraControls: {
      position: 'absolute',
      bottom: 50,
      left: 0,
      right: 0,
      alignItems: 'center',
    },

    captureButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#fff',
    },

    captureInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#fff',
    },

    // Result Section - matching HomeScreen cards
    resultSection: {
      paddingHorizontal: 16,
      marginBottom: 20,
    },

    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },

    resultTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    matchBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },

    matchBadgeGood: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },

    matchBadgeFair: {
      backgroundColor: colors.warning,
      borderColor: colors.warning,
    },

    matchText: {
      fontSize: 13,
      fontWeight: '600',
      color: 'white',
    },

    resultCard: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    resultLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },

    resultTextInput: {
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },

    recommendationCard: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    recommendationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    recommendationText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    brewingCard: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    brewingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 12,
    },

    brewingMethod: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
      marginBottom: 8,
    },

    brewingMethodSelected: {
      backgroundColor: colors.bgLight,
    },

    brewingText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    // Rating Section
    ratingSection: {
      alignItems: 'center',
      marginVertical: 20,
    },

    ratingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 12,
    },

    ratingStars: {
      flexDirection: 'row',
      gap: 10,
    },

    starButton: {
      padding: 5,
    },

    starText: {
      fontSize: 30,
    },

    recipeSection: {
      marginBottom: 16,
    },

    recipeTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    tasteQuestion: {
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 8,
    },

    tasteInput: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 12,
      padding: 12,
      color: colors.textPrimary,
      marginBottom: 12,
      backgroundColor: 'white',
    },

    recipeButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },

    recipeButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 15,
    },

    recipeCard: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    recipeResultTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },

    recipeResultText: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    // Result Actions
    resultActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },

    shareButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },

    clearButton: {
      flex: 1,
      backgroundColor: colors.danger,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },

    buttonText: {
      color: 'white',
      fontSize: 15,
      fontWeight: '600',
    },

    // History Section - matching HomeScreen recommendations
    historySection: {
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 100,
    },

    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },

    historyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    historyToggle: {
      fontSize: 16,
      color: colors.textSecondary,
    },

    historyList: {
      paddingBottom: 8,
    },

    historyItem: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },

    historyItemContent: {
      flex: 1,
    },

    historyItemName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },

    historyItemDate: {
      fontSize: 11,
      color: colors.textSecondary,
    },

    historyItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    historyItemMatch: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },

    historyItemRating: {
      fontSize: 12,
      color: colors.warning,
    },

    emptyHistoryText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      paddingVertical: 20,
    },

    // Loading
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingText: {
      color: '#fff',
      fontSize: 16,
      marginTop: 15,
    },

    // Error
    errorText: {
      fontSize: 18,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 50,
    },

    // Back button
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 44 : 20,
      left: 16,
      width: 40,
      height: 40,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },

    backButtonText: {
      fontSize: 18,
      color: colors.primary,
    },
  });
};
