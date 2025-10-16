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
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, Colors } from '../theme/colors';
import LinearGradient from 'react-native-linear-gradient';

interface EmailAuthProps {
  onBack?: () => void;
  initialMode?: 'login' | 'register';
}

const EmailAuth: React.FC<EmailAuthProps> = ({ onBack, initialMode }) => {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialMode) {
      setIsRegistering(initialMode === 'register');
    }
  }, [initialMode]);

  useEffect(() => {
    return () => {
      if (successTimeout.current) {
        clearTimeout(successTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (successTimeout.current) {
      clearTimeout(successTimeout.current);
      successTimeout.current = null;
    }
    setSuccessVisible(false);
    setIsSubmitting(false);
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setFirstName('');
    setLastName('');
  }, [isRegistering]);

  const emailTrimmed = email.trim();
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed), [emailTrimmed]);
  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordValid = password.length >= 8;
  const confirmMatches =
    !isRegistering || (confirmPassword.length === 0 ? true : password === confirmPassword);
  const canSubmit = isRegistering
    ? Boolean(
        firstName.trim() &&
          lastName.trim() &&
          emailValid &&
          passwordValid &&
          password === confirmPassword &&
          acceptedTerms,
      )
    : Boolean(emailTrimmed && password.length >= 6);
  const registerStage = useMemo(() => {
    if (!isRegistering) {
      return 0;
    }

    let stage = 1;

    if (firstName.trim() && lastName.trim()) {
      stage = 2;
    }

    if (emailValid && passwordValid && password === confirmPassword) {
      stage = 3;
    }

    if (acceptedTerms && stage === 3) {
      stage = 4;
    }

    return stage;
  }, [acceptedTerms, confirmPassword, emailValid, firstName, isRegistering, lastName, password, passwordValid]);

  const handleAuth = async () => {
    try {
      if (isRegistering && !canSubmit) {
        Alert.alert('Chýbajúce údaje', 'Vyplň všetky polia a potvrď podmienky.');
        return;
      }

      setIsSubmitting(true);

      if (isRegistering) {
        const trimmedEmail = emailTrimmed.toLowerCase();
        const userCredential = await auth().createUserWithEmailAndPassword(trimmedEmail, password);

        const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (displayName) {
          await userCredential.user.updateProfile({ displayName });
        }

        await userCredential.user.sendEmailVerification();

        setEmail(trimmedEmail);

        setSuccessVisible(true);
        if (successTimeout.current) {
          clearTimeout(successTimeout.current);
        }
        successTimeout.current = setTimeout(() => {
          setSuccessVisible(false);
          setIsRegistering(false);
        }, 2200);

        setFirstName('');
        setLastName('');
        setPassword('');
        setConfirmPassword('');
        setAcceptedTerms(false);
      } else {
        const userCredential = await auth().signInWithEmailAndPassword(emailTrimmed, password);
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
    } finally {
      setIsSubmitting(false);
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
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.cardHeader}>
                {onBack && (
                  <TouchableOpacity onPress={onBack} style={styles.backPill}>
                    <Text style={styles.backText}>← späť</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.cardTitle}>
                  {isRegistering ? 'Vytvor nový BrewMate účet' : 'Vitaj späť, kávičkár!'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {isRegistering
                    ? 'Zaregistruj sa a nechaj si pripravovať personalizované tipy na mieru.'
                    : 'Prihlás sa a pokračuj v objavovaní chuti tvojej kávy.'}
                </Text>
              </View>

              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, !isRegistering && styles.segmentButtonActive]}
                  onPress={() => setIsRegistering(false)}
                >
                  <Text
                    style={[styles.segmentLabel, !isRegistering && styles.segmentLabelActive]}
                  >
                    Prihlásenie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, isRegistering && styles.segmentButtonActive]}
                  onPress={() => setIsRegistering(true)}
                >
                  <Text
                    style={[styles.segmentLabel, isRegistering && styles.segmentLabelActive]}
                  >
                    Registrácia
                  </Text>
                </TouchableOpacity>
              </View>

              {isRegistering ? (
                <>
                  <View style={styles.stepsIndicator}>
                    {[0, 1, 2].map((step) => (
                      <View
                        key={`step-${step}`}
                        style={[
                          styles.step,
                          registerStage > step && styles.stepActive,
                          registerStage > step + 1 && styles.stepComplete,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Vitaj v BrewMate!</Text>
                    <Text style={styles.welcomeSubtitle}>
                      Pripoj sa ku komunite kávových nadšencov
                    </Text>
                  </View>

                  {successVisible && (
                    <View style={styles.successMessage}>
                      <Text style={styles.successTitle}>Účet vytvorený!</Text>
                      <Text style={styles.successText}>Presmerovávame ťa na prihlásenie...</Text>
                    </View>
                  )}

                  <View style={styles.formRow}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Meno</Text>
                      <TextInput
                        placeholder="Ján"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={styles.input}
                        placeholderTextColor={
                          isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                        }
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Priezvisko</Text>
                      <TextInput
                        placeholder="Novák"
                        value={lastName}
                        onChangeText={setLastName}
                        style={styles.input}
                        placeholderTextColor={
                          isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                        }
                      />
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  placeholder="napr. barista@brew.coffee"
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    isRegistering && email.length > 0 && !emailValid && styles.inputError,
                  ]}
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
                  placeholder={isRegistering ? 'Minimálne 8 znakov' : 'min. 6 znakov'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={[styles.input, isRegistering && !passwordValid && styles.inputError]}
                  placeholderTextColor={
                    isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                  }
                />
                {isRegistering ? (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBars}>
                      {[0, 1, 2, 3].map((bar) => (
                        <View
                          key={`strength-${bar}`}
                          style={[
                            styles.strengthBar,
                            bar < passwordStrength.score && styles.strengthBarActive,
                            bar < passwordStrength.score &&
                              passwordStrength.tone === 'weak' &&
                              styles.strengthBarWeak,
                            bar < passwordStrength.score &&
                              passwordStrength.tone === 'medium' &&
                              styles.strengthBarMedium,
                            bar < passwordStrength.score &&
                              passwordStrength.tone === 'strong' &&
                              styles.strengthBarStrong,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.strengthText}>{passwordStrength.label}</Text>
                  </View>
                ) : null}
              </View>

              {isRegistering ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Potvrď heslo</Text>
                  <TextInput
                    placeholder="Zopakuj heslo"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={[styles.input, !confirmMatches && styles.inputError]}
                    placeholderTextColor={
                      isDarkMode ? 'rgba(244, 236, 230, 0.5)' : 'rgba(83, 54, 40, 0.42)'
                    }
                  />
                </View>
              ) : null}

              {isRegistering ? (
                <View style={styles.termsCard}>
                  <TouchableOpacity
                    onPress={() => setAcceptedTerms((prev) => !prev)}
                    style={styles.termsWrapper}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms && <View style={styles.checkboxDot} />}
                    </View>
                    <Text style={styles.termsText}>
                      Súhlasím s{' '}
                      <Text style={styles.termsLink}>podmienkami používania</Text> a{' '}
                      <Text style={styles.termsLink}>zásadami ochrany súkromia</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleAuth}
                activeOpacity={0.85}
                disabled={!canSubmit || isSubmitting}
              >
                <LinearGradient
                  colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
                  style={[
                    styles.button,
                    (!canSubmit || isSubmitting) && styles.buttonDisabled,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isRegistering ? 'Vytvoriť účet' : 'Prihlásiť sa'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {isRegistering ? (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>alebo</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.socialRow}>
                    <TouchableOpacity
                      style={styles.socialButton}
                      activeOpacity={0.85}
                      onPress={() =>
                        Alert.alert(
                          'Tip',
                          'Na prihlásenie pomocou Google použi hlavné okno aplikácie.',
                        )
                      }
                    >
                      <View style={styles.socialIcon}>
                        <Text style={styles.socialIconLetter}>G</Text>
                      </View>
                      <Text style={styles.socialText}>Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.socialButton}
                      activeOpacity={0.85}
                      onPress={() =>
                        Alert.alert(
                          'Tip',
                          'Prihlásenie cez Apple nájdeš na hlavnej obrazovke.',
                        )
                      }
                    >
                      <View style={styles.socialIcon}>
                        <Text style={styles.socialIconLetter}></Text>
                      </View>
                      <Text style={styles.socialText}>Apple</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}

              <TouchableOpacity
                onPress={() => setIsRegistering(!isRegistering)}
                style={styles.secondaryLink}
              >
                <Text style={styles.secondaryLinkText}>
                  {isRegistering ? 'Už máš účet? Prihlás sa' : 'Nemáš účet? Zaregistruj sa'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

type PasswordStrengthTone = 'idle' | 'weak' | 'medium' | 'strong';

const evaluatePasswordStrength = (value: string) => {
  if (!value) {
    return { score: 0, label: 'Zadaj heslo', tone: 'idle' as PasswordStrengthTone };
  }

  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;

  const clampedScore = Math.min(score, 4);
  let tone: PasswordStrengthTone = 'weak';
  let label = 'Slabé heslo';

  if (score <= 2) {
    tone = 'weak';
    label = 'Slabé heslo';
  } else if (score === 3 || score === 4) {
    tone = 'medium';
    label = 'Stredné heslo';
  } else {
    tone = 'strong';
    label = 'Silné heslo';
  }

  if (score >= 4) {
    tone = 'strong';
    label = 'Silné heslo';
  }

  return { score: clampedScore, label, tone };
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
      backgroundColor: isDark ? 'rgba(28, 17, 12, 0.92)' : 'rgba(255, 252, 248, 0.96)',
      paddingVertical: 24,
      paddingHorizontal: 24,
      maxHeight: 620,
    },
    scrollContent: {
      gap: 20,
      paddingBottom: 12,
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
    stepsIndicator: {
      flexDirection: 'row',
      gap: 8,
    },
    step: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200, 168, 130, 0.22)',
    },
    stepActive: {
      backgroundColor: isDark ? '#C7A57A' : '#C8A882',
    },
    stepComplete: {
      backgroundColor: isDark ? '#E0C49C' : '#D4A574',
    },
    welcomeSection: {
      alignItems: 'center',
      gap: 6,
    },
    welcomeTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: isDark ? '#F7F1EA' : '#4A2F18',
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : 'rgba(93, 78, 55, 0.8)',
      textAlign: 'center',
    },
    successMessage: {
      backgroundColor: isDark ? 'rgba(35, 68, 49, 0.5)' : '#D1FAE5',
      borderRadius: 14,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: isDark ? '#34D399' : '#16A34A',
      gap: 4,
    },
    successTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#6EE7B7' : '#047857',
    },
    successText: {
      fontSize: 14,
      color: isDark ? '#A7F3D0' : '#065F46',
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputGroup: {
      gap: 6,
      flex: 1,
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
    inputError: {
      borderColor: '#DC2626',
    },
    passwordStrength: {
      marginTop: 10,
      gap: 6,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 4,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(200, 168, 130, 0.2)',
    },
    strengthBarActive: {
      backgroundColor: '#16A34A',
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
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : 'rgba(93, 78, 55, 0.7)',
    },
    termsCard: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(47, 31, 22, 0.88)' : 'rgba(255, 248, 244, 0.9)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(216, 192, 160, 0.6)',
    },
    termsWrapper: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(247, 241, 234, 0.6)' : '#C8A882',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.18)' : '#C8A882',
    },
    checkboxDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: isDark ? '#F7F1EA' : '#FFFFFF',
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.8)' : 'rgba(60, 38, 27, 0.78)',
      lineHeight: 18,
    },
    termsLink: {
      color: isDark ? '#FCD34D' : '#8B6544',
      fontWeight: '600',
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
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(212, 177, 138, 0.6)',
    },
    dividerText: {
      fontSize: 13,
      color: isDark ? 'rgba(247, 241, 234, 0.68)' : 'rgba(93, 78, 55, 0.68)',
      fontWeight: '500',
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(244, 236, 230, 0.18)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(30, 19, 13, 0.9)' : '#FFFFFF',
      shadowColor: '#2A1208',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 12,
    },
    socialIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(254, 247, 240, 0.9)',
    },
    socialIconLetter: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F7F1EA' : '#2C1810',
    },
    socialText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2C1810',
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

