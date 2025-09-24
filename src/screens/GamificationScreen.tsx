import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import auth from '@react-native-firebase/auth';
import LevelProgressBar from '../components/gamification/LevelProgressBar';
import DailyQuestCard from '../components/gamification/DailyQuestCard';
import AchievementShowcase from '../components/gamification/AchievementShowcase';
import StatsRadarChart from '../components/gamification/StatsRadarChart';
import useGamification from '../hooks/useGamification';
import usePersonalization from '../hooks/usePersonalization';
import gamificationStore from '../store/gamificationStore';
import type {
  AchievementDefinition,
  DailyQuestInstance,
  DailyQuestProgress,
  XpSource,
} from '../types/gamification';
import type {LeaderboardScope} from '../services/gamification/GamificationEngine';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const rarityOrder = {legendary: 4, epic: 3, rare: 2, common: 1} as const;

type QuickAction = {
  id: string;
  label: string;
  source: XpSource;
  baseAmount: number;
  metadata?: Record<string, unknown>;
};

const quickActions: QuickAction[] = [
  {
    id: 'perfect-brew',
    label: 'Perfektné espresso',
    source: 'perfect_brew',
    baseAmount: 160,
    metadata: {method: 'espresso', art_score: 5},
  },
  {
    id: 'share-story',
    label: 'Zdieľal príbeh',
    source: 'share_story',
    baseAmount: 60,
    metadata: {channel: 'community'},
  },
  {
    id: 'help-community',
    label: 'Pomohol komunite',
    source: 'help_others',
    baseAmount: 90,
    metadata: {thread: 'latte-art'},
  },
];

