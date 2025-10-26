import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: 'light' | 'medium' | 'strong';
}

/**
 * Glassmorphism karta s blur efektom
 * Premium vzhľad s priehľadnosťou a jemnými tieňmi
 */
const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 'medium'
}) => {
  const blurAmount = {
    light: 10,
    medium: 20,
    strong: 30,
  }[intensity];

  return (
    <View style={[styles.container, style]}>
      {/* Blur background - iOS only, Android fallback */}
      <BlurView
        style={styles.blur}
        blurType="light"
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={premiumCoffeeTheme.glass.white}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.4)',
          'rgba(255, 255, 255, 0.1)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Border highlight */}
      <View style={styles.borderHighlight} />

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: premiumCoffeeTheme.glass.white,
    ...premiumCoffeeTheme.shadows.medium,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  borderHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  content: {
    padding: 24,
  },
});

export default GlassCard;
