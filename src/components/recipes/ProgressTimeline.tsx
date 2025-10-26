import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { materialYouCoffee } from '../../theme/materialYouColors';

interface ProgressTimelineProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ icon: string; label: string }>;
}

/**
 * Timeline progress indicator s ikonami krokov
 * Zobrazuje aktuálny krok s animovaným progressom
 */
const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  currentStep,
  totalSteps,
  steps,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, totalSteps],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Progress track */}
      <View style={styles.track}>
        <Animated.View style={[styles.progress, { width: progressWidth }]} />
      </View>

      {/* Timeline nodes */}
      <View style={styles.nodesContainer}>
        {steps.map((step, index) => {
          const isActive = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <View
              key={index}
              style={[
                styles.node,
                {
                  left: totalSteps === 1 ? '0%' : `${(index / (totalSteps - 1)) * 100}%`,
                },
              ]}
            >
              <View
                style={[
                  styles.nodeCircle,
                  isActive && styles.nodeCircleActive,
                  isCurrent && styles.nodeCircleCurrent,
                ]}
              >
                <Text style={styles.nodeIcon}>{step.icon}</Text>
              </View>
              {isCurrent && (
                <Text style={styles.nodeLabel} numberOfLines={1}>
                  {step.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 20,
  },
  track: {
    height: 4,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: materialYouCoffee.primary,
    borderRadius: 2,
  },
  nodesContainer: {
    position: 'relative',
    marginTop: -16,
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    marginLeft: -16,
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderWidth: 2,
    borderColor: materialYouCoffee.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleActive: {
    backgroundColor: materialYouCoffee.primaryContainer,
    borderColor: materialYouCoffee.primary,
  },
  nodeCircleCurrent: {
    backgroundColor: materialYouCoffee.primary,
    borderColor: materialYouCoffee.primary,
    shadowColor: materialYouCoffee.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  nodeIcon: {
    fontSize: 16,
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: materialYouCoffee.onSurface,
    maxWidth: 80,
    textAlign: 'center',
  },
});

export default ProgressTimeline;
