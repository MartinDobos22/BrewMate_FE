// ProfessionalOCRScanner.styles.ts
import { StyleSheet, Dimensions } from 'react-native';
import { getColors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export const scannerStyles = (isDarkMode: boolean) => {
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

    // Header
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 15,
      alignItems: 'center',
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Main Actions
    mainActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginTop: 10,
      marginBottom: 20,
      gap: 15,
    },

    actionCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 25,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...(!isDarkMode && {
        shadowColor: shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }),
    },

    cameraAction: {
      backgroundColor: isDarkMode ? `${colors.primary}22` : `${colors.primary}11`,
      borderColor: `${colors.primary}44`,
    },

    galleryAction: {
      backgroundColor: isDarkMode ? `${colors.secondary}22` : `${colors.secondary}11`,
      borderColor: `${colors.secondary}44`,
    },

    actionIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },

    actionEmoji: {
      fontSize: 32,
    },

    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },

    actionDesc: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
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
      paddingTop: 50,
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
      borderColor: colors.primary,
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
      fontSize: 16,
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
      backgroundColor: colors.primary,
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

    // Result Section
    resultSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },

    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },

    resultTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },

    matchBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
    },

    matchBadgeGood: {
      backgroundColor: `${colors.secondary}22`,
    },

    matchBadgeFair: {
      backgroundColor: `${colors.warning}22`,
    },

    matchText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },

    resultCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },

    resultLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
    },

    resultTextInput: {
      fontSize: 15,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
    },

    recommendationCard: {
      backgroundColor: `${colors.info}11`,
      borderRadius: 16,
      padding: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: `${colors.info}33`,
    },

    recommendationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },

    recommendationText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },

    // Rating Section
    ratingSection: {
      alignItems: 'center',
      marginVertical: 15,
    },

    ratingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 10,
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

    // Result Actions
    resultActions: {
      flexDirection: 'row',
      gap: 15,
      marginTop: 10,
    },

    shareButton: {
      flex: 1,
      backgroundColor: colors.info,
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
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },

    // History Section
    historySection: {
      paddingHorizontal: 20,
      marginTop: 20,
      marginBottom: 30,
    },

    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    historyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },

    historyToggle: {
      fontSize: 16,
      color: colors.textSecondary,
    },

    historyList: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },

    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderWidth: 1,
      borderColor: colors.border,
    },

    historyItemContent: {
      flex: 1,
    },

    historyItemName: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 3,
    },

    historyItemDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },

    historyItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    historyItemMatch: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },

    historyItemRating: {
      fontSize: 13,
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
      color: colors.text,
      textAlign: 'center',
      marginTop: 50,
    },
  });
};