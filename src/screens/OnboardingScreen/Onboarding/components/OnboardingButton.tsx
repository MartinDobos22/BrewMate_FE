import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import {
  OnboardingPalette,
  getElevationStyle,
  radius,
  spacing,
} from '../onboardingPalette';

interface Props {
  label: string;
  onPress: () => void;
  palette: OnboardingPalette;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'tonal';
}

const OnboardingButton: React.FC<Props> = ({
  label,
  onPress,
  palette,
  style,
  variant = 'primary',
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.base,
      variant === 'primary'
        ? [
            styles.primary,
            { backgroundColor: palette.cta },
            getElevationStyle(palette, 'high'),
          ]
        : [
            styles.tonal,
            {
              backgroundColor: palette.secondarySurface,
              borderColor: palette.surfaceBorder,
            },
            getElevationStyle(palette, 'medium'),
          ],
      pressed && styles.pressed,
      style,
    ]}
  >
    <Text
      style={[
        styles.label,
        {
          color: variant === 'primary' ? palette.ctaText : palette.primaryText,
        },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    borderWidth: 0,
  },
  tonal: {
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default OnboardingButton;
