// UserProfile.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  RefreshControl,
  Dimensions,
  } from 'react-native';
  import auth from '@react-native-firebase/auth';
  import { getColors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface ProfileData {
  email: string;
  name?: string;
  coffee_preferences?: any;
  experience_level?: string;
  ai_recommendation?: string;
}

interface Stat {
  label: string;
  value: string | number;
  emoji: string;
}

const UserProfile = ({
                       onEdit,
                       onPreferences,
                       onBack
                     }: {
  onEdit: () => void;
  onPreferences: () => void;
  onBack?: () => void;
  }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const colors = getColors(isDarkMode);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [coffeeStats, setCoffeeStats] = useState<Stat[]>([]);

    useEffect(() => {
      fetchProfile();
    }, []);

    const fetchProfile = async () => {
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
      Alert.alert('Chyba', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  const getExperienceLevelColor = (level?: string) => {
    switch (level) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'expert': return '#9C27B0';
      default: return '#757575';
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

    const styles = createStyles(isDarkMode);

  if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Načítavam profil...</Text>
        </View>
      );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>Nepodarilo sa načítať profil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Skúsiť znova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {onBack && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[
            styles.avatar,
            { backgroundColor: getExperienceLevelColor(profile.experience_level) }
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
              { backgroundColor: getExperienceLevelColor(profile.experience_level) }
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
            style={[styles.actionButton, styles.primaryButton]}
            onPress={onPreferences}
          >
            <Text style={styles.actionEmoji}>☕</Text>
            <Text style={styles.actionButtonText}>Upraviť preferencie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={onEdit}
          >
            <Text style={styles.actionEmoji}>✏️</Text>
            <Text style={styles.actionButtonText}>Upraviť profil</Text>
          </TouchableOpacity>
        </View>

        {/* Coffee Stats */}
        {coffeeStats.length > 0 && (
          <View style={styles.statsSection}>
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
        )}

        {/* AI Recommendation */}
        {recommendation && (
          <View style={styles.recommendationSection}>
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
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 Tip dňa</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              Vedel si, že ideálna teplota vody pre prípravu kávy je medzi 90-96°C?
              Príliš horúca voda môže spáliť kávu a spôsobiť horkú chuť.
            </Text>
          </View>
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

const createStyles = (isDarkMode: boolean) => {
  const colors = getColors(isDarkMode);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    backButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 15,
      alignSelf: 'flex-start',
    },
    backButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 14,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 15,
      fontSize: 16,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20,
    },
    errorEmoji: {
      fontSize: 60,
      marginBottom: 20,
    },
    errorText: {
      fontSize: 18,
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: 25,
    },
    retryButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    avatarText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    profileName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 15,
    },
    levelBadge: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    levelBadgeText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 14,
    },
    quickActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 30,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 16,
      gap: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionEmoji: {
      fontSize: 20,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDarkMode ? '#ffffff' : colors.text,
    },
    statsSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      width: (width - 52) / 3,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statEmoji: {
      fontSize: 24,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    recommendationSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    recommendationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    refreshButton: {
      padding: 8,
    },
    refreshText: {
      fontSize: 20,
    },
    recommendationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 300,
    },
    recommendationScroll: {
      maxHeight: 250,
    },
    recommendationText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
    },
    tipsSection: {
      paddingHorizontal: 20,
      marginBottom: 30,
    },
    tipCard: {
      backgroundColor: isDarkMode ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.1)',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: `${colors.primary}33`,
    },
    tipText: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.text,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 30,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
};

export default UserProfile;