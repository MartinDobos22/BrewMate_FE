// UserProfile.tsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import auth from '@react-native-firebase/auth';
import { getSafeAreaTop, getSafeAreaBottom, scale, verticalScale } from './utils/safeArea';
import { AIResponseDisplay } from './AIResponseDisplay';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersonalization } from '../hooks/usePersonalization';
import { PrivacyManager } from '../services/PrivacyManager';
import { preferenceEngine } from '../services/personalizationGateway';
import { privacyManager, optIn, DEFAULT_COMMUNITY_AVERAGE, PERSONALIZATION_USER_ID } from '../services/Personalization';
import type { TrackingPreferences, TasteProfileVector } from '../types/Personalization';

const { width } = Dimensions.get('window');
const palette = {
  espresso: '#2C1810',
  darkRoast: '#3E2723',
  medium: '#6B4C3A',
  mocha: '#8D6E63',
  latte: '#A67C52',
  caramel: '#C8A882',
  cream: '#F5DDD0',
  foam: '#FFF8F4',
  accentGold: '#FFB300',
  accentAmber: '#FFA000',
  accentOrange: '#FF8C42',
  accentCoral: '#FF6B6B',
  accentMint: '#7FB069',
  accentPurple: '#9C27B0',
};

const BACKGROUND_GRADIENT = [palette.accentGold, palette.accentOrange, palette.caramel];
const PRIMARY_GRADIENT = [palette.espresso, palette.medium];
const FAB_WIDTH = Math.min(width - scale(32), scale(360));

type RadarAxisKey = 'acidity' | 'sweetness' | 'body' | 'bitterness' | 'aroma' | 'fruitiness';

type RadarScores = Record<RadarAxisKey, number>;

const RADAR_AXES: { key: RadarAxisKey; label: string }[] = [
  { key: 'acidity', label: 'Kyslosť' },
  { key: 'sweetness', label: 'Sladkosť' },
  { key: 'body', label: 'Telo' },
  { key: 'bitterness', label: 'Horkosť' },
  { key: 'aroma', label: 'Aroma' },
  { key: 'fruitiness', label: 'Ovocnosť' },
];

const EXPERIENCE_LEVEL_META: Record<string, { label: string; gradient: string[] }> = {
  beginner: { label: '🌱 Začiatočník', gradient: [palette.accentMint, '#43A047'] },
  intermediate: { label: '☕ Milovník kávy', gradient: [palette.latte, palette.caramel] },
  expert: { label: '🎯 Kávový nadšenec', gradient: [palette.accentPurple, palette.accentCoral] },
  default: { label: '☕ Milovník kávy', gradient: [palette.latte, palette.caramel] },
};

const RADAR_SIZE = 240;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = RADAR_SIZE / 2 - 24;

const clampTasteValue = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(10, value));
};

const getExperienceLevelMeta = (level?: string | null) => {
  if (!level) {
    return EXPERIENCE_LEVEL_META.default;
  }
  return EXPERIENCE_LEVEL_META[level] ?? EXPERIENCE_LEVEL_META.default;
};

const buildRadarScores = (profile?: TasteProfileVector | null, community?: TasteProfileVector | null): RadarScores | null => {
  if (!profile) {
    return null;
  }

  const fallback = 5;
  const communitySafe = community ?? DEFAULT_COMMUNITY_AVERAGE;

  const aromaBase = (clampTasteValue(profile.body, fallback) + clampTasteValue(communitySafe.body, fallback)) / 2;
  const fruitinessBase = (clampTasteValue(profile.acidity, fallback) + clampTasteValue(communitySafe.sweetness, fallback)) / 2;

  return {
    acidity: clampTasteValue(profile.acidity, fallback),
    sweetness: clampTasteValue(profile.sweetness, fallback),
    body: clampTasteValue(profile.body, fallback),
    bitterness: clampTasteValue(profile.bitterness, fallback),
    aroma: clampTasteValue(aromaBase, fallback),
    fruitiness: clampTasteValue(fruitinessBase, fallback),
  };
};

const radarPoint = (value: number, index: number, total: number, radius: number = RADAR_RADIUS) => {
  const safeValue = clampTasteValue(value, 0);
  const normalized = safeValue / 10;
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: RADAR_CENTER + radius * normalized * Math.cos(angle),
    y: RADAR_CENTER + radius * normalized * Math.sin(angle),
  };
};

