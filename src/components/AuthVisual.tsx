import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import GoogleLogin from './GoogleAuth.tsx';

const AuthScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const handleAuth = async () => {
    try {
      console.log('🔧 handleAuth spustený. isRegistering:', isRegistering);

      if (isRegistering) {
        const response = await fetch('http://10.0.2.2:3001/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('❌ Backend error:', result);
          Alert.alert('Chyba registrácie', result?.error || 'Neznáma chyba');
          return;
        }

        Alert.alert(
          'Registrácia úspešná',
          'Na tvoju emailovú adresu bol odoslaný overovací email. Po jeho potvrdení sa môžeš prihlásiť.',
        );

        // ŽIADNE signOut ani nič iné – používateľ nebol nikdy prihlásený

      } else {
        // 🔑 PRIHLÁSENIE
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          Alert.alert(
            'Email nie je overený',
            'Prosím, over svoju emailovú adresu pred prihlásením.',
          );
          await auth().signOut();
          return;
        }

        const idToken = await user.getIdToken();

        await fetch('http://10.0.2.2:3001/api/auth', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        Alert.alert('Úspech', 'Prihlásenie úspešné');
      }
    } catch (error: any) {
      console.error('❌ Globálna chyba:', error);
      Alert.alert('Chyba', error.message || 'Neznáma chyba');
    }
  };
  if (isResettingPassword) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Obnoviť heslo</Text>

        <TextInput
          placeholder="Zadaj svoj email"
          value={resetEmail}
          onChangeText={setResetEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            try {
              const response = await fetch('http://10.0.2.2:3001/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
              });

              const result = await response.json();

              if (!response.ok) {
                Alert.alert('Chyba', result?.error || 'Nepodarilo sa odoslať email');
                return;
              }

              Alert.alert('Hotovo', 'Email na obnovu hesla bol odoslaný');
              setIsResettingPassword(false);
              setResetEmail('');
            } catch (error) {
              console.error('❌ Chyba pri resete hesla:', error);
              Alert.alert('Chyba', 'Zlyhanie pri odoslaní emailu');
            }
          }}
        >
          <Text style={styles.buttonText}>Odoslať link</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsResettingPassword(false)}>
          <Text style={styles.link}>← Späť na prihlásenie</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.container}>
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
  {isRegistering
    ? 'Už máš účet? Prihlás sa'
    : 'Nemáš účet? Zaregistruj sa'}
  </Text>
  </TouchableOpacity>
      <View style={styles.socialLoginContainer}>
        <GoogleLogin />
      </View>
      <TouchableOpacity onPress={() => setIsResettingPassword(true)}>
        <Text style={styles.link}>Zabudol si heslo?</Text>
      </TouchableOpacity>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f7f7',
  },
  socialLoginContainer: {
    marginTop: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#333',
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
    color: '#007bff',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default AuthScreen;
