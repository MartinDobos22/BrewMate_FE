import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { homeStyles } from './styles/HomeScreen.styles.ts';
import { fetchCoffees } from '../services/homePagesService.ts';
import BottomNav from './BottomNav';

interface CoffeeItem {
  id: string;
  name: string;
  brand?: string;
  origin?: string;
  roastLevel?: number;
  intensity?: number;
  flavorNotes?: string[];

  origin?: string;

  rating?: number;
  match?: number;
}

interface AllCoffeesScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
}

const AllCoffeesScreen: React.FC<AllCoffeesScreenProps> = ({
  onBack,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}) => {
  const styles = homeStyles();
  const [coffees, setCoffees] = useState<CoffeeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCoffees = useCallback(async () => {
    try {
      const data = await fetchCoffees();
      setCoffees(data);
    } catch (err) {
      console.error('Error loading coffees:', err);
    }
  }, []);

  useEffect(() => {
    loadCoffees();
  }, [loadCoffees]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoffees();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={onBack} style={styles.logoSection}>
          <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.appTitle, { flex: 1, textAlign: 'center' }]}>Moje kávy</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >



        {coffees.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>
            Žiadne kávy sa nenašli
          </Text>
        ) : (
          coffees.map((coffee) => (
            <View
              key={coffee.id}
              style={[styles.coffeeCard, { marginRight: 0, marginBottom: 16 }]}
            >
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

              {coffee.origin && <Text style={styles.coffeeOrigin}>{coffee.origin}</Text>}

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
            </View>
          ))
        )}


        {coffees.map((coffee) => (
          <View
            key={coffee.id}
            style={[styles.coffeeCard, { marginRight: 0, marginBottom: 16 }]}
          >
            <View style={styles.coffeeImage}>
              <Text style={styles.coffeeEmoji}>☕</Text>
            </View>
            <Text style={styles.coffeeName}>{coffee.name}</Text>
            {coffee.origin && <Text style={styles.coffeeOrigin}>{coffee.origin}</Text>}
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
          </View>
        ))}


      </ScrollView>
      <BottomNav
        active="discover"
        onHomePress={onHomePress}
        onDiscoverPress={onDiscoverPress}
        onRecipesPress={onRecipesPress}
        onFavoritesPress={onFavoritesPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
};

export default AllCoffeesScreen;
