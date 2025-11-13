// HomeScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { homeStyles } from './styles';
import {
  fetchCoffees,
  fetchDailyTip,
  fetchHomeStatistics,
  fetchRecentScans,
  getEmptyStatistics,
  getTipFromCache,
} from './services';
import type { HomeStatistics, RecentScan, Tip } from './services';
import DailyTipCard from './components/DailyTipCard';
import DailyRitualCard, { DailyRitualCardProps } from './components/DailyRitualCard';
import BottomNav from '../../components/navigation/BottomNav';
import { usePersonalization } from '../../hooks/usePersonalization';
import TasteProfileRadarCard from './components/TasteProfileRadarCard';
import {
  buildTasteRadarScores,
  normalizeCoffeePreferenceSnapshot,
  CoffeePreferenceSnapshot,
  TasteRadarScores,
} from '../../utils/tasteProfile';

interface CoffeeItem {
  id: string;
  name: string;
  brand?: string;
  origin?: string;
  roastLevel?: number;
  intensity?: number;
  flavorNotes?: string[];
  rating?: number;
  match?: number;
  hasCheckmark?: boolean;
}

interface HomeScreenProps {
  onHomePress: () => void;
  onScanPress: () => void;
  onBrewPress: () => void;
  onBrewHistoryPress: () => void;
  onLogBrewPress: () => void;
  onProfilePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onInventoryPress: () => void;
  onPersonalizationPress: () => void;
  onCommunityRecipesPress: () => void;
  onSavedTipsPress: () => void;
  userName?: string;
}

