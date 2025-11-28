import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { materialYouCoffee } from '../../theme/materialYouColors';

interface BaristaTooltipProps {
  tip: string;
  visible?: boolean;
}

/**
 * Tooltip s tipom od baristu
 * Zobrazuje sa s fade-in animáciou
 */
const BaristaTooltip: React.FC<BaristaTooltipProps> = ({ tip, visible = true }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>☕</Text>
        <Text style={styles.label}>Tip baristu</Text>
      </View>
      <Text style={styles.tip}>{tip}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: materialYouCoffee.primaryContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: materialYouCoffee.outline,
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: materialYouCoffee.onPrimaryContainer,
    opacity: 0.8,
  },
  tip: {
    fontSize: 14,
    lineHeight: 20,
    color: materialYouCoffee.onPrimaryContainer,
  },
});

export default BaristaTooltip;
