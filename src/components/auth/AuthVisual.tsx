import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import GoogleLogin from './GoogleAuth';
import AppleAuth from './AppleAuth';
import EmailRegister from './EmailRegister';
import { getColors, Colors } from '../../theme/colors';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthScreen: React.FC = () => {
  const [showEmailRegister, setShowEmailRegister] = useState(false);
  const [showAppleAuth, setShowAppleAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Nesprávny email alebo heslo');
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const infoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimeout.current) {
        clearTimeout(errorTimeout.current);
      }
      if (infoTimeout.current) {
        clearTimeout(infoTimeout.current);
      }
    };
  }, []);

  const triggerError = (message: string) => {
    if (errorTimeout.current) {
      clearTimeout(errorTimeout.current);
    }
    setInfoVisible(false);
    setErrorMessage(message);
    setErrorVisible(true);
    errorTimeout.current = setTimeout(() => {
      setErrorVisible(false);
    }, 3000);
  };

  const triggerInfo = (message: string) => {
    if (infoTimeout.current) {
      clearTimeout(infoTimeout.current);
    }
    setErrorVisible(false);
    setInfoMessage(message);
    setInfoVisible(true);
    infoTimeout.current = setTimeout(() => {
      setInfoVisible(false);
    }, 6000);
  };

  const handleLoginPress = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      triggerError('Prosím, vyplň email aj heslo.');
      return;
    }

    setErrorVisible(false);

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        trimmedEmail,
        trimmedPassword,
      );
      const user = userCredential.user;

      const idToken = await user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', idToken);
      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Auth-Provider': 'email',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Úspech', 'Prihlásenie úspešné');
    } catch (error: any) {
      console.error('❌ AuthScreen login error:', error);
      const message = error?.message ?? 'Prihlásenie zlyhalo. Skús to prosím znova.';
      triggerError(message);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      triggerError('Zadaj email, na ktorý ti pošleme odkaz na obnovenie hesla.');
      return;
    }

    try {
      await auth().sendPasswordResetEmail(trimmedEmail);
      Alert.alert('Obnovenie hesla', 'Poslali sme ti email s pokynmi na obnovu hesla.');
    } catch (error: any) {
      console.error('❌ AuthScreen forgot password error:', error);
      const message = error?.message ?? 'Obnovenie hesla sa nepodarilo. Skús to znova.';
      triggerError(message);
    }
  };

  const handleRegister = () => {
    setModalEmail(email);
    setShowEmailRegister(true);
  };

  const openLoginFromRegister = (prefillEmail?: string, notice?: string) => {
    setShowEmailRegister(false);
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
    if (notice) {
      triggerInfo(notice);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.logoSection}>
            <LinearGradient
              colors={isDarkMode ? BADGE_GRADIENT_DARK : BADGE_GRADIENT_LIGHT}
              style={styles.logoBadge}
            >
              <Text style={styles.logoEmoji}>☕</Text>
            </LinearGradient>
            <Text style={styles.appTitle}>BrewMate</Text>
            <Text style={styles.appTagline}>Tvoj barista vo vrecku</Text>
          </View>

          {infoVisible && (
            <View style={[styles.feedbackMessage, styles.infoMessage]}>
              <Text style={[styles.feedbackText, styles.infoText]}>{infoMessage}</Text>
            </View>
          )}
          {errorVisible && (
            <View style={[styles.feedbackMessage, styles.errorMessage]}>
              <Text style={[styles.feedbackText, styles.errorText]}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="tvoj@email.com"
                placeholderTextColor={isDarkMode ? 'rgba(248, 240, 232, 0.4)' : 'rgba(92, 67, 48, 0.5)'}
                style={styles.inputField}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Heslo</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDarkMode ? 'rgba(248, 240, 232, 0.4)' : 'rgba(92, 67, 48, 0.5)'}
                  style={[styles.inputField, styles.passwordInput]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.passwordToggle}
                  accessibilityLabel={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                >
                  <Text style={styles.passwordToggleText}>{showPassword ? '👁‍🗨' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formOptions}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRememberMe((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxChecked]}>
                  {rememberMe && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Zapamätať si ma</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Zabudnuté heslo?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={handleLoginPress}
            >
              <LinearGradient
                colors={isDarkMode ? PRIMARY_GRADIENT_DARK : PRIMARY_GRADIENT_LIGHT}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Prihlásiť sa</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>alebo pokračuj cez</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <View style={styles.socialButtonWrapper}>
              <GoogleLogin />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              style={[styles.socialButtonSurface, styles.appleButtonSurface]}
              onPress={() => setShowAppleAuth(true)}
            >
              <View style={styles.socialIconSlot}>
                <Text style={styles.socialIcon}></Text>
              </View>
              <Text style={styles.socialLabel}>Pokračovať s Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupSection}>
            <Text style={styles.signupText}>
              Nemáš účet?
              <Text style={styles.signupLink} onPress={handleRegister}> Zaregistruj sa</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {showEmailRegister && (
        <Modal visible animationType="fade" transparent>
          <EmailRegister
            initialEmail={modalEmail}
            onBack={() => setShowEmailRegister(false)}
            onSwitchToLogin={openLoginFromRegister}
          />
        </Modal>
      )}
      {showAppleAuth && (
        <Modal visible animationType="fade" transparent>
          <AppleAuth onBack={() => setShowAppleAuth(false)} />
        </Modal>
      )}
    </View>
  );
};

const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    contentWrapper: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      gap: 24,
    },
    logoSection: {
      marginTop: 12,
      alignItems: 'center',
      gap: 14,
    },
    logoBadge: {
      width: 96,
      height: 96,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#6B4423',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.28,
      shadowRadius: 24,
      elevation: 16,
    },
    logoEmoji: {
      fontSize: 46,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: isDark ? '#F4E8DC' : '#4A2F18',
    },
    appTagline: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? 'rgba(250, 240, 232, 0.7)' : '#8B7355',
    },
    feedbackMessage: {
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderLeftWidth: 4,
      gap: 4,
    },
    feedbackText: {
      fontSize: 14,
      fontWeight: '500',
    },
    infoMessage: {
      backgroundColor: isDark ? 'rgba(22, 101, 52, 0.25)' : '#DCFCE7',
      borderLeftColor: isDark ? '#34D399' : '#16A34A',
    },
    infoText: {
      color: isDark ? '#D1FAE5' : '#14532D',
    },
    errorMessage: {
      backgroundColor: isDark ? 'rgba(164, 48, 48, 0.25)' : '#FEE2E2',
      borderLeftColor: '#DC2626',
    },
    errorText: {
      color: isDark ? '#FEE2E2' : '#B91C1C',
    },
    formSection: {
      gap: 18,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : '#5D4E37',
    },
    inputField: {
      borderRadius: 14,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0DFCD',
      backgroundColor: isDark ? 'rgba(32, 20, 14, 0.85)' : '#FFF8F4',
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    passwordWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },
    passwordInput: {
      paddingRight: 46,
    },
    passwordToggle: {
      position: 'absolute',
      right: 14,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    passwordToggleText: {
      fontSize: 18,
      color: isDark ? 'rgba(247, 241, 234, 0.6)' : '#8B7355',
    },
    formOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkboxBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.35)' : '#C8A882',
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxBoxChecked: {
      backgroundColor: isDark ? '#D4A574' : '#C8A882',
      borderColor: isDark ? '#D4A574' : '#C8A882',
    },
    checkboxCheck: {
      color: isDark ? '#1D120D' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    checkboxLabel: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : '#5D4E37',
      fontWeight: '500',
    },
    forgotLink: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F5D4A8' : '#A67C52',
    },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#6B4423',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 16,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.18)' : '#E8D5C4',
    },
    dividerText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? 'rgba(247, 241, 234, 0.68)' : '#8B7355',
    },
    socialButtons: {
      gap: 12,
    },
    socialButtonWrapper: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    socialButtonSurface: {
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
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 10,
    },
    appleButtonSurface: {
      backgroundColor: isDark ? 'rgba(32, 20, 14, 0.9)' : '#FFFFFF',
    },
    socialIconSlot: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.08)' : '#FFF8F4',
    },
    socialIcon: {
      fontSize: 16,
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    socialLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    signupSection: {
      paddingTop: 8,
      alignItems: 'center',
    },
    signupText: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.68)' : '#5D4E37',
    },
    signupLink: {
      color: isDark ? '#F5D4A8' : '#A67C52',
      fontWeight: '600',
    },
  });

const BADGE_GRADIENT_LIGHT = ['#A67C52', '#D4A574'];
const BADGE_GRADIENT_DARK = ['#4A2F18', '#8B6544'];
const PRIMARY_GRADIENT_LIGHT = ['#6B4423', '#A67C52'];
const PRIMARY_GRADIENT_DARK = ['#E8B57A', '#C8935B'];

export default AuthScreen;

