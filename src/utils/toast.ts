import { Platform, ToastAndroid, Alert } from 'react-native';

/**
 * Jednoduchá pomocná funkcia pre zobrazenie toast notifikácií
 * na oboch platformách.
 */
export const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};
