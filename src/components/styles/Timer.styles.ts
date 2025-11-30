import { StyleSheet } from 'react-native';
import { scale } from '../../theme/responsive';
import { Colors } from '../../theme/colors';

/**
 * Creates themed styles for the countdown timer component.
 *
 * @param {Colors} colors - Theme color palette used to style text and buttons.
 * @returns {ReturnType<typeof StyleSheet.create>} StyleSheet for the timer layout.
 */
export const timerStyles = (colors: Colors): ReturnType<typeof StyleSheet.create> =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: scale(10),
    },
    time: {
      fontSize: scale(18),
      color: colors.text,
      marginRight: scale(10),
    },
    button: {
      paddingHorizontal: scale(12),
      paddingVertical: scale(6),
      borderRadius: scale(8),
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: '#fff',
      fontSize: scale(14),
      fontWeight: 'bold',
    },
  });
