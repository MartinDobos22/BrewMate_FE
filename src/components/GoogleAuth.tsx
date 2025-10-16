import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Inicializácia konfigurácie Google Sign-In (vykoná sa raz pri importe)
import '../config/googleSignin';

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
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      onPress={handleLogin}
      style={styles.button}
    >
      <View style={styles.iconSlot}>
        <Text style={styles.iconLetter}>G</Text>
      </View>
      <Text style={styles.text}>Pokračovať s Google</Text>
    </TouchableOpacity>
  );
};

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    button: {
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(244, 236, 230, 0.18)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(26, 16, 11, 0.92)' : '#FFFFFF',
      shadowColor: '#2A160D',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 12,
    },
    iconSlot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFF8F4',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(139, 101, 68, 0.15)',
    },
    iconLetter: {
      fontWeight: '700',
      color: '#4285F4',
      fontSize: 18,
    },
    text: {
      color: isDark ? '#F7F1EA' : '#2C1810',
      fontSize: 15,
      fontWeight: '600',
    },
  });

export default GoogleLogin;
