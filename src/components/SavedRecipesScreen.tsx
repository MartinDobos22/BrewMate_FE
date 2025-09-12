import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { homeStyles } from './styles/HomeScreen.styles';
import { fetchRecipeHistory, RecipeHistory } from '../services/recipeServices';

interface SavedRecipesScreenProps {
  onBack: () => void;
}

const SavedRecipesScreen: React.FC<SavedRecipesScreenProps> = ({ onBack }) => {
  const styles = homeStyles();
  const [recipes, setRecipes] = useState<RecipeHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipeHistory(20);
      setRecipes(data);
    } catch (err) {
      console.error('Error loading recipes:', err);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
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
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {recipes.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>
            Žiadne uložené recepty
          </Text>
        ) : (
          recipes.map((item) => (
            <View
              key={item.id}
              style={[styles.coffeeCard, { width: '100%', marginRight: 0, marginBottom: 16 }]}
            >
              <Text style={styles.coffeeName}>{item.method}</Text>
              <Text style={styles.coffeeOrigin}>
                {new Date(item.created_at).toLocaleDateString('sk-SK')}
              </Text>
              <Text style={styles.coffeeOrigin}>{item.recipe}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default SavedRecipesScreen;

