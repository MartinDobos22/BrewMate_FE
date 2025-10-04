import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Recipe, BrewDevice, BREW_DEVICES } from '../types/Recipe';
import { fetchRecipes } from '../services/recipeServices';

const CommunityRecipesScreen: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [device, setDevice] = useState<'All' | BrewDevice>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchRecipes();
      setRecipes(fetched);
    } catch (err) {
      console.error('CommunityRecipesScreen: failed to load recipes', err);
      setError('Nepodarilo sa načítať recepty. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filtered = recipes.filter(
    (r) => r.brewDevice === device || device === 'All'
  );

  return (
    <View style={styles.container}>
      <Picker selectedValue={device} onValueChange={(v) => setDevice(v as any)}>
        <Picker.Item label="All" value="All" />
        {BREW_DEVICES.map((d) => (
          <Picker.Item key={d} label={d} value={d} />
        ))}
      </Picker>
      {loading ? (
        <View style={styles.stateContainer} testID="community-recipes-loading">
          <ActivityIndicator color="#6B4423" />
          <Text style={styles.stateText}>Načítavam recepty...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer} testID="community-recipes-error">
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadRecipes}
            activeOpacity={0.85}
            testID="community-recipes-retry"
          >
            <Text style={styles.retryText}>Skúsiť znova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : undefined}
          renderItem={({ item }) => (
            <View style={styles.recipeItem}>
              <Text style={styles.recipeTitle}>{item.title}</Text>
              <Text style={styles.recipeDevice}>{item.brewDevice}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Pre zvolený filter nemáme recepty.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#2C2C2C',
  },
  retryButton: {
    backgroundColor: '#6B4423',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  recipeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  recipeTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  recipeDevice: {
    color: '#666',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CommunityRecipesScreen;
