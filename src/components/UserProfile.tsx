// UserProfile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { getSafeAreaTop, getSafeAreaBottom, scale } from './utils/safeArea';

const { width } = Dimensions.get('window');

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
                       onBack
                     }: {
  onEdit: () => void;
  onPreferences: () => void;
  onForm?: () => void;
  onBack?: () => void;
}) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [coffeeStats, setCoffeeStats] = useState<Stat[]>([]);

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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const generateStats = (data: ProfileData) => {
    const stats: Stat[] = [];

    if (data.experience_level) {
      const levelMap: any = {
        'beginner': 'Začiatočník',
        'intermediate': 'Milovník',
        'expert': 'Nadšenec'
      };
      stats.push({
        label: 'Úroveň',
        value: levelMap[data.experience_level] || data.experience_level,
        emoji: '📊'
      });
    }

    if (data.coffee_preferences) {
      const prefs = data.coffee_preferences;

      if (prefs.intensity) {
        const intensityMap: any = {
          'light': 'Jemná',
          'medium': 'Stredná',
          'strong': 'Silná'
        };
        stats.push({
          label: 'Intenzita',
          value: intensityMap[prefs.intensity] || prefs.intensity,
          emoji: '💪'
        });
      }

      if (prefs.preferred_drinks?.length > 0) {
        stats.push({
          label: 'Obľúbené nápoje',
          value: prefs.preferred_drinks.length,
          emoji: '☕'
        });
      }

      if (prefs.milk !== undefined) {
        stats.push({
          label: 'Mlieko',
          value: prefs.milk ? 'Áno' : 'Nie',
          emoji: '🥛'
        });
      }

      if (prefs.roast) {
        const roastMap: any = {
          'light': 'Svetlé',
          'medium': 'Stredné',
          'dark': 'Tmavé'
        };
        stats.push({
          label: 'Praženie',
          value: roastMap[prefs.roast] || prefs.roast,
          emoji: '🔥'
        });
      }

      if (prefs.temperature) {
        const tempMap: any = {
          'hot': 'Horúca',
          'iced': 'Ľadová',
          'both': 'Oboje'
        };
        stats.push({
          label: 'Teplota',
          value: tempMap[prefs.temperature] || prefs.temperature,
          emoji: '🌡️'
        });
      }
    }

    setCoffeeStats(stats);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

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
    <View style={styles.centerContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#6B4423" />
        <Text style={styles.loadingText}>Načítavam profil...</Text>
      </View>
    </View>
  );

  const ErrorView = () => (
    <View style={styles.centerContainer}>
      <View style={styles.errorCard}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Nepodarilo sa načítať profil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ProfileContent = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header Card */}
      <View style={styles.profileHeaderCard}>
        <View style={[styles.avatar, getExperienceLevelStyle(profile?.experience_level)]}>
          <Text style={styles.avatarText}>
            {getInitials(profile?.name, profile?.email)}
          </Text>
        </View>

        <Text style={styles.profileName}>
          {profile?.name || 'Milovník kávy'}
        </Text>

        <Text style={styles.profileEmail}>{profile?.email}</Text>

        {profile?.experience_level && (
          <View style={[styles.levelBadge, getExperienceLevelStyle(profile.experience_level)]}>
            <Text style={styles.levelBadgeText}>
              {profile.experience_level === 'beginner' && '🌱 Začiatočník'}
              {profile.experience_level === 'intermediate' && '☕ Milovník kávy'}
              {profile.experience_level === 'expert' && '🎯 Kávový nadšenec'}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryActionButton]}
          onPress={onPreferences}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, styles.actionIconPrimary]}>
            <Text style={styles.actionEmoji}>☕</Text>
          </View>
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
            Upraviť preferencie
          </Text>
        </TouchableOpacity>

        {onForm && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={onForm}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>📝</Text>
            </View>
            <Text style={styles.actionButtonText}>Formulár</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryActionButton]}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionEmoji}>✏️</Text>
          </View>
          <Text style={styles.actionButtonText}>Upraviť profil</Text>
        </TouchableOpacity>
      </View>

      {/* Coffee Stats */}
      {coffeeStats.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📊 Tvoj kávový profil</Text>
            <View style={styles.statsGrid}>
              {coffeeStats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{stat.emoji}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* AI Recommendation */}
      {recommendation && (
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.sectionTitle}>🤖 Personalizované odporúčanie</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshText}>🔄</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        </View>
      )}

      {/* Tips Section */}
      <View style={styles.section}>
        <View style={styles.tipCard}>
          <Text style={styles.sectionTitle}>💡 Tip dňa</Text>
          <Text style={styles.tipText}>
            Vedel si, že ideálna teplota vody pre prípravu kávy je medzi 90-96°C?
            Príliš horúca voda môže spáliť kávu a spôsobiť horkú chuť. ☕
          </Text>
        </View>
      </View>

      {/* Footer with padding for navigation */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Členstvo od: {new Date().toLocaleDateString('sk-SK')}
        </Text>
      </View>
    </ScrollView>
  );

  const getExperienceLevelStyle = (level?: string) => {
    switch (level) {
      case 'beginner': return { backgroundColor: '#4CAF50' };
      case 'intermediate': return { backgroundColor: '#FFA726' };
      case 'expert': return { backgroundColor: '#9C27B0' };
      default: return { backgroundColor: '#666666' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? <LoadingView /> : !profile ? <ErrorView /> : <ProfileContent />}
      </KeyboardAvoidingView>
    </View>
  );
};

