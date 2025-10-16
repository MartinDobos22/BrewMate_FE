import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleLogin from './GoogleAuth.tsx';
import EmailAuth from './EmailAuth';
import AppleAuth from './AppleAuth';
import { getColors, Colors } from '../theme/colors';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showAppleAuth, setShowAppleAuth] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const backgroundPulse = React.useRef(new Animated.Value(0)).current;
  const placeholderColor = isDarkMode ? 'rgba(247, 241, 234, 0.4)' : 'rgba(141, 115, 85, 0.6)';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 6500,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 0,
          duration: 6500,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [backgroundPulse]);

  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('@RememberedEmail');
        if (storedEmail) {
          setEmail(storedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.error('❌ Failed to load remembered email', err);
      }
    };

    loadRememberedEmail();
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setErrorMessage('');
    }, 3500);

    return () => clearTimeout(timeout);
  }, [errorMessage]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Vyplň svoj email aj heslo.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const trimmedEmail = email.trim();
      const userCredential = await auth().signInWithEmailAndPassword(trimmedEmail, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setErrorMessage('Email ešte nie je overený. Skontroluj svoju schránku.');
        await auth().signOut();
        await AsyncStorage.removeItem('@AuthToken');
        return;
      }

      const idToken = await user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', idToken);

      if (rememberMe) {
        await AsyncStorage.setItem('@RememberedEmail', trimmedEmail);
      } else {
        await AsyncStorage.removeItem('@RememberedEmail');
      }

      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Auth-Provider': 'email',
          'Content-Type': 'application/json',
        },
      });
    } catch (err: any) {
      console.error('❌ Email login error:', err);
      setErrorMessage(err?.message || 'Prihlásenie sa nepodarilo. Skús to znova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Zadaj email, aby sme ti mohli poslať nové heslo.');
      return;
    }

    try {
      await auth().sendPasswordResetEmail(email.trim());
      Alert.alert('Email odoslaný', 'Skontroluj svoj inbox a nastav si nové heslo.');
    } catch (err: any) {
      console.error('❌ Password reset error:', err);
      setErrorMessage(err?.message || 'Nepodarilo sa odoslať email na obnovu hesla.');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDarkMode ? BACKGROUND_GRADIENT_DARK : BACKGROUND_GRADIENT_LIGHT}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundPatternLarge,
          {
            transform: [
              {
                translateX: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -36],
                }),
              },
              {
                translateY: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -42],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundPatternMedium,
          {
            transform: [
              {
                translateX: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 28],
                }),
              },
              {
                translateY: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -26],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundPatternSmall,
          {
            transform: [
              {
                translateX: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
              {
                translateY: backgroundPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 34],
                }),
              },
            ],
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.centerContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.phoneShadow}>
            <View style={styles.phoneFrame}>
              <View style={styles.statusBar}>
                <Text style={styles.statusText}>9:41</Text>
                <Text style={styles.statusText}>100%</Text>
              </View>

              <View style={styles.loginContent}>
                <View style={styles.logoSection}>
                  <View style={styles.logoBadgeWrapper}>
                    <LinearGradient
                      colors={isDarkMode ? LOGO_GRADIENT_DARK : LOGO_GRADIENT_LIGHT}
                      style={styles.logoBadge}
                    >
                      <Text style={styles.logoEmoji}>☕</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.appTitle}>BrewMate</Text>
                  <Text style={styles.appTagline}>Tvoj barista vo vrecku</Text>
                </View>

                {errorMessage ? (
                  <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.formSection}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="tvoj@email.com"
                      placeholderTextColor={placeholderColor}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Heslo</Text>
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={placeholderColor}
                        secureTextEntry={!showPassword}
                        style={[styles.input, styles.passwordInput]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.passwordToggle}
                      >
                        <Text style={styles.passwordToggleLabel}>
                          {showPassword ? '👁‍🗨' : '👁'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.formOptions}>
                    <Pressable
                      style={styles.rememberMe}
                      onPress={() => setRememberMe((prev) => !prev)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: rememberMe }}
                    >
                      <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                        {rememberMe && <View style={styles.checkboxInner} />}
                      </View>
                      <Text style={styles.rememberLabel}>Zapamätať si ma</Text>
                    </Pressable>
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.forgotLink}>Zabudnuté heslo?</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleLogin}
                    style={styles.loginButtonShadow}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                      style={styles.loginButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.loginButtonLabel}>Prihlásiť sa</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>alebo pokračuj cez</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <GoogleLogin />
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => setShowAppleAuth(true)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.socialIconSlot}>
                      <Text style={styles.appleIcon}></Text>
                    </View>
                    <Text style={styles.socialButtonText}>Pokračovať s Apple</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.signupSection}>
                  <Text style={styles.signupText}>Nemáš účet?</Text>
                  <TouchableOpacity onPress={() => setShowRegister(true)}>
                    <Text style={styles.signupLink}>Zaregistruj sa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRegister} animationType="fade" transparent>
        <EmailAuth onBack={() => setShowRegister(false)} initialMode="register" />
      </Modal>
      <Modal visible={showAppleAuth} animationType="fade" transparent>
        <AppleAuth onBack={() => setShowAppleAuth(false)} />
      </Modal>
    </View>
  );
};

