// App.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/components/AuthVisual.tsx';
import HomeScreen from './src/components/HomeScreen';
import CoffeeTasteScanner from './src/components/CoffeeTasteScanner.tsx';
import CoffeeReceipeScanner from './src/components/CoffeeReceipeScanner.tsx';
import AllCoffeesScreen from './src/components/AllCoffeesScreen';
import AIChatScreen from './src/components/AIChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditUserProfile from './src/components/EditUserProfile';
import CoffeePreferenceForm from './src/components/CoffeePreferenceForm';
import EditPreferences from './src/components/EditPreferences';
import RecipeStepsScreen from './src/components/RecipeStepsScreen';
import OnboardingScreen from './src/components/OnboardingScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { scale } from './src/theme/responsive';
import ResponsiveWrapper from './src/components/ResponsiveWrapper';
import SavedRecipesScreen from './src/components/SavedRecipesScreen';
import BottomNav from './src/components/BottomNav';
import { scheduleLowStockCheck } from './src/utils/reminders';
import InventoryScreen from './src/screens/InventoryScreen';

type ScreenName =
  | 'home'
  | 'scanner'
  | 'profile'
  | 'edit-profile'
  | 'preferences'
  | 'edit-preferences'
  | 'brew'
  | 'discover'
  | 'recipes'
  | 'recipe-steps'
  | 'favorites'
  | 'inventory';

const AppContent = (): React.JSX.Element | null => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState('');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('@AuthToken');
      if (stored) {
        setIsAuthenticated(true);
      }
    };
    init();

    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        const token = await user.getIdToken();
        await AsyncStorage.setItem('@AuthToken', token);
        setIsAuthenticated(true);
        setCurrentScreen('home');
      } else {
        await AsyncStorage.removeItem('@AuthToken');
        setIsAuthenticated(false);
      }
    });
    return unsubscribe;
  }, []);

    useEffect(() => {
      const checkOnboarding = async () => {
        const value = await AsyncStorage.getItem('@OnboardingComplete');
        setIsOnboardingComplete(value === 'true');
        setCheckingOnboarding(false);
      };
      checkOnboarding();
    }, []);

  useEffect(() => {
    scheduleLowStockCheck();
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    let timeout = next.getTime() - now.getTime();
    if (timeout < 0) timeout += 24 * 60 * 60 * 1000;
    const timer = setTimeout(() => {
      scheduleLowStockCheck();
      setInterval(scheduleLowStockCheck, 24 * 60 * 60 * 1000);
    }, timeout);
    return () => clearTimeout(timer);
  }, []);

  const handleScannerPress = () => {
    setCurrentScreen('scanner');
  };

  // Open dedicated scanner for preparing a drink (same as scan for now)
  const handleBrewPress = () => {
    setCurrentScreen('brew');
  };

  const handleProfilePress = () => {
    setCurrentScreen('profile');
  };

  const handleDiscoverPress = () => {
    setCurrentScreen('discover');
  };

  const handleRecipesPress = () => {
    setCurrentScreen('recipes');
  };

  const handleFavoritesPress = () => {
    setCurrentScreen('favorites');
  };

  const handleInventoryPress = () => {
    setCurrentScreen('inventory');
  };

  const handleBackPress = () => {
    setCurrentScreen('home');
  };

  if (checkingOnboarding) {
    return null;
  }

  if (!isOnboardingComplete) {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <OnboardingScreen onFinish={() => setIsOnboardingComplete(true)} />
      </ResponsiveWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <AuthScreen />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'scanner') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <CoffeeTasteScanner />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'brew') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <CoffeeReceipeScanner
          onRecipeGenerated={(recipe) => {
            setGeneratedRecipe(recipe);
            setCurrentScreen('recipe-steps');
          }}
        />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'recipe-steps') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <RecipeStepsScreen
          recipe={generatedRecipe}
          onBack={() => setCurrentScreen('brew')}
        />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'profile') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Spť</Text>
          </TouchableOpacity>
        </View>
        <ProfileScreen />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'edit-profile') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <EditUserProfile onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'preferences') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <CoffeePreferenceForm onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'edit-preferences') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <EditPreferences onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'recipes') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <SavedRecipesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'favorites') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <AllCoffeesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'inventory') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <InventoryScreen />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'discover') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <AIChatScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  return (
    <ResponsiveWrapper
      backgroundColor={colors.background}
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackground={colors.background}
    >
      <HomeScreen
        onHomePress={handleBackPress}
        onScanPress={handleScannerPress}
        onBrewPress={handleBrewPress}
        onProfilePress={handleProfilePress}
        onDiscoverPress={handleDiscoverPress}
        onRecipesPress={handleRecipesPress}
        onFavoritesPress={handleFavoritesPress}
        onInventoryPress={handleInventoryPress}
      />
    </ResponsiveWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
  },
  backButton: {
    paddingHorizontal: scale(15),
    paddingVertical: scale(8),
    borderRadius: scale(15),
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: scale(14),
  },
});

export default function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
