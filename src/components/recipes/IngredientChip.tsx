import React, { useState, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated, StyleSheet } from 'react-native';
import { materialYouCoffee } from '../../theme/materialYouColors';

interface IngredientChipProps {
  icon: string;
  name: string;
  amount: string;
  tip: string;
  index: number;
}

/**
 * Interaktívny ingredient chip s mikrointerakciami
 * Tap → zobrazí tooltip s tipom
 */
const IngredientChip: React.FC<IngredientChipProps> = ({ icon, name, amount, tip, index }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Scale + rotate animácia
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotateAnim, {
        toValue: showTooltip ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Tooltip animácia
    Animated.timing(tooltipAnim, {
      toValue: showTooltip ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    setShowTooltip(!showTooltip);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const tooltipOpacity = tooltipAnim;
  const tooltipTranslateY = tooltipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.touchable}
      >
        <Animated.View
          style={[
            styles.chip,
            {
              transform: [{ scale: scaleAnim }, { rotate }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.amount}>{amount}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

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
          <View style={styles.tooltipArrow} />
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
  touchable: {
    width: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: materialYouCoffee.outline,
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: materialYouCoffee.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: materialYouCoffee.onSurface,
    marginBottom: 2,
  },
  amount: {
    fontSize: 14,
    color: materialYouCoffee.onSurfaceVariant,
  },
  tooltip: {
    marginTop: 8,
    backgroundColor: materialYouCoffee.primaryContainer,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: materialYouCoffee.outline,
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    left: 24,
    width: 12,
    height: 12,
    backgroundColor: materialYouCoffee.primaryContainer,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: materialYouCoffee.outline,
    transform: [{ rotate: '45deg' }],
  },
  tooltipText: {
    fontSize: 13,
    color: materialYouCoffee.onPrimaryContainer,
    lineHeight: 18,
  },
});

export default IngredientChip;
