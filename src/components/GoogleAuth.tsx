import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';

// 🔐 Konfigurácia Google Sign-In (spusti len raz)
GoogleSignin.configure({
  webClientId: '952234062512-iffqsr2kacvsq9qljs9r03vp337ld7h3.apps.googleusercontent.com'
});

const GoogleLogin = () => {
  const handleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      await GoogleSignin.signIn(); // ⚠️ musíš získať user
      const { idToken } = await GoogleSignin.getTokens(); // idToken pre Firebase

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const firebaseIdToken = await userCredential.user.getIdToken();

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
    <TouchableOpacity style={styles.button} onPress={handleLogin}>
      <Text style={styles.text}>Prihlásiť sa cez Google</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GoogleLogin;
