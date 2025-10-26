import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';

interface PremiumProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

/**
 * Luxusný progress bar s gradientom a animáciou
 */
const PremiumProgressBar: React.FC<PremiumProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepLabels = [],
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Progress animation
    Animated.spring(progressAnim, {
      toValue: currentStep / totalSteps,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();

    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [currentStep, totalSteps]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 300],
  });

  return (
    <View style={styles.container}>
      {/* Progress info */}
      <View style={styles.infoContainer}>
        <Text style={styles.currentStep}>Krok {currentStep}</Text>
        <Text style={styles.totalSteps}>z {totalSteps}</Text>
      </View>

      {/* Progress track */}
      <View style={styles.track}>
        <LinearGradient
          colors={['rgba(139, 111, 71, 0.1)', 'rgba(184, 149, 106, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trackGradient}
        />

        {/* Progress bar */}
        <Animated.View style={[styles.progressContainer, { width: progressWidth }]}>
          <LinearGradient
            colors={['#8B6F47', '#B8956A', '#D4C4B0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progress}
          />

          {/* Shimmer effect */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslateX }] },
            ]}
          >
            <LinearGradient
              colors={premiumCoffeeTheme.gradients.shine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {/* Progress nodes */}
        <View style={styles.nodesContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isActive = index < currentStep;
            const isCurrent = index === currentStep;
            const left =
              totalSteps === 1 ? '50%' : `${(index / (totalSteps - 1)) * 100}%`;

            return (
              <View
                key={index}
                style={[
                  styles.node,
                  { left },
                  isActive && styles.nodeActive,
                  isCurrent && styles.nodeCurrent,
                ]}
              >
                <View style={styles.nodeInner} />
              </View>
            );
          })}
        </View>

        {/* Border */}
        <View style={styles.trackBorder} />
      </View>

      {/* Step label */}
      {stepLabels[currentStep] && (
        <Text style={styles.stepLabel}>{stepLabels[currentStep]}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 6,
  },
  currentStep: {
    fontSize: 24,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    letterSpacing: -0.5,
  },
  totalSteps: {
    fontSize: 16,
    fontWeight: '500',
    color: premiumCoffeeTheme.text.light,
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: premiumCoffeeTheme.glass.whiteLight,
  },
  trackGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  trackBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  progress: {
    flex: 1,
    borderRadius: 8,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
  },
  nodesContainer: {
    ...StyleSheet.absoluteFillObject,
    marginTop: -8,
  },
  node: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: premiumCoffeeTheme.glass.white,
    borderWidth: 2,
    borderColor: premiumCoffeeTheme.coffee.cream,
    ...premiumCoffeeTheme.shadows.small,
  },
  nodeActive: {
    borderColor: '#B8956A',
  },
  nodeCurrent: {
    borderColor: '#8B6F47',
    borderWidth: 3,
    ...premiumCoffeeTheme.shadows.medium,
  },
  nodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: premiumCoffeeTheme.coffee.light,
  },
  stepLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: premiumCoffeeTheme.text.light,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default PremiumProgressBar;