const buildPolygonPoints = (values: number[], radius: number = RADAR_RADIUS) =>
  values
    .map((value, index) => {
      const { x, y } = radarPoint(value, index, values.length, radius);
      return `${x},${y}`;
    })
    .join(' ');

const ProfileRadarChart: React.FC<{ scores: RadarScores }> = React.memo(({ scores }) => {
  const dataValues = useMemo(() => RADAR_AXES.map(axis => scores[axis.key]), [scores]);
  const dataPolygon = useMemo(() => buildPolygonPoints(dataValues), [dataValues]);
  const gridPolygons = useMemo(
    () => [2, 4, 6, 8, 10].map(level => buildPolygonPoints(new Array(RADAR_AXES.length).fill(level))),
    [],
  );

  return (
    <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
      <Defs>
        <SvgLinearGradient id="profile-radar-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255, 215, 170, 0.35)" />
          <Stop offset="100%" stopColor="rgba(255, 175, 110, 0.1)" />
        </SvgLinearGradient>
        <SvgLinearGradient id="profile-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(234, 88, 12, 0.7)" />
          <Stop offset="100%" stopColor="rgba(249, 115, 22, 0.45)" />
        </SvgLinearGradient>
      </Defs>

      <Polygon points={buildPolygonPoints(new Array(RADAR_AXES.length).fill(10))} fill="url(#profile-radar-bg)" />

      {gridPolygons.map((points, index) => (
        <Polygon key={`grid-${index}`} points={points} fill="none" stroke="rgba(217, 119, 6, 0.18)" strokeWidth={1} />
      ))}

      {RADAR_AXES.map((axis, index) => {
        const axisEnd = radarPoint(10, index, RADAR_AXES.length);
        const labelPosition = radarPoint(11, index, RADAR_AXES.length);
        return (
          <React.Fragment key={axis.key}>
            <Line x1={RADAR_CENTER} y1={RADAR_CENTER} x2={axisEnd.x} y2={axisEnd.y} stroke="rgba(217, 119, 6, 0.25)" strokeWidth={1} />
            <SvgText x={labelPosition.x} y={labelPosition.y} fill="#8B5E34" fontSize={12} textAnchor="middle">
              {axis.label}
            </SvgText>
          </React.Fragment>
        );
      })}

      <Polygon points={dataPolygon} fill="url(#profile-radar-fill)" stroke="rgba(234, 88, 12, 0.85)" strokeWidth={2.5} />

      {RADAR_AXES.map((axis, index) => {
        const { x, y } = radarPoint(dataValues[index], index, RADAR_AXES.length);
        return <Circle key={`dot-${axis.key}`} cx={x} cy={y} r={4.5} fill="#EA580C" stroke="#fff7ed" strokeWidth={2} />;
      })}
    </Svg>
  );
});

interface ProfileData {
  email: string;
  name?: string;
  coffee_preferences?: any;
  experience_level?: string;
  ai_recommendation?: string;
  manual_input?: string;
}

interface Stat {
  label: string;
  value: string | number;
  emoji: string;
}

