import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import GoogleLogin from './GoogleAuth.tsx';
import EmailAuth from './EmailAuth';
import AppleAuth from './AppleAuth';
import { getColors, Colors } from '../theme/colors';

const AuthScreen = () => {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showAppleAuth, setShowAppleAuth] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors, isDarkMode);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDarkMode ? COFFEE_GRADIENT_DARK : COFFEE_GRADIENT_LIGHT}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.texture}>
        <View style={styles.overlayBeanLarge} />
        <View style={styles.overlayBeanSmall} />
        <View style={styles.contentWrapper}>
          <View style={styles.headerSurface}>
            <Text style={styles.headline}>BrewMate</Text>
            <Text style={styles.subtitle}>Tvoj barista asistent na každý dúšok</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.cardTitle}>Prihlás sa a pokračuj v objavovaní</Text>

            <GoogleLogin />

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionButton, styles.emailButton]}
              onPress={() => setShowEmailAuth(true)}
            >
              <Text style={styles.actionButtonLabel}>Prihlásiť emailom</Text>
              <Text style={styles.actionButtonHelper}>bezpečne a jednoducho</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionButton, styles.appleButton]}
              onPress={() => setShowAppleAuth(true)}
            >
              <Text style={styles.actionButtonLabel}>Pokračovať s Apple</Text>
              <Text style={styles.actionButtonHelper}>pre používateľov iOS</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Vyber si spôsob prihlásenia, ktorý ti najviac chutí.
            </Text>
          </View>
        </View>
      </View>

      <Modal visible={showEmailAuth} animationType="fade" transparent>
        <EmailAuth onBack={() => setShowEmailAuth(false)} />
      </Modal>
      <Modal visible={showAppleAuth} animationType="fade" transparent>
        <AppleAuth onBack={() => setShowAppleAuth(false)} />
      </Modal>
    </View>
  );
};

const createStyles = (colors: Colors, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    texture: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 40,
    },
    overlayBeanLarge: {
      position: 'absolute',
      top: -40,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: isDark ? 'rgba(80, 45, 26, 0.35)' : 'rgba(201, 158, 111, 0.32)',
      transform: [{ rotate: '-12deg' }],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
      elevation: 24,
    },
    overlayBeanSmall: {
      position: 'absolute',
      bottom: -60,
      left: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: isDark ? 'rgba(51, 29, 18, 0.38)' : 'rgba(151, 94, 61, 0.28)',
      transform: [{ rotate: '18deg' }],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
      elevation: 20,
    },
    contentWrapper: {
      flex: 1,
      justifyContent: 'space-between',
    },
    headerSurface: {
      backgroundColor: isDark ? 'rgba(24, 13, 9, 0.48)' : 'rgba(255, 255, 255, 0.68)',
      borderRadius: 36,
      padding: 24,
      marginBottom: 32,
      shadowColor: '#2A140C',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 18,
    },
    headline: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      color: isDark ? 'rgba(244, 236, 230, 0.86)' : 'rgba(70, 44, 34, 0.72)',
    },
    authCard: {
      backgroundColor: isDark ? 'rgba(32, 19, 13, 0.72)' : 'rgba(255, 253, 250, 0.92)',
      borderRadius: 40,
      paddingHorizontal: 24,
      paddingVertical: 28,
      gap: 16,
      shadowColor: '#311A12',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.22,
      shadowRadius: 30,
      elevation: 24,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    actionButton: {
      borderRadius: 28,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      shadowColor: '#2E1205',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
      elevation: 12,
    },
    emailButton: {
      backgroundColor: isDark ? 'rgba(86, 49, 29, 0.68)' : 'rgba(227, 198, 167, 0.92)',
    },
    appleButton: {
      backgroundColor: isDark ? 'rgba(18, 11, 9, 0.72)' : 'rgba(54, 37, 28, 0.9)',
    },
    actionButtonLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F7F1EA' : '#2F1B11',
    },
    actionButtonHelper: {
      fontSize: 12,
      marginTop: 4,
      color: isDark ? 'rgba(247, 241, 234, 0.72)' : 'rgba(47, 27, 17, 0.68)',
    },
    footerText: {
      marginTop: 4,
      textAlign: 'center',
      fontSize: 13,
      color: isDark ? 'rgba(250, 240, 232, 0.7)' : 'rgba(72, 45, 35, 0.6)',
    },
  });

const COFFEE_GRADIENT_LIGHT = ['#F7F1E8', '#F0E0D0', '#E2C5A7'];
const COFFEE_GRADIENT_DARK = ['#2B1A12', '#1D120C', '#150B07'];

export default AuthScreen;

