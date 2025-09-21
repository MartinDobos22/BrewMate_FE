import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import type { DailyQuestInstance } from '../../types/gamification';

interface Props {
  quest: DailyQuestInstance;
  onClaim(): void;
}

/**
 * Karta dennej výzvy so swipe interakciou a animáciou odmeny.
 */
export const DailyQuestCard: React.FC<Props> = ({ quest, onClaim }) => {
  const translateX = useSharedValue(0);
  const claimed = quest.completed;

  const gesture = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = Math.min(Math.max(event.translationX, -40), 40);
    },
    onEnd: () => {
      translateX.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: claimed ? withSpring(1.1) : withTiming(1) }],
    opacity: withTiming(claimed ? 1 : 0.8),
  }));

  const progressRatio = quest.goal === 0 ? 0 : quest.progress / quest.goal;
  const countdown = useMemo(() => formatDistanceToNowStrict(parseISO(quest.expiresAt)), [quest.expiresAt]);

  return (
    <PanGestureHandler onGestureEvent={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{(quest.metadata as any)?.title ?? 'Denná výzva'}</Text>
          <Animated.View style={[styles.reward, rewardStyle]}>
            <Text style={styles.rewardText}>+{quest.xpReward} XP</Text>
          </Animated.View>
        </View>
        <Text style={styles.description}>{(quest.metadata as any)?.description ?? ''}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progressRatio * 100)}%` }]} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.progressLabel}>
            {quest.progress}/{quest.goal}
          </Text>
          <Text style={styles.timer}>Do konca {countdown}</Text>
        </View>
        <TouchableOpacity
          style={[styles.claimButton, claimed && styles.claimedButton]}
          disabled={!claimed}
          onPress={onClaim}
        >
          <Text style={[styles.claimText, claimed && styles.claimedText]}>{claimed ? 'Získať odmenu' : 'Pracuj na úlohe'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26, 28, 38, 0.95)',
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    shadowColor: '#2d3748',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reward: {
    backgroundColor: '#f6ad55',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardText: {
    color: '#1a1c26',
    fontWeight: '700',
  },
  description: {
    color: '#cbd5f5',
    fontSize: 13,
    marginTop: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2d3140',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#63b3ed',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  progressLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  timer: {
    color: '#a0aec0',
    fontSize: 12,
  },
  claimButton: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#2d3748',
    paddingVertical: 12,
    alignItems: 'center',
  },
  claimedButton: {
    backgroundColor: '#48bb78',
  },
  claimText: {
    color: '#9fa7bf',
    fontWeight: '600',
  },
  claimedText: {
    color: '#fff',
  },
});
