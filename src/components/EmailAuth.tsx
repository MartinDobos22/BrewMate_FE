import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, Colors } from '../theme/colors';
import LinearGradient from 'react-native-linear-gradient';

interface EmailAuthProps {
  onBack?: () => void;
  initialEmail?: string;
  initialPassword?: string;
  initialMode?: 'login' | 'register';
}

const EmailAuth: React.FC<EmailAuthProps> = ({
  onBack,
  initialEmail,
  initialPassword,
  initialMode = 'login',
}) => {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState(initialPassword ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [passwordLevel, setPasswordLevel] = useState(0);
  const [passwordLabel, setPasswordLabel] = useState('Zadaj heslo');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const registerPlaceholderColor = isDarkMode
    ? 'rgba(244, 236, 230, 0.5)'
    : 'rgba(93, 78, 55, 0.5)';
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleReturnToLogin = () => {
    if (onBack) {
      onBack();
    } else {
      setIsRegistering(false);
    }
  };

  const resetRegisterForm = () => {
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setPassword('');
    setPasswordLevel(0);
    setPasswordLabel('Zadaj heslo');
  };

  useEffect(() => {
    if (!isRegistering) {
      setRegistrationSuccess(false);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    } else {
      resetRegisterForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistering]);

  useEffect(() => {
    const pwd = password;
    if (!pwd) {
      setPasswordLevel(0);
      setPasswordLabel('Zadaj heslo');
      return;
    }

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    const level = Math.min(score, 4);
    setPasswordLevel(level);

    if (score <= 2) {
      setPasswordLabel('Slabé heslo');
    } else if (score === 3) {
      setPasswordLabel('Stredné heslo');
    } else {
      setPasswordLabel('Silné heslo');
    }
  }, [password]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const isRegisterDisabled = useMemo(() => {
    if (!isRegistering) {
      return false;
    }

    if (registrationSuccess) {
      return true;
    }

    return (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.includes('@') ||
      password.length < 8 ||
      password !== confirmPassword ||
      !termsAccepted
    );
  }, [
    confirmPassword,
    email,
    firstName,
    isRegistering,
    lastName,
    password,
    registrationSuccess,
    termsAccepted,
  ]);

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          Alert.alert('Chyba', 'Heslá sa nezhodujú.');
          return;
        }

        if (!termsAccepted) {
          Alert.alert('Chýba súhlas', 'Musíš súhlasiť s podmienkami používania.');
          return;
        }

        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        Alert.alert('Registrácia úspešná', 'Skontroluj svoj email pre overenie účtu.');
        setRegistrationSuccess(true);
        redirectTimeoutRef.current = setTimeout(() => {
          setIsRegistering(false);
          setRegistrationSuccess(false);
        }, 2000);
      } else {
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          Alert.alert('Email nie je overený', 'Prosím, over svoju emailovú adresu.');
          await auth().signOut();
          await AsyncStorage.removeItem('@AuthToken');
          return;
        }

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
      }
    } catch (err: any) {
      console.error('❌ EmailAuth error:', err);
      Alert.alert('Chyba', err.message || 'Neznáma chyba');
    }
  };

  return (
    <View style={[styles.overlay, isRegistering && styles.registerOverlay]}>
      {!isRegistering && (
        <LinearGradient
          colors={isDarkMode ? EMAIL_GRADIENT_DARK : EMAIL_GRADIENT_LIGHT}
          style={StyleSheet.absoluteFill}
        />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.centerContent, isRegistering && styles.registerCenter]}
      >
        {isRegistering ? (
          <View style={styles.registerScreen}>
            <View style={styles.registerHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleReturnToLogin}
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.registerTitle}>Vytvor účet</Text>
            </View>

            <ScrollView
              style={styles.registerScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.registerContent}
            >
                <View style={styles.stepsIndicator}>
                  <View style={[styles.stepBar, styles.stepBarActive]} />
                  <View style={[styles.stepBar, styles.stepBarActive]} />
                  <View style={styles.stepBar} />
                </View>

                <View style={styles.welcomeSection}>
                  <Text style={styles.welcomeTitle}>Vitaj v BrewMate!</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Pripoj sa ku komunite kávových nadšencov
                  </Text>
                </View>

                {registrationSuccess && (
                  <View style={styles.successMessage}>
                    <Text style={styles.successTitle}>Účet vytvorený!</Text>
                    <Text style={styles.successSubtitle}>
                      Presmerovávame ťa na prihlásenie...
                    </Text>
                  </View>
                )}

                <View style={styles.formRow}>
                  <View style={styles.inputGroupWide}>
                    <Text style={styles.inputLabel}>Meno</Text>
                    <TextInput
                      placeholder="Ján"
                      value={firstName}
                      onChangeText={setFirstName}
                      style={styles.registerInput}
                      placeholderTextColor={registerPlaceholderColor}
                    />
                  </View>
                  <View style={styles.inputGroupWide}>
                    <Text style={styles.inputLabel}>Priezvisko</Text>
                    <TextInput
                      placeholder="Novák"
                      value={lastName}
                      onChangeText={setLastName}
                      style={styles.registerInput}
                      placeholderTextColor={registerPlaceholderColor}
                    />
                  </View>
                </View>

                <View style={styles.inputGroupStacked}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    placeholder="jan.novak@email.com"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.registerInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={registerPlaceholderColor}
                  />
                </View>

                <View style={styles.inputGroupStacked}>
                  <Text style={styles.inputLabel}>Heslo</Text>
                  <TextInput
                    placeholder="Minimálne 8 znakov"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.registerInput}
                    placeholderTextColor={registerPlaceholderColor}
                  />
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBars}>
                      {[0, 1, 2, 3].map((index) => {
                        const isActive = passwordLevel > index;
                        const activeStyle =
                          passwordLevel >= 4
                            ? styles.strengthBarStrong
                            : passwordLevel === 3
                            ? styles.strengthBarMedium
                            : styles.strengthBarWeak;

                        return (
                          <View
                            key={index}
                            style={
                              isActive
                                ? [styles.strengthBar, activeStyle]
                                : styles.strengthBar
                            }
                          />
                        );
                      })}
                    </View>
                    <Text style={styles.strengthLabel}>{passwordLabel}</Text>
                  </View>
                </View>

                <View style={styles.inputGroupStacked}>
                  <Text style={styles.inputLabel}>Potvrď heslo</Text>
                  <TextInput
                    placeholder="Zopakuj heslo"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={styles.registerInput}
                    placeholderTextColor={registerPlaceholderColor}
                  />
                </View>

                <View style={styles.termsContainer}>
                  <TouchableOpacity
                    style={styles.termsCheckboxWrapper}
                    onPress={() => setTermsAccepted((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.checkboxBase,
                        termsAccepted && styles.checkboxChecked,
                      ]}
                    >
                      {termsAccepted && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.termsText}>
                      Súhlasím s{' '}
                      <Text style={styles.termsLink}>podmienkami používania</Text>
                      {' '}a{' '}
                      <Text style={styles.termsLink}>zásadami ochrany súkromia</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  disabled={isRegisterDisabled}
                  onPress={handleAuth}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                    style={[
                      styles.registerButton,
                      isRegisterDisabled && styles.registerButtonDisabled,
                    ]}
                  >
                    <Text style={styles.registerButtonText}>Vytvoriť účet</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>alebo</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton}>
                    <View style={[styles.socialIconCircle, styles.googleCircle]}>
                      <Text style={styles.socialIconText}>G</Text>
                    </View>
                    <Text style={styles.socialText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <View style={[styles.socialIconCircle, styles.appleCircle]}>
                      <Text style={styles.socialIconText}></Text>
                    </View>
                    <Text style={styles.socialText}>Apple</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleReturnToLogin}
                  style={styles.loginRedirect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginPrompt}>
                    Už máš účet?
                    <Text style={styles.loginLink}> Prihlás sa</Text>
                  </Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
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
                  placeholderTextColor={isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'}
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
                  placeholderTextColor={isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'}
                />
              </View>

              <TouchableOpacity onPress={handleAuth} activeOpacity={0.85}>
                <LinearGradient
                  colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Prihlásiť sa</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRegistering(true)}
                style={styles.secondaryLink}
              >
                <Text style={styles.secondaryLinkText}>
                  Nemáš účet? Zaregistruj sa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

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
    registerOverlay: {
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    registerCenter: {
      justifyContent: 'flex-start',
    },
    registerScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    registerScroll: {
      flex: 1,
    },
    registerHeader: {
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF8F4',
    },
    backIcon: {
      fontSize: 18,
      color: isDark ? '#F7F1EA' : '#5D4E37',
      fontWeight: '600',
    },
    registerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    registerContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 48,
      gap: 20,
    },
    stepsIndicator: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    stepBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F5E6D3',
    },
    stepBarActive: {
      backgroundColor: isDark ? '#B87B46' : '#A67C52',
    },
    welcomeSection: {
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    welcomeTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: isDark ? '#F0DFC8' : '#6B4423',
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(247,241,234,0.7)' : '#8B7355',
    },
    successMessage: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#D1FAE5',
      borderLeftWidth: 4,
      borderLeftColor: '#16A34A',
      gap: 6,
    },
    successTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#16A34A',
    },
    successSubtitle: {
      fontSize: 14,
      color: '#065F46',
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputGroupWide: {
      flex: 1,
      gap: 6,
    },
    inputGroupStacked: {
      gap: 8,
    },
    registerInput: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      backgroundColor: isDark ? 'rgba(44, 26, 18, 0.82)' : '#FFF8F4',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E8D5C4',
      color: colors.text,
      fontSize: 15,
    },
    passwordStrength: {
      gap: 6,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 4,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5E6D3',
    },
    strengthBarWeak: {
      backgroundColor: '#DC2626',
    },
    strengthBarMedium: {
      backgroundColor: '#F59E0B',
    },
    strengthBarStrong: {
      backgroundColor: '#16A34A',
    },
    strengthLabel: {
      fontSize: 12,
      color: isDark ? 'rgba(244,236,230,0.7)' : '#8B7355',
    },
    termsContainer: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(45, 29, 20, 0.7)' : '#FFF8F4',
    },
    termsCheckboxWrapper: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    checkboxBase: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? '#B87B46' : '#A67C52',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: isDark ? '#B87B46' : '#A67C52',
    },
    checkboxMark: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      color: isDark ? 'rgba(247,241,234,0.78)' : '#5D4E37',
    },
    termsLink: {
      color: isDark ? '#DCA371' : '#A67C52',
      fontWeight: '600',
    },
    registerButton: {
      marginTop: 4,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: '#2A1208',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 20,
    },
    registerButtonDisabled: {
      opacity: 0.5,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E8D5C4',
    },
    dividerText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? 'rgba(247,241,234,0.6)' : '#8B7355',
    },
    socialButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E8D5C4',
    },
    socialIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5E6D3',
    },
    googleCircle: {
      backgroundColor: isDark ? 'rgba(14,165,233,0.2)' : '#E0F2FE',
    },
    appleCircle: {
      backgroundColor: isDark ? 'rgba(244,244,245,0.15)' : '#F4F4F5',
    },
    socialIconText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    socialText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    loginRedirect: {
      alignItems: 'center',
      marginTop: 8,
    },
    loginPrompt: {
      fontSize: 14,
      color: isDark ? 'rgba(247,241,234,0.78)' : '#5D4E37',
    },
    loginLink: {
      color: isDark ? '#F0DFC8' : '#A67C52',
      fontWeight: '600',
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

const EMAIL_GRADIENT_LIGHT = ['rgba(247, 239, 229, 0.96)', '#F0DFC8', '#DAB38A'];
const EMAIL_GRADIENT_DARK = ['#24140D', '#1A0F0A', '#110805'];
const CTA_GRADIENT_LIGHT = ['#8E5B34', '#B97A4A', '#DCA371'];
const CTA_GRADIENT_DARK = ['#5A3B23', '#8D5A35', '#B87B46'];

export default EmailAuth;

