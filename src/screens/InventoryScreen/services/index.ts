import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import AddCalendarEvent from 'react-native-add-calendar-event';
import { InventoryItem } from '../../../types/InventoryItem';
import { scheduleReminder, cancelLocalNotification } from '../../../utils/reminders';

const INVENTORY_STORAGE_KEY = 'inventory';

export const loadInventoryItems = async (): Promise<InventoryItem[]> => {
  const data = await AsyncStorage.getItem(INVENTORY_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const persistInventoryItems = async (items: InventoryItem[]): Promise<void> => {
  await AsyncStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
};

export const fetchScheduledReminders = async (): Promise<any[]> =>
  new Promise((resolve) => {
    PushNotification.getScheduledLocalNotifications((notifications) => resolve(notifications));
  });

export const presentCalendarDialog = (item: InventoryItem) =>
  AddCalendarEvent.presentEventCreatingDialog({
    title: item.coffeeName,
    startDate: item.reminderDate || new Date().toISOString(),
  });

export { scheduleReminder, cancelLocalNotification };
