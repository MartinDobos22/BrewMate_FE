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
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import auth from '@react-native-firebase/auth';
import { AIResponseDisplay } from '../../components/personalization/AIResponseDisplay';
import BottomNav from '../../components/navigation/BottomNav';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePersonalization } from '../../hooks/usePersonalization';
import {
  PrivacyManager,
  privacyManager,
  optIn,
  DEFAULT_COMMUNITY_AVERAGE,
} from './services';
import type { TrackingPreferences, TasteProfileVector } from '../../types/Personalization';
import { palette, styles } from './styles';
import { API_URL } from '../../services/api';
import { buildTasteRadarScores, normalizeCoffeePreferenceSnapshot } from '../../utils/tasteProfile';

const PRIMARY_GRADIENT = [palette.espresso, palette.medium];

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

const getExperienceLevelMeta = (level?: string | null) => {
  if (!level) {
    return EXPERIENCE_LEVEL_META.default;
  }
  return EXPERIENCE_LEVEL_META[level] ?? EXPERIENCE_LEVEL_META.default;
};

const radarPoint = (value: number, index: number, total: number, radius: number = RADAR_RADIUS) => {
  const normalized = Math.max(0, Math.min(10, value)) / 10;
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

interface UserProfileProps {
  onEdit: () => void;
  onPreferences: () => void;
  onForm?: () => void;
  onBack?: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
  /**
   * Triggers a refresh of profile + personalization data after preferences are saved.
   */
  preferencesReloadKey?: number;
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
  preferencesReloadKey = 0,
}: UserProfileProps) => {
  const {
    privacyManager: contextPrivacyManager,
    profile: personalizationProfile,
    refreshInsights,
    userId: personalizationUserId,
  } = usePersonalization();
  const privacyManagerRef = useRef<PrivacyManager>(contextPrivacyManager ?? privacyManager.manager);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [coffeeStats, setCoffeeStats] = useState<Stat[]>([]);
  const [communityAverage, setCommunityAverage] = useState<TasteProfileVector>(DEFAULT_COMMUNITY_AVERAGE);
  const [trackingConsent, setTrackingConsent] = useState<TrackingPreferences | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const hasDataConsent = trackingConsent ? optIn.dataControl.every(flag => trackingConsent[flag]) : false;
  const normalizedPreferences = useMemo(() => {
    // Backend payloads use snake_case (flavor_notes, taste_vector); normalize to flavorNotes/tasteVector
    // so aroma/fruitiness can be derived from flavor notes and taste vector signals.
    return normalizeCoffeePreferenceSnapshot(profile?.coffee_preferences);
  }, [profile?.coffee_preferences]);

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

      const res = await fetch(`${API_URL}/profile`, {
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
    try {
      const managerInstance = privacyManagerRef.current;
      const effectiveUserId = personalizationUserId ?? auth().currentUser?.uid ?? null;
      const [preferences, insights] = await Promise.all([
        effectiveUserId ? managerInstance.loadPreferences(effectiveUserId) : Promise.resolve(null),
        effectiveUserId
          ? managerInstance.buildCommunityInsights(effectiveUserId)
          : Promise.resolve({ flavorTrends: {}, sampleSize: 0 }),
      ]);
      const nextCommunityAverage: TasteProfileVector = insights.sampleSize > 0
        ? {
            sweetness: clampTasteValue(insights.flavorTrends.sweetness, DEFAULT_COMMUNITY_AVERAGE.sweetness),
            acidity: clampTasteValue(insights.flavorTrends.acidity, DEFAULT_COMMUNITY_AVERAGE.acidity),
            bitterness: clampTasteValue(insights.flavorTrends.bitterness, DEFAULT_COMMUNITY_AVERAGE.bitterness),
            body: clampTasteValue(insights.flavorTrends.body, DEFAULT_COMMUNITY_AVERAGE.body),
          }
        : { ...DEFAULT_COMMUNITY_AVERAGE };

      return {
        preferences,
        communityAverage: nextCommunityAverage,
      };
    } catch (error) {
      console.warn('UserProfile: failed to load personalization data', error);
      throw error;
    }
  }, [personalizationTasteProfile, personalizationUserId]);

  const applyPersonalization = useCallback(async () => {
    try {
      const data = await readPersonalization();
      setTrackingConsent(data.preferences);
      setCommunityAverage(data.communityAverage);
    } catch (error) {
      console.warn('UserProfile: personalization state update failed', error);
      setCommunityAverage(DEFAULT_COMMUNITY_AVERAGE);
    }
  }, [readPersonalization]);

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('@AuthToken');
      if (token) {
        await fetch(`${API_URL}/logout`, {
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
    applyPersonalization();
    refreshInsights?.();
  }, [applyPersonalization, fetchProfile, preferencesReloadKey, refreshInsights]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await readPersonalization();
        if (!active) {
          return;
        }
        setTrackingConsent(data.preferences);
        setCommunityAverage(data.communityAverage);
      } catch (error) {
        if (!active) {
          return;
        }
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
      const managerInstance = privacyManagerRef.current;
      const effectiveUserId = personalizationUserId ?? auth().currentUser?.uid ?? null;
      if (!effectiveUserId) {
        throw new Error('Missing user id for export.');
      }
      const payload = await managerInstance.exportUserData(effectiveUserId);
      console.log('UserProfile: export payload', payload);
      Alert.alert('Export pripravený', 'Tvoje personalizačné dáta boli pripravené na export.');
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa exportovať dáta.');
      console.error('UserProfile: export data failed', error);
    } finally {
      setExportingData(false);
    }
  }, [exportingData, hasDataConsent, personalizationUserId]);

  const handleDeleteData = useCallback(async () => {
    if (!hasDataConsent || deletingData) {
      return;
    }

    setDeletingData(true);
    try {
      const managerInstance = privacyManagerRef.current;
      const effectiveUserId = personalizationUserId ?? auth().currentUser?.uid ?? null;
      if (!effectiveUserId) {
        throw new Error('Missing user id for delete.');
      }
      await managerInstance.deleteUserData(effectiveUserId);
      await applyPersonalization();
      Alert.alert('Vymazané', 'Tvoje personalizačné dáta boli odstránené.');
    } catch (error) {
      Alert.alert('Chyba', 'Vymazanie dát sa nepodarilo.');
      console.error('UserProfile: delete data failed', error);
    } finally {
      setDeletingData(false);
    }
  }, [applyPersonalization, deletingData, hasDataConsent, personalizationUserId]);

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
    const radarScores = useMemo(
      () => buildTasteRadarScores({ profile: personalizationProfile, preferences: normalizedPreferences }),
      [normalizedPreferences, personalizationProfile],
    );

    return (
      <>
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
              <Text style={[styles.actionText, styles.actionTextPrimary]}>Prejsť na úpravu preferencií</Text>
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
      </>
    );
  };

  const HeaderBar = () => (
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
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContent}>
          {loading || !profile ? (
            <>
              <HeaderBar />
              {loading ? <LoadingView /> : <ErrorView />}
            </>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <HeaderBar />
              <ProfileContent />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

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



export default UserProfile;
