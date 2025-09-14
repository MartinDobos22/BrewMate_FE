import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppleAuthProps {
  onBack?: () => void;
}

const AppleAuth: React.FC<AppleAuthProps> = ({ onBack }) => {
  const handleLogin = async () => {
    try {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      if (!response.identityToken) {
        Alert.alert('Chyba', 'Identity token chýba');
        return;
      }

      const { identityToken, nonce } = response;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
      const userCredential = await auth().signInWithCredential(appleCredential);
      const idToken = await userCredential.user.getIdToken();
      await AsyncStorage.setItem('@AuthToken', idToken);

      await fetch('http://10.0.2.2:3001/api/auth', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'X-Auth-Provider': 'apple',
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Úspech', 'Prihlásenie úspešné');
    } catch (err: any) {
      if (err?.code === appleAuth.Error.CANCELED) {
        Alert.alert('Zrušené', 'Prihlásenie bolo zrušené');
      } else {
        console.error('❌ Apple login error:', err);
        Alert.alert('Chyba', err.message || 'Nepodarilo sa prihlásiť');
      }
    }
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Späť</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.text}>Prihlásiť cez Apple</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  back: {
    marginBottom: 20,
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default AppleAuth;