const BACKGROUND_GRADIENT = ['#FFE8D1', '#FFA000', '#FAF8F5'];
const WELCOME_CARD_GRADIENT = ['#FF9966', '#A86B8C'];
const ACTION_GRADIENTS = {
  scan: ['#8B6544', '#6B4423'],
  brew: ['#00897B', '#00695C'],
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  onHomePress,
  onScanPress,
  onBrewPress,
  onBrewHistoryPress,
  onLogBrewPress,
  onProfilePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onInventoryPress,
  onPersonalizationPress,
  onCommunityRecipesPress,
  onSavedTipsPress,
  userName = 'Martin',
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [recommendedCoffees, setRecommendedCoffees] = useState<CoffeeItem[]>([]);
  const [dailyTip, setDailyTip] = useState<Tip | null>(null);
  const [tipLoading, setTipLoading] = useState(true);
  const [tipError, setTipError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [ritualRecommendation, setRitualRecommendation] =
    useState<DailyRitualCardProps['recommendation'] | null>(null);
  const [stats, setStats] = useState<HomeStatistics>(getEmptyStatistics());
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [tastePreferenceSnapshot, setTastePreferenceSnapshot] =
    useState<CoffeePreferenceSnapshot | null>(null);
  const [tasteRadarScores, setTasteRadarScores] =
    useState<TasteRadarScores | null>(null);
  const [tasteProfileLoading, setTasteProfileLoading] = useState(false);
  const [tasteProfileError, setTasteProfileError] = useState<string | null>(null);
  const styles = homeStyles();
  const { morningRitualManager, profile: personalizationProfile } =
    usePersonalization();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const result = await fetchHomeStatistics();
      setStats(result);
    } catch (error) {
      console.warn('HomeScreen: failed to load home statistics', error);
      setStats(getEmptyStatistics());
      if (error instanceof Error) {
        if (error.message.includes('nie je prihlásený')) {
          setStatsError('Prihlás sa, aby si videl svoje štatistiky.');
        } else if (error.message.includes('Supabase')) {
          setStatsError('Štatistiky momentálne nie sú dostupné.');
        } else {
          setStatsError('Nepodarilo sa načítať štatistiky.');
        }
      } else {
        setStatsError('Nepodarilo sa načítať štatistiky.');
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadCoffees = useCallback(async () => {
    try {
      const coffees = await fetchCoffees();
      setRecommendedCoffees(coffees);
      setCoffeeCount(coffees.length);
    } catch (err) {
      console.error('Error loading coffees:', err);
    }
  }, []);

  const loadTasteProfile = useCallback(async () => {
    setTasteProfileLoading(true);
    setTasteProfileError(null);

    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('Používateľ nie je prihlásený');
      }

      const token = await user.getIdToken();
      const response = await fetch('http://10.0.2.2:3001/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať preferencie');
      }

      const data = await response.json();
      const normalized = normalizeCoffeePreferenceSnapshot(
        data?.coffee_preferences,
      );
      setTastePreferenceSnapshot(normalized);
    } catch (error) {
      console.warn('HomeScreen: failed to load taste profile', error);
      setTasteProfileError('Nepodarilo sa načítať chuťový profil.');
    } finally {
      setTasteProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoffees();
  }, [loadCoffees]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTasteProfile();
  }, [loadTasteProfile]);

  useEffect(() => {
    const computed = buildTasteRadarScores({
      profile: personalizationProfile ?? null,
      preferences: tastePreferenceSnapshot,
    });
    setTasteRadarScores(computed);
  }, [personalizationProfile, tastePreferenceSnapshot]);

  useEffect(() => {
    if (!morningRitualManager) {
      setRitualRecommendation(null);
      return;
    }

    let active = true;

    morningRitualManager.scheduleNotifications().catch((error) => {
      console.warn('HomeScreen: failed to schedule ritual notifications', error);
    });

    const resolveRecommendation = async () => {
      try {
        const rec = await morningRitualManager.getRecommendation();
        if (active) {
          setRitualRecommendation(rec);
        }
      } catch (error) {
        console.warn('HomeScreen: failed to fetch ritual recommendation', error);
      }
    };

    resolveRecommendation();

    return () => {
      active = false;
    };
  }, [morningRitualManager]);

  const loadTip = useCallback(async () => {
    setTipLoading(true);
    setTipError(null);
    try {
      const tip = await fetchDailyTip();
      setDailyTip(tip);
    } catch (e) {
      console.warn('HomeScreen: failed to fetch daily tip', e);
      setTipError('Nepodarilo sa načítať tip. Skúste to znova.');
      try {
        const cached = await getTipFromCache(new Date().toISOString().slice(0, 10));
        if (cached) {
          setDailyTip(cached);
          setTipError(null);
        }
      } catch (cacheError) {
        console.warn('HomeScreen: failed to read cached tip', cacheError);
      }
    } finally {
      setTipLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTip();
  }, [loadTip]);

  useEffect(() => {
    const loadScans = async () => {
      try {
        const scans = await fetchRecentScans(10);
        setRecentScans(scans);
      } catch (err) {
        console.error('Error loading recent scans:', err);
      }
    };
    loadScans();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dobré ráno';
    if (hour < 17) return 'Dobrý deň';
    return 'Dobrý večer';
  };

  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Ranná káva je ideálna';
    if (hour < 16) return 'Skús espresso';
    return 'Pozor na spánok';
  };

  const getCoffeeAdvice = () => {
    const hour = new Date().getHours();
    if (hour < 11)
      return 'Ráno je ideálny čas na kávu – Taliani si cappuccino doprajú len do 11:00 kvôli tráveniu.';
    if (hour < 16)
      return 'Po 11:00 Taliani odporúčajú už len espresso, cappuccino kvôli mlieku môže zaťažiť trávenie.';
    return 'Pitie kávy po 16:00 môže negatívne ovplyvniť spánok.';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await loadCoffees();
    await loadTip();
    await loadTasteProfile();
    try {
      const scans = await fetchRecentScans(10);
      setRecentScans(scans);
    } catch (err) {
      console.error('Error refreshing scans:', err);
    }
    setRefreshing(false);
  };

  const handleCoffeeCardPress = (coffee: CoffeeItem) => {
    const details = [
      coffee.brand,
      coffee.origin,
      coffee.roastLevel !== undefined ? `Praženie: ${coffee.roastLevel}` : null,
      coffee.intensity !== undefined ? `Intenzita: ${coffee.intensity}` : null,
      coffee.flavorNotes && coffee.flavorNotes.length > 0
        ? coffee.flavorNotes.join(', ')
        : null,
      coffee.rating !== undefined ? `⭐ ${coffee.rating}` : null,
      coffee.match !== undefined ? `${coffee.match}% zhoda s tvojím profilom` : null,
    ]
      .filter(Boolean)
      .join('\n');
    Alert.alert(
      coffee.name,
      details,
      [
        { text: 'Zatvoriť', style: 'cancel' },
        { text: 'Pripraviť', onPress: onBrewPress },
      ],
    );
  };

  const quickActions = useMemo(
    () => [
      {
        key: 'scan',
        icon: '📷',
        title: 'Skenovať kávu',
        subtitle: 'AI analýza',
        gradient: ACTION_GRADIENTS.scan,
        onPress: onScanPress,
      },
      {
        key: 'brew',
        icon: '☕',
        title: 'Pripraviť drink',
        subtitle: 'Krok po kroku',
        gradient: ACTION_GRADIENTS.brew,
        onPress: onBrewPress,
      },
    ],
    [onScanPress, onBrewPress],
  );

  return (
    <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.gradientBackground}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND_GRADIENT[0]} />
      <SafeAreaView style={styles.container}>
        <View style={styles.appHeader}>
            <View style={styles.logoSection}>
              <View style={styles.logoIconWrapper}>
                <Text style={styles.logoIcon}>☕</Text>
              </View>
              <Text style={styles.logoText}>BrewMate</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.85}>
                <Text style={styles.notificationIcon}>🔔</Text>
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileAvatar}
                onPress={onProfilePress}
                activeOpacity={0.85}
              >
                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
            {ritualRecommendation ? (
              <View style={styles.ritualWrapper}>
                <DailyRitualCard recommendation={ritualRecommendation} />
              </View>
            ) : null}

            <LinearGradient
              colors={WELCOME_CARD_GRADIENT}
              style={styles.welcomeCard}
            >
              <View style={styles.welcomeRow}>
                <View style={styles.welcomeLeft}>
                  <Text style={styles.greetingTime}>{getGreeting()},</Text>
                  <Text style={styles.userName}>{`${userName}!`}</Text>
                  <View style={styles.coffeeSuggestion}>
                    <Text style={styles.coffeeSuggestionIcon}>☕</Text>
                    <Text style={styles.coffeeSuggestionText}>
                      {getTimeBasedMessage()}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.tipSection}>
              {tipLoading ? (
                <View style={styles.tipFeedback}>
                  <ActivityIndicator color="#6B4423" />
                  <Text style={styles.tipFeedbackText}>Načítavam tip...</Text>
                </View>
              ) : tipError ? (
                <View style={styles.tipFeedback}>
                  <Text style={styles.tipFeedbackText}>{tipError}</Text>
                  <TouchableOpacity
                    style={styles.tipRetry}
                    onPress={loadTip}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.tipRetryText}>Skúsiť znova</Text>
                  </TouchableOpacity>
                </View>
              ) : dailyTip ? (
                <DailyTipCard tip={dailyTip} />
              ) : (
                <View style={styles.tipFeedback}>
                  <Text style={styles.tipFeedbackText}>
                    Žiadny tip nie je k dispozícii.
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.savedTipsLink}
                onPress={onSavedTipsPress}
                activeOpacity={0.85}
                testID="saved-tips-cta"
              >
                <Text style={styles.savedTipsLinkText}>Zobraziť uložené tipy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.sectionTitle}>📊 Tvoje štatistiky</Text>
                <Text style={styles.sectionSubtitle}>
                  Prehľad aktivít v BrewMate
                </Text>
              </View>
              {statsLoading ? (
                <View style={styles.statsFeedback}>
                  <ActivityIndicator color="#6B4423" />
                  <Text style={styles.statsFeedbackText}>
                    Načítavam štatistiky...
                  </Text>
                </View>
              ) : (
                <>
                  {statsError ? (
                    <Text style={styles.statsErrorText} testID="stats-fallback-message">
                      {statsError}
                    </Text>
                  ) : null}
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Prípravy za 30 dní</Text>
                      <Text style={styles.statValue} testID="stat-monthly-brew-count">
                        {stats.monthlyBrewCount}
                      </Text>
                      <Text style={styles.statMeta}>Posledných 30 dní</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Najčastejší recept</Text>
                      <Text style={styles.statHighlight} testID="stat-top-recipe-name">
                        {stats.topRecipe?.name ?? 'Žiadny záznam'}
                      </Text>
                      {stats.topRecipe ? (
                        <Text style={styles.statMeta} testID="stat-top-recipe-count">
                          {`${stats.topRecipe.brewCount} príprav`}
                        </Text>
                      ) : (
                        <Text style={styles.statMeta}>Zaznamenaj si svoje varenia</Text>
                      )}
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Top chuťové tóny</Text>
                      {stats.topTastingNotes.length > 0 ? (
                        <View style={styles.statNoteList} testID="stat-top-notes">
                          {stats.topTastingNotes.slice(0, 3).map((note, index) => (
                            <Text
                              key={`${note.note}-${index}`}
                              style={styles.statNoteItem}
                              testID={`stat-top-note-${index}`}
                            >
                              {`${note.note} · ${note.occurrences}`}
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.statMeta}>Zatiaľ žiadne dáta</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.statsActions}>
                    <TouchableOpacity
                      style={styles.statsLink}
                      onPress={onBrewHistoryPress}
                      activeOpacity={0.85}
                      testID="brew-history-cta"
                    >
                      <Text style={styles.statsLinkText}>História varení</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.statsLinkPrimary}
                      onPress={onLogBrewPress}
                      activeOpacity={0.85}
                      testID="brew-log-cta"
                    >
                      <Text style={styles.statsLinkPrimaryText}>
                        Zaznamenať varenie
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <View style={styles.quickActions}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionCardWrapper}
                  onPress={action.onPress}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionCard}
                  >
                    <Text style={styles.actionIcon}>{action.icon}</Text>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={onCommunityRecipesPress}
                activeOpacity={0.85}
                testID="community-recipes-cta"
              >
                <Text style={styles.secondaryActionText}>Objav komunitné recepty</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={onPersonalizationPress}
                activeOpacity={0.85}
                testID="personalization-cta"
              >
                <Text style={styles.secondaryActionText}>Uprav chuťový profil</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tasteProfileSection}>
              <TasteProfileRadarCard
                scores={tasteRadarScores}
                loading={tasteProfileLoading}
                error={tasteProfileError}
                onRetry={loadTasteProfile}
                onEdit={onPersonalizationPress}
              />
            </View>

            <View style={styles.inventorySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Tvoje kávy</Text>
                <TouchableOpacity
                  style={styles.sectionBadge}
                  onPress={onInventoryPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sectionBadgeText}>{coffeeCount} káv</Text>
                </TouchableOpacity>
              </View>
              {recommendedCoffees.length === 0 ? (
                <Text style={styles.emptyStateText}>
                  Žiadne kávy sa nenašli
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.coffeeCarousel}
                >
                  {recommendedCoffees.map((coffee) => (
                    <TouchableOpacity
                      key={coffee.id}
                      style={styles.coffeeCard}
                      onPress={() => handleCoffeeCardPress(coffee)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.coffeeHeader}>
                        <Text style={styles.coffeeBrand}>
                          {coffee.brand ?? 'BrewMate'}
                        </Text>
                        {coffee.rating !== undefined ? (
                          <Text style={styles.coffeeRating}>
                            ⭐ {coffee.rating.toFixed ? coffee.rating.toFixed(1) : coffee.rating}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.coffeeName}>{coffee.name}</Text>
                      {coffee.flavorNotes && coffee.flavorNotes.length > 0 ? (
                        <View style={styles.coffeeTags}>
                          {coffee.flavorNotes.map((note) => (
                            <Text key={note} style={styles.coffeeTag}>
                              {note}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {coffee.origin ? (
                        <Text style={styles.coffeeOrigin}>{coffee.origin}</Text>
                      ) : null}
                      {(coffee.match !== undefined || coffee.intensity !== undefined) ? (
                        <View style={styles.coffeeMetaRow}>
                          {coffee.match !== undefined ? (
                            <Text style={styles.matchScore}>{coffee.match}% zhoda</Text>
                          ) : null}
                          {coffee.intensity !== undefined ? (
                            <Text style={styles.coffeeOrigin}>
                              Intenzita: {coffee.intensity}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.brewButton}
                        onPress={onBrewPress}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.brewButtonText}>Pripraviť</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIcon}>
                  <Text>🔬</Text>
                </View>
                <Text style={styles.insightLabel}>Denný insight</Text>
              </View>
              <Text style={styles.insightText}>
                "Vedeli ste, že správne namletá káva by mala mať konzistenciu hrubej
                morskej soli pre French Press a jemného prášku pre espresso? Mletie je
                kľúčové pre extrakciu."
              </Text>
              <Text style={styles.insightFooter}>{getCoffeeAdvice()}</Text>
            </View>

            <View style={styles.activitySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Nedávna aktivita</Text>
                <TouchableOpacity
                  onPress={onScanPress}
                  style={styles.sectionLink}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sectionLinkText}>Skenovať teraz</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityList}>
                {recentScans.length === 0 ? (
                  <Text style={styles.emptyStateText}>
                    Zatiaľ nič naskenované
                  </Text>
                ) : (
                  recentScans.slice(0, 5).map((scan) => (
                    <View key={scan.id} style={styles.activityItem}>
                      <View style={styles.activityIconWrapper}>
                        <Text style={styles.activityIcon}>☕</Text>
                      </View>
                      <View style={styles.activityDetails}>
                        <Text style={styles.activityName}>{scan.name}</Text>
                        <Text style={styles.activityTime}>Posledné naskenovanie</Text>
                      </View>
                      <Text style={styles.activityScore}>⭐</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
        </ScrollView>

        <BottomNav
          active="home"
          onHomePress={onHomePress}
          onDiscoverPress={onDiscoverPress}
          onRecipesPress={onRecipesPress}
          onFavoritesPress={onFavoritesPress}
          onProfilePress={onProfilePress}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

export default HomeScreen;
