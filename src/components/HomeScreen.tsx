// HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Alert,
  RefreshControl,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { homeStyles } from './styles/HomeScreen.styles';
import {
  fetchDashboardData,
  toggleFavorite,
  getDailyTip
} from '../services/homePagesService.ts';

// const { width } = Dimensions.get('window');

interface CoffeeItem {
  id: string;
  name: string;
  rating: number;
  match: number;
  timestamp: Date;
  isRecommended: boolean;
}

interface HomeScreenProps {
  onScanPress: () => void;
  onBrewPress: () => void;
  onProfilePress: () => void;
  onDiscoverPress?: () => void;
  onRecipesPress?: () => void;
  onFavoritesPress?: () => void;
  onLogout: () => void;
}


// const handleLogoutPress = () => {
//   Alert.alert(
//     'Odhlásiť sa',
//     'Naozaj sa chceš odhlásiť?',
//     [
//       { text: 'Zrušiť', style: 'cancel' },
//       { text: 'Odhlásiť', style: 'destructive', onPress: onLogout }
//     ]
//   );
// };

const HomeScreen: React.FC<HomeScreenProps> = ({
                                                 onScanPress,
                                                 onBrewPress,
                                                 onProfilePress,
                                                 onDiscoverPress,
                                                 onRecipesPress,
                                                 onFavoritesPress,
                                                 onLogout,
                                               }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [userName, setUserName] = useState('');
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [recentCoffees, setRecentCoffees] = useState<CoffeeItem[]>([]);
  const [recommendations, setRecommendations] = useState<CoffeeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyTip, setDailyTip] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  const styles = homeStyles(isDarkMode);

  useEffect(() => {
    loadUserData();
    loadDailyTip();
  }, []);

  const loadUserData = async () => {
    try {
      setRefreshing(true);
      const user = auth().currentUser;
      if (user) {
        // Získaj meno používateľa
        const displayName = user.displayName || user.email?.split('@')[0] || 'Kávoš';
        setUserName(displayName);

        // Načítaj dáta z backendu
        const dashboardData = await fetchDashboardData();

        if (dashboardData) {
          // Nastav štatistiky
          setCoffeeCount(dashboardData.stats.coffeeCount);
          setAvgRating(dashboardData.stats.avgRating);
          setFavoritesCount(dashboardData.stats.favoritesCount);

          // Nastav nedávne skenovania
          setRecentCoffees(dashboardData.recentScans);

          // Nastav odporúčania
          setRecommendations(dashboardData.recommendations);

          // Nastav denný tip
          setDailyTip(dashboardData.dailyTip);
        } else {
          // Ak zlyhá načítanie, použi základné hodnoty
          setCoffeeCount(0);
          setAvgRating(0);
          setFavoritesCount(0);
          setRecentCoffees([]);
          setRecommendations([]);
          setDailyTip(getDailyTip());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Použi záložné dáta ak zlyhá načítanie
      setDailyTip(getDailyTip());
      Alert.alert('Upozornenie', 'Nepodarilo sa načítať všetky dáta. Niektoré funkcie môžu byť obmedzené.');
    } finally {
      setRefreshing(false);
    }
  };

  const loadDailyTip = () => {
    setDailyTip(getDailyTip());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    loadDailyTip();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dobré ráno';
    if (hour < 17) return 'Dobrý deň';
    return 'Dobrý večer';
  };

  const getTimeBasedMessage = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'Čas na rannú kávu ☕';
    if (hour < 14) return 'Obedná káva? ☕';
    if (hour < 17) return 'Popoludňajší boost ⚡';
    return 'Večerná káva? 🌙';
  };

  const handleCoffeePress = (coffee: CoffeeItem) => {
    Alert.alert(
      coffee.name,
      `Hodnotenie: ${coffee.rating}⭐\nZhoda: ${coffee.match}%\n${
        coffee.isRecommended ? '✓ Odporúčané pre teba' : 'Stredná zhoda'
      }`,
      [
        { text: 'Zatvoriť', style: 'cancel' },
        { text: 'Pripraviť', onPress: onBrewPress },
        {
          text: '❤️ Obľúbené',
          onPress: async () => {
            const success = await toggleFavorite(coffee.id);
            if (success) {
              Alert.alert('Úspech', 'Káva pridaná do obľúbených!');
              loadUserData(); // Refresh data
            }
          }
        },
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Odhlásiť sa',
      'Naozaj sa chceš odhlásiť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Odhlásiť', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userSection}>
            <TouchableOpacity onPress={onProfilePress} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>
                {getGreeting()}, {userName}!
              </Text>
              <Text style={styles.subGreeting}>{getTimeBasedMessage()}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Text style={styles.notificationIcon}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogoutPress}
              onLongPress={() => Alert.alert('Odhlásiť', 'Kliknutím sa odhlásiš z aplikácie')}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Tip Card */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Káva dňa</Text>
          <Text style={styles.tipText}>{dailyTip}</Text>
        </View>

        {/* Main Actions */}
        <View style={styles.mainActions}>
          <TouchableOpacity
            style={[styles.actionCard, styles.primaryAction]}
            onPress={onScanPress}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>📷</Text>
            </View>
            <Text style={styles.actionTitle}>Skenovať kávu</Text>
            <Text style={styles.actionDesc}>Zisti či je pre teba</Text>
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
            <Text style={styles.actionDesc}>Krok po kroku</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{coffeeCount}</Text>
            <Text style={styles.statLabel}>Káv tento rok</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Priem. hodnotenie</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Obľúbených</Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Odporúčané pre teba</Text>
            {recommendations.length > 0 && (
              <TouchableOpacity onPress={onDiscoverPress}>
                <Text style={styles.seeAll}>Všetky →</Text>
              </TouchableOpacity>
            )}
          </View>
          {recommendations.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {recommendations.map((coffee) => (
                <TouchableOpacity
                  key={coffee.id}
                  style={styles.coffeeCard}
                  onPress={() => handleCoffeePress(coffee)}
                  activeOpacity={0.8}
                >
                  <View style={styles.coffeeImage}>
                    <Text style={styles.coffeeEmoji}>☕</Text>
                  </View>
                  <Text style={styles.coffeeName} numberOfLines={1}>
                    {coffee.name}
                  </Text>
                  <Text style={styles.coffeeRating}>⭐ {coffee.rating}</Text>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{coffee.match}% zhoda</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Zatiaľ nemáme pre teba žiadne odporúčania.
                Naskenuj prvú kávu a začni objavovať!
              </Text>
            </View>
          )}
        </View>

        {/* Recent Scans */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nedávno skenované</Text>
            {recentCoffees.length > 0 && (
              <TouchableOpacity>
                <Text style={styles.seeAll}>História →</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentCoffees.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {recentCoffees.map((coffee) => (
                <TouchableOpacity
                  key={coffee.id}
                  style={styles.coffeeCard}
                  onPress={() => handleCoffeePress(coffee)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.coffeeImage, styles.scannedImage]}>
                    <Text style={styles.coffeeEmoji}>📸</Text>
                  </View>
                  <Text style={styles.coffeeName} numberOfLines={1}>
                    {coffee.name}
                  </Text>
                  <Text style={styles.coffeeRating}>⭐ {coffee.rating}</Text>
                  <Text style={[
                    styles.recommendStatus,
                    coffee.isRecommended ? styles.recommended : styles.notRecommended
                  ]}>
                    {coffee.isRecommended ? '✓ Odporúčané' : 'Stredná zhoda'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Ešte si neskenoval žiadnu kávu.
                Vyskúšaj skener a začni budovať svoju históriu!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.activeNav]}>
            🏠
          </Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNav]}>
            Domov
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={onDiscoverPress}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Objaviť</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={onRecipesPress}
        >
          <Text style={styles.navIcon}>📖</Text>
          <Text style={styles.navLabel}>Recepty</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={onFavoritesPress}
        >
          <Text style={styles.navIcon}>❤️</Text>
          <Text style={styles.navLabel}>Obľúbené</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={onProfilePress}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;