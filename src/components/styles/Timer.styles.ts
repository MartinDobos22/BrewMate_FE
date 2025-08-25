import { StyleSheet } from 'react-native';
import { scale } from '../../theme/responsive';
import { Colors } from '../../theme/colors';

export const timerStyles = (colors: Colors) =>
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
