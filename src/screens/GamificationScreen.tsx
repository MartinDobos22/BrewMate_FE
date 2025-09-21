import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LevelProgressBar } from '../components/gamification/LevelProgressBar';
import { AchievementShowcase } from '../components/gamification/AchievementShowcase';
import { DailyQuestCard } from '../components/gamification/DailyQuestCard';
import { StatsRadarChart } from '../components/gamification/StatsRadarChart';
import { useGamificationStore } from '../hooks/useGamificationStore';
import { useGamificationServices } from '../hooks/useGamificationServices';

const GamificationScreen: React.FC = () => {
  const services = useGamificationServices();
  const {
    level,
    currentXp,
    xpToNextLevel,
    title,
    dailyQuests,
    achievements,
    achievementDefinitions,
    radarStats,
    seasonalEvents,
    streakDays,
    comboMultiplier,
    doubleXpActive,
    leaderboard,
  } = useGamificationStore((state) => ({
    level: state.level,
    currentXp: state.currentXp,
    xpToNextLevel: state.xpToNextLevel,
    title: state.title,
    dailyQuests: state.dailyQuests,
    achievements: state.achievements,
    achievementDefinitions: state.achievementDefinitions,
    radarStats: state.radarStats,
    seasonalEvents: state.seasonalEvents,
    streakDays: state.streakDays,
    comboMultiplier: state.comboMultiplier,
    doubleXpActive: state.doubleXpActive,
    leaderboard: state.leaderboard,
  }));

  const showcaseData = useMemo(
    () =>
      achievements
        .filter((achievement) => achievement.unlockedAt)
        .map((progress) => ({
          ...progress,
          definition: achievementDefinitions.find((item) => item.id === progress.achievementId),
        })),
    [achievements, achievementDefinitions],
  );

  useEffect(() => {
    if (!services) {
      return;
    }
    void services.refreshLeaderboards('global', 'weekly');
  }, [services]);

  const handleQuestClaim = useCallback(
    (questId: string) => {
      if (!services) {
        return;
      }
      void services.getDailyQuestService().applyProgress(questId, 0);
    },
    [services],
  );

  const handleLeaderboardPress = useCallback(() => {
    if (!services) {
      return;
    }
    void services.refreshLeaderboards('global', 'weekly');
  }, [services]);

  const topLeaderboard = useMemo(() => leaderboard['global:weekly'] ?? [], [leaderboard]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
        <LevelProgressBar level={level} currentXp={currentXp} xpToNextLevel={xpToNextLevel} title={title} />
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Denný streak: {streakDays} dní</Text>
          <Text style={styles.metaText}>Combo: {comboMultiplier.toFixed(2)}x</Text>
          {doubleXpActive && <Text style={styles.doubleXp}>DOUBLE XP aktívne</Text>}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150)} style={styles.section}>
        <Text style={styles.sectionTitle}>Aktuálne výzvy</Text>
        {dailyQuests.map((quest) => (
          <DailyQuestCard key={quest.id} quest={quest} onClaim={() => handleQuestClaim(quest.id)} />
        ))}
        {dailyQuests.length === 0 && <Text style={styles.empty}>Žiadne denné úlohy. Vráť sa neskôr!</Text>}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
        <Text style={styles.sectionTitle}>Trofeje</Text>
        <AchievementShowcase achievements={showcaseData} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(450)} style={styles.section}>
        <Text style={styles.sectionTitle}>Tvoje štatistiky</Text>
        {radarStats.length > 0 ? <StatsRadarChart stats={radarStats} /> : <Text style={styles.empty}>Zbierame dáta…</Text>}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(600)} style={styles.section}>
        <View style={styles.leaderboardHeader}>
          <Text style={styles.sectionTitle}>Top hráči</Text>
          <TouchableOpacity style={styles.leaderboardButton} onPress={handleLeaderboardPress}>
            <Text style={styles.leaderboardButtonText}>Celý rebríček →</Text>
          </TouchableOpacity>
        </View>
        {topLeaderboard.slice(0, 3).map((entry) => (
          <View key={entry.userId} style={styles.leaderboardRow}>
            <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
            <View style={styles.leaderboardInfo}>
              <Text style={styles.leaderboardName}>{entry.displayName}</Text>
              <Text style={styles.leaderboardSubtitle}>{entry.title}</Text>
            </View>
            <Text style={styles.leaderboardXp}>{entry.xp} XP</Text>
          </View>
        ))}
        {topLeaderboard.length === 0 && <Text style={styles.empty}>Rebríček sa pripravuje…</Text>}
      </Animated.View>

      {seasonalEvents.length > 0 && (
        <Animated.View entering={FadeInUp.delay(750)} style={styles.section}>
          <Text style={styles.sectionTitle}>Sezónne udalosti</Text>
          {seasonalEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventSubtitle}>{event.theme}</Text>
              <Text style={styles.eventBonus}>Bonus XP: {event.bonusXpMultiplier}x</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f1118',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(21, 23, 34, 0.92)',
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metaText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  doubleXp: {
    color: '#f6ad55',
    fontWeight: '700',
  },
  empty: {
    color: '#a0aec0',
    textAlign: 'center',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaderboardButton: {
    backgroundColor: '#f6ad55',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  leaderboardButtonText: {
    color: '#1a1d29',
    fontWeight: '700',
  },
  leaderboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leaderboardRank: {
    color: '#f6ad55',
    width: 40,
    fontWeight: '700',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    color: '#fff',
    fontWeight: '600',
  },
  leaderboardSubtitle: {
    color: '#a0aec0',
    fontSize: 12,
  },
  leaderboardXp: {
    color: '#fff',
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#1c1f2b',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  eventTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  eventSubtitle: {
    color: '#cbd5f5',
    marginTop: 4,
  },
  eventBonus: {
    color: '#f6ad55',
    marginTop: 4,
    fontWeight: '600',
  },
});

export default GamificationScreen;
