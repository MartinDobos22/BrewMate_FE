import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';

interface PremiumButtonProps {
  onPress: () => void;
  children: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Premium button s luxusným dizajnom a animáciami
 */
const PremiumButton: React.FC<PremiumButtonProps> = ({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
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
      ]),
    ]).start();
  };

  const shineTranslateX = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const getGradientColors = () => {
    if (variant === 'primary') {
      return ['#8B6F47', '#B8956A', '#8B6F47'];
    }
    if (variant === 'secondary') {
      return ['#E8C4A5', '#FFE8D6', '#E8C4A5'];
    }
    return ['transparent', 'transparent'];
  };

  const getTextColor = () => {
    if (variant === 'ghost') return premiumCoffeeTheme.text.secondary;
    if (variant === 'secondary') return premiumCoffeeTheme.text.primary;
    return '#FFFBF5';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style]}
    >
      <Animated.View
        style={[
          styles.button,
          variant === 'ghost' && styles.ghostButton,
          disabled && styles.disabled,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />

        {/* Shine effect */}
        {variant !== 'ghost' && (
          <Animated.View
            style={[
              styles.shine,
              {
                transform: [{ translateX: shineTranslateX }],
              },
            ]}
          >
            <LinearGradient
              colors={premiumCoffeeTheme.gradients.shine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {children}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 32,
    ...premiumCoffeeTheme.shadows.medium,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: premiumCoffeeTheme.coffee.light,
    shadowOpacity: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
  },
});

export default PremiumButton;
