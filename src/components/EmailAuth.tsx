import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, useColorScheme } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, Colors } from '../theme/colors';

interface EmailAuthProps {
  onBack?: () => void;
}

const EmailAuth: React.FC<EmailAuthProps> = ({ onBack }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

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
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.link}>← Späť</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{isRegistering ? 'Registrácia' : 'Prihlásenie'}</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Heslo"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity onPress={handleAuth} style={styles.button}>
        <Text style={styles.buttonText}>
          {isRegistering ? 'Registrovať sa' : 'Prihlásiť sa'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.link}>
          {isRegistering ? 'Už máš účet? Prihlás sa' : 'Nemáš účet? Zaregistruj sa'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      backgroundColor: colors.cardBackground,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 8,
      marginBottom: 12,
    },
    buttonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: '600',
    },
    link: {
      color: colors.primary,
      textAlign: 'center',
      marginTop: 12,
    },
  });

export default EmailAuth;

