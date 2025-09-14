import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Recipe, BrewDevice, BREW_DEVICES } from '../types/Recipe';
import { fetchRecipes } from '../services/recipeServices';

const CommunityRecipesScreen: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [device, setDevice] = useState<'All' | BrewDevice>('All');

  useEffect(() => {
    fetchRecipes().then(setRecipes);
  }, []);

  const filtered = recipes.filter(
    (r) => r.brewDevice === device || device === 'All'
  );

  return (
    <View style={{ flex: 1 }}>
      <Picker selectedValue={device} onValueChange={(v) => setDevice(v as any)}>
        <Picker.Item label="All" value="All" />
        {BREW_DEVICES.map((d) => (
          <Picker.Item key={d} label={d} value={d} />
        ))}
      </Picker>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
            <Text>{item.brewDevice}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default CommunityRecipesScreen;
