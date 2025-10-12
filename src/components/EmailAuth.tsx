import React, { useState } from 'react';
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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, Colors } from '../theme/colors';
import LinearGradient from 'react-native-linear-gradient';

interface EmailAuthProps {
  onBack?: () => void;
}

const EmailAuth: React.FC<EmailAuthProps> = ({ onBack }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        Alert.alert('Registrácia úspešná', 'Skontroluj svoj email pre overenie účtu.');
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
                <Text style={styles.buttonText}>
                  {isRegistering ? 'Vytvoriť účet' : 'Prihlásiť sa'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRegistering(!isRegistering)}
              style={styles.secondaryLink}
            >
              <Text style={styles.secondaryLinkText}>
                {isRegistering ? 'Už máš účet? Prihlás sa' : 'Nemáš účet? Zaregistruj sa'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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

