import React, { useState, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';

interface PremiumIngredientChipProps {
  icon: string;
  name: string;
  amount: string;
  tip: string;
}

/**
 * Luxusný ingredient chip s glassmorphism a tooltip
 */
const PremiumIngredientChip: React.FC<PremiumIngredientChipProps> = ({
  icon,
  name,
  amount,
  tip,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Scale animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Tooltip animation
    Animated.timing(tooltipAnim, {
      toValue: showTooltip ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Shine effect
    Animated.sequence([
      Animated.timing(shineAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(shineAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    setShowTooltip(!showTooltip);
  };

  const tooltipOpacity = tooltipAnim;
  const tooltipTranslateY = tooltipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const shineTranslateX = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <Animated.View
          style={[
            styles.chip,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Glass background */}
          <BlurView
            style={styles.glassBackground}
            blurType="light"
            blurAmount={15}
            reducedTransparencyFallbackColor={premiumCoffeeTheme.glass.white}
          />

          {/* Shine effect */}
          <Animated.View
            style={[
              styles.shine,
              { transform: [{ translateX: shineTranslateX }] },
            ]}
          >
            <LinearGradient
              colors={premiumCoffeeTheme.gradients.shine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Border */}
          <View style={styles.border} />

          {/* Content */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.amount}>{amount}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Tooltip */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipOpacity,
              transform: [{ translateY: tooltipTranslateY }],
            },
          ]}
        >
          <BlurView
            style={styles.tooltipBlur}
            blurType="light"
            blurAmount={20}
            reducedTransparencyFallbackColor={premiumCoffeeTheme.glass.white}
          />

          <LinearGradient
            colors={['rgba(139, 111, 71, 0.15)', 'rgba(184, 149, 106, 0.1)']}
            style={styles.tooltipGradient}
          />

          <View style={styles.tooltipArrow} />
          <View style={styles.tooltipBorder} />

          <Text style={styles.tooltipText}>{tip}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 14,
    overflow: 'hidden',
    ...premiumCoffeeTheme.shadows.small,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: premiumCoffeeTheme.glass.white,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: premiumCoffeeTheme.accent.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: premiumCoffeeTheme.text.primary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: 14,
    color: premiumCoffeeTheme.text.light,
    fontWeight: '500',
  },
  tooltip: {
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    ...premiumCoffeeTheme.shadows.medium,
  },
  tooltipBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  tooltipGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -8,
    left: 28,
    width: 16,
    height: 16,
    backgroundColor: premiumCoffeeTheme.glass.white,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    transform: [{ rotate: '45deg' }],
  },
  tooltipBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  tooltipText: {
    fontSize: 14,
    lineHeight: 20,
    color: premiumCoffeeTheme.text.secondary,
    fontWeight: '500',
  },
});

export default PremiumIngredientChip;