// Štýly
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  header: {
    backgroundColor: '#6B4423',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingTop: Platform.OS === 'ios' ? scale(12) : scale(16) + getSafeAreaTop(),
  },
  headerButton: {
    width: scale(36),
    height: scale(36),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: 'white',
    fontSize: scale(20),
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: scale(18),
    fontWeight: '700',
  },
  headerPlaceholder: {
    width: scale(36),
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: getSafeAreaBottom() + scale(20),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: scale(20),
    padding: scale(30),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: scale(15),
    fontSize: scale(16),
    color: '#666666',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: scale(20),
    padding: scale(30),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorEmoji: {
    fontSize: scale(50),
    marginBottom: scale(15),
  },
  errorText: {
    fontSize: scale(16),
    color: '#2C2C2C',
    marginBottom: scale(20),
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6B4423',
    paddingHorizontal: scale(25),
    paddingVertical: scale(12),
    borderRadius: scale(20),
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: scale(14),
  },
  profileHeaderCard: {
    backgroundColor: 'white',
    margin: scale(16),
    borderRadius: scale(20),
    padding: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  avatarText: {
    fontSize: scale(30),
    fontWeight: '700',
    color: 'white',
  },
  profileName: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: scale(4),
  },
  profileEmail: {
    fontSize: scale(14),
    color: '#666666',
    marginBottom: scale(12),
  },
  levelBadge: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  levelBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: scale(12),
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(10),
  },
  actionButton: {
    flex: 1,
    borderRadius: scale(16),
    padding: scale(12),
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#6B4423',
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionIcon: {
    width: scale(40),
    height: scale(40),
    backgroundColor: 'rgba(107, 68, 35, 0.1)',
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionEmoji: {
    fontSize: scale(20),
  },
  actionButtonText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: '#2C2C2C',
  },
  actionButtonTextPrimary: {
    color: 'white',
  },
  section: {
    marginHorizontal: scale(16),
    marginBottom: scale(16),
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: scale(12),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  statCard: {
    width: (width - scale(64)) / 3,
    backgroundColor: '#FAF7F5',
    borderRadius: scale(12),
    padding: scale(12),
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: scale(20),
    marginBottom: scale(4),
  },
  statValue: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#6B4423',
    marginBottom: scale(2),
  },
  statLabel: {
    fontSize: scale(10),
    color: '#666666',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  refreshButton: {
    width: scale(30),
    height: scale(30),
    backgroundColor: '#FAF7F5',
    borderRadius: scale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: scale(16),
  },
  recommendationText: {
    fontSize: scale(14),
    lineHeight: scale(20),
    color: '#2C2C2C',
  },
  tipCard: {
    backgroundColor: '#D2691E',
    borderRadius: scale(16),
    padding: scale(16),
  },
  tipText: {
    fontSize: scale(13),
    lineHeight: scale(18),
    color: 'white',
    marginTop: scale(8),
  },
  footer: {
    alignItems: 'center',
    paddingVertical: scale(16),
    marginBottom: scale(20),
  },
  footerText: {
    fontSize: scale(12),
    color: '#666666',
  },
});

export default UserProfile;