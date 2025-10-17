import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, TextInput, FlatList } from 'react-native';
import { InventoryItem } from '../../types/InventoryItem';
import {
  loadInventoryItems,
  persistInventoryItems,
  fetchScheduledReminders,
  presentCalendarDialog,
  scheduleReminder,
  cancelLocalNotification,
} from './services';
import { styles } from './styles';

const InventoryScreen = (): React.JSX.Element => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [form, setForm] = useState({
    coffeeName: '',
    gramsLeft: '',
    dailyUsage: '',
    reminderDate: '',
  });

  const loadItems = useCallback(async () => {
    const data = await loadInventoryItems();
    setItems(data);
  }, []);

  const loadReminders = useCallback(async () => {
    const scheduled = await fetchScheduledReminders();
    setReminders(scheduled);
  }, []);

  useEffect(() => {
    loadItems();
    loadReminders();
  }, [loadItems, loadReminders]);

  const saveItems = async (newItems: InventoryItem[]) => {
    setItems(newItems);
    await persistInventoryItems(newItems);
  };

  const addItem = async () => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      coffeeName: form.coffeeName,
      gramsLeft: parseFloat(form.gramsLeft),
      dailyUsage: parseFloat(form.dailyUsage),
      reminderDate: form.reminderDate || undefined,
    };
    const updated = [...items, newItem];
    await saveItems(updated);
    if (form.reminderDate) {
      scheduleReminder(new Date(form.reminderDate), `${form.coffeeName} reminder`);
      await loadReminders();
    }
    setForm({ coffeeName: '', gramsLeft: '', dailyUsage: '', reminderDate: '' });
  };

  const cancelReminder = (id: string) => {
    cancelLocalNotification(id);
    loadReminders();
  };

  const addToCalendar = (item: InventoryItem) => {
    presentCalendarDialog(item);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>
              {item.coffeeName} - {item.gramsLeft}g
            </Text>
            <Button
              title="Pridať brew session do kalendára"
              onPress={() => addToCalendar(item)}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
      <Text style={styles.sectionTitle}>Pridať položku</Text>
      <TextInput
        placeholder="coffeeName"
        value={form.coffeeName}
        onChangeText={(t) => setForm({ ...form, coffeeName: t })}
        style={styles.input}
      />
      <TextInput
        placeholder="gramsLeft"
        keyboardType="numeric"
        value={form.gramsLeft}
        onChangeText={(t) => setForm({ ...form, gramsLeft: t })}
        style={styles.input}
      />
      <TextInput
        placeholder="dailyUsage"
        keyboardType="numeric"
        value={form.dailyUsage}
        onChangeText={(t) => setForm({ ...form, dailyUsage: t })}
        style={styles.input}
      />
      <TextInput
        placeholder="reminderDate"
        value={form.reminderDate}
        onChangeText={(t) => setForm({ ...form, reminderDate: t })}
        style={styles.input}
      />
      <Button title="Uložiť" onPress={addItem} />
      <Text style={styles.sectionTitle}>Aktívne pripomienky</Text>
      {reminders.map((r) => (
        <View key={r.id} style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>{r.message}</Text>
          <Button title="Zrušiť" onPress={() => cancelReminder(r.id)} />
        </View>
      ))}
    </View>
  );
};

export default InventoryScreen;
