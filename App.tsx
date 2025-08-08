// App.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
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

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    flex: 1,
  };

  const handleScannerPress = () => {
    setCurrentScreen('scanner');
  };

  const handleBrewPress = () => {
    // Tu bude navigácia na obrazovku prípravy kávy
    Alert.alert('BrewMate', 'Funkcia prípravy kávy bude čoskoro dostupná!');
    // setCurrentScreen('brew');
  };

  const handleProfilePress = () => {
    setCurrentScreen('profile');
  };

  const handleDiscoverPress = () => {
    Alert.alert('Objaviť', 'Sekcia objavovania nových káv bude čoskoro!');
    // setCurrentScreen('discover');
  };

  const handleRecipesPress = () => {
    Alert.alert('Recepty', 'Vaše obľúbené recepty budú čoskoro dostupné!');
    // setCurrentScreen('recipes');
  };

  const handleFavoritesPress = () => {
    Alert.alert('Obľúbené', 'Vaše obľúbené kávy budú čoskoro dostupné!');
    // setCurrentScreen('favorites');
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

  // Ak používateľ nie je prihlásený
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Scanner obrazovka
  if (currentScreen === 'scanner') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <ProfessionalOCRScanner />
      </SafeAreaView>
    );
  }

  // Profil používateľa
  if (currentScreen === 'profile') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <UserProfile
          onEdit={handleEditProfilePress}
          onPreferences={() => setCurrentScreen('preferences')}
        />
      </SafeAreaView>
    );
  }

  // Editácia profilu
  if (currentScreen === 'edit-profile') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <EditUserProfile onBack={() => setCurrentScreen('profile')} />
      </SafeAreaView>
    );
  }

  // Preferencie kávy
  if (currentScreen === 'preferences') {
    return (
      <SafeAreaView style={backgroundStyle}>
        <CoffeePreferenceForm onBack={() => setCurrentScreen('profile')} />
      </SafeAreaView>
    );
  }

  // Hlavná obrazovka
  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
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
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default App;