const UserProfile = ({
                       onEdit,
                       onPreferences,
                       onForm,
                       onBack,
                       onHomePress,
                       onDiscoverPress,
                       onRecipesPress,
                       onFavoritesPress,
                       onProfilePress,
                       onGamification,
                     }: {
  onEdit: () => void;
  onPreferences: () => void;
  onForm?: () => void;
  onBack?: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
  onGamification: () => void;
}) => {
  const { ready: personalizationReady, privacyManager: contextPrivacyManager } = usePersonalization();
  const privacyManagerRef = useRef<PrivacyManager>(contextPrivacyManager ?? privacyManager.manager);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [coffeeStats, setCoffeeStats] = useState<Stat[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfileVector | null>(null);
  const [communityAverage, setCommunityAverage] = useState<TasteProfileVector>(DEFAULT_COMMUNITY_AVERAGE);
  const [trackingConsent, setTrackingConsent] = useState<TrackingPreferences | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const hasDataConsent = trackingConsent ? optIn.dataControl.every(flag => trackingConsent[flag]) : false;

  useEffect(() => {
    if (contextPrivacyManager) {
      privacyManagerRef.current = contextPrivacyManager;
    }
  }, [contextPrivacyManager]);

  const fetchProfile = useCallback(async () => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('Not authenticated');

      const idToken = await user.getIdToken();

      const res = await fetch('http://10.0.2.2:3001/api/profile', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Unknown error');
      }

      const data = await res.json();
      setProfile(data);

      if (data.ai_recommendation) {
        setRecommendation(data.ai_recommendation);
      }

      generateStats(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      Alert.alert('Chyba', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const readPersonalization = useCallback(async () => {
    const profilePromise = personalizationReady ? preferenceEngine.getProfile() : Promise.resolve(null);

    try {
      const managerInstance = privacyManagerRef.current;
      const [personalProfile, preferences, insights] = await Promise.all([
        profilePromise,
        managerInstance.loadPreferences(PERSONALIZATION_USER_ID),
        managerInstance.buildCommunityInsights(PERSONALIZATION_USER_ID),
      ]);

      const nextTasteProfile = personalProfile?.preferences ?? null;

      const nextCommunityAverage: TasteProfileVector = insights.sampleSize > 0
        ? {
            sweetness: clampTasteValue(insights.flavorTrends.sweetness, DEFAULT_COMMUNITY_AVERAGE.sweetness),
            acidity: clampTasteValue(insights.flavorTrends.acidity, DEFAULT_COMMUNITY_AVERAGE.acidity),
            bitterness: clampTasteValue(insights.flavorTrends.bitterness, DEFAULT_COMMUNITY_AVERAGE.bitterness),
            body: clampTasteValue(insights.flavorTrends.body, DEFAULT_COMMUNITY_AVERAGE.body),
          }
        : { ...DEFAULT_COMMUNITY_AVERAGE };

      return {
        profile: nextTasteProfile,
        preferences,
        communityAverage: nextCommunityAverage,
      };
    } catch (error) {
      console.warn('UserProfile: failed to load personalization data', error);
      throw error;
    }
  }, [personalizationReady]);

  const applyPersonalization = useCallback(async () => {
    try {
      const data = await readPersonalization();
      setTasteProfile(data.profile);
      setTrackingConsent(data.preferences);
      setCommunityAverage(data.communityAverage);
    } catch (error) {
      console.warn('UserProfile: personalization state update failed', error);
      setTasteProfile(null);
      setCommunityAverage(DEFAULT_COMMUNITY_AVERAGE);
    }
  }, [readPersonalization]);

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('@AuthToken');
      if (token) {
        await fetch('http://10.0.2.2:3001/api/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await auth().signOut();
      await AsyncStorage.removeItem('@AuthToken');
    } catch (err) {
      Alert.alert('Chyba', 'Nepodarilo sa odhlásiť');
      console.error('Sign out error:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await readPersonalization();
        if (!active) {
          return;
        }
        setTasteProfile(data.profile);
        setTrackingConsent(data.preferences);
        setCommunityAverage(data.communityAverage);
      } catch (error) {
        if (!active) {
          return;
        }
        setTasteProfile(null);
        setCommunityAverage(DEFAULT_COMMUNITY_AVERAGE);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [readPersonalization]);

  const generateStats = (data: ProfileData) => {
    const fallback = '–';
    const prefs = data.coffee_preferences;

    const intensityMap: Record<string, string> = {
      light: 'Jemná',
      medium: 'Stredná',
      strong: 'Silná',
    };

    const roastMap: Record<string, string> = {
      light: 'Svetlé',
      medium: 'Stredné',
      dark: 'Tmavé',
    };

    const temperatureMap: Record<string, string> = {
      hot: 'Horúca',
      iced: 'Ľadová',
      both: 'Oboje',
    };

    const intensityValue = prefs?.intensity ? intensityMap[prefs.intensity] || prefs.intensity : fallback;
    const roastValue = prefs?.roast ? roastMap[prefs.roast] || prefs.roast : fallback;
    const temperatureValue = prefs?.temperature ? temperatureMap[prefs.temperature] || prefs.temperature : fallback;

    const stats: Stat[] = [
      { label: 'Intenzita', value: intensityValue, emoji: '💪' },
      { label: 'Praženie', value: roastValue, emoji: '🔥' },
      { label: 'Teplota', value: temperatureValue, emoji: '🌡️' },
    ];

    const hasData = stats.some(stat => stat.value !== fallback);
    setCoffeeStats(hasData ? stats : []);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    applyPersonalization();
  };

  const handleExportData = useCallback(async () => {
    if (!hasDataConsent || exportingData) {
      return;
    }

    setExportingData(true);
    try {
      const payload = await privacyManager.exportData();
      console.log('UserProfile: export payload', payload);
      Alert.alert('Export pripravený', 'Tvoje personalizačné dáta boli pripravené na export.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa exportovať dáta.');
      console.error('UserProfile: export data failed', error);
    } finally {
      setExportingData(false);
    }
  }, [exportingData, hasDataConsent]);

  const handleDeleteData = useCallback(async () => {
    if (!hasDataConsent || deletingData) {
      return;
    }

    setDeletingData(true);
    try {
      await privacyManager.deleteData();
      await applyPersonalization();
      Alert.alert('Vymazané', 'Tvoje personalizačné dáta boli odstránené.');
    } catch (error) {
      Alert.alert('Chyba', 'Vymazanie dát sa nepodarilo.');
      console.error('UserProfile: delete data failed', error);
    } finally {
      setDeletingData(false);
    }
  }, [applyPersonalization, deletingData, hasDataConsent]);

  const confirmDeleteData = useCallback(() => {
    if (!hasDataConsent || deletingData) {
      return;
    }

    Alert.alert(
      'Vymazať dáta',
      'Naozaj chceš vymazať všetky personalizačné údaje? Tento krok je nevratný.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Vymazať', style: 'destructive', onPress: () => handleDeleteData() },
      ],
    );
  }, [deletingData, handleDeleteData, hasDataConsent]);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Komponenty pre rôzne stavy
  const LoadingView = () => (
    <View style={styles.statusContainer}>
      <View style={styles.statusCard}>
        <ActivityIndicator size="large" color={palette.medium} />
        <Text style={styles.statusText}>Načítavam profil...</Text>
      </View>
    </View>
  );

  const ErrorView = () => (
    <View style={styles.statusContainer}>
      <View style={styles.statusCard}>
        <Text style={styles.statusEmoji}>😕</Text>
        <Text style={styles.statusText}>Nepodarilo sa načítať profil</Text>
        <TouchableOpacity style={styles.statusButton} onPress={fetchProfile} activeOpacity={0.85}>
          <Text style={styles.statusButtonText}>Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ProfileContent = () => {
    const { label: levelLabel, gradient: levelGradient } = getExperienceLevelMeta(profile?.experience_level);
    const radarScores = useMemo(() => buildRadarScores(tasteProfile, communityAverage), [tasteProfile, communityAverage]);

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.card, styles.profileCard]}>
          <View style={styles.avatarRing} />
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={[palette.accentPurple, palette.accentMint]} style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile?.name, profile?.email)}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.profileName}>{profile?.name || 'Milovník kávy'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          <LinearGradient colors={levelGradient} style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{levelLabel}</Text>
          </LinearGradient>

          {radarScores ? (
            <View style={styles.tasteCard}>
              <Text style={styles.tasteTitle}>Chuťový profil</Text>
              <View style={styles.radarWrapper}>
                <ProfileRadarChart scores={radarScores} />
              </View>
            </View>
          ) : (
            <View style={styles.tasteCard}>
              <Text style={styles.tasteTitle}>Chuťový profil</Text>
              <Text style={styles.emptyTasteText}>Vyplň preferencie pre zobrazenie chuťového profilu.</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, styles.actionCardFirst]} onPress={onPreferences} activeOpacity={0.9}>
            <LinearGradient colors={PRIMARY_GRADIENT} style={[styles.actionInner, styles.actionInnerPrimary]}>
              <View style={[styles.actionIcon, styles.actionIconPrimary]}>
                <Text style={styles.actionIconText}>✨</Text>
              </View>
              <Text style={[styles.actionText, styles.actionTextPrimary]}>Upraviť preferencie</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={onEdit} activeOpacity={0.9}>
            <View style={[styles.actionInner, styles.actionInnerSecondary]}>
              <View style={[styles.actionIcon, styles.actionIconSecondary]}>
                <Text style={styles.actionIconText}>✏️</Text>
              </View>
              <Text style={styles.actionText}>Upraviť profil</Text>
            </View>
          </TouchableOpacity>
        </View>

        {coffeeStats.length > 0 && (
          <View style={[styles.card, styles.sectionCard]}>
            <Text style={styles.sectionTitle}>📊 Tvoj kávový profil</Text>
            <View style={styles.statsGrid}>
              {coffeeStats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{stat.emoji}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {recommendation && (
          <View style={[styles.card, styles.aiCard]}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>🤖 Personalizované odporúčanie</Text>
              <TouchableOpacity style={styles.aiRefreshButton} onPress={onRefresh} activeOpacity={0.8}>
                <Text style={styles.aiRefreshText}>🔄</Text>
              </TouchableOpacity>
            </View>
            <AIResponseDisplay text={recommendation} type="recommendation" animate />
          </View>
        )}

        <LinearGradient colors={[palette.accentPurple, palette.accentCoral]} style={[styles.card, styles.tipCard]}>
          <Text style={styles.tipTitle}>💡 Tip dňa</Text>
          <Text style={styles.tipText}>
            Pre svetlé praženie používaj nižšiu teplotu vody (90–92°C) pre zachovanie delikátnych kvetinových tónov.
          </Text>
        </LinearGradient>

        <View style={[styles.card, styles.dataCard]}>
          <Text style={styles.sectionTitle}>🔐 Ovládanie dát</Text>
          <Text style={styles.sectionDescription}>Spravuj export a vymazanie svojich personalizačných údajov.</Text>
          <TouchableOpacity
            style={[styles.primaryButton, (!hasDataConsent || exportingData) && styles.primaryButtonDisabled]}
            onPress={handleExportData}
            disabled={!hasDataConsent || exportingData}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{exportingData ? 'Exportujem…' : 'Exportovať dáta'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.dangerButton, (!hasDataConsent || deletingData) && styles.primaryButtonDisabled]}
            onPress={confirmDeleteData}
            disabled={!hasDataConsent || deletingData}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{deletingData ? 'Mazanie…' : 'Vymazať dáta'}</Text>
          </TouchableOpacity>
          {!hasDataConsent && (
            <Text style={styles.dataConsentHint}>
              Na export alebo vymazanie je potrebný súhlas so spracovaním dát v nastaveniach súkromia.
            </Text>
          )}
        </View>

        <View style={[styles.card, styles.signOutCard]}>
          <TouchableOpacity style={[styles.primaryButton, styles.signOutButton]} onPress={handleLogout} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>Odhlásiť sa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.gradientBackground} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContent}>
          <View style={styles.headerBar}>
            {onBack ? (
              <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.9}>
                <Text style={styles.iconButtonText}>←</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.iconButton, styles.iconButtonGhost]} />
            )}
            <Text style={styles.headerTitle}>Profil</Text>
            <TouchableOpacity style={styles.iconButton} onPress={onEdit} activeOpacity={0.9}>
              <Text style={styles.iconButtonText}>⋮</Text>
            </TouchableOpacity>
          </View>

          {loading ? <LoadingView /> : !profile ? <ErrorView /> : <ProfileContent />}
        </View>
      </KeyboardAvoidingView>

      <View style={styles.fabContainer} pointerEvents="box-none">
        <View style={styles.fabCard}>
          <TouchableOpacity onPress={onPreferences} activeOpacity={0.92} style={styles.fabTouchable}>
            <LinearGradient colors={PRIMARY_GRADIENT} style={styles.fabButton}>
              <Text style={styles.fabText}>Prejsť na úpravu preferencií</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <BottomNav
        active="profile"
        onHomePress={onHomePress}
        onDiscoverPress={onDiscoverPress}
        onRecipesPress={onRecipesPress}
        onFavoritesPress={onFavoritesPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
};