const GamificationScreen: React.FC = () => {
  const {
    state,
    initialize,
    handleXp,
    updateQuest,
    refreshQuests,
    useFreeze,
    featureAchievement,
    loadLeaderboard,
  } = useGamification();
  const {userId, learningEngine} = usePersonalization();
  const [initializing, setInitializing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>('global');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recentXpGain, setRecentXpGain] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousLevel = useRef(state.level);

  const activeUserId = useMemo(() => userId ?? auth().currentUser?.uid ?? null, [userId]);

  const preferenceTags = useMemo(() => {
    const profile = learningEngine?.getProfile();
    if (!profile) {
      return [] as string[];
    }
    const notes = Object.entries(profile.flavorNotes ?? {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 4)
      .map(([note]) => note);
    const seasonal = profile.seasonalAdjustments?.map((adjustment) => adjustment.key) ?? [];
    return Array.from(new Set([...notes, ...seasonal]));
  }, [learningEngine]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }
    if (state.initialized && state.userId === activeUserId) {
      return;
    }
    setInitializing(true);
    initialize(activeUserId, preferenceTags)
      .catch((error) => console.warn('GamificationScreen: failed to initialize engine', error))
      .finally(() => setInitializing(false));
  }, [activeUserId, initialize, preferenceTags, state.initialized, state.userId]);

  useEffect(() => {
    if (!state.initialized) {
      return;
    }
    if (!state.radarStats) {
      const profile = learningEngine?.getProfile();
      const normalize = (value: number) => Math.max(0, Math.min(1, value / 10));
      const explorationBase = profile?.flavorNotes
        ? Object.values(profile.flavorNotes).reduce((sum, value) => sum + Number(value || 0), 0) /
            Math.max(1, Object.keys(profile.flavorNotes).length) /
            10
        : 0.45;
      gamificationStore
        .getState()
        .setRadarStats({
          brewing: normalize(profile?.preferences.body ?? state.comboMultiplier * 3),
          exploration: Math.max(0.2, Math.min(1, explorationBase)),
          social: normalize(profile?.preferences.sweetness ?? state.streakDays / 10),
          knowledge: normalize(10 - (profile?.preferences.bitterness ?? 5)),
          averageComparison: 0.6,
        });
    }
  }, [learningEngine, state.comboMultiplier, state.initialized, state.radarStats, state.streakDays]);

  useEffect(() => {
    if (state.xpLog.length === 0) {
      return;
    }
    const lastEvent = state.xpLog[state.xpLog.length - 1];
    setRecentXpGain(Math.round(lastEvent.baseAmount));
  }, [state.xpLog]);

  useEffect(() => {
    if (recentXpGain <= 0) {
      return;
    }
    const timeout = setTimeout(() => setRecentXpGain(0), 2200);
    return () => clearTimeout(timeout);
  }, [recentXpGain]);

  useEffect(() => {
    if (state.level > previousLevel.current) {
      setLeveledUp(true);
      const timeout = setTimeout(() => setLeveledUp(false), 1600);
      previousLevel.current = state.level;
      return () => clearTimeout(timeout);
    }
    previousLevel.current = state.level;
    return undefined;
  }, [state.level]);

  useEffect(() => {
    if (!state.initialized || !state.userId) {
      return;
    }
    let cancelled = false;
    setLeaderboardLoading(true);
    loadLeaderboard(leaderboardScope)
      .catch((error) => console.warn('GamificationScreen: failed to load leaderboard', error))
      .finally(() => {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leaderboardScope, loadLeaderboard, state.initialized, state.userId]);

  useEffect(() => () => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }
  }, []);

  const pushStatusMessage = useCallback((message: string) => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }
    setStatusMessage(message);
    messageTimer.current = setTimeout(() => setStatusMessage(null), 2600);
  }, []);

  const handleQuestClaim = useCallback(
    async (questId: string) => {
      if (!state.userId) {
        return;
      }
      const quest = state.dailyQuests.find((item) => item.id === questId);
      const progress = state.questProgress[questId];
      if (!quest || !progress || progress.claimed || !progress.completed) {
        return;
      }
      const payload: DailyQuestProgress & {userId: string} = {
        ...progress,
        userId: state.userId,
        claimed: true,
        updatedAt: new Date().toISOString(),
      };
      try {
        await updateQuest(payload);
        await handleXp({
          userId: state.userId,
          source: 'event_bonus',
          baseAmount: quest.rewardXp,
          timestamp: new Date().toISOString(),
          metadata: {questId: quest.id, questTitle: quest.title},
        });
        pushStatusMessage(`Odmena za úlohu „${quest.title}“ pridelená!`);
      } catch (error) {
        console.warn('GamificationScreen: failed to claim quest reward', error);
        pushStatusMessage('Nepodarilo sa získať odmenu. Skús to znova.');
      }
    },
    [handleXp, pushStatusMessage, state.dailyQuests, state.questProgress, state.userId, updateQuest]
  );

  const handleRefreshQuests = useCallback(async () => {
    if (!state.userId) {
      return;
    }
    setRefreshing(true);
    try {
      await refreshQuests(preferenceTags);
      pushStatusMessage('Denné úlohy obnovené podľa tvojich chutí.');
    } catch (error) {
      console.warn('GamificationScreen: failed to refresh quests', error);
    } finally {
      setRefreshing(false);
    }
  }, [preferenceTags, pushStatusMessage, refreshQuests, state.userId]);

  const handleFreezeUse = useCallback(() => {
    const success = useFreeze();
    pushStatusMessage(success ? 'Freeze token použitý – streak je v bezpečí.' : 'Nemáš žiadne freeze tokeny.');
  }, [pushStatusMessage, useFreeze]);

  const handleQuickXp = useCallback(
    async (action: QuickAction) => {
      if (!state.userId) {
        return;
      }
      try {
        await handleXp({
          userId: state.userId,
          source: action.source,
          baseAmount: action.baseAmount,
          timestamp: new Date().toISOString(),
          metadata: {...(action.metadata ?? {}), quickAction: true},
        });
        pushStatusMessage(`+${action.baseAmount} XP – ${action.label}!`);
      } catch (error) {
        console.warn('GamificationScreen: failed to send XP event', error);
        pushStatusMessage('XP sa nepodarilo započítať.');
      }
    },
    [handleXp, pushStatusMessage, state.userId]
  );

  const levelProgress = useMemo(() => {
    if (state.xpToNextLevel <= 0) {
      return 1;
    }
    return Math.max(0, Math.min(1, state.xp / state.xpToNextLevel));
  }, [state.xp, state.xpToNextLevel]);

  const featuredAchievement = useMemo(() => {
    if (!state.achievements.length) {
      return undefined;
    }
    const progressValues = Object.values(state.achievementProgress);
    const featured = progressValues.find((progress) => progress.featured);
    if (featured) {
      return state.achievements.find((achievement) => achievement.id === featured.achievementId);
    }
    const unlocked = state.achievements.filter((achievement) =>
      Boolean(state.achievementProgress[achievement.id]?.unlockedAt)
    );
    if (unlocked.length === 0) {
      return undefined;
    }
    const sorted = [...unlocked].sort((a, b) => {
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) {
        return rarityDiff;
      }
      const aUnlocked = state.achievementProgress[a.id]?.unlockedAt ?? '';
      const bUnlocked = state.achievementProgress[b.id]?.unlockedAt ?? '';
      return bUnlocked.localeCompare(aUnlocked);
    });
    return sorted[0];
  }, [state.achievementProgress, state.achievements]);

  const leaderboardEntries = useMemo(() => state.leaderboard.slice(0, 5), [state.leaderboard]);

  if (!activeUserId) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Prihlás sa, aby si videl gamifikáciu.</Text>
        <Text style={styles.emptyStateSubtitle}>
          Po prihlásení ti ukážeme tvoje levely, úlohy aj komunitný rebríček.
        </Text>
      </View>
    );
  }

  if (initializing && !state.initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
        <Text style={styles.loadingText}>Pripravujeme tvoje gamifikačné centrum...</Text>
      </View>
    );
  }

  return (
    <AnimatedScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      entering={FadeIn.duration(280)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefreshQuests} tintColor="#f8fafc" />}
    >
      <Animated.View entering={FadeInDown.duration(320)} layout={Layout.springify()}>
        <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.hero}>
          <Text style={styles.heroTitle}>Vitaj späť, {state.title}</Text>
          <Text style={styles.heroSubtitle}>Úroveň {state.level} · {state.skillPoints} SP k dispozícii</Text>
          <View style={styles.heroStatsRow}>
            <Text style={styles.heroMeta}>🔥 {state.streakDays} dní streak</Text>
            <Text style={styles.heroMeta}>⚡️ x{state.comboMultiplier.toFixed(1)} combo</Text>
          </View>
          {state.seasonalEvent ? (
            <View style={styles.eventPill}>
              <Text style={styles.eventTitle}>{state.seasonalEvent.title}</Text>
              <Text style={styles.eventMeta}>Bonus {state.seasonalEvent.bonusMultiplier}× XP do {new Date(
                state.seasonalEvent.endsAt
              ).toLocaleDateString()}</Text>
            </View>
          ) : (
            <Text style={styles.heroHint}>Plň úlohy denne a získaj špeciálne odmeny.</Text>
          )}
          {statusMessage && (
            <Animated.Text entering={FadeInUp} exiting={FadeOut} style={styles.statusMessage}>
              {statusMessage}
            </Animated.Text>
          )}
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(320)} layout={Layout.springify()} style={styles.section}>
        <LevelProgressBar
          progress={levelProgress}
          level={state.level}
          title={state.title}
          xp={state.xp}
          xpToNext={state.xpToNextLevel}
          recentGain={recentXpGain}
          leveledUp={leveledUp}
        />
        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakLabel}>Login streak</Text>
            <Text style={styles.streakValue}>{state.loginStreak} dní</Text>
            <Text style={styles.streakHint}>Nezabudni sa prihlásiť každý deň.</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakLabel}>Brew streak</Text>
            <Text style={styles.streakValue}>{state.brewStreak} dní</Text>
            <Text style={styles.streakHint}>Nové recepty držia pruh pri živote.</Text>
          </View>
        </View>
        <View style={styles.freezeCard}>
          <View>
            <Text style={styles.freezeTitle}>Freeze tokeny</Text>
            <Text style={styles.freezeMeta}>Zostáva {state.freezeTokens}</Text>
            <Text style={styles.freezeHint}>Použi ich, keď vieš, že nestihneš rituál.</Text>
          </View>
          <TouchableOpacity style={styles.freezeButton} onPress={handleFreezeUse}>
            <Text style={styles.freezeButtonText}>Aktivovať</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(160).duration(320)} layout={Layout.springify()} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rýchle XP akcie</Text>
          <Text style={styles.sectionSubtitle}>Stačí jedno ťuknutie pre zaznamenanie udalosti.</Text>
        </View>
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.quickAction} onPress={() => handleQuickXp(action)}>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Text style={styles.quickActionMeta}>+{action.baseAmount} XP</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(320)} layout={Layout.springify()} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Denné úlohy</Text>
          <TouchableOpacity onPress={handleRefreshQuests}>
            <Text style={styles.sectionAction}>Obnoviť</Text>
          </TouchableOpacity>
        </View>
        {state.dailyQuests.length === 0 ? (
          <Text style={styles.emptyListText}>Úlohy sa načítajú... Skontroluj o chvíľu.</Text>
        ) : (
          state.dailyQuests.map((quest: DailyQuestInstance, index: number) => (
            <Animated.View key={quest.id} entering={FadeInUp.delay(80 * index)} layout={Layout.springify()}>
              <DailyQuestCard quest={quest} progress={state.questProgress[quest.id]} onClaim={handleQuestClaim} />
            </Animated.View>
          ))
        )}
      </Animated.View>

      {featuredAchievement && (
        <Animated.View entering={FadeInUp.delay(240).duration(320)} layout={Layout.springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Významný odznak</Text>
            <TouchableOpacity onPress={() => featureAchievement(featuredAchievement.id)}>
              <Text style={styles.sectionAction}>Zvýrazniť</Text>
            </TouchableOpacity>
          </View>
          <AchievementShowcase achievement={featuredAchievement as AchievementDefinition} onFeature={featureAchievement} />
        </Animated.View>
      )}

      {state.radarStats && (
        <Animated.View entering={FadeInUp.delay(280).duration(320)} layout={Layout.springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profil zručností</Text>
            <Text style={styles.sectionSubtitle}>Porovnanie s komunitou</Text>
          </View>
          <StatsRadarChart stats={state.radarStats} />
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(320).duration(320)} layout={Layout.springify()} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.scopeSwitch}>
            {(['global', 'friends', 'local'] as LeaderboardScope[]).map((scope) => (
              <TouchableOpacity
                key={scope}
                style={[styles.scopeButton, leaderboardScope === scope && styles.scopeButtonActive]}
                onPress={() => setLeaderboardScope(scope)}
              >
                <Text style={[styles.scopeLabel, leaderboardScope === scope && styles.scopeLabelActive]}>
                  {scope.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {leaderboardLoading ? (
          <ActivityIndicator color="#fbbf24" style={styles.leaderboardLoader} />
        ) : leaderboardEntries.length === 0 ? (
          <Text style={styles.emptyListText}>Zatiaľ nemáme dáta pre tento rebríček.</Text>
        ) : (
          leaderboardEntries.map((entry, index) => (
            <Animated.View
              key={entry.userId}
              entering={FadeInUp.delay(80 * index)}
              layout={Layout.springify()}
              style={[styles.leaderboardRow, entry.userId === state.userId && styles.leaderboardRowActive]}
            >
              <Text style={styles.leaderboardRank}>{index + 1}</Text>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{entry.displayName}</Text>
                <Text style={styles.leaderboardMeta}>
                  Level {entry.level} · {entry.totalXp} XP · 🔥 {entry.streakDays}
                </Text>
              </View>
              <Text style={styles.leaderboardBadge}>🏅 {entry.achievementsUnlocked}</Text>
            </Animated.View>
          ))
        )}
      </Animated.View>
    </AnimatedScrollView>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: '#020617'},
  content: {padding: 20, paddingBottom: 120},
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#020617',
  },
  emptyStateTitle: {color: '#f8fafc', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12},
  emptyStateSubtitle: {color: '#cbd5f5', textAlign: 'center', lineHeight: 20},
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {marginTop: 16, color: '#e2e8f0', fontSize: 16},
  hero: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  heroTitle: {color: '#f8fafc', fontSize: 22, fontWeight: '700'},
  heroSubtitle: {color: '#cbd5f5', marginTop: 6, fontSize: 14},
  heroStatsRow: {flexDirection: 'row', marginTop: 20},
  heroMeta: {color: '#fde68a', marginRight: 16, fontWeight: '600'},
  heroHint: {color: '#a855f7', marginTop: 16},
  eventPill: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.2)',
  },
  eventTitle: {color: '#f8fafc', fontWeight: '700'},
  eventMeta: {color: '#bae6fd', marginTop: 4, fontSize: 12},
  statusMessage: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.15)',
    color: '#fef3c7',
    fontWeight: '600',
  },
  section: {marginBottom: 32},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  sectionTitle: {color: '#f8fafc', fontSize: 18, fontWeight: '700'},
  sectionSubtitle: {color: '#cbd5f5', fontSize: 12, marginLeft: 8},
  sectionAction: {color: '#38bdf8', fontWeight: '600'},
  emptyListText: {color: '#94a3b8', fontStyle: 'italic'},
  streakRow: {flexDirection: 'row', marginTop: 12},
  streakCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    marginRight: 12,
  },
  streakLabel: {color: '#cbd5f5', fontSize: 12},
  streakValue: {color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 6},
  streakHint: {color: '#64748b', fontSize: 11, marginTop: 8},
  freezeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#111827',
  },
  freezeTitle: {color: '#f8fafc', fontWeight: '700', fontSize: 16},
  freezeMeta: {color: '#bae6fd', marginTop: 6},
  freezeHint: {color: '#64748b', fontSize: 12, marginTop: 8},
  freezeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  freezeButtonText: {color: '#f8fafc', fontWeight: '700'},
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  quickAction: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  quickActionLabel: {color: '#f8fafc', fontWeight: '600'},
  quickActionMeta: {color: '#fbbf24', marginTop: 8, fontWeight: '700'},
  sectionSubtitleText: {color: '#94a3b8'},
  scopeSwitch: {flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 16, padding: 4},
  scopeButton: {flex: 1, paddingVertical: 8, borderRadius: 12},
  scopeButtonActive: {backgroundColor: '#2563eb'},
  scopeLabel: {color: '#94a3b8', textAlign: 'center', fontSize: 12, fontWeight: '600'},
  scopeLabelActive: {color: '#f8fafc'},
  leaderboardLoader: {marginVertical: 12},
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  leaderboardRowActive: {borderWidth: 2, borderColor: '#fbbf24'},
  leaderboardRank: {color: '#fef3c7', width: 28, fontWeight: '700', fontSize: 18},
  leaderboardInfo: {flex: 1},
  leaderboardName: {color: '#f8fafc', fontWeight: '600'},
  leaderboardMeta: {color: '#cbd5f5', marginTop: 4, fontSize: 12},
  leaderboardBadge: {color: '#fbbf24', fontWeight: '700'},
});

export default GamificationScreen;
