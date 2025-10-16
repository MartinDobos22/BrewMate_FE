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
        colors={isDarkMode ? COFFEE_GRADIENT_DARK : COFFEE_GRADIENT_LIGHT}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundDecor}>
        <View style={styles.decorLayerBase} />
        <Animated.View
          style={[
            styles.decorLayerOne,
            {
              transform: [
                {
                  translateX: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -28],
                  }),
                },
                {
                  translateY: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -18],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorLayerTwo,
            {
              transform: [
                {
                  translateX: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 16],
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
          style={[
            styles.decorLayerThree,
            {
              transform: [
                {
                  translateX: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 22],
                  }),
                },
                {
                  translateY: backgroundPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 24],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusBarMock}>
            <Text style={styles.statusTime}>9:41</Text>
            <Text style={styles.statusBattery}>100%</Text>
          </View>

          <View style={styles.logoSection}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>☕</Text>
            </View>
            <Text style={styles.appTitle}>BrewMate</Text>
            <Text style={styles.appSubtitle}>Tvoj barista vo vrecku</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Prihlás sa a objavuj nové chute</Text>

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
                  <Text style={styles.passwordToggleLabel}>{showPassword ? 'Skryť' : 'Zobraziť'}</Text>
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
                  {rememberMe && <View style={styles.checkboxDot} />}
                </View>
                <Text style={styles.rememberLabel}>Zapamätať si ma</Text>
              </Pressable>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotLink}>Zabudnuté heslo?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
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

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>alebo pokračuj cez</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <GoogleLogin />
              <TouchableOpacity
                style={styles.appleButton}
                onPress={() => setShowAppleAuth(true)}
                activeOpacity={0.9}
              >
                <View style={styles.appleIconSlot}>
                  <Text style={styles.appleIcon}></Text>
                </View>
                <Text style={styles.appleText}>Pokračovať s Apple</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Nemáš účet?</Text>
              <TouchableOpacity onPress={() => setShowRegister(true)}>
                <Text style={styles.signupLink}>Zaregistruj sa</Text>
              </TouchableOpacity>
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
    backgroundDecor: {
      ...StyleSheet.absoluteFillObject,
    },
    decorLayerBase: {
      ...StyleSheet.absoluteFillObject,
      opacity: isDark ? 0.65 : 0.42,
      backgroundColor: isDark ? 'rgba(20, 12, 8, 0.78)' : 'rgba(255, 255, 255, 0.45)',
    },
    decorLayerOne: {
      position: 'absolute',
      width: '160%',
      height: '160%',
      top: '-30%',
      left: '-30%',
      borderRadius: 420,
      backgroundColor: isDark ? 'rgba(88, 52, 30, 0.32)' : 'rgba(245, 230, 211, 0.32)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 30 },
      shadowOpacity: 0.24,
      shadowRadius: 40,
      elevation: 24,
    },
    decorLayerTwo: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      top: -100,
      right: -60,
      backgroundColor: isDark ? 'rgba(129, 84, 56, 0.38)' : 'rgba(212, 165, 116, 0.26)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 26 },
      shadowOpacity: 0.22,
      shadowRadius: 36,
      elevation: 22,
    },
    decorLayerThree: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      bottom: -90,
      left: -60,
      backgroundColor: isDark ? 'rgba(64, 38, 24, 0.45)' : 'rgba(231, 197, 160, 0.28)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 22 },
      shadowOpacity: 0.2,
      shadowRadius: 30,
      elevation: 20,
    },
    avoidingView: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 28,
      paddingTop: 48,
      paddingBottom: 40,
    },
    statusBarMock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
      backgroundColor: isDark ? 'rgba(24, 14, 9, 0.4)' : 'rgba(255, 255, 255, 0.58)',
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 10,
      shadowColor: '#29160E',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
      elevation: 10,
    },
    statusTime: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F5EDE4' : '#2C1810',
    },
    statusBattery: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F5EDE4' : '#2C1810',
    },
    logoSection: {
      alignItems: 'center',
      gap: 12,
      marginBottom: 28,
    },
    logoBadge: {
      width: 100,
      height: 100,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(87, 55, 33, 0.85)' : 'rgba(212, 165, 116, 0.95)',
      shadowColor: '#2B160D',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 18,
    },
    logoEmoji: {
      fontSize: 44,
    },
    appTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: isDark ? '#F7F1EA' : '#4A2F18',
      letterSpacing: -0.5,
    },
    appSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : 'rgba(93, 78, 55, 0.8)',
      fontWeight: '500',
    },
    errorCard: {
      backgroundColor: isDark ? 'rgba(191, 71, 71, 0.18)' : '#FEE2E2',
      borderLeftWidth: 4,
      borderLeftColor: '#DC2626',
      borderRadius: 14,
      padding: 14,
      marginBottom: 20,
    },
    errorText: {
      color: isDark ? '#F8EDEA' : '#B91C1C',
      fontSize: 14,
      fontWeight: '500',
    },
    formCard: {
      backgroundColor: isDark ? 'rgba(28, 17, 12, 0.9)' : 'rgba(255, 253, 250, 0.96)',
      borderRadius: 36,
      paddingHorizontal: 24,
      paddingVertical: 28,
      shadowColor: '#2D160C',
      shadowOffset: { width: 0, height: 22 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 20,
      gap: 18,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
      textAlign: 'center',
      marginBottom: 4,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : 'rgba(60, 38, 27, 0.78)',
    },
    input: {
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
      backgroundColor: isDark ? 'rgba(46, 28, 19, 0.85)' : 'rgba(255, 248, 244, 0.96)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(232, 213, 196, 0.9)',
      color: colors.text,
      fontSize: 16,
    },
    passwordWrapper: {
      position: 'relative',
      justifyContent: 'center',
    },
    passwordInput: {
      paddingRight: 96,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    passwordToggleLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : '#8B6544',
    },
    formOptions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rememberMe: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.6)' : '#C8A882',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.2)' : '#C8A882',
    },
    checkboxDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#F7F1EA' : '#FFFFFF',
    },
    rememberLabel: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : 'rgba(60, 38, 27, 0.78)',
    },
    forgotLink: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#8B6544',
    },
    loginButtonShadow: {
      borderRadius: 18,
      shadowColor: '#2B140A',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 16,
    },
    loginButton: {
      borderRadius: 18,
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
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(226, 202, 173, 0.8)',
    },
    dividerText: {
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : 'rgba(93, 78, 55, 0.7)',
      fontWeight: '500',
    },
    socialButtons: {
      gap: 12,
    },
    appleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(244, 236, 230, 0.16)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(26, 17, 12, 0.92)' : '#FFFFFF',
      shadowColor: '#2A140A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 12,
    },
    appleIconSlot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(254, 247, 240, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    appleIcon: {
      fontSize: 18,
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    appleText: {
      fontSize: 15,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
    },
    signupText: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : 'rgba(93, 78, 55, 0.8)',
    },
    signupLink: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#8B6544',
    },
  });

const COFFEE_GRADIENT_LIGHT = ['#F5E6D3', '#E8D5C4', '#D4A574'];
const COFFEE_GRADIENT_DARK = ['#2B1A12', '#1D120C', '#150B07'];
const CTA_GRADIENT_LIGHT = ['#6B4423', '#8B6544', '#A67C52'];
const CTA_GRADIENT_DARK = ['#4A2F18', '#6B4423', '#8B6544'];

export default AuthScreen;
