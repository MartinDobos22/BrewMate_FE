import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BrewLog } from '../types/BrewLog';
import { BrewDevice, BREW_DEVICES } from '../types/Recipe';
import { saveBrewLog } from '../services/brewLogService';

interface Props {
  recipeId?: string;
  initialDevice?: BrewDevice;
  onSaved?: (log: BrewLog) => void;
  onError?: (error: unknown) => void;
}

const BrewLogForm: React.FC<Props> = ({ recipeId, initialDevice, onSaved, onError }) => {
  const [waterTemp, setWaterTemp] = useState('');
  const [coffeeDose, setCoffeeDose] = useState('');
  const [ratio, setRatio] = useState('');
  const [grindSize, setGrindSize] = useState('medium');
  const [brewDevice, setBrewDevice] = useState<BrewDevice>(initialDevice || BREW_DEVICES[0]);
  const [brewTime, setBrewTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ waterTemp?: string; coffeeDose?: string; ratio?: string }>({});

  const validate = () => {
    const err: { waterTemp?: string; coffeeDose?: string; ratio?: string } = {};
    const t = parseFloat(waterTemp);
    if (isNaN(t) || t < 60 || t > 100) err.waterTemp = 'Teplota musí byť 60–100°C';
    const d = parseFloat(coffeeDose);
    if (isNaN(d) || d <= 0) err.coffeeDose = 'Dávka musí byť >0';
    if (!/^\d+$/.test(ratio) || parseInt(ratio, 10) <= 0) err.ratio = 'Pomer musí byť 1:x';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const ratioNum = parseInt(ratio, 10);
    const doseNum = parseFloat(coffeeDose);
    const log: BrewLog = {
      id: Date.now().toString(),
      recipeId,
      date: new Date().toISOString(),
      waterTemp: parseFloat(waterTemp),
      grindSize,
      coffeeDose: doseNum,
      waterVolume: doseNum * ratioNum,
      brewTime,
      notes,
      brewDevice,
    };
    try {
      await saveBrewLog(log, { showFeedback: false });
      setWaterTemp('');
      setCoffeeDose('');
      setRatio('');
      setBrewTime('');
      setNotes('');
      onSaved?.(log);
    } catch (error) {
      console.error('BrewLogForm: failed to save log', error);
      if (onError) {
        onError(error);
      } else {
        Alert.alert('Chyba', 'Záznam sa nepodarilo uložiť. Skúste to prosím znova.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text>Teplota vody (°C)</Text>
      <TextInput
        style={styles.input}
        value={waterTemp}
        onChangeText={setWaterTemp}
        keyboardType="numeric"
      />
      {errors.waterTemp ? <Text style={styles.error}>{errors.waterTemp}</Text> : null}

      <Text>Dávka kávy (g)</Text>
      <TextInput
        style={styles.input}
        value={coffeeDose}
        onChangeText={setCoffeeDose}
        keyboardType="numeric"
      />
      {errors.coffeeDose ? <Text style={styles.error}>{errors.coffeeDose}</Text> : null}

      <Text>Pomer (1:x)</Text>
      <TextInput
        style={styles.input}
        value={ratio}
        onChangeText={setRatio}
        keyboardType="numeric"
      />
      {errors.ratio ? <Text style={styles.error}>{errors.ratio}</Text> : null}

      <Text>Hrubosť mletia</Text>
      <Picker selectedValue={grindSize} onValueChange={(v) => setGrindSize(String(v))}>
        <Picker.Item label="Jemná" value="fine" />
        <Picker.Item label="Stredná" value="medium" />
        <Picker.Item label="Hrubá" value="coarse" />
      </Picker>

      <Text>Zariadenie</Text>
      <Picker selectedValue={brewDevice} onValueChange={(v) => setBrewDevice(v as BrewDevice)}>
        {BREW_DEVICES.map((device) => (
          <Picker.Item key={device} label={device} value={device} />
        ))}
      </Picker>

      <Text>Čas extrakcie</Text>
      <TextInput
        style={styles.input}
        value={brewTime}
        onChangeText={setBrewTime}
        placeholder="mm:ss"
      />

      <Text>Poznámky</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Button title="Uložiť" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 4,
  },
  notes: { height: 80, textAlignVertical: 'top' },
  error: { color: 'red', marginBottom: 8 },
});

export default BrewLogForm;
