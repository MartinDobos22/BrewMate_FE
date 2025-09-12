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
  onScanPress: () => void;
  onBrewPress: () => void;
  onProfilePress: () => void;
  onDiscoverPress?: () => void;
  onRecipesPress?: () => void;
  onFavoritesPress?: () => void;
  userName?: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
                                                 onScanPress,
                                                 onBrewPress,
                                                 onProfilePress,
                                                 onDiscoverPress,
                                                 onRecipesPress,
                                                 onFavoritesPress,
                                                 userName = 'Martin',
                                               }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [caffeineAmount, _setCaffeineAmount] = useState(195);
  const [coffeesToday, _setCoffeesToday] = useState(3);
  const [activeTasteTags, setActiveTasteTags] = useState([
    'Stredná intenzita',
    'Čokoládové tóny',
    'Oriešková',
    'Arabica',
  ]);

  const [recommendedCoffees, setRecommendedCoffees] = useState<CoffeeItem[]>([]);
  const styles = homeStyles();

  const loadCoffees = useCallback(async () => {
    try {
      const coffees = await fetchCoffees();
      setRecommendedCoffees(coffees);
    } catch (err) {
      console.error('Error loading coffees:', err);
    }
  }, []);

  useEffect(() => {
    loadCoffees();
  }, [loadCoffees]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dobré ráno';
    if (hour < 17) return 'Dobrý deň';
    return 'Dobrý večer';
  };

  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'Čas na rannú kávu';
    if (hour < 14) return 'Čas na obednú kávu';
    if (hour < 17) return 'Popoludňajší boost';
    return 'Večerná káva?';
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

  // const getCaffeineLevel = () => {
  //   const percentage = (caffeineAmount / 300) * 100;
  //   if (percentage < 50) return 'low';
  //   if (percentage < 80) return 'medium';
  //   return 'high';
  // };

  const suggestedCoffee = getWeatherBasedCoffee();

  // @ts-ignore
  // @ts-ignore
  return (
    <View style={styles.container}>
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
        </View>

        {/* Coffee Tracker */}
        <View style={styles.coffeeTracker}>
          <View style={styles.trackerHeader}>
            <Text style={styles.trackerTitle}>☕ Denný tracker kofeínu</Text>
            <Text style={styles.trackerDate}>Dnes</Text>
          </View>
          <View style={styles.caffeineMeter}>
            {/*<View style={[*/}
            {/*  styles.caffeineFill,*/}
            {/*  styles[`caffeine${getCaffeineLevel().charAt(0).toUpperCase() + getCaffeineLevel().slice(1)}`]*/}
            {/*]} />*/}
            <Text style={styles.caffeineAmount}>{caffeineAmount}mg / 300mg</Text>
          </View>
          <View style={styles.trackerStats}>
            <View style={styles.trackerStat}>
              <Text style={styles.statValue}>{coffeesToday}</Text>
              <Text style={styles.statLabel}>Kávy dnes</Text>
            </View>
            <View style={styles.trackerStat}>
              <Text style={styles.statValue}>89%</Text>
              <Text style={styles.statLabel}>Zhoda chuti</Text>
            </View>
            <View style={styles.trackerStat}>
              <Text style={styles.statValue}>4.5</Text>
              <Text style={styles.statLabel}>Priem. hodnotenie</Text>
            </View>
          </View>
        </View>

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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveNavItem('home')}
        >
          <Text style={[styles.navIcon, activeNavItem === 'home' && styles.navActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeNavItem === 'home' && styles.navActive]}>Domov</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { setActiveNavItem('discover'); onDiscoverPress?.(); }}
        >
          <Text style={[styles.navIcon, activeNavItem === 'discover' && styles.navActive]}>🔍</Text>
          <Text style={[styles.navLabel, activeNavItem === 'discover' && styles.navActive]}>Objaviť</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { setActiveNavItem('recipes'); onRecipesPress?.(); }}
        >
          <Text style={[styles.navIcon, activeNavItem === 'recipes' && styles.navActive]}>📖</Text>
          <Text style={[styles.navLabel, activeNavItem === 'recipes' && styles.navActive]}>Recepty</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { setActiveNavItem('favorites'); onFavoritesPress?.(); }}
        >
          <Text style={[styles.navIcon, activeNavItem === 'favorites' && styles.navActive]}>❤️</Text>
          <Text style={[styles.navLabel, activeNavItem === 'favorites' && styles.navActive]}>Obľúbené</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { setActiveNavItem('profile'); onProfilePress(); }}
        >
          <Text style={[styles.navIcon, activeNavItem === 'profile' && styles.navActive]}>👤</Text>
          <Text style={[styles.navLabel, activeNavItem === 'profile' && styles.navActive]}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;