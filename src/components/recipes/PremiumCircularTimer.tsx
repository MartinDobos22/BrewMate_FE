import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Svg, { Circle } from 'react-native-svg';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface PremiumCircularTimerProps {
  seconds: number;
  autoStart?: boolean;
}

/**
 * Luxusný circular timer s glassmorphism a SVG progress
 */
const PremiumCircularTimer: React.FC<PremiumCircularTimerProps> = ({
  seconds,
  autoStart = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const radius = 70;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    setTimeLeft(seconds);
    setRunning(autoStart);
    progressAnim.setValue(0);
  }, [seconds, autoStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (running && timeLeft > 0) {
      // Glow animation when running
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      interval = setInterval(() => {
        setTimeLeft((t) => {
          const newTime = t - 1;
          Animated.timing(progressAnim, {
            toValue: 1 - newTime / seconds,
            duration: 1000,
            useNativeDriver: true,
          }).start();
          return newTime;
        });
      }, 1000);
    }

    if (timeLeft === 0 && running) {
      // Pulse animation when done
      Animated.sequence([
        Animated.spring(pulseAnim, {
          toValue: 1.15,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
      setRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running, timeLeft, seconds]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    if (timeLeft > 0) {
      setRunning(!running);
    } else {
      setTimeLeft(seconds);
      setRunning(true);
      progressAnim.setValue(0);
    }
  };

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.container}>
      <Animated.View
        style={[
          styles.timerWrapper,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {/* Glow effect */}
        {running && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={['#8B6F47', '#B8956A', '#8B6F47']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* Glass background */}
        <BlurView
          style={styles.glassBackground}
          blurType="light"
          blurAmount={20}
          reducedTransparencyFallbackColor={premiumCoffeeTheme.glass.white}
        />

        {/* SVG Progress Circle */}
        <View style={styles.svgContainer}>
          <Svg width={180} height={180}>
            {/* Background circle */}
            <Circle
              cx={90}
              cy={90}
              r={radius}
              stroke={premiumCoffeeTheme.glass.dark}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Progress circle with gradient */}
            <AnimatedCircle
              cx={90}
              cy={90}
              r={radius}
              stroke="url(#gradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="90, 90"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B6F47" />
                <stop offset="50%" stopColor="#B8956A" />
                <stop offset="100%" stopColor="#D4C4B0" />
              </linearGradient>
            </defs>
          </Svg>
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.timeText}>{formatTime()}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, running && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {timeLeft === 0 ? 'Hotovo' : running ? 'Beží' : 'Tap pre štart'}
            </Text>
          </View>
        </View>

        {/* Border highlight */}
        <View style={styles.borderHighlight} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  timerWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 90,
    backgroundColor: premiumCoffeeTheme.glass.white,
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 40,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    letterSpacing: -1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: premiumCoffeeTheme.coffee.light,
  },
  statusDotActive: {
    backgroundColor: '#8B6F47',
  },
  statusText: {
    fontSize: 11,
    color: premiumCoffeeTheme.text.light,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  borderHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default PremiumCircularTimer;
