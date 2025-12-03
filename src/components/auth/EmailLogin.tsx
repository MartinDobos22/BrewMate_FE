import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, Colors } from '../../theme/colors';
import { API_URL } from '../../services/api';
import {
  CTA_GRADIENT_DARK,
  CTA_GRADIENT_LIGHT,
  EMAIL_GRADIENT_DARK,
  EMAIL_GRADIENT_LIGHT,
} from './constants';

/**
 * Props for the email login form that enables sign-in with Firebase credentials.
 */
interface EmailLoginProps {
  /** Optional callback executed when the user presses the back pill. */
  onBack?: () => void;
  /** Email value prefilled into the email field when the component mounts. */
  initialEmail?: string;
  /** Password value prefilled into the password field when the component mounts. */
  initialPassword?: string;
  /**
   * Callback invoked when the user requests to switch to registration, receiving the current email
   * value to prefill the registration form.
   */
  onSwitchToRegister?: (email?: string) => void;
}

/**
 * Screen-level form that authenticates a user with Firebase email/password and stores the token in
 * AsyncStorage for subsequent API requests.
 *
 * @param {EmailLoginProps} props - Component props for configuring callbacks and initial values.
 * @returns {JSX.Element} The rendered email login UI with gradient background and form controls.
 */
const EmailLogin: React.FC<EmailLoginProps> = ({
  onBack,
  initialEmail,
  initialPassword,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState(initialPassword ?? '');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);

  /**
   * Authenticates the user with Firebase credentials, persists the token locally, and notifies the
   * backend of the authentication event.
   *
   * @returns {Promise<void>} Promise that resolves after login and token storage complete.
   * @throws {Error} If authentication fails or token storage encounters an error.
   */
  const handleLogin = async () => {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // dočasne vypnutá kontrola overenia emailu
      // if (!user.emailVerified) {
      //   Alert.alert('Email nie je overený', 'Prosím, over svoju emailovú adresu.');
      //   await auth().signOut();
      //   await AsyncStorage.removeItem('@AuthToken');
      //   return;
      // }

      const idToken = await user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', idToken);
      await fetch(`${API_URL}/auth`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Auth-Provider': 'email',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Úspech', 'Prihlásenie úspešné');
    } catch (err: any) {
      console.error('❌ EmailLogin error:', err);
      Alert.alert('Chyba', err?.message ?? 'Neznáma chyba');
    }
  };

  /**
   * Notifies parent consumers that the registration view should be opened while preserving the
   * currently typed email.
   */
  const handleSwitchToRegister = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister(email);
    }
  };

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={isDarkMode ? EMAIL_GRADIENT_DARK : EMAIL_GRADIENT_LIGHT}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centerContent}
      >
        <View style={styles.cardShadow}>
          <View style={styles.cardSurface}>
            <View style={styles.cardHeader}>
              {onBack && (
                <TouchableOpacity onPress={onBack} style={styles.backPill}>
                  <Text style={styles.backText}>← späť</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.cardTitle}>Vitaj späť, kávičkár!</Text>
              <Text style={styles.cardSubtitle}>
                Prihlás sa a pokračuj v objavovaní chuti tvojej kávy.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                placeholder="napr. barista@brew.coffee"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={
                  isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                }
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Heslo</Text>
              <TextInput
                placeholder="min. 6 znakov"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor={
                  isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                }
              />
            </View>

            <TouchableOpacity onPress={handleLogin} activeOpacity={0.85}>
              <LinearGradient
                colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Prihlásiť sa</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSwitchToRegister} style={styles.secondaryLink}>
              <Text style={styles.secondaryLinkText}>Nemáš účet? Zaregistruj sa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

/**
 * Generates memoized styles for the email login form using the active color palette and theme
 * brightness.
 *
 * @param {Colors} colors - Theme-driven color tokens used throughout the form UI.
 * @param {boolean} isDark - Whether the current theme is dark mode, affecting contrast and shadows.
 * @returns {ReturnType<typeof StyleSheet.create>} StyleSheet object for the component.
 */
const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
    },
    cardShadow: {
      borderRadius: 44,
      padding: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      shadowColor: '#1A0D07',
      shadowOffset: { width: 0, height: 32 },
      shadowOpacity: 0.35,
      shadowRadius: 45,
      elevation: 34,
    },
    cardSurface: {
      borderRadius: 42,
      backgroundColor: isDark ? 'rgba(28, 17, 12, 0.92)' : 'rgba(255, 252, 248, 0.94)',
      paddingVertical: 28,
      paddingHorizontal: 24,
      gap: 20,
    },
    cardHeader: {
      gap: 12,
    },
    backPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.08)' : 'rgba(60, 38, 27, 0.08)',
    },
    backText: {
      color: isDark ? 'rgba(247, 241, 234, 0.86)' : 'rgba(61, 37, 26, 0.78)',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    cardTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : 'rgba(60, 38, 27, 0.75)',
      fontWeight: '600',
    },
    input: {
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      backgroundColor: isDark ? 'rgba(45, 27, 19, 0.85)' : 'rgba(255, 255, 255, 0.92)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(102, 68, 45, 0.18)',
      color: colors.text,
      fontSize: 16,
    },
    button: {
      borderRadius: 26,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#2A1208',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.2,
      shadowRadius: 22,
      elevation: 14,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    secondaryLink: {
      alignItems: 'center',
    },
    secondaryLinkText: {
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : colors.primary,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 4,
    },
  });

export default EmailLogin;
