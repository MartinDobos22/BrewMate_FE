/*
 * Denná úloha so swipe interakciou, progres barom a animovaným claim efektom.
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PanGestureHandler} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import type {DailyQuestInstance, DailyQuestProgress} from '../../types/gamification';

interface Props {
  quest: DailyQuestInstance;
  progress?: DailyQuestProgress;
  onClaim?: (questId: string) => void;
}

const DailyQuestCard: React.FC<Props> = ({quest, progress, onClaim}) => {
  const translateX = useSharedValue(0);
  const claimed = progress?.claimed ?? false;
  const completed = progress?.completed ?? false;
  const progressRatio = useMemo(() => {
    if (!progress) {
      return 0;
    }
    const values = Object.values(progress.progress);
    if (values.length === 0) {
      return completed ? 1 : 0;
    }
    const sum = values.reduce((total, value) => total + value, 0);
    return Math.min(1, sum / values.length);
  }, [progress, completed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      translateX.value = Math.max(0, event.translationX);
    },
    onEnd: () => {
      if (translateX.value > 120 && completed && !claimed) {
        translateX.value = withTiming(200, {duration: 200}, () => {
          runOnJS(onClaim ?? (() => {}))(quest.id);
        });
      } else {
        translateX.value = withTiming(0);
      }
    },
  });

  return (
    <View style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.gradient}>
            <View style={styles.header}>
              <Text style={styles.title}>{quest.title}</Text>
              <Text style={styles.difficulty}>{quest.difficulty.toUpperCase()}</Text>
            </View>
            <Text style={styles.description}>{quest.description}</Text>
            <View style={styles.progressWrapper}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {width: `${progressRatio * 100}%`}]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progressRatio * 100)}%</Text>
            </View>
            <View style={styles.footer}>
              <Text style={styles.reward}>🎁 {quest.rewardXp} XP</Text>
              {quest.rewardSkillPoints > 0 && <Text style={styles.reward}>⚙️ {quest.rewardSkillPoints} SP</Text>}
            </View>
            {completed && !claimed && <Text style={styles.swipeHint}>⬅️ Potiahni pre odmenu</Text>}
            {claimed && <Text style={styles.claimed}>Odmena vyzdvihnutá!</Text>}
            <TouchableOpacity style={styles.claimButton} disabled={!completed || claimed} onPress={() => onClaim?.(quest.id)}>
              <Text style={styles.claimText}>{claimed ? 'Hotovo' : completed ? 'Získať odmenu' : 'Plním...'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </PanGestureHandler>
      <Text style={styles.timer}>⏱️ Koniec: {new Date(quest.activeTo).toLocaleTimeString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#e0f2fe',
    fontSize: 18,
    fontWeight: '700',
  },
  difficulty: {
    color: '#f97316',
    fontWeight: '600',
  },
  description: {
    color: '#cbd5f5',
    fontSize: 14,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#312e81',
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
  },
  progressText: {
    color: '#fef9c3',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  reward: {
    color: '#f1f5f9',
    fontWeight: '600',
    marginRight: 16,
  },
  swipeHint: {
    marginTop: 16,
    color: '#a855f7',
    fontStyle: 'italic',
  },
  claimed: {
    marginTop: 16,
    color: '#22c55e',
    fontWeight: '700',
  },
  claimButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  timer: {
    marginTop: 8,
    color: '#cbd5f5',
    textAlign: 'right',
  },
});

export default DailyQuestCard;
