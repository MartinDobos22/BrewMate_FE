import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import type { LeaderboardEntry, LeaderboardRange, LeaderboardScope } from '../types/gamification';
import { useGamificationStore } from '../hooks/useGamificationStore';
import { useGamificationServices } from '../hooks/useGamificationServices';

const scopes: LeaderboardScope[] = ['global', 'friends', 'local'];
const ranges: LeaderboardRange[] = ['weekly', 'monthly', 'all_time'];

/**
 * Obrazovka rebríčkov s animovaným prechodom.
 */
const LeaderboardScreen: React.FC = () => {
  const [activeScope, setActiveScope] = useState<LeaderboardScope>('global');
  const [activeRange, setActiveRange] = useState<LeaderboardRange>('weekly');
  const [refreshing, setRefreshing] = useState(false);
  const { leaderboard, title } = useGamificationStore((state) => ({ leaderboard: state.leaderboard, title: state.title }));
  const services = useGamificationServices();

  const data = useMemo(() => leaderboard[`${activeScope}:${activeRange}`] ?? [], [leaderboard, activeScope, activeRange]);

  const fetchLeaderboard = useCallback(async () => {
    if (!services) {
      return;
    }
    setRefreshing(true);
    await services.refreshLeaderboards(activeScope, activeRange);
    setRefreshing(false);
  }, [services, activeScope, activeRange]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const renderItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
    <Animated.View entering={FadeInRight.delay(item.rank * 40)} style={styles.row}>
      <Text style={styles.rank}>#{item.rank}</Text>
      <View style={styles.profile}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{item.displayName?.[0] ?? '?'}</Text>
          </View>
        )}
        <View>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.subtitle}>{item.title}</Text>
        </View>
      </View>
      <View style={styles.points}>
        <Text style={styles.xp}>{item.xp} XP</Text>
        <Text style={[styles.trend, trendColor(item.trend)]}>{trendLabel(item.trend)}</Text>
      </View>
    </Animated.View>
  ), []);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)}>
        <Text style={styles.heading}>Rebríčky</Text>
        <Text style={styles.subtitleHeading}>Titul: {title}</Text>
      </Animated.View>
      <View style={styles.segmented}>
        {scopes.map((scope) => (
          <TouchableOpacity key={scope} onPress={() => setActiveScope(scope)} style={[styles.segmentButton, activeScope === scope && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeScope === scope && styles.segmentTextActive]}>{scope.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.segmentedRange}>
        {ranges.map((range) => (
          <TouchableOpacity key={range} onPress={() => setActiveRange(range)} style={[styles.segmentButton, activeRange === range && styles.segmentActive]}>
            <Text style={[styles.segmentText, activeRange === range && styles.segmentTextActive]}>{range.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLeaderboard} />}
        ListEmptyComponent={<Text style={styles.empty}>Zatiaľ žiadne dáta</Text>}
      />
    </View>
  );
};

const trendLabel = (trend: LeaderboardEntry['trend']) => {
  switch (trend) {
    case 'up':
      return '▲';
    case 'down':
      return '▼';
    default:
      return '—';
  }
};

const trendColor = (trend: LeaderboardEntry['trend']) => {
  switch (trend) {
    case 'up':
      return { color: '#48bb78' };
    case 'down':
      return { color: '#f56565' };
    default:
      return { color: '#a0aec0' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11131b',
    paddingTop: 48,
  },
  heading: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitleHeading: {
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 4,
  },
  segmented: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  segmentedRange: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  segmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: '#1c1f2b',
  },
  segmentActive: {
    backgroundColor: '#f6ad55',
  },
  segmentText: {
    color: '#cbd5f5',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#1c1f2b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1d29',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  rank: {
    color: '#f6ad55',
    fontWeight: '800',
    width: 40,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d3140',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
  },
  name: {
    color: '#fff',
    fontWeight: '600',
  },
  subtitle: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  points: {
    alignItems: 'flex-end',
  },
  xp: {
    color: '#fff',
    fontWeight: '700',
  },
  trend: {
    marginTop: 4,
  },
  empty: {
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default LeaderboardScreen;
