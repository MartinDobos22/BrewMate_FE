import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Recipe, BrewDevice, BREW_DEVICES } from '../types/Recipe';
import { createRecipe } from '../services/recipeServices';

const RecipeForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [brewDevice, setBrewDevice] = useState<BrewDevice>(BREW_DEVICES[0]);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!brewDevice) {
      setError('Vyberte zariadenie');
      return;
    }
    const recipe: Recipe = {
      id: '',
      title,
      instructions,
      brewDevice,
    };
    await createRecipe(recipe);
  };

  return (
    <View style={styles.container}>
      <Text>Názov</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text>Postup</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      <Text>Zariadenie</Text>
      <Picker selectedValue={brewDevice} onValueChange={(v) => setBrewDevice(v as BrewDevice)}>
        {BREW_DEVICES.map((d) => (
          <Picker.Item key={d} label={d} value={d} />
        ))}
      </Picker>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Uložiť" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  error: { color: 'red' },
});

export default RecipeForm;
