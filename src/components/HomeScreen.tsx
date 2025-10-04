// HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { homeStyles } from './styles/HomeScreen.styles.ts';
import { fetchCoffees } from '../services/homePagesService.ts';
import DailyTipCard from './DailyTipCard';
import DailyRitualCard, { DailyRitualCardProps } from './DailyRitualCard';
import { fetchDailyTip, Tip } from '../services/contentServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';
import RecentScansCarousel from './RecentScansCarousel';
import { fetchRecentScans, RecentScan } from '../services/coffeeServices.ts';
import { usePersonalization } from '../hooks/usePersonalization';

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
  userName?: string;
}

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
                                               userName = 'Martin',
                                             }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [activeTasteTags, setActiveTasteTags] = useState([
    'Stredná intenzita',
    'Čokoládové tóny',
    'Oriešková',
    'Arabica',
  ]);

  const [recommendedCoffees, setRecommendedCoffees] = useState<CoffeeItem[]>([]);
  const [dailyTip, setDailyTip] = useState<Tip | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [ritualRecommendation, setRitualRecommendation] = useState<DailyRitualCardProps['recommendation'] | null>(null);
  const styles = homeStyles();
  const { morningRitualManager } = usePersonalization();

  const loadCoffees = useCallback(async () => {
    try {
      const coffees = await fetchCoffees();
      setRecommendedCoffees(coffees);
      setCoffeeCount(coffees.length);
    } catch (err) {
      console.error('Error loading coffees:', err);
    }
  }, []);

  useEffect(() => {
    loadCoffees();
  }, [loadCoffees]);

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

  useEffect(() => {
    const loadTip = async () => {
      try {
        const tip = await fetchDailyTip();
        setDailyTip(tip);
      } catch (e) {
        const stored = await AsyncStorage.getItem('lastTip');
        if (stored) setDailyTip(JSON.parse(stored));
      }
    };
    loadTip();
  }, []);

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

  const getWeatherBasedCoffee = () => {
    // This would normally check actual weather
    const temp = 22; // Mock temperature
    if (temp > 20) return { name: 'Cold Brew', icon: '🧊' };
    return { name: 'Cappuccino', icon: '☕' };
  };

  const tasteTags = [
    'Stredná intenzita',
    'Čokoládové tóny',
    'Ovocné',
    'Oriešková',
    'Kyslá',
    'Arabica',
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoffees();
    try {
      const scans = await fetchRecentScans(10);
      setRecentScans(scans);
    } catch (err) {
      console.error('Error refreshing scans:', err);
    }
    setRefreshing(false);
  };

  const handleTasteTagPress = (tag: string) => {
    setActiveTasteTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCoffeeCardPress = (coffee: CoffeeItem) => {
    const details = [
      coffee.brand,
      coffee.origin,
      coffee.roastLevel !== undefined ? `Praženie: ${coffee.roastLevel}` : null,
      coffee.intensity !== undefined ? `Intenzita: ${coffee.intensity}` : null,
      coffee.flavorNotes && coffee.flavorNotes.length > 0 ? coffee.flavorNotes.join(', ') : null,
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
      ]
    );
  };

  const suggestedCoffee = getWeatherBasedCoffee();

  // @ts-ignore
  // @ts-ignore
  return (
    <View style={styles.container}>
      {ritualRecommendation && (
        <View style={{ marginTop: 12 }}>
          <DailyRitualCard recommendation={ritualRecommendation} />
        </View>
      )}
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.statusIcons}>
          <Text>📶 📶 🔋</Text>
        </View>
      </View>

      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.logoSection}>
          <View style={styles.appLogo}>
            <Text style={styles.logoIcon}>☕</Text>
          </View>
          <Text style={styles.appTitle}>BrewMate</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.notificationBtn}>
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.userAvatar} onPress={onProfilePress}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.mainContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        // contentContainerStyle={{ paddingBottom: 16 }}
        contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Welcome Card */}
        <View style={styles.heroWelcome}>
          <Text style={styles.welcomeText}>{getGreeting()}</Text>
          <Text style={styles.welcomeName}>{userName}! ☀️</Text>
          <View style={styles.coffeeStatus}>
            <View style={styles.statusIcon}>
              <Text>☕</Text>
            </View>
            <Text style={styles.statusText}>{getTimeBasedMessage()}</Text>
          </View>
        </View>

        {dailyTip && (
          <View style={{ marginVertical: 16 }}>
            <DailyTipCard tip={dailyTip} />
          </View>
        )}

        {/* Weather & Coffee Widget */}
        <View style={styles.weatherWidget}>
          <View style={styles.weatherSection}>
            <View style={styles.weatherIcon}>
              <Text style={styles.weatherEmoji}>☀️</Text>
            </View>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherLocation}>Košice</Text>
              <Text style={styles.weatherTemp}>22°C, slnečno</Text>
            </View>
          </View>
          <View style={styles.coffeeSuggestion}>
            <Text style={styles.suggestionLabel}>Ideálna káva na dnes:</Text>
            <View style={styles.suggestionName}>
              <Text style={styles.suggestionText}>{suggestedCoffee.name}</Text>
              <Text>{suggestedCoffee.icon}</Text>
            </View>
          </View>
        </View>

        {/* Coffee Time Advice Widget */}
        <View style={styles.coffeeTip}>
          <Text style={styles.coffeeTipText}>{getCoffeeAdvice()}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={onScanPress}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>📷</Text>
            </View>
            <Text style={[styles.actionTitle, styles.primaryText]}>Skenovať kávu</Text>
            <Text style={[styles.actionDesc, styles.primaryText]}>AI analýza a hodnotenie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onBrewPress}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>☕</Text>
            </View>
            <Text style={styles.actionTitle}>Pripraviť drink</Text>
            <Text style={styles.actionDesc}>Návod krok po kroku</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onPersonalizationPress}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>🧠</Text>
            </View>
            <Text style={styles.actionTitle}>Personalizácia</Text>
            <Text style={styles.actionDesc}>Pozri svoje odporúčania</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brewDiarySection}>
          <Text style={styles.sectionTitle}>Denník varenia</Text>
          <View style={styles.brewDiaryActions}>
            <TouchableOpacity
              style={[styles.brewDiaryButton, styles.brewDiaryPrimary]}
              onPress={onLogBrewPress}
              activeOpacity={0.85}
              testID="brew-log-cta"
            >
              <Text style={styles.brewDiaryButtonText}>Pridať záznam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.brewDiaryButton}
              onPress={onBrewHistoryPress}
              activeOpacity={0.85}
              testID="brew-history-cta"
            >
              <Text style={styles.brewDiaryButtonSecondaryText}>História varení</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coffee Inventory */}
        <TouchableOpacity
          style={styles.coffeeInventory}
          onPress={onInventoryPress}
          activeOpacity={0.8}>
          <Text style={styles.inventoryTitle}>📦 Počet balíkov kávy</Text>
          <Text style={styles.inventoryCount}>{coffeeCount}</Text>
        </TouchableOpacity>

        {/* Taste Profile */}
        <View style={styles.tasteProfile}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>🎯 Tvoj chuťový profil</Text>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Upraviť</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tasteTags}>
            {tasteTags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.tasteTag,
                  activeTasteTags.includes(tag) && styles.tasteTagActive
                ]}
                onPress={() => handleTasteTagPress(tag)}
              >
                <Text style={[
                  styles.tasteTagText,
                  activeTasteTags.includes(tag) && styles.tasteTagTextActive
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.recentScans}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Naposledy naskenované</Text>
            <TouchableOpacity style={styles.seeAll} onPress={onScanPress}>
              <Text style={styles.seeAllText}>Skenovať teraz</Text>
            </TouchableOpacity>
          </View>
          {recentScans.length === 0 ? (
            <Text style={{ color: '#666', paddingHorizontal: 16 }}>Zatiaľ nič naskenované</Text>
          ) : (
            <RecentScansCarousel scans={recentScans} />
          )}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendations}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ Odporúčané pre teba</Text>
            <TouchableOpacity style={styles.seeAll} onPress={onDiscoverPress}>
              <Text style={styles.seeAllText}>Všetky</Text>
              <Text style={styles.seeAllArrow}>→</Text>
            </TouchableOpacity>
          </View>
          {recommendedCoffees.length === 0 ? (
            <Text style={{ color: '#666', paddingHorizontal: 16 }}>
              Žiadne kávy sa nenašli
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coffeeCards}
            >
              {recommendedCoffees.map((coffee) => (
                <TouchableOpacity
                  key={coffee.id}
                  style={styles.coffeeCard}
                  onPress={() => handleCoffeeCardPress(coffee)}
                  activeOpacity={0.8}
                >
                  {coffee.hasCheckmark && (
                    <View style={styles.coffeeBadge}>
                      <Text style={styles.badgeCheck}>✓</Text>
                    </View>
                  )}
                  <View style={styles.coffeeImage}>
                    <Text style={styles.coffeeEmoji}>☕</Text>
                  </View>
                  <Text style={styles.coffeeName}>{coffee.name}</Text>
                  {coffee.brand && (
                    <Text style={styles.coffeeOrigin}>{coffee.brand}</Text>
                  )}
                  {coffee.origin && (
                    <Text style={styles.coffeeOrigin}>{coffee.origin}</Text>
                  )}
                  {(coffee.roastLevel !== undefined || coffee.intensity !== undefined) && (
                    <Text style={styles.coffeeOrigin}>
                      {coffee.roastLevel !== undefined && `Praženie: ${coffee.roastLevel}`}
                      {coffee.roastLevel !== undefined && coffee.intensity !== undefined && ' • '}
                      {coffee.intensity !== undefined && `Intenzita: ${coffee.intensity}`}
                    </Text>
                  )}
                  {coffee.flavorNotes && coffee.flavorNotes.length > 0 && (
                    <Text style={styles.coffeeOrigin}>{coffee.flavorNotes.join(', ')}</Text>
                  )}
                  {coffee.origin && (
                    <Text style={styles.coffeeOrigin}>{coffee.origin}</Text>
                  )}
                  {(coffee.match !== undefined || coffee.rating !== undefined) && (
                    <View style={styles.coffeeMatch}>
                      {coffee.match !== undefined && (
                        <Text style={styles.matchScore}>{coffee.match}% zhoda</Text>
                      )}
                      {coffee.rating !== undefined && (
                        <Text style={styles.coffeeRating}>⭐ {coffee.rating}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
    </View>
  );
};

export default HomeScreen;
