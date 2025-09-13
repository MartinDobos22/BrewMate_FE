import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import GoogleLogin from './GoogleAuth.tsx';
import EmailAuth from './EmailAuth';
import { getColors, Colors } from '../theme/colors';

const AuthScreen = () => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  if (showEmailAuth) {
    return <EmailAuth onBack={() => setShowEmailAuth(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prihlásenie</Text>
      <GoogleLogin />
      <TouchableOpacity style={styles.button} onPress={() => setShowEmailAuth(true)}>
        <Text style={styles.buttonText}>Použiť email</Text>
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
    buttonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: '600',
    },
  });

export default AuthScreen;

