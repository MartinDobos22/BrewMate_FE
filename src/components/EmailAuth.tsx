import React, { useMemo, useState } from 'react';
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
  const [showSuccess, setShowSuccess] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const registerPlaceholderColor = isDarkMode
    ? 'rgba(244, 236, 230, 0.5)'
    : 'rgba(139, 115, 85, 0.6)';

  const passwordEvaluation = useMemo(() => evaluatePassword(password), [password]);
  const emailIsValid = EMAIL_REGEX.test(email.trim());
  const registerButtonDisabled = !(
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailIsValid &&
    password.length >= 8 &&
    confirmPassword === password &&
    termsAccepted
  );

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        if (registerButtonDisabled) {
          Alert.alert('Chýbajúce údaje', 'Vyplň všetky polia, potvrď podmienky a over si heslo.');
          return;
        }

        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        setShowSuccess(true);
        Alert.alert('Registrácia úspešná', 'Skontroluj svoj email pre overenie účtu.');
        setTimeout(() => {
          setIsRegistering(false);
          setShowSuccess(false);
          setFirstName('');
          setLastName('');
          setConfirmPassword('');
          setTermsAccepted(false);
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

  const handleToggleMode = (shouldRegister: boolean) => {
    setIsRegistering(shouldRegister);
    setShowSuccess(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (isRegistering) {
      handleToggleMode(false);
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
        style={[styles.centerContent, isRegistering && styles.centerContentExpanded]}
      >
        {isRegistering ? (
          <View style={styles.registerLayout}>
            <View style={styles.registerHeader}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <View style={styles.registerHeading}>
                <Text style={styles.headerTitle}>Vytvor účet</Text>
                <Text style={styles.headerSubtitle}>
                  Personalizuj si svoj BrewMate zážitok v pár krokoch
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.registerScroll}
              contentContainerStyle={styles.registerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stepsIndicator}>
                {[0, 1, 2].map(index => (
                  <View
                    key={`step-${index}`}
                    style={[styles.step, index < 2 ? styles.stepActive : undefined]}
                  />
                ))}
              </View>

              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>Vitaj v BrewMate!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Pripoj sa ku komunite kávových nadšencov
                </Text>
              </View>

              {showSuccess && (
                <View style={styles.successMessage}>
                  <Text style={styles.successTitle}>Účet vytvorený!</Text>
                  <Text style={styles.successText}>Presmerovávame ťa na prihlásenie...</Text>
                </View>
              )}

              <View style={styles.registerCard}>
                <View style={styles.formContainer}>
                  <View style={styles.formRow}>
                    <View style={styles.registerInputGroup}>
                      <Text style={styles.registerInputLabel}>Meno</Text>
                      <TextInput
                        placeholder="Ján"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={styles.registerInput}
                        placeholderTextColor={registerPlaceholderColor}
                      />
                    </View>
                    <View style={styles.registerInputGroup}>
                      <Text style={styles.registerInputLabel}>Priezvisko</Text>
                      <TextInput
                        placeholder="Novák"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.registerInput}
                        placeholderTextColor={registerPlaceholderColor}
                      />
                    </View>
                  </View>

                  <View style={styles.registerInputGroupFull}>
                    <Text style={styles.registerInputLabel}>Email</Text>
                    <TextInput
                      placeholder="jan.novak@email.com"
                      value={email}
                      onChangeText={setEmail}
                      style={[
                        styles.registerInput,
                        !emailIsValid && email.length > 0 ? styles.inputError : undefined,
                      ]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={registerPlaceholderColor}
                    />
                  </View>

                  <View style={styles.registerInputGroupFull}>
                    <Text style={styles.registerInputLabel}>Heslo</Text>
                    <TextInput
                      placeholder="Minimálne 8 znakov"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={[
                        styles.registerInput,
                        password.length > 0 && password.length < 8 ? styles.inputError : undefined,
                      ]}
                      placeholderTextColor={registerPlaceholderColor}
                    />
                    <View style={styles.passwordStrength}>
                      <View style={styles.strengthBars}>
                        {[0, 1, 2, 3].map(index => (
                          <View
                            key={`strength-${index}`}
                            style={[
                              styles.strengthBar,
                              index < passwordEvaluation.level &&
                                (passwordEvaluation.variant === 'weak'
                                  ? styles.strengthBarWeak
                                  : passwordEvaluation.variant === 'medium'
                                  ? styles.strengthBarMedium
                                  : styles.strengthBarStrong),
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.strengthText}>{passwordEvaluation.label}</Text>
                    </View>
                  </View>

                  <View style={styles.registerInputGroupFull}>
                    <Text style={styles.registerInputLabel}>Potvrď heslo</Text>
                    <TextInput
                      placeholder="Zopakuj heslo"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      style={[
                        styles.registerInput,
                        confirmPassword.length > 0 && confirmPassword !== password
                          ? styles.inputError
                          : undefined,
                      ]}
                      placeholderTextColor={registerPlaceholderColor}
                    />
                  </View>

                  <View style={styles.termsSection}>
                    <TouchableOpacity
                      onPress={() => setTermsAccepted(prev => !prev)}
                      style={styles.termsWrapper}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                        {termsAccepted && <View style={styles.checkboxIndicator} />}
                      </View>
                      <Text style={styles.termsText}>
                        Súhlasím s <Text style={styles.termsLink}>podmienkami používania</Text> a{' '}
                        <Text style={styles.termsLink}>zásadami ochrany súkromia</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleAuth}
                    activeOpacity={0.85}
                    disabled={registerButtonDisabled}
                    style={{ opacity: registerButtonDisabled ? 0.5 : 1 }}
                  >
                    <LinearGradient
                      colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                      style={styles.registerButton}
                    >
                      <Text style={styles.registerButtonText}>Vytvoriť účet</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>alebo</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
                  <View style={styles.socialIconCircle}>
                    <Text style={styles.socialIconText}>G</Text>
                  </View>
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
                  <View style={styles.socialIconCircle}>
                    <Text style={styles.socialIconText}></Text>
                  </View>
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.loginSection} onPress={() => handleToggleMode(false)}>
                <Text style={styles.loginText}>
                  Už máš účet? <Text style={styles.loginLink}>Prihlás sa</Text>
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

              <TouchableOpacity onPress={handleAuth} activeOpacity={0.85}>
                <LinearGradient
                  colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Prihlásiť sa</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleToggleMode(true)}
                style={styles.secondaryLink}
              >
                <Text style={styles.secondaryLinkText}>Nemáš účet? Zaregistruj sa</Text>
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
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
    },
    centerContentExpanded: {
      justifyContent: 'flex-start',
    },
    registerLayout: {
      flex: 1,
      paddingTop: Platform.OS === 'ios' ? 32 : 12,
      paddingBottom: 32,
      paddingHorizontal: 24,
      gap: 16,
    },
    registerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 8,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.08)' : 'rgba(255, 248, 244, 0.9)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.16)' : 'rgba(181, 130, 92, 0.25)',
    },
    backButtonText: {
      fontSize: 20,
      color: isDark ? '#F7F1EA' : '#6B4423',
      fontWeight: '600',
    },
    registerHeading: {
      flex: 1,
      gap: 6,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.65)' : '#8B7355',
      lineHeight: 20,
    },
    registerScroll: {
      flex: 1,
    },
    registerContent: {
      paddingBottom: 48,
      gap: 24,
    },
    stepsIndicator: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    step: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.1)' : '#F5E6D3',
    },
    stepActive: {
      backgroundColor: isDark ? 'rgba(225, 191, 150, 0.8)' : '#B97A4A',
    },
    welcomeSection: {
      alignItems: 'flex-start',
      gap: 6,
    },
    welcomeTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: isDark ? '#F7F1EA' : '#6B4423',
      textAlign: 'left',
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : '#8B7355',
      textAlign: 'left',
    },
    successMessage: {
      backgroundColor: isDark ? 'rgba(22, 101, 52, 0.18)' : '#D1FAE5',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#16A34A',
      gap: 4,
    },
    successTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#16A34A',
    },
    successText: {
      fontSize: 14,
      color: '#065F46',
    },
    registerCard: {
      backgroundColor: isDark ? 'rgba(28, 17, 12, 0.85)' : 'rgba(255, 252, 248, 0.96)',
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 28,
      shadowColor: isDark ? '#0f0805' : 'rgba(62, 40, 27, 0.24)',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: isDark ? 0.55 : 0.22,
      shadowRadius: 36,
      elevation: 22,
      gap: 20,
    },
    formContainer: {
      gap: 20,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
      flexWrap: 'wrap',
    },
    registerInputGroup: {
      flex: 1,
      minWidth: 140,
      gap: 6,
    },
    registerInputGroupFull: {
      gap: 6,
    },
    registerInputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : '#5D4E37',
    },
    registerInput: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12,
      backgroundColor: isDark ? 'rgba(40, 25, 18, 0.9)' : '#FFF8F4',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.12)' : 'transparent',
      fontSize: 15,
      color: isDark ? '#F7F1EA' : '#2C1810',
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
      height: 3,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.08)' : '#F5E6D3',
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
    strengthText: {
      fontSize: 12,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : '#8B7355',
    },
    termsSection: {
      backgroundColor: isDark ? 'rgba(40, 25, 18, 0.9)' : '#FFF8F4',
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.1)' : 'rgba(212, 165, 116, 0.2)',
    },
    termsWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(225, 191, 150, 0.6)' : '#B97A4A',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(33, 21, 15, 0.6)' : '#FFFFFF',
    },
    checkboxChecked: {
      backgroundColor: '#B97A4A',
      borderColor: '#B97A4A',
    },
    checkboxIndicator: {
      width: 10,
      height: 10,
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : '#5D4E37',
      lineHeight: 20,
    },
    termsLink: {
      color: isDark ? '#EBC49F' : '#A67C52',
      fontWeight: '600',
    },
    registerButton: {
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: 'rgba(107, 68, 35, 0.35)',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: isDark ? 0.55 : 0.38,
      shadowRadius: 28,
      elevation: 22,
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
      marginTop: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.12)' : '#E8D5C4',
    },
    dividerText: {
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.65)' : '#8B7355',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    socialButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    socialButton: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.18)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(33, 21, 15, 0.8)' : '#FFFFFF',
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    socialIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.12)' : '#F5E6D3',
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
    loginSection: {
      alignItems: 'center',
      paddingBottom: 12,
    },
    loginText: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : '#5D4E37',
    },
    loginLink: {
      color: isDark ? '#EBC49F' : '#A67C52',
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
    segmentedControl: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(93, 63, 45, 0.08)',
      gap: 4,
    },
    segmentButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: isDark ? 'rgba(225, 200, 170, 0.24)' : 'rgba(181, 130, 92, 0.32)',
      shadowColor: '#2A1309',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 8,
    },
    segmentLabel: {
      fontSize: 14,
      color: isDark ? 'rgba(247, 241, 234, 0.58)' : 'rgba(70, 45, 32, 0.65)',
      fontWeight: '500',
    },
    segmentLabelActive: {
      color: isDark ? '#F7F1EA' : '#2F1B11',
      fontWeight: '600',
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
    inputError: {
      borderColor: '#DC2626',
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const evaluatePassword = (value: string) => {
  if (!value) {
    return {
      level: 0,
      variant: 'weak' as const,
      label: 'Zadaj heslo',
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;

  let variant: 'weak' | 'medium' | 'strong' = 'strong';
  let label = 'Silné heslo';

  if (score <= 2) {
    variant = 'weak';
    label = 'Slabé heslo';
  } else if (score === 3) {
    variant = 'medium';
    label = 'Stredné heslo';
  }

  return {
    level: Math.min(score, 4),
    variant,
    label,
  };
};

export default EmailAuth;

