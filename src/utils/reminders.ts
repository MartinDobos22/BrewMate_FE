import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { cancelLocalNotification as cancelLocalNotificationService } from '../services/NotificationService';
import { InventoryItem } from '../types/InventoryItem';

/**
 * Schedules a local push notification for a specific date and message.
 *
 * @param {Date} date - Absolute date and time when the reminder should trigger.
 * @param {string} message - Notification message body presented to the user.
 * @returns {string} Identifier of the scheduled notification, used for cancellation.
 */
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

/**
 * Scans stored inventory items and schedules low-stock reminders three days before depletion.
 *
 * Reads inventory data from AsyncStorage and estimates depletion based on daily usage.
 * Does nothing if inventory storage is empty or missing.
 *
 * @returns {Promise<void>} Resolves when reminders are scheduled or skipped without error.
 */
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

/**
 * Cancels a previously scheduled local notification by identifier.
 *
 * @param {string} id - Notification identifier returned by {@link scheduleReminder}.
 * @returns {void}
 */
export const cancelLocalNotification = (id: string): void => {
  cancelLocalNotificationService(id);
};

