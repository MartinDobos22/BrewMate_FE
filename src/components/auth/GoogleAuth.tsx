import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Inicializácia konfigurácie Google Sign-In (vykoná sa raz pri importe)
import '../../config/googleSignin';

/**
 * Touch target that authenticates the user with Google Sign-In and persists the Firebase token for
 * authenticated requests.
 *
 * @returns {JSX.Element} The rendered Google authentication button.
 */
const GoogleLogin = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const styles = createStyles(isDarkMode);

  /**
   * Performs Google Sign-In, exchanges the resulting ID token for Firebase credentials, and stores
   * the Firebase token locally.
   *
   * @returns {Promise<void>} Promise resolved once authentication and token persistence finish.
   * @throws {Error} If Google Play Services are unavailable or Firebase credential creation fails.
   */
  const handleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      await GoogleSignin.signIn(); // ⚠️ musíš získať user
      const { idToken } = await GoogleSignin.getTokens(); // idToken pre Firebase

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const firebaseIdToken = await userCredential.user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', firebaseIdToken);

      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${firebaseIdToken}`,
          'X-Auth-Provider': 'google',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('✅ Úspešné prihlásenie', `Vitaj, ${userCredential.user.email}`);
    } catch (err: any) {
      Alert.alert('Chyba', err.message || 'Nepodarilo sa prihlásiť');
      console.error('❌ Google login error:', err);
    }

  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.9}
      onPress={handleLogin}
      style={styles.button}
    >
      <View style={styles.iconSlot}>
        <Text style={styles.iconLetter}>G</Text>
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.text}>Pokračovať s Google</Text>
        <Text style={styles.helperText}>synchronizované s tvojím účtom</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Produces themed styles for the Google login button depending on dark or light mode.
 *
 * @param {boolean} isDark - Whether the interface is currently using a dark color scheme.
 * @returns {ReturnType<typeof StyleSheet.create>} The generated StyleSheet for the button.
 */
const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    button: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: isDark ? 'rgba(32, 20, 14, 0.88)' : '#FFFFFF',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.12)' : '#E8D5C4',
      shadowColor: '#2F1B11',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 10,
    },
    iconSlot: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.08)' : '#FFF8F4',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.2)' : 'rgba(200, 168, 130, 0.45)',
    },
    iconLetter: {
      fontWeight: '700',
      color: isDark ? '#F7F1EA' : '#EA4335',
      fontSize: 16,
    },
    textColumn: {
      flex: 1,
    },
    text: {
      color: isDark ? '#F7F1EA' : '#2C1810',
      fontSize: 15,
      fontWeight: '600',
    },
    helperText: {
      marginTop: 2,
      color: isDark ? 'rgba(247, 241, 234, 0.68)' : '#8B7355',
      fontSize: 12,
    },
  });

export default GoogleLogin;
