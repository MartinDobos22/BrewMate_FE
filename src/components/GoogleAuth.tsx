import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

// 🔐 Konfigurácia Google Sign-In (spusti len raz)
GoogleSignin.configure({
  webClientId: '952234062512-iffqsr2kacvsq9qljs9r03vp337ld7h3.apps.googleusercontent.com'
});

const GoogleLogin = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const styles = createStyles(isDarkMode);

  const handleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      await GoogleSignin.signIn(); // ⚠️ musíš získať user
      const { idToken } = await GoogleSignin.getTokens(); // idToken pre Firebase

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const firebaseIdToken = await userCredential.user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', firebaseIdToken);

      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${firebaseIdToken}`,
          'X-Auth-Provider': 'google',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('✅ Úspešné prihlásenie', `Vitaj, ${userCredential.user.email}`);
    } catch (err: any) {
      Alert.alert('Chyba', err.message || 'Nepodarilo sa prihlásiť');
      console.error('❌ Google login error:', err);
    }

  };

  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.88} onPress={handleLogin}>
      <LinearGradient
        colors={isDarkMode ? GOOGLE_GRADIENT_DARK : GOOGLE_GRADIENT_LIGHT}
        style={styles.button}
      >
        <View style={styles.iconSlot}>
          <Text style={styles.iconLetter}>G</Text>
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.text}>Pokračovať s Google</Text>
          <Text style={styles.helperText}>synchronizované s tvojím účtom</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    button: {
      borderRadius: 28,
      paddingVertical: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      shadowColor: '#1C0F0B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 14,
      marginBottom: 4,
    },
    iconSlot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.24)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.45)',
    },
    iconLetter: {
      fontWeight: '700',
      color: '#FFFFFF',
      fontSize: 18,
    },
    textColumn: {
      flex: 1,
    },
    text: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    helperText: {
      marginTop: 2,
      color: isDark ? 'rgba(239, 231, 225, 0.78)' : 'rgba(255, 255, 255, 0.86)',
      fontSize: 12,
    },
  });

const GOOGLE_GRADIENT_LIGHT = ['#8F5B34', '#C27E41', '#E8A165'];
const GOOGLE_GRADIENT_DARK = ['#5C3B24', '#8E5A33', '#B77744'];

export default GoogleLogin;
