// UserProfile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { userProfileStyles } from './styles/UserProfile.styles';

const { width, height } = Dimensions.get('window');

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

  const styles = userProfileStyles();

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

      // Generuj štatistiky z preferencií
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

  const getExperienceLevelStyle = (level?: string) => {
    switch (level) {
      case 'beginner': return styles.experienceBeginner;
      case 'intermediate': return styles.experienceIntermediate;
      case 'expert': return styles.experienceExpert;
      default: return styles.experienceDefault;
    }
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

  const getResponsiveStyle = () => {
    return width < 375 ? styles.smallScreen : width > 414 ? styles.largeScreen : {};
  };

  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
          <StatusBar
              barStyle="light-content"
              backgroundColor="#6B4423"
              translucent={false}
          />
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profil</Text>
            <View style={styles.headerPlaceholder} />

          </View>

          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#6B4423" />
              <Text style={styles.loadingText}>Načítavam profil...</Text>
            </View>
          </View>
        </SafeAreaView>
    );
  }

  if (!profile) {
    return (
        <SafeAreaView style={styles.container}>
          <StatusBar
              barStyle="light-content"
              backgroundColor="#6B4423"
              translucent={false}
          />
          {/* Header */}
          <View style={styles.header}>

            <Text style={styles.headerTitle}>Profil</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Text style={styles.errorEmoji}>😕</Text>
              <Text style={styles.errorText}>Nepodarilo sa načítať profil</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
                <Text style={styles.retryButtonText}>Skúsiť znova</Text>
              </TouchableOpacity>
            </View>
            {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <StatusBar
            barStyle="light-content"
            backgroundColor="#6B4423"
            translucent={false}
        />
        {/* Header - will be positioned properly below status bar */}
        <View style={styles.header}>

          <Text style={styles.headerTitle}>Profil</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
            style={[styles.scrollView, getResponsiveStyle()]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            <View style={[
              styles.avatar,
              getExperienceLevelStyle(profile.experience_level)
            ]}>
              <Text style={styles.avatarText}>
                {getInitials(profile.name, profile.email)}
              </Text>
            </View>

            <Text style={styles.profileName}>
              {profile.name || 'Milovník kávy'}
            </Text>

            <Text style={styles.profileEmail}>{profile.email}</Text>

            {profile.experience_level && (
                <View style={[
                  styles.levelBadge,
                  getExperienceLevelStyle(profile.experience_level)
                ]}>
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
                  <Text style={styles.actionButtonText}>Formulár preferencií</Text>
                </TouchableOpacity>
            )}
            {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>←</Text>
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
              <View style={styles.statsSection}>
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
              <View style={styles.recommendationSection}>
                <View style={styles.sectionCard}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.sectionTitle}>🤖 Personalizované odporúčanie</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={onRefresh}
                    >
                      <Text style={styles.refreshText}>🔄</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.recommendationCard}>
                    <ScrollView
                        style={styles.recommendationScroll}
                        nestedScrollEnabled={true}
                    >
                      <Text style={styles.recommendationText}>
                        {recommendation}
                      </Text>
                    </ScrollView>
                  </View>
                </View>
              </View>
          )}

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>💡 Tip dňa</Text>
            </View>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                Vedel si, že ideálna teplota vody pre prípravu kávy je medzi 90-96°C?
                Príliš horúca voda môže spáliť kávu a spôsobiť horkú chuť. ☕
              </Text>
            </View>
            {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>BACK</Text>
                </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Členstvo od: {new Date().toLocaleDateString('sk-SK')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
};

export default UserProfile;