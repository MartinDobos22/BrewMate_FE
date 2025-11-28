import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { materialYouCoffee } from '../../theme/materialYouColors';

interface CircularTimerProps {
  seconds: number;
  autoStart?: boolean;
}

/**
 * Cirkulárny progress timer s countdown
 * Zobrazuje čas v kruhovom progresse
 */
const CircularTimer: React.FC<CircularTimerProps> = ({ seconds, autoStart = false }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(autoStart);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setTimeLeft(seconds);
    setRunning(autoStart);
    progressAnim.setValue(0);
  }, [seconds, autoStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (running && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => {
          const newTime = t - 1;
          // Animate progress
          Animated.timing(progressAnim, {
            toValue: 1 - newTime / seconds,
            duration: 1000,
            useNativeDriver: false,
          }).start();
          return newTime;
        });
      }, 1000);
    }

    if (timeLeft === 0 && running) {
      // Pulse animation when done
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
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

  // Calculate stroke-dashoffset based on progress
  const circumference = 2 * Math.PI * 60; // radius = 60
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.container}
    >
      <Animated.View style={[styles.timerCircle, { transform: [{ scale: scaleAnim }] }]}>
        {/* Background circle */}
        <View style={styles.circleBackground} />

        {/* Progress circle - using Animated.View as simple approximation */}
        <Animated.View
          style={[
            styles.progressCircle,
            {
              opacity: progressAnim,
            },
          ]}
        />

        {/* Time text */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime()}</Text>
          <Text style={styles.statusText}>
            {timeLeft === 0 ? '✓ Hotovo' : running ? 'Spustené' : 'Tap pre štart'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 80,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderWidth: 8,
    borderColor: materialYouCoffee.outline,
  },
  progressCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 80,
    borderWidth: 8,
    borderColor: materialYouCoffee.primary,
    backgroundColor: 'transparent',
  },
  timeContainer: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: materialYouCoffee.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default CircularTimer;
