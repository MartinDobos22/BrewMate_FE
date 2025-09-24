/*
 * Prehľad rebríčkov s animáciami a možnosťou prepínania rozsahu.
 */
import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {Layout, SlideInRight} from 'react-native-reanimated';
import gamificationStore from '../../store/gamificationStore';
import GamificationRepository from '../../services/gamification/GamificationRepository';
import type {LeaderboardEntry} from '../../types/gamification';

const repository = new GamificationRepository();

type Scope = 'global' | 'friends' | 'local';

const LeaderboardScreen: React.FC = () => {
  const {leaderboard, userId} = gamificationStore((state) => ({
    leaderboard: state.leaderboard,
    userId: state.userId,
  }));
  const [scope, setScope] = useState<Scope>('global');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    repository
      .fetchLeaderboard(scope)
      .then((entries) => gamificationStore.setState({leaderboard: entries}))
      .finally(() => setLoading(false));
  }, [scope]);

  const renderItem = ({item, index}: {item: LeaderboardEntry; index: number}) => (
    <Animated.View entering={SlideInRight} layout={Layout.springify()} style={[styles.row, item.userId === userId && styles.highlight]}> 
      <Text style={styles.rank}>{index + 1}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{item.displayName}</Text>
        <Text style={styles.meta}>
          Level {item.level} · {item.totalXp} XP · {item.streakDays} dní streak
        </Text>
      </View>
      <Text style={styles.badges}>🏅 {item.achievementsUnlocked}</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['global', 'friends', 'local'] as Scope[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tab, scope === item && styles.tabActive]}
            onPress={() => setScope(item)}
          >
            <Text style={[styles.tabText, scope === item && styles.tabTextActive]}>{item.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <Text style={styles.loading}>Načítavam...</Text>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f172a',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f8fafc',
  },
  list: {
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  highlight: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  rank: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fef08a',
    width: 40,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#cbd5f5',
    fontSize: 12,
    marginTop: 4,
  },
  badges: {
    color: '#fbbf24',
    fontWeight: '700',
  },
  loading: {
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default LeaderboardScreen;
