import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { homeStyles } from './styles/HomeScreen.styles';
import { fetchUserRecipes } from '../services/recipeServices';
import { BrewDevice, BREW_DEVICES, Recipe } from '../types/Recipe';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';

type SavedRecipe = Recipe & {
  method?: string;
  recipe?: string;
  created_at?: string;
  taste?: string;
};

interface SavedRecipesScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
}

const SavedRecipesScreen: React.FC<SavedRecipesScreenProps> = ({
  onBack,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}) => {
  const styles = homeStyles();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<'All' | BrewDevice>('All');
  const filteredRecipes = recipes.filter(
    (r) => r.brewDevice === deviceFilter || deviceFilter === 'All'
  );

  const loadRecipes = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchUserRecipes();
      setRecipes(data);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError('Nepodarilo sa načítať uložené recepty. Skúste to prosím znova.');
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes(true);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={onBack} style={styles.logoSection}>
          <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.appTitle, { flex: 1, textAlign: 'center' }]}>Recepty</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => {
            void loadRecipes();
          }}
          disabled={loading || refreshing}
          style={{
            alignSelf: 'flex-end',
            marginBottom: 16,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: '#4A4A4A',
            opacity: loading || refreshing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff' }}>Obnoviť</Text>
        </TouchableOpacity>
        {error && (
          <Text style={{ color: '#d9534f', marginBottom: 12, textAlign: 'center' }}>{error}</Text>
        )}
        {loading && !refreshing ? (
          <View style={{ flex: 1, alignItems: 'center', marginTop: 40 }}>
            <ActivityIndicator size="large" color="#4A4A4A" />
          </View>
        ) : null}
        <Picker
          selectedValue={deviceFilter}
          onValueChange={(v) => setDeviceFilter(v as any)}
          style={{ marginBottom: 16 }}
        >
          <Picker.Item label="All" value="All" />
          {BREW_DEVICES.map((d) => (
            <Picker.Item key={d} label={d} value={d} />
          ))}
        </Picker>
        {!loading && filteredRecipes.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>
            Žiadne uložené recepty
          </Text>
        ) : (
          filteredRecipes.map((item) => {
            const brewDeviceLabel = item.brewDevice ?? 'Neznáme zariadenie';
            const createdAt = item.created_at
              ? new Date(item.created_at).toLocaleDateString('sk-SK')
              : null;
            const instructionsRaw = item.instructions ?? item.recipe ?? '';
            const instructions = instructionsRaw.trim() || 'Bez detailov';

            return (
              <View
                key={item.id}
                style={[styles.coffeeCard, { width: '100%', marginRight: 0, marginBottom: 16 }]}
              >
                <Text style={styles.coffeeName}>{item.title ?? item.method ?? 'Recept'}</Text>
                <Text style={[styles.coffeeOrigin, { marginBottom: 4 }]}>{brewDeviceLabel}</Text>
                {createdAt ? (
                  <Text style={[styles.coffeeOrigin, { marginBottom: 4 }]}>{createdAt}</Text>
                ) : null}
                <Text style={styles.coffeeOrigin}>{instructions}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
      <BottomNav
        active="recipes"
        onHomePress={onHomePress}
        onDiscoverPress={onDiscoverPress}
        onRecipesPress={onRecipesPress}
        onFavoritesPress={onFavoritesPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
};

export default SavedRecipesScreen;

