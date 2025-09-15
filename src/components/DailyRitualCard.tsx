import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PredictionResult } from '../types/Personalization';

export interface DailyRitualCardProps {
  recommendation: PredictionResult & {
    message: string;
    strengthHint: 'light' | 'balanced' | 'strong';
    weatherCondition?: string;
  };
  onAccept: (recipeId: string) => void;
  onDecline: (recipeId: string) => void;
  onShowAlternative: () => void;
}

/**
 * Ranná kartička s odporúčaním a gestami na alternatívy.
 */
const DailyRitualCard: React.FC<DailyRitualCardProps> = ({ recommendation, onAccept, onDecline, onShowAlternative }) => {
  const translateX = useSharedValue(0);

  const gradient = useMemo(() => buildGradient(recommendation.weatherCondition), [recommendation.weatherCondition]);
  const indicatorColor = useMemo(() => strengthColor(recommendation.strengthHint), [recommendation.strengthHint]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value < -100) {
        runOnJS(onShowAlternative)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.shadowWrapper, animatedStyle]}>
        <LinearGradient colors={gradient} style={styles.container}>
          <View style={[styles.strengthIndicator, { backgroundColor: indicatorColor }]} />
          <View style={styles.content}>
            <Text style={styles.title}>Tvoje ranné espresso</Text>
            <Text style={styles.recipe}>{recommendation.recipeId.toUpperCase()}</Text>
            <Text style={styles.message}>{recommendation.message}</Text>
            <Text style={styles.meta}>
              Predikcia {recommendation.predictedRating}/5 · Dôvera {Math.round(recommendation.confidence * 100)}%
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(recommendation.recipeId)}>
                <Text style={styles.acceptText}>Uvariť</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton} onPress={() => onDecline(recommendation.recipeId)}>
                <Text style={styles.declineText}>Preskočiť</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.swipeHint}>Potiahni doľava pre alternatívu</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
};

function buildGradient(condition?: string): string[] {
  if (!condition) {
    return ['#1e3c72', '#2a5298'];
  }
  const lower = condition.toLowerCase();
  if (lower.includes('rain')) {
    return ['#2b5876', '#4e4376'];
  }
  if (lower.includes('sun')) {
    return ['#f3904f', '#3b4371'];
  }
  if (lower.includes('snow')) {
    return ['#83a4d4', '#b6fbff'];
  }
  return ['#1e3c72', '#2a5298'];
}

function strengthColor(strength: 'light' | 'balanced' | 'strong'): string {
  switch (strength) {
    case 'light':
      return '#8bc34a';
    case 'strong':
      return '#ff5722';
    default:
      return '#ffc107';
  }
}

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: 16,
    borderRadius: 18,
  },
  container: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  strengthIndicator: {
    width: 6,
    borderRadius: 4,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  recipe: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#f3f3f3',
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: '#e0e0e0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  acceptButton: {
    backgroundColor: '#ff8000',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  acceptText: {
    color: '#fff',
    fontWeight: '700',
  },
  declineButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  declineText: {
    color: '#fff',
    fontWeight: '600',
  },
  swipeHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#eaeaea',
  },
});

export default DailyRitualCard;
