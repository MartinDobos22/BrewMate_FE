import { Platform } from 'react-native';
import PushNotification, {Importance} from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const DEFAULT_CHANNEL_ID = 'default-channel';

let isConfigured = false;

function configure() {
  if (isConfigured) {
    return;
  }

  PushNotification.configure({
    onRegister: () => {},
    onNotification: (notification) => {
      if (Platform.OS === 'ios') {
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      }
    },
    requestPermissions: Platform.OS === 'ios',
  });

  PushNotification.createChannel(
    {
      channelId: DEFAULT_CHANNEL_ID,
      channelName: 'General Notifications',
      importance: Importance.HIGH,
    },
    () => {},
  );

  isConfigured = true;
}

export async function requestPermissions(): Promise<void> {
  configure();
  if (Platform.OS === 'ios') {
    await PushNotificationIOS.requestPermissions();
  }
}

interface ScheduleOptions {
  /**
   * Dátum a čas, kedy sa má notifikácia zobraziť. Ak nie je zadaný, použije sa aktuálny čas + 1 sekunda.
   */
  date?: Date;
  /**
   * Či sa má notifikácia zobraziť aj počas šetrenia batérie.
   */
  allowWhileIdle?: boolean;
}

export async function scheduleLocalNotification(
  title: string,
  message: string,
  options: ScheduleOptions = {},
): Promise<void> {
  configure();

  const { date, allowWhileIdle = true } = options;
  const scheduledDate = date ?? new Date(Date.now() + 1000);

  PushNotification.localNotificationSchedule({
    channelId: DEFAULT_CHANNEL_ID,
    title,
    message,
    date: scheduledDate,
    allowWhileIdle,
  });
}

export function cancelLocalNotification(id: string): void {
  configure();
  PushNotification.cancelLocalNotification(id);
  if (Platform.OS === 'ios') {
    PushNotificationIOS.removePendingNotificationRequests([id]);
  }
}

configure();
