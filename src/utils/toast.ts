import { Platform, ToastAndroid, Alert } from 'react-native';

/**
 * Displays a short toast-like notification appropriate for the current platform.
 *
 * Uses `ToastAndroid` on Android and a simple alert dialog on iOS and other platforms.
 *
 * @param {string} message - Message text to display to the user.
 * @returns {void}
 */
export const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};
