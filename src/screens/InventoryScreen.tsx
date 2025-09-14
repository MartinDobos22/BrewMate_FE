import React, {useEffect, useState} from 'react';
import {View, Text, Button, TextInput, FlatList} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import AddCalendarEvent from 'react-native-add-calendar-event';
import {InventoryItem} from '../types/InventoryItem';
import {scheduleReminder} from '../utils/reminders';

const InventoryScreen = (): React.JSX.Element => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [form, setForm] = useState({
    coffeeName: '',
    gramsLeft: '',
    dailyUsage: '',
    reminderDate: '',
  });

  const loadItems = async () => {
    const data = await AsyncStorage.getItem('inventory');
    if (data) setItems(JSON.parse(data));
  };

  const loadReminders = () => {
    PushNotification.getScheduledLocalNotifications((n) => setReminders(n));
  };

  useEffect(() => {
    loadItems();
    loadReminders();
  }, []);

  const saveItems = async (newItems: InventoryItem[]) => {
    setItems(newItems);
    await AsyncStorage.setItem('inventory', JSON.stringify(newItems));
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
      loadReminders();
    }
    setForm({coffeeName: '', gramsLeft: '', dailyUsage: '', reminderDate: ''});
  };

  const cancelReminder = (id: string) => {
    PushNotification.cancelLocalNotification(id);
    loadReminders();
  };

  const addToCalendar = (item: InventoryItem) => {
    AddCalendarEvent.presentEventCreatingDialog({
      title: item.coffeeName,
      startDate: item.reminderDate || new Date().toISOString(),
    });
  };

  return (
    <View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({item}) => (
          <View>
            <Text>
              {item.coffeeName} - {item.gramsLeft}g
            </Text>
            <Button
              title="Pridať brew session do kalendára"
              onPress={() => addToCalendar(item)}
            />
          </View>
        )}
      />
      <Text>Pridať položku</Text>
      <TextInput
        placeholder="coffeeName"
        value={form.coffeeName}
        onChangeText={(t) => setForm({...form, coffeeName: t})}
      />
      <TextInput
        placeholder="gramsLeft"
        keyboardType="numeric"
        value={form.gramsLeft}
        onChangeText={(t) => setForm({...form, gramsLeft: t})}
      />
      <TextInput
        placeholder="dailyUsage"
        keyboardType="numeric"
        value={form.dailyUsage}
        onChangeText={(t) => setForm({...form, dailyUsage: t})}
      />
      <TextInput
        placeholder="reminderDate"
        value={form.reminderDate}
        onChangeText={(t) => setForm({...form, reminderDate: t})}
      />
      <Button title="Uložiť" onPress={addItem} />
      <Text>Aktívne pripomienky</Text>
      {reminders.map((r) => (
        <View key={r.id}>
          <Text>{r.message}</Text>
          <Button title="Zrušiť" onPress={() => cancelReminder(r.id)} />
        </View>
      ))}
    </View>
  );
};

export default InventoryScreen;
