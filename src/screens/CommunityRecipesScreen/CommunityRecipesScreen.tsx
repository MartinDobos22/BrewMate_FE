import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Recipe, BrewDevice, BREW_DEVICES } from '../../types/Recipe';
import { fetchRecipes } from './services';
import { communityRecipeStyles as styles } from './styles';

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

export default CommunityRecipesScreen;
