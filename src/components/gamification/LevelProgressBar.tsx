import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface Props {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  title: string;
}

/**
 * Animovaný kruhový progress bar s časticami pre levelovanie.
 */
export const LevelProgressBar: React.FC<Props> = ({ level, currentXp, xpToNextLevel, title }) => {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);
  const flyingXp = useSharedValue(0);

  const strokeDasharray = useMemo(() => 2 * Math.PI * 64, []);

  useEffect(() => {
    const ratio = Math.min(1, xpToNextLevel === 0 ? 0 : currentXp / xpToNextLevel);
    progress.value = withTiming(ratio, { duration: 800, easing: Easing.out(Easing.cubic) });
    flyingXp.value = withTiming(currentXp, { duration: 600 });
    if (ratio >= 1) {
      pulse.value = withSpring(1, { damping: 12, stiffness: 120 }, () => {
        pulse.value = withTiming(0, { duration: 400 });
      });
    }
  }, [currentXp, progress, xpToNextLevel, pulse, flyingXp]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDasharray * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedProps(() => ({
    opacity: pulse.value,
    r: 72 + pulse.value * 12,
  }));

  const xpText = useAnimatedProps(() => ({
    text: `${Math.round(flyingXp.value)}/${xpToNextLevel}`,
  }));

  const particleAngles = useMemo(() => Array.from({ length: 8 }, (_, index) => index * (Math.PI / 4)), []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#35234b', '#1c1f2b']} style={styles.gradient}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          <AnimatedCircle
            cx={90}
            cy={90}
            animatedProps={pulseStyle as any}
            stroke="#C38FFF"
            strokeWidth={2}
            fill="none"
          />
          <Circle cx={90} cy={90} r={64} stroke="#1d1f2b" strokeWidth={14} fill="rgba(18,18,28,0.8)" />
          <AnimatedCircle
            cx={90}
            cy={90}
            r={64}
            stroke="#ffdd8d"
            strokeWidth={14}
            strokeDasharray={`${strokeDasharray} ${strokeDasharray}`}
            animatedProps={animatedProps}
            strokeLinecap="round"
            fill="transparent"
          />
        </Svg>
        <View style={styles.textContainer}>
          <Text style={styles.levelTitle}>{title}</Text>
          <Text style={styles.levelNumber}>Level {level}</Text>
          <AnimatedText style={styles.xpText} animatedProps={xpText as any}>
            {`${currentXp}/${xpToNextLevel}`}
          </AnimatedText>
          <Text style={styles.caption}>XP do ďalšieho levelu</Text>
        </View>
        <View style={styles.particles}>
          {particleAngles.map((angle) => (
            <Particle key={angle} angle={angle} progress={progress} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const Particle: React.FC<{ angle: number; progress: SharedValue<number> }> = ({ angle, progress }) => {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: Math.cos(angle) * 50 },
      { translateY: Math.sin(angle) * 50 },
      { scale: 0.8 + progress.value * 0.4 },
    ],
  }));

  return <Animated.View style={[styles.particle, style]} />;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  levelTitle: {
    color: '#d6ccff',
    fontSize: 14,
    fontWeight: '600',
  },
  levelNumber: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  xpText: {
    color: '#ffdd8d',
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  caption: {
    color: '#9aa0b0',
    fontSize: 12,
    marginTop: 2,
  },
  particles: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffdd8d',
  },
});
