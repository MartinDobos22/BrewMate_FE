import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Modal } from 'react-native';
import GoogleLogin from './GoogleAuth.tsx';
import EmailAuth from './EmailAuth';
import AppleAuth from './AppleAuth';
import { getColors, Colors } from '../theme/colors';

const AuthScreen = () => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showAppleAuth, setShowAppleAuth] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prihlásenie</Text>
      <GoogleLogin />
      <TouchableOpacity style={styles.button} onPress={() => setShowEmailAuth(true)}>
        <Text style={styles.buttonText}>Prihlásiť emailom</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.appleButton} onPress={() => setShowAppleAuth(true)}>
        <Text style={styles.buttonText}>Prihlásiť cez Apple</Text>
      </TouchableOpacity>

      <Modal visible={showEmailAuth} animationType="slide">
        <EmailAuth onBack={() => setShowEmailAuth(false)} />
      </Modal>
      <Modal visible={showAppleAuth} animationType="slide">
        <AppleAuth onBack={() => setShowAppleAuth(false)} />
      </Modal>
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
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 24,
      textAlign: 'center',
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 8,
      marginTop: 20,
      width: '100%',
    },
    appleButton: {
      backgroundColor: '#000',
      padding: 14,
      borderRadius: 8,
      marginTop: 20,
      width: '100%',
    },
    buttonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: '600',
    },
  });

export default AuthScreen;

