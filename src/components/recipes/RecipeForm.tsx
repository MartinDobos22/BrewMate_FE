import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Recipe, BrewDevice, BREW_DEVICES } from '../../types/Recipe';
import { createRecipe } from '../../services/recipeServices';

interface RecipeFormProps {
  onClose: () => void;
  onCreated?: (recipe: Recipe) => void;
  onReload?: () => Promise<void> | void;
}

/**
 * Form component for creating a new coffee recipe and persisting it through the recipe service.
 *
 * @param {RecipeFormProps} props - Component properties.
 * @param {() => void} props.onClose - Callback triggered after a successful save or when the user cancels.
 * @param {(recipe: Recipe) => void} [props.onCreated] - Optional handler invoked with the created recipe returned from the API.
 * @param {() => Promise<void>|void} [props.onReload] - Optional hook to refresh recipe lists; awaited after creation when provided.
 * @returns {JSX.Element} Controlled form for entering recipe title, instructions, and brew device with validation feedback.
 */
const RecipeForm: React.FC<RecipeFormProps> = ({ onClose, onCreated, onReload }) => {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [brewDevice, setBrewDevice] = useState<BrewDevice>(BREW_DEVICES[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Validates user input and submits the recipe to the backend service, handling optimistic UI resets and error presentation.
   *
   * @returns {Promise<void>} Promise resolving once the recipe is created and callbacks have completed.
   */
  const handleSave = async () => {
    if (submitting) {
      return;
    }
    if (!title.trim()) {
      setError('Zadajte názov receptu');
      return;
    }
    if (!instructions.trim()) {
      setError('Zadajte postup receptu');
      return;
    }
    if (!brewDevice) {
      setError('Vyberte zariadenie');
      return;
    }
    setError('');
    setSubmitting(true);
    const recipe: Recipe = {
      id: '',
      title,
      instructions,
      brewDevice,
    };
    try {
      const created = await createRecipe(recipe);
      if (!created) {
        setError('Nepodarilo sa uložiť recept. Skúste to prosím znova.');
        return;
      }
      onCreated?.(created);
      await onReload?.();
      setTitle('');
      setInstructions('');
      onClose();
    } catch (err) {
      console.error('Error saving recipe', err);
      setError('Vyskytla sa neočakávaná chyba. Skúste to prosím znova.');
    } finally {
      setSubmitting(false);
    }
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
      <View style={styles.actions}>
        <Button title="Zrušiť" onPress={onClose} disabled={submitting} />
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Button title={submitting ? 'Ukladám…' : 'Uložiť'} onPress={handleSave} disabled={submitting} />
        </View>
      </View>
      {submitting ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4A4A4A" />
          <Text style={styles.loadingText}>Ukladám recept…</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 },
  textArea: { height: 80, textAlignVertical: 'top' },
  error: { color: 'red' },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  loadingText: { marginLeft: 8, color: '#4A4A4A' },
});

export default RecipeForm;