const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundPatternLarge: {
      position: 'absolute',
      width: '220%',
      height: '220%',
      borderRadius: 620,
      top: '-120%',
      left: '-120%',
      backgroundColor: isDark ? 'rgba(80, 52, 33, 0.35)' : 'rgba(212, 165, 116, 0.2)',
    },
    backgroundPatternMedium: {
      position: 'absolute',
      width: 360,
      height: 360,
      borderRadius: 180,
      top: -140,
      right: -120,
      backgroundColor: isDark ? 'rgba(120, 80, 52, 0.28)' : 'rgba(197, 168, 130, 0.22)',
    },
    backgroundPatternSmall: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 160,
      bottom: -140,
      left: -90,
      backgroundColor: isDark ? 'rgba(55, 34, 22, 0.3)' : 'rgba(245, 230, 211, 0.28)',
    },
    avoidingView: {
      flex: 1,
    },
    centerContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: 20,
    },
    phoneShadow: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 44,
      padding: 0,
      backgroundColor: 'transparent',
      shadowColor: '#452B1B',
      shadowOffset: { width: 0, height: 30 },
      shadowOpacity: isDark ? 0.35 : 0.25,
      shadowRadius: 44,
      elevation: 24,
      alignSelf: 'center',
    },
    phoneFrame: {
      width: '100%',
      borderRadius: 36,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(26, 18, 12, 0.92)' : '#FFFFFF',
      minHeight: 720,
    },
    statusBar: {
      height: 44,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      backgroundColor: isDark ? 'rgba(36, 24, 18, 0.7)' : 'rgba(255, 255, 255, 0.82)',
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    loginContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 28,
      backgroundColor: isDark ? 'rgba(26, 18, 12, 0.92)' : '#FFFFFF',
    },
    logoSection: {
      alignItems: 'center',
      gap: 16,
      marginBottom: 28,
    },
    logoBadgeWrapper: {
      width: 100,
      height: 100,
      borderRadius: 28,
      backgroundColor: 'transparent',
      shadowColor: '#6B4423',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: isDark ? 0.35 : 0.28,
      shadowRadius: 24,
      elevation: 18,
      overflow: 'hidden',
    },
    logoBadge: {
      width: '100%',
      height: '100%',
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoEmoji: {
      fontSize: 48,
    },
    appTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: isDark ? '#F7F1EA' : '#4A2F18',
      letterSpacing: -0.5,
    },
    appTagline: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : '#8B7355',
      fontWeight: '500',
    },
    errorCard: {
      backgroundColor: isDark ? 'rgba(191, 71, 71, 0.18)' : '#FEE2E2',
      borderLeftWidth: 4,
      borderLeftColor: '#DC2626',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    errorText: {
      color: isDark ? '#FDEDEA' : '#B91C1C',
      fontSize: 14,
      fontWeight: '500',
    },
    formSection: {
      gap: 20,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : '#5D4E37',
    },
    input: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
      backgroundColor: isDark ? 'rgba(42, 28, 20, 0.82)' : '#FFF8F4',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5E6D3',
      color: colors.text,
      fontSize: 15,
    },
    passwordWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },
    passwordInput: {
      paddingRight: 52,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    passwordToggleLabel: {
      fontSize: 18,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : '#8B7355',
    },
    formOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rememberMe: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.5)' : '#C8A882',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    checkboxChecked: {
      borderColor: isDark ? '#F7F1EA' : '#A67C52',
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.15)' : '#A67C52',
    },
    checkboxInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#F7F1EA' : '#FFFFFF',
    },
    rememberLabel: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : '#5D4E37',
    },
    forgotLink: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#A67C52',
    },
    loginButtonShadow: {
      borderRadius: 14,
      shadowColor: '#2F1C10',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.24,
      shadowRadius: 24,
      elevation: 18,
    },
    loginButton: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 24,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E8D5C4',
    },
    dividerText: {
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : '#8B7355',
      fontWeight: '500',
    },
    socialButtons: {
      gap: 12,
      marginTop: 8,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(244, 236, 230, 0.18)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(26, 18, 12, 0.9)' : '#FFFFFF',
      shadowColor: '#2A160D',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 12,
    },
    socialIconSlot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FFF8F4',
    },
    appleIcon: {
      fontSize: 18,
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    socialButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    signupSection: {
      marginTop: 'auto',
      paddingTop: 20,
      alignItems: 'center',
      gap: 4,
    },
    signupText: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : '#5D4E37',
    },
    signupLink: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#A67C52',
    },
  });

const BACKGROUND_GRADIENT_LIGHT = ['#F5E6D3', '#E8D5C4', '#D4A574'];
const BACKGROUND_GRADIENT_DARK = ['#2B1A12', '#1D120C', '#150B07'];
const LOGO_GRADIENT_LIGHT = ['#A67C52', '#D4A574'];
const LOGO_GRADIENT_DARK = ['#4A2F18', '#8B6544'];
const CTA_GRADIENT_LIGHT = ['#6B4423', '#8B6544', '#A67C52'];
const CTA_GRADIENT_DARK = ['#4A2F18', '#6B4423', '#8B6544'];

export default AuthScreen;
