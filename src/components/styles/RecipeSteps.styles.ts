import { StyleSheet } from 'react-native';
import { scale } from '../../theme/responsive';
import { Colors } from '../../theme/colors';

/**
 * Generates themed styles for the recipe steps walkthrough screen.
 *
 * @param {Colors} colors - Current theme palette to colorize backgrounds and text.
 * @returns {ReturnType<typeof StyleSheet.create>} StyleSheet object applied to recipe step components.
 */
export const recipeStepsStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      padding: scale(20),
    },
    backButton: {
      paddingHorizontal: scale(15),
      paddingVertical: scale(8),
      borderRadius: scale(15),
      backgroundColor: colors.primary,
    },
    backButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: scale(14),
    },
    content: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: scale(20),
      paddingTop: scale(20),
    },
    stepCounter: {
      fontSize: scale(18),
      color: colors.text,
      marginBottom: scale(10),
    },
    stepCard: {
      width: '90%',
      backgroundColor: colors.cardBackground,
      borderRadius: scale(12),
      padding: scale(20),
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: scale(6),
      elevation: 3,
    },
    stepIcon: {
      fontSize: scale(48),
      marginBottom: scale(10),
    },
    stepText: {
      fontSize: scale(16),
      color: colors.text,
      textAlign: 'center',
    },
    stepBullet: {
      fontSize: scale(16),
      color: colors.text,
      textAlign: 'left',
      alignSelf: 'stretch',
      marginBottom: scale(8),
    },
    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: scale(20),
    },
    navButton: {
      flex: 1,
      paddingVertical: scale(12),
      marginHorizontal: scale(5),
      borderRadius: scale(12),
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    navButtonText: {
      color: '#fff',
      fontSize: scale(14),
      fontWeight: 'bold',
    },
  });