const cardShadow = {
  shadowColor: 'rgba(44, 24, 16, 0.18)',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 12,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.foam,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingTop: getSafeAreaTop() + verticalScale(12),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(18),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
    borderRadius: scale(26),
    backgroundColor: 'rgba(255, 248, 244, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    ...cardShadow,
  },
  iconButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(14),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  iconButtonGhost: {
    opacity: 0,
  },
  iconButtonText: {
    color: palette.espresso,
    fontSize: scale(18),
    fontWeight: '700',
  },
  headerTitle: {
    color: palette.espresso,
    fontSize: scale(18),
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: getSafeAreaBottom() + BOTTOM_NAV_HEIGHT + verticalScale(160),
  },
  card: {
    borderRadius: scale(28),
    padding: scale(20),
    backgroundColor: '#FFFFFF',
    marginBottom: verticalScale(18),
    ...cardShadow,
  },
  profileCard: {
    alignItems: 'center',
    paddingTop: verticalScale(28),
    overflow: 'hidden',
  },
  avatarRing: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    bottom: -scale(90),
    left: -scale(70),
  },
  avatarWrapper: {
    borderRadius: scale(60),
    padding: scale(4),
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: verticalScale(14),
  },
  avatar: {
    width: scale(108),
    height: scale(108),
    borderRadius: scale(54),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: scale(32),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: scale(22),
    fontWeight: '800',
    color: palette.espresso,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: scale(13),
    color: '#6B6B6B',
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  levelBadge: {
    marginTop: verticalScale(12),
    borderRadius: scale(999),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(12),
  },
  tasteCard: {
    width: '100%',
    marginTop: verticalScale(20),
    backgroundColor: '#FFF8F4',
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    padding: scale(16),
  },
  tasteTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: palette.espresso,
    marginBottom: verticalScale(12),
  },
  radarWrapper: {
    alignItems: 'center',
  },
  emptyTasteText: {
    fontSize: scale(12),
    color: '#6B6B6B',
    lineHeight: verticalScale(18),
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(20),
  },
  actionCard: {
    flex: 1,
  },
  actionCardFirst: {
    marginRight: scale(12),
  },
  actionInner: {
    borderRadius: scale(20),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  actionInnerPrimary: {
    borderRadius: scale(20),
  },
  actionInnerSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.35)',
  },
  actionIcon: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  actionIconSecondary: {
    backgroundColor: 'rgba(107, 68, 35, 0.08)',
  },
  actionIconText: {
    fontSize: scale(22),
  },
  actionText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: palette.espresso,
  },
  actionTextPrimary: {
    color: '#FFFFFF',
  },
  sectionCard: {
    paddingBottom: verticalScale(10),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: palette.espresso,
    marginBottom: verticalScale(12),
  },
  sectionDescription: {
    fontSize: scale(12),
    color: '#6B6B6B',
    marginBottom: verticalScale(12),
    lineHeight: verticalScale(18),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginHorizontal: scale(4),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
  },
  statEmoji: {
    fontSize: scale(22),
    marginBottom: verticalScale(6),
  },
  statValue: {
    fontSize: scale(14),
    fontWeight: '700',
    color: palette.medium,
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: scale(11),
    color: '#6B6B6B',
  },
  aiCard: {
    paddingBottom: verticalScale(18),
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  aiTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: palette.espresso,
  },
  aiRefreshButton: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 168, 130, 0.2)',
  },
  aiRefreshText: {
    fontSize: scale(16),
  },
  tipCard: {
    padding: scale(20),
    borderRadius: scale(26),
  },
  tipTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: verticalScale(8),
  },
  tipText: {
    fontSize: scale(13),
    color: '#FFFFFF',
    lineHeight: verticalScale(20),
  },
  dataCard: {
    paddingBottom: verticalScale(18),
  },
  primaryButton: {
    backgroundColor: palette.espresso,
    borderRadius: scale(18),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(13),
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  dangerButton: {
    backgroundColor: '#C62828',
  },
  dataConsentHint: {
    fontSize: scale(11),
    color: '#7A6957',
    marginTop: verticalScale(12),
    lineHeight: verticalScale(16),
  },
  signOutCard: {
    paddingVertical: verticalScale(18),
  },
  signOutButton: {
    width: '100%',
  },
  bottomSpacer: {
    height: verticalScale(40),
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  statusCard: {
    backgroundColor: 'rgba(255, 248, 244, 0.95)',
    borderRadius: scale(26),
    padding: scale(28),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    ...cardShadow,
  },
  statusText: {
    fontSize: scale(14),
    color: palette.medium,
    textAlign: 'center',
    marginTop: verticalScale(12),
    lineHeight: verticalScale(20),
  },
  statusEmoji: {
    fontSize: scale(48),
  },
  statusButton: {
    marginTop: verticalScale(20),
    backgroundColor: palette.espresso,
    borderRadius: scale(18),
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(12),
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(13),
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: getSafeAreaBottom() + BOTTOM_NAV_HEIGHT + verticalScale(16),
    alignItems: 'center',
  },
  fabCard: {
    width: FAB_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: scale(20),
    padding: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    ...cardShadow,
  },
  fabTouchable: {
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  fabButton: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: scale(14),
    letterSpacing: 0.4,
  },
});


export default UserProfile;
