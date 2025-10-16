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
      activeOpacity={0.85}
      onPress={handleLogin}
      style={styles.button}
    >
      <View style={styles.iconSlot}>
        <Text style={styles.iconLetter}>G</Text>
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.text}>Pokračovať s Google</Text>
        <Text style={styles.helperText}>synchronizované s tvojím účtom</Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    button: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(244, 236, 230, 0.16)' : '#E8D5C4',
      backgroundColor: isDark ? 'rgba(26, 16, 11, 0.92)' : '#FFFFFF',
      shadowColor: '#1F120C',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
      elevation: 10,
    },
    iconSlot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(254, 247, 240, 0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(139, 101, 68, 0.2)',
    },
    iconLetter: {
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#DB4437',
      fontSize: 18,
    },
    textColumn: {
      flex: 1,
    },
    text: {
      color: isDark ? '#F7F1EA' : '#2C1810',
      fontSize: 15,
      fontWeight: '600',
    },
    helperText: {
      marginTop: 2,
      color: isDark ? 'rgba(247, 241, 234, 0.7)' : 'rgba(93, 78, 55, 0.7)',
      fontSize: 12,
    },
  });

export default GoogleLogin;
