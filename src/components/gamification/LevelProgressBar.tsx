/*
 * Animovaná kruhová lišta progresu s efektmi pre level-up.
 */
import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

interface Props {
  progress: number;
  level: number;
  title: string;
  xp: number;
  xpToNext: number;
  recentGain?: number;
  leveledUp?: boolean;
}

const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LevelProgressBar: React.FC<Props> = ({progress, level, title, xp, xpToNext, recentGain = 0, leveledUp}) => {
  const animatedProgress = useSharedValue(progress);
  const pulse = useSharedValue(0);
  const floating = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {duration: 800, easing: Easing.out(Easing.cubic)});
  }, [progress, animatedProgress]);

  useEffect(() => {
    if (leveledUp) {
      pulse.value = withSequence(withSpring(1, {damping: 8}), withTiming(0, {duration: 600}));
    }
  }, [leveledUp, pulse]);

  useEffect(() => {
    floating.value = withSequence(withTiming(1, {duration: 600}), withDelay(400, withTiming(0, {duration: 400})));
  }, [recentGain, floating]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const pulseStyle = useAnimatedProps(() => ({
    opacity: pulse.value,
    strokeWidth: STROKE + pulse.value * 6,
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    opacity: floating.value,
    transform: [{translateY: -40 * floating.value}],
  }));

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <LinearGradient id="progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#ec4899" />
          </LinearGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#1f2937" strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="url(#progress)"
          strokeWidth={STROKE}
          strokeDasharray={`${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS + 4}
          stroke="#f472b6"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE}`}
          animatedProps={pulseStyle}
        />
      </Svg>
      <View style={styles.content}>
        <Text style={styles.levelLabel}>Level {level}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.xp}>XP {xp}/{xpToNext}</Text>
      </View>
      {recentGain > 0 && <AnimatedText style={[styles.gain, floatingStyle]}>+{recentGain} XP</AnimatedText>}
      <Animated.View style={styles.particles}>
        {[...Array(12)].map((_, index) => (
          <Animated.View
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            style={[
              styles.particle,
              {
                transform: [
                  {translateX: Math.cos((index / 12) * 2 * Math.PI) * (RADIUS + 10)},
                  {translateY: Math.sin((index / 12) * 2 * Math.PI) * (RADIUS + 10)},
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
  },
  levelLabel: {
    color: '#f9fafb',
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    color: '#c4b5fd',
    fontSize: 14,
    marginTop: 4,
  },
  xp: {
    color: '#fde68a',
    fontSize: 12,
    marginTop: 8,
  },
  gain: {
    position: 'absolute',
    top: -10,
    fontSize: 18,
    color: '#fbbf24',
    fontWeight: '700',
  },
  particles: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f472b6',
  },
});

export default LevelProgressBar;
