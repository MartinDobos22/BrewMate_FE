import { StyleSheet } from 'react-native';
import { scale } from '../../theme/responsive';
import { Colors } from '../../theme/colors';

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
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: scale(20),
    },
    stepCounter: {
      fontSize: scale(18),
      color: colors.text,
      marginBottom: scale(10),
    },
    stepIcon: {
      fontSize: scale(64),
      marginBottom: scale(20),
    },
    stepText: {
      fontSize: scale(16),
      color: colors.text,
      textAlign: 'center',
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
