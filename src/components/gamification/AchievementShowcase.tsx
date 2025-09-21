import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import ModelView from 'react-native-3d-model-view';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { AchievementProgress, AchievementDefinition } from '../../types/gamification';

interface Props {
  achievements: (AchievementProgress & { definition?: AchievementDefinition })[];
}

const rarityColors: Record<string, string> = {
  common: '#a0aec0',
  rare: '#63b3ed',
  epic: '#b794f4',
  legendary: '#f6ad55',
};

/**
 * 3D vitrína pre odznaky s možnosťou zdieľania.
 */
export const AchievementShowcase: React.FC<Props> = ({ achievements }) => {
  const glow = useSharedValue(0.6);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.6 + glow.value * 0.4,
    transform: [{ scale: 0.95 + glow.value * 0.05 }],
  }));

  const handleShare = async (achievement: AchievementProgress & { definition?: AchievementDefinition }) => {
    try {
      await Share.share({
        message: `Práve som získal odznak ${achievement.definition?.name ?? achievement.achievementId} v BrewMate! ☕️🔥`,
      });
    } catch (error) {
      console.warn('AchievementShowcase: zdieľanie zlyhalo', error);
    }
  };

  if (achievements.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Zbierka odznakov čaká</Text>
        <Text style={styles.emptySubtitle}>Dokonči výzvy a objaví sa tu tvoja sláva.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {achievements.slice(0, 3).map((achievement) => {
        const rarity = achievement.definition?.rarity ?? 'common';
        const modelSource = achievement.definition?.featureUnlock?.endsWith('.glb')
          ? { uri: achievement.definition?.featureUnlock }
          : undefined;
        return (
          <Animated.View key={achievement.achievementId} style={[styles.card, glowStyle]}> 
            <View style={[styles.badgeContainer, { borderColor: rarityColors[rarity] ?? '#a0aec0' }]}> 
              {modelSource ? (
                <ModelView
                  style={styles.model}
                  source={modelSource}
                  scale={0.2}
                  translateZ={-2}
                  rotateX={20}
                  rotateZ={45}
                  autoPlay
                />
              ) : (
                <View style={[styles.placeholder, { backgroundColor: rarityColors[rarity] ?? '#444' }]} />
              )}
            </View>
            <Text style={styles.badgeTitle}>{achievement.definition?.name ?? achievement.achievementId}</Text>
            <Text style={styles.badgeDescription}>{achievement.definition?.description ?? 'Unikátny odznak'}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={() => handleShare(achievement)}>
              <Text style={styles.shareText}>Zdieľať</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  card: {
    width: 120,
    backgroundColor: 'rgba(19, 20, 30, 0.9)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#f6ad55',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  model: {
    width: 80,
    height: 80,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.7,
  },
  badgeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDescription: {
    color: '#cbd5f5',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  shareButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f6ad55',
  },
  shareText: {
    color: '#1f1f2e',
    fontWeight: '700',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#a0aec0',
    marginTop: 4,
  },
});
