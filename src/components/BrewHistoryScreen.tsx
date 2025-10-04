import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BrewLog } from '../types/BrewLog';
import { BREW_DEVICES } from '../types/Recipe';
import { getBrewLogs } from '../services/brewLogService';

interface BrewHistoryScreenProps {
  onAddLog?: () => void;
}

const BrewHistoryScreen: React.FC<BrewHistoryScreenProps> = ({ onAddLog }) => {
  const [logs, setLogs] = useState<BrewLog[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await getBrewLogs();
      setLogs(data);
    };
    load();
  }, []);

  const filtered = logs.filter((log) => {
    const byDevice = deviceFilter === 'all' || log.brewDevice === deviceFilter;
    const byDate = dateFilter === '' || log.date.startsWith(dateFilter);
    return byDevice && byDate;
  });

  const renderItem = ({ item }: { item: BrewLog }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => Alert.alert('Detail záznamu', JSON.stringify(item, null, 2))}
    >
      <Text style={styles.itemTitle}>
        {new Date(item.date).toLocaleDateString()} - {item.brewDevice}
      </Text>
      <Text>{`T:${item.waterTemp}°C D:${item.coffeeDose}g V:${item.waterVolume}ml`}</Text>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {onAddLog ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.addButton} onPress={onAddLog} testID="history-add-log">
            <Text style={styles.addButtonText}>Pridať záznam</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.filters}>
        <Picker
          selectedValue={deviceFilter}
          style={styles.devicePicker}
          onValueChange={(v) => setDeviceFilter(String(v))}
        >
          <Picker.Item label="Všetky" value="all" />
          {BREW_DEVICES.map((d) => (
            <Picker.Item key={d} label={d} value={d} />
          ))}
        </Picker>
        <TextInput
          style={styles.dateInput}
          placeholder="YYYY-MM-DD"
          value={dateFilter}
          onChangeText={setDateFilter}
        />
      </View>
      <FlatList data={filtered} keyExtractor={(item) => item.id} renderItem={renderItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  actionsRow: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: '#6B4423',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: { color: 'white', fontWeight: '600' },
  filters: { flexDirection: 'row', marginBottom: 12 },
  devicePicker: { flex: 1 },
  dateInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginLeft: 8, flex: 1 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  itemTitle: { fontWeight: 'bold' },
  notes: { fontStyle: 'italic' },
});

export default BrewHistoryScreen;
