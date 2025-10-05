import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { cancelLocalNotification as cancelLocalNotificationService } from '../services/NotificationService';
import { InventoryItem } from '../types/InventoryItem';

export const scheduleReminder = (date: Date, message: string): string => {
  const id = Date.now().toString();
  PushNotification.localNotificationSchedule({
    channelId: 'default-channel',
    message,
    date,
    allowWhileIdle: true,
    id,
  });
  return id;
};

export const scheduleLowStockCheck = async (): Promise<void> => {
  const data = await AsyncStorage.getItem('inventory');
  if (!data) return;
  const items: InventoryItem[] = JSON.parse(data);
  const now = new Date();
  items.forEach((item) => {
    if (item.dailyUsage > 0) {
      const daysLeft = item.gramsLeft / item.dailyUsage;
      const depletion = new Date(now.getTime() + daysLeft * 86400000);
      const reminderDate = new Date(depletion.getTime() - 3 * 86400000);
      if (reminderDate > now) {
        scheduleReminder(reminderDate, `${item.coffeeName} is running low`);
      }
    }
  });
};

export const cancelLocalNotification = (id: string): void => {
  cancelLocalNotificationService(id);
};

