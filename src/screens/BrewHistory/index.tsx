import React, { JSX, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BrewLog } from '../../types/BrewLog';
import { BREW_DEVICES } from '../../types/Recipe';
import { getBrewLogs } from './services';
import { styles } from './styles';

interface BrewHistoryScreenProps {
  onAddLog?: () => void;
  onLogPress?: (log: BrewLog) => void;
}

/**
 * Zobrazuje históriu záznamov kávových nápojov s filtrami a detailmi.
 *
 * @param {object} props - Vstupné vlastnosti obrazovky.
 * @param {() => void} [props.onAddLog] - Voliteľný callback na otvorenie formulára pre nový záznam.
 * @param {(log: BrewLog) => void} [props.onLogPress] - Voliteľný handler pri kliknutí na existujúci záznam.
 * @returns {JSX.Element} Rozhranie s filtrami, zoznamom záznamov a akciami.
 */
const BrewHistoryScreen: React.FC<BrewHistoryScreenProps> = ({
  onAddLog,
  onLogPress,
}: {
  onAddLog?: () => void;
  onLogPress?: (log: BrewLog) => void;
}): JSX.Element => {
  const [logs, setLogs] = useState<BrewLog[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    /**
     * Načíta uložené logy prípravy kávy z úložiska služby a uloží ich do stavu.
     *
     * @returns {Promise<void>} Promise vyriešená po načítaní zoznamu.
     */
    const load = async () => {
      const data = await getBrewLogs();
      setLogs(data);
    };
    load();
  }, []);

  const filtered = logs.filter(log => {
    const byDevice = deviceFilter === 'all' || log.brewDevice === deviceFilter;
    const byDate = dateFilter === '' || log.date.startsWith(dateFilter);
    return byDevice && byDate;
  });

  /**
   * Vykreslí jednotlivý záznam so základnými detailmi a možnosťou otvoriť detail.
   *
   * @param {{ item: BrewLog }} param0 - Položka zoznamu s logom prípravy.
   * @returns {JSX.Element} Dotykový prvok so zhrnutím záznamu.
   */
  const renderItem = ({ item }: { item: BrewLog }): JSX.Element => (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        onLogPress
          ? onLogPress(item)
          : Alert.alert('Detail záznamu', JSON.stringify(item, null, 2))
      }
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddLog}
            testID="history-add-log"
          >
            <Text style={styles.addButtonText}>Pridať záznam</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.filters}>
        <Picker
          selectedValue={deviceFilter}
          style={styles.devicePicker}
          onValueChange={v => setDeviceFilter(String(v))}
        >
          <Picker.Item label="Všetky" value="all" />
          {BREW_DEVICES.map(d => (
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
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};


export default BrewHistoryScreen;
