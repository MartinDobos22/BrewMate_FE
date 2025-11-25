import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Props for the Apple authentication bottom sheet component.
 */
interface AppleAuthProps {
  /** Callback executed to close the sheet or navigate away from Apple auth. */
  onBack?: () => void;
}

/**
 * Bottom sheet that signs the user in with Apple ID, persists the Firebase token, and informs the
 * backend of the chosen auth provider.
 *
 * @param {AppleAuthProps} props - Handlers to dismiss the sheet when necessary.
 * @returns {JSX.Element} The rendered Apple login prompt with gradient styling.
 */
const AppleAuth: React.FC<AppleAuthProps> = ({ onBack }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const styles = createStyles(isDarkMode);

  /**
   * Initiates Apple authentication, exchanges the identity token for Firebase credentials, and
   * stores the resulting token locally.
   *
   * @returns {Promise<void>} Promise resolved when the login and token persistence complete.
   * @throws {Error} If Apple sign-in fails or Firebase credential exchange is unsuccessful.
   */
  const handleLogin = async () => {
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!response.identityToken) {
        Alert.alert('Chyba', 'Identity token chýba');
        return;
      }

      const { identityToken, nonce } = response;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
      const userCredential = await auth().signInWithCredential(appleCredential);
      const idToken = await userCredential.user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', idToken);

      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Auth-Provider': 'apple',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Úspech', 'Prihlásenie úspešné');
    } catch (err: any) {
      if (err?.code === appleAuth.Error.CANCELED) {
        Alert.alert('Zrušené', 'Prihlásenie bolo zrušené');
      } else {
        console.error('❌ Apple login error:', err);
        Alert.alert('Chyba', err.message || 'Nepodarilo sa prihlásiť');
      }
    }
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        accessibilityLabel="Zavrieť Apple prihlásenie"
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onBack}
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Pokračuj s Apple</Text>
        <Text style={styles.description}>
          Pripoj sa pomocou Apple ID a získaj synchronizované odporúčania naprieč zariadeniami.
        </Text>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={handleLogin}>
          <LinearGradient
            colors={isDarkMode ? APPLE_GRADIENT_DARK : APPLE_GRADIENT_LIGHT}
            style={styles.button}
          >
            <Text style={styles.text}>Prihlásiť cez Apple</Text>
          </LinearGradient>
        </TouchableOpacity>
        {onBack && (
          <TouchableOpacity style={styles.secondaryAction} onPress={onBack}>
            <Text style={styles.secondaryText}>Naspäť na výber prihlásenia</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Generates StyleSheet rules for the Apple authentication UI using theme brightness.
 *
 * @param {boolean} isDark - Flag indicating whether the current theme is dark mode.
 * @returns {ReturnType<typeof StyleSheet.create>} StyleSheet definition for the component.
 */
const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(20, 12, 8, 0.65)',
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: isDark ? '#1D120D' : '#FEF8F2',
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 36,
      shadowColor: '#140C08',
      shadowOffset: { width: 0, height: -18 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 26,
      gap: 20,
    },
    handle: {
      alignSelf: 'center',
      width: 60,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(48,32,24,0.16)',
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: isDark ? '#F7F1EA' : '#1F140F',
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: isDark ? 'rgba(247, 241, 234, 0.74)' : 'rgba(33, 21, 15, 0.72)',
      textAlign: 'center',
    },
    button: {
      borderRadius: 26,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 12,
    },
    text: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
      letterSpacing: 0.2,
    },
    secondaryAction: {
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(66, 45, 33, 0.08)',
    },
    secondaryText: {
      color: isDark ? 'rgba(247, 241, 234, 0.9)' : 'rgba(54, 36, 27, 0.8)',
      fontSize: 14,
      fontWeight: '500',
    },
  });

const APPLE_GRADIENT_LIGHT = ['#5C463A', '#31211B'];
const APPLE_GRADIENT_DARK = ['#1A100C', '#000000'];

export default AppleAuth;

