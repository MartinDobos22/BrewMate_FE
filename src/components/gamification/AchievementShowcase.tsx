/*
 * Prezentácia odznakov s pseudo 3D efektom a žiarením podľa rarity.
 */
import React, {useEffect, useMemo} from 'react';
import {Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import type {AchievementDefinition} from '../../types/gamification';

interface Props {
  achievement: AchievementDefinition;
  onFeature?: (achievementId: string) => void;
}

const rarityColors = {
  common: ['#94a3b8', '#cbd5f5'],
  rare: ['#38bdf8', '#818cf8'],
  epic: ['#a855f7', '#f472b6'],
  legendary: ['#f59e0b', '#f97316'],
};

const AchievementShowcase: React.FC<Props> = ({achievement, onFeature}) => {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, {duration: 2000}), -1, true);
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + glow.value * 0.4,
    transform: [{scale: 1 + glow.value * 0.05}],
  }));

  const gradient = useMemo(() => rarityColors[achievement.rarity], [achievement.rarity]);

  const handleShare = () => {
    void Share.share({
      title: 'BrewMate Achievement',
      message: `Práve som získal odznak ${achievement.name} v BrewMate! Pridaj sa ku mne.`,
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <LinearGradient colors={gradient} style={styles.badge}>
        <View style={styles.badgeFace}>
          <Text style={styles.badgeTitle}>{achievement.name}</Text>
          <Text style={styles.badgeDescription}>{achievement.description}</Text>
          <Text style={styles.badgeCategory}>{achievement.category.toUpperCase()}</Text>
        </View>
      </LinearGradient>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={() => onFeature?.(achievement.id)}>
          <Text style={styles.buttonText}>🌟 Zvýrazniť</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleShare}>
          <Text style={styles.buttonText}>📤 Zdieľať</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#fde68a',
    opacity: 0.5,
  },
  badge: {
    width: 200,
    height: 200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{rotateX: '12deg'}, {rotateY: '-8deg'}],
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  badgeFace: {
    padding: 16,
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 12,
    color: '#f1f5f9',
    textAlign: 'center',
    marginVertical: 8,
  },
  badgeCategory: {
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
});

export default AchievementShowcase;
