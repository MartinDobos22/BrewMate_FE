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
import { getColors, Colors } from '../theme/colors';
import LinearGradient from 'react-native-linear-gradient';

interface EmailAuthProps {
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  initialEmail?: string;
  initialPassword?: string;
}

const EmailAuth: React.FC<EmailAuthProps> = ({
  onBack,
  onNavigateToLogin,
  initialEmail,
  initialPassword,
}) => {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState(initialPassword ?? '');
  const [confirmPassword, setConfirmPassword] = useState(initialPassword ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);
  const strengthLevelStyles = [
    styles.strengthLevel1,
    styles.strengthLevel2,
    styles.strengthLevel3,
    styles.strengthLevel4,
  ];

  const switchMode = (registerMode: boolean) => {
    setIsRegistering(registerMode);
    if (!registerMode) {
      setShowSuccess(false);
    }
  };

  const passwordStrength = useMemo(() => {
    if (!password) {
      return { level: 0, label: 'Zadaj heslo' };
    }

    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    if (strength <= 2) {
      return { level: Math.max(1, strength), label: 'Slabé heslo' };
    }
    if (strength === 3) {
      return { level: 3, label: 'Stredné heslo' };
    }
    return { level: 4, label: 'Silné heslo' };
  }, [password]);

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        if (!termsAccepted) {
          Alert.alert('Chýbajúci súhlas', 'Pred pokračovaním musíš súhlasiť s podmienkami.');
          return;
        }

        if (password !== confirmPassword) {
          Alert.alert('Heslá sa nezhodujú', 'Prosím, uisti sa, že heslá sú rovnaké.');
          return;
        }

        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        setShowSuccess(true);
      } else {
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

    if (strength <= 2) {
      return { level: Math.max(1, strength), label: 'Slabé heslo' };
    }
    if (strength === 3) {
      return { level: 3, label: 'Stredné heslo' };
    }
    return { level: 4, label: 'Silné heslo' };
  }, [password]);

  const canSubmit =
    Boolean(firstName.trim()) &&
    Boolean(lastName.trim()) &&
    Boolean(email.trim()) &&
    password.length >= 8 &&
    password === confirmPassword &&
    termsAccepted;

  const handleAuth = async () => {
    try {
      if (!termsAccepted) {
        Alert.alert('Chýbajúci súhlas', 'Pred pokračovaním musíš súhlasiť s podmienkami.');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Heslá sa nezhodujú', 'Prosím, uisti sa, že heslá sú rovnaké.');
        return;
      }

      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      await userCredential.user.sendEmailVerification();
      setShowSuccess(true);
    } catch (err: any) {
      console.error('❌ EmailAuth error:', err);
      Alert.alert('Chyba', err.message || 'Neznáma chyba');
    }
  };

  const renderRegisterForm = () => (
    <View style={styles.registerWrapper}>
      <View style={styles.registerHeader}>
        <Text style={styles.registerTitle}>Vitaj v BrewMate!</Text>
        <Text style={styles.registerSubtitle}>Pripoj sa ku komunite kávových nadšencov</Text>
      </View>

      {showSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successTitle}>Účet vytvorený!</Text>
          <Text style={styles.successMessage}>Skontroluj svoj email a potvrď registráciu.</Text>
        </View>
      )}

      <View style={styles.stepIndicator}>
        {[0, 1, 2].map((step) => (
          <View
            key={step}
            style={[styles.stepBar, step < 2 ? styles.stepBarActive : undefined]}
          />
        ))}
      </View>

      <View style={styles.formRow}>
        <View style={styles.inputGroupHalf}>
          <Text style={styles.inputLabel}>Meno</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ján"
            style={styles.input}
            placeholderTextColor={
              isDarkMode ? 'rgba(244, 236, 230, 0.45)' : 'rgba(83, 54, 40, 0.38)'
            }
          />
        </View>
        <View style={styles.inputGroupHalf}>
          <Text style={styles.inputLabel}>Priezvisko</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Novák"
            style={styles.input}
            placeholderTextColor={
              isDarkMode ? 'rgba(244, 236, 230, 0.45)' : 'rgba(83, 54, 40, 0.38)'
            }
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="jan.novak@email.com"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={
            isDarkMode ? 'rgba(244, 236, 230, 0.45)' : 'rgba(83, 54, 40, 0.38)'
          }
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Heslo</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Minimálne 8 znakov"
          secureTextEntry
          style={styles.input}
          placeholderTextColor={
            isDarkMode ? 'rgba(244, 236, 230, 0.45)' : 'rgba(83, 54, 40, 0.38)'
          }
        />

        <View style={styles.strengthWrapper}>
          <View style={styles.strengthBars}>
            {(() => {
              const activeStyle =
                passwordStrength.level > 0
                  ? strengthLevelStyles[Math.min(passwordStrength.level, 4) - 1]
                  : undefined;
              return [0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[styles.strengthBar, index < passwordStrength.level && activeStyle]}
                />
              ));
            })()}
          </View>
          <Text style={styles.strengthLabel}>{passwordStrength.label}</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Potvrď heslo</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Zopakuj heslo"
          secureTextEntry
          style={styles.input}
          placeholderTextColor={
            isDarkMode ? 'rgba(244, 236, 230, 0.45)' : 'rgba(83, 54, 40, 0.38)'
          }
        />
      </View>

      <TouchableOpacity
        onPress={() => setTermsAccepted(!termsAccepted)}
        style={styles.termsCard}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          Súhlasím s <Text style={styles.linkText}>podmienkami používania</Text> a
          <Text style={styles.linkText}> zásadami ochrany súkromia</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleAuth} activeOpacity={0.85} disabled={!termsAccepted}>
        <LinearGradient
          colors={isDarkMode ? CTA_GRADIENT_DARK : CTA_GRADIENT_LIGHT}
          style={[styles.button, !termsAccepted && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>Vytvoriť účet</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>alebo</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} activeOpacity={0.85}>
          <Text style={styles.socialText}>Apple</Text>
        </TouchableOpacity>
      </View>

        <TouchableOpacity onPress={() => switchMode(false)} style={styles.secondaryLink}>
          <Text style={styles.secondaryLinkText}>Už máš účet? Prihlás sa</Text>
        </TouchableOpacity>
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.loginWrapper}>
      <Text style={styles.cardTitle}>Vitaj späť, kávičkár!</Text>
      <Text style={styles.cardSubtitle}>
        Prihlás sa a pokračuj v objavovaní chuti tvojej kávy.
      </Text>

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
        onPress={() => switchMode(true)}
        style={styles.secondaryLink}
      >
        <Text style={styles.secondaryLinkText}>Nemáš účet? Zaregistruj sa</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDarkMode ? EMAIL_GRADIENT_DARK : EMAIL_GRADIENT_LIGHT}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topBar}>
              {onBack && (
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
              )}
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, !isRegistering && styles.segmentButtonActive]}
                  onPress={() => switchMode(false)}
                >
                  <Text
                    style={[styles.segmentLabel, !isRegistering && styles.segmentLabelActive]}
                  >
                    Prihlásenie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentButton, isRegistering && styles.segmentButtonActive]}
                  onPress={() => switchMode(true)}
                >
                  <Text
                    style={[styles.segmentLabel, isRegistering && styles.segmentLabelActive]}
                  >
                    Registrácia
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              {isRegistering ? renderRegisterForm() : renderLoginForm()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      gap: 24,
      maxHeight: 640,
    },
    cardHeader: {
      gap: 20,
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
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(244, 236, 228, 0.12)' : 'rgba(60, 38, 27, 0.08)',
    },
    backIcon: {
      fontSize: 20,
      color: isDark ? '#F7F1EA' : '#3D2518',
      fontWeight: '600',
    },
    progressDots: {
      flexDirection: 'row',
      gap: 8,
    },
    progressDot: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(244, 236, 228, 0.18)' : 'rgba(181, 130, 92, 0.28)',
    },
    progressDotActive: {
      backgroundColor: isDark ? '#B87B46' : '#8E5B34',
    },
    hero: {
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: isDark ? '#F3E6D7' : '#4A2F18',
    },
    heroSubtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: isDark ? 'rgba(243, 230, 214, 0.7)' : 'rgba(74, 47, 24, 0.7)',
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputGroupHalf: {
      flex: 1,
      gap: 6,
    },
    formContent: {
      paddingBottom: 12,
      gap: 24,
    },
    inputGroup: {
      gap: 6,
    },
    inputGroupHalf: {
      flex: 1,
      gap: 6,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
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
    registerWrapper: {
      gap: 20,
    },
    registerHeader: {
      alignItems: 'center',
      gap: 8,
    },
    registerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: isDark ? '#F3E6D7' : '#4A2F18',
    },
    registerSubtitle: {
      fontSize: 15,
      color: isDark ? 'rgba(243, 230, 214, 0.7)' : 'rgba(74, 47, 24, 0.6)',
      textAlign: 'center',
    },
    successBanner: {
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.18)' : 'rgba(187, 247, 208, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.6)',
      gap: 4,
    },
    successTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#4ADE80' : '#166534',
    },
    successMessage: {
      fontSize: 13,
      color: isDark ? '#BBF7D0' : '#166534',
    },
    stepIndicator: {
      flexDirection: 'row',
      gap: 6,
    },
    stepBar: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(243, 230, 214, 0.18)' : 'rgba(212, 189, 160, 0.45)',
    },
    stepBarActive: {
      backgroundColor: isDark ? '#C18C5D' : '#B37544',
    },
    strengthWrapper: {
      marginTop: 8,
      gap: 6,
    },
    strengthBars: {
      flexDirection: 'row',
      gap: 4,
    },
    strengthBar: {
      flex: 1,
      height: 3,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(247, 241, 234, 0.12)' : 'rgba(196, 171, 143, 0.38)',
    },
    strengthLevel1: {
      backgroundColor: '#DC2626',
    },
    strengthLevel2: {
      backgroundColor: '#F59E0B',
    },
    strengthLevel3: {
      backgroundColor: '#F59E0B',
    },
    strengthLevel4: {
      backgroundColor: '#16A34A',
    },
    strengthLabel: {
      fontSize: 12,
      color: isDark ? 'rgba(243, 230, 214, 0.6)' : 'rgba(70, 45, 32, 0.6)',
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
      height: 1,
      backgroundColor: isDark ? 'rgba(243, 230, 214, 0.18)' : 'rgba(206, 180, 149, 0.6)',
    },
    dividerText: {
      fontSize: 13,
      color: isDark ? 'rgba(243, 230, 214, 0.65)' : 'rgba(88, 58, 36, 0.65)',
      fontWeight: '500',
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
    },
    socialButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(243, 230, 214, 0.25)' : 'rgba(188, 158, 125, 0.6)',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(35, 21, 14, 0.9)' : 'rgba(255, 255, 255, 0.92)',
      shadowColor: '#2A1309',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 10,
    },
    socialText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    secondaryLink: {
      alignItems: 'center',
      marginBottom: 16,
    },
    secondaryLinkText: {
      color: isDark ? 'rgba(247, 241, 234, 0.82)' : colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    loginWrapper: {
      gap: 20,
    },
    termsCard: {
      flexDirection: 'row',
      gap: 12,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(244, 236, 228, 0.8)',
      alignItems: 'center',
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? 'rgba(244, 236, 228, 0.72)' : 'rgba(70, 45, 32, 0.75)',
      lineHeight: 18,
    },
    linkText: {
      color: isDark ? '#F7C48A' : '#A3693E',
      fontWeight: '600',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: isDark ? '#C18C5D' : '#B97A4A',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: isDark ? '#C18C5D' : '#B97A4A',
    },
    checkboxMark: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
    },
  });

const EMAIL_GRADIENT_LIGHT = ['#F7EDE2', '#F0DFC8', '#DAB38A'];
const EMAIL_GRADIENT_DARK = ['#24140D', '#1A0F0A', '#110805'];
const CTA_GRADIENT_LIGHT = ['#8E5B34', '#B97A4A', '#DCA371'];
const CTA_GRADIENT_DARK = ['#5A3B23', '#8D5A35', '#B87B46'];

export default EmailAuth;
