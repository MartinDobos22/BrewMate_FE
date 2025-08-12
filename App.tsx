// App.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import AuthScreen from './src/components/AuthVisual.tsx';
import HomeScreen from './src/components/HomeScreen';
import ProfessionalOCRScanner from './src/components/ProfessionalOCRScanner';
import UserProfile from './src/components/UserProfile';
import EditUserProfile from './src/components/EditUserProfile';
import CoffeePreferenceForm from './src/components/CoffeePreferenceForm';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { scale } from './src/theme/responsive';

type ScreenName =
  | 'home'
  | 'scanner'
  | 'profile'
  | 'edit-profile'
  | 'preferences'
  | 'brew'
  | 'discover'
  | 'recipes'
  | 'favorites';

const AppContent = (): React.JSX.Element => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  const backgroundStyle = {
    backgroundColor: colors.background,
    flex: 1,
  };

  const handleScannerPress = () => {
    setCurrentScreen('scanner');
  };

  const handleBrewPress = () => {
    Alert.alert('BrewMate', 'Funkcia prípravy kávy bude čoskoro dostupná!');
  };

  const handleProfilePress = () => {
    setCurrentScreen('profile');
  };

  const handleDiscoverPress = () => {
    Alert.alert('Objaviť', 'Sekcia objavovania nových káv bude čoskoro!');
  };

  const handleRecipesPress = () => {
    Alert.alert('Recepty', 'Vaše obľúbené recepty budú čoskoro dostupné!');
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
    return <AuthScreen />;
  }

  if (currentScreen === 'scanner') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <ProfessionalOCRScanner />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'profile') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Spť</Text>
          </TouchableOpacity>
        </View>
        <UserProfile
          onEdit={handleEditProfilePress}
          onPreferences={() => setCurrentScreen('preferences')}
        />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'edit-profile') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <EditUserProfile onBack={() => setCurrentScreen('profile')} />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'preferences') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <CoffeePreferenceForm onBack={() => setCurrentScreen('profile')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <HomeScreen
        onScanPress={handleScannerPress}
        onBrewPress={handleBrewPress}
        onProfilePress={handleProfilePress}
        onDiscoverPress={handleDiscoverPress}
        onRecipesPress={handleRecipesPress}
        onFavoritesPress={handleFavoritesPress}
        onLogout={handleLogout}
      />
    </SafeAreaView>
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
