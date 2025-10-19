import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { getColors, Colors } from '../../theme/colors';
import {
  CTA_GRADIENT_DARK,
  CTA_GRADIENT_LIGHT,
  EMAIL_GRADIENT_DARK,
  EMAIL_GRADIENT_LIGHT,
} from './constants';

interface EmailRegisterProps {
  onBack?: () => void;
  initialEmail?: string;
  onSwitchToLogin?: (email?: string, notice?: string) => void;
}

const EmailRegister: React.FC<EmailRegisterProps> = ({ onBack, initialEmail, onSwitchToLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordLevel, setPasswordLevel] = useState(0);
  const [passwordLabel, setPasswordLabel] = useState('Zadaj heslo');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const registerPlaceholderColor = isDarkMode
    ? 'rgba(244, 236, 230, 0.5)'
    : 'rgba(93, 78, 55, 0.5)';

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

  const isRegisterDisabled = useMemo(() => {
    return (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.includes('@') ||
      password.length < 8 ||
      password !== confirmPassword ||
      !termsAccepted
    );
  }, [confirmPassword, email, firstName, lastName, password, termsAccepted]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onSwitchToLogin) {
      onSwitchToLogin();
    }
  };

  const handleSwitchToLogin = (notice?: string) => {
    if (onSwitchToLogin) {
      onSwitchToLogin(email, notice);
    } else if (onBack) {
      onBack();
    }
  };

  const handleRegister = async () => {
    try {
      if (password !== confirmPassword) {
        Alert.alert('Chyba', 'Heslá sa nezhodujú.');
        return;
      }

      if (!termsAccepted) {
        Alert.alert('Chýba súhlas', 'Musíš súhlasiť s podmienkami používania.');
        return;
      }

      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      void (async () => {
        try {
          const idToken = await firebaseUser.getIdToken();
          await fetch('http://10.0.2.2:3001/api/auth', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'X-Auth-Provider': 'email',
              'Content-Type': 'application/json',
            },
          });
        } catch (authErr) {
          console.warn('⚠️ EmailRegister: failed to initialize profile', authErr);
        }
      })();

      handleSwitchToLogin('Účet bol vytvorený. Prihlás sa svojimi údajmi.');
    } catch (err: any) {
      console.error('❌ EmailRegister error:', err);
      Alert.alert('Chyba', err?.message ?? 'Neznáma chyba');
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
        <View style={styles.registerScreen}>
          <View style={styles.registerHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
                        style={isActive ? [styles.strengthBar, activeStyle] : styles.strengthBar}
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
                  Súhlasím s <Text style={styles.termsLink}>podmienkami používania</Text> a{' '}
                  <Text style={styles.termsLink}>zásadami ochrany súkromia</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              disabled={isRegisterDisabled}
              onPress={handleRegister}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                style={[styles.registerButton, isRegisterDisabled && styles.registerButtonDisabled]}
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

            <TouchableOpacity onPress={handleSwitchToLogin} style={styles.loginRedirect} activeOpacity={0.8}>
              <Text style={styles.loginPrompt}>
                Už máš účet?<Text style={styles.loginLink}> Prihlás sa</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
    },
    registerScreen: {
      flex: 1,
      backgroundColor: colors.background,
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
    registerScroll: {
      flex: 1,
    },
    registerContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 20,
    },
    stepsIndicator: {
      flexDirection: 'row',
      gap: 6,
    },
    stepBar: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F1DED0',
    },
    stepBarActive: {
      backgroundColor: isDark ? '#DAB38A' : '#8E5B34',
    },
    welcomeSection: {
      gap: 6,
    },
    welcomeTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(247, 241, 234, 0.75)' : '#6B4F3A',
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
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : '#5D4E37',
    },
    registerInput: {
      borderRadius: 16,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0DFCD',
      backgroundColor: isDark ? 'rgba(32, 20, 14, 0.85)' : '#FFF8F4',
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    passwordStrength: {
      marginTop: 6,
      gap: 6,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 6,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#E6D3C1',
    },
    strengthBarWeak: {
      backgroundColor: '#DC2626',
    },
    strengthBarMedium: {
      backgroundColor: '#D97706',
    },
    strengthBarStrong: {
      backgroundColor: '#16A34A',
    },
    strengthLabel: {
      fontSize: 12,
      color: isDark ? 'rgba(247,241,234,0.78)' : '#5D4E37',
      fontWeight: '600',
    },
    termsContainer: {
      marginTop: 6,
    },
    termsCheckboxWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    checkboxBase: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.35)' : '#C8A882',
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: isDark ? '#D4A574' : '#C8A882',
      borderColor: isDark ? '#D4A574' : '#C8A882',
    },
    checkboxMark: {
      color: isDark ? '#1D120D' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? 'rgba(247,241,234,0.78)' : '#5D4E37',
    },
    termsLink: {
      color: isDark ? '#F5D4A8' : '#A67C52',
      fontWeight: '600',
    },
    registerButton: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#6B4423',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 16,
    },
    registerButtonDisabled: {
      opacity: 0.5,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.2,
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
  });

export default EmailRegister;
