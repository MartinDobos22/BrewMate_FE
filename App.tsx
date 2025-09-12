// App.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AuthScreen from './src/components/AuthVisual.tsx';
import HomeScreen from './src/components/HomeScreen';
import CoffeeTasteScanner from './src/components/CoffeeTasteScanner.tsx';
import CoffeeReceipeScanner from './src/components/CoffeeReceipeScanner.tsx';
import AllCoffeesScreen from './src/components/AllCoffeesScreen';
import UserProfile from './src/components/UserProfile';
import EditUserProfile from './src/components/EditUserProfile';
import CoffeePreferenceForm from './src/components/CoffeePreferenceForm';
import EditPreferences from './src/components/EditPreferences';
import RecipeStepsScreen from './src/components/RecipeStepsScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { scale } from './src/theme/responsive';
import ResponsiveWrapper from './src/components/ResponsiveWrapper';
import SavedRecipesScreen from './src/components/SavedRecipesScreen';

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
  | 'favorites';

const AppContent = (): React.JSX.Element => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState('');
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
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
    Alert.alert('Obľúbené', 'Vaše obľúbené kávy budú čoskoro dostupné!');
  };

  const handleBackPress = () => {
    setCurrentScreen('home');
  };

  const handleEditProfilePress = () => {
    setCurrentScreen('edit-profile');
  };

  const handleLogout = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Chyba', 'Používateľ nie je prihlásený.');
        return;
      }

      const idToken = await user.getIdToken();

      const response = await fetch('http://10.0.2.2:3001/api/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        console.error('❌ Logout error:', result);
        Alert.alert('Chyba odhlásenia', result?.error || 'Neznáma chyba');
      }

      await auth().signOut();
    } catch (err) {
      console.error('❌ Logout exception:', err);
      Alert.alert('Chyba', 'Nastala chyba pri odhlasovaní.');
    }
  };

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
        <UserProfile
          onEdit={handleEditProfilePress}
          onPreferences={() => setCurrentScreen('edit-preferences')}
          onForm={() => setCurrentScreen('preferences')}
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
        <SavedRecipesScreen onBack={handleBackPress} />
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
        <AllCoffeesScreen onBack={handleBackPress} />
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
        onScanPress={handleScannerPress}
        onBrewPress={handleBrewPress}
        onProfilePress={handleProfilePress}
        onDiscoverPress={handleDiscoverPress}
        onRecipesPress={handleRecipesPress}
        onFavoritesPress={handleFavoritesPress}
        onLogout={handleLogout}
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
