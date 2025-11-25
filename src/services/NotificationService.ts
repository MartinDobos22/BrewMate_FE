import { Platform } from 'react-native';
import PushNotification, {Importance} from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const DEFAULT_CHANNEL_ID = 'default-channel';

let isConfigured = false;

/**
 * Lazily configures the push notification library and platform channels so
 * subsequent scheduling calls are registered correctly on iOS and Android.
 *
 * The configuration is idempotent and only runs once per app session to avoid
 * duplicate channel creation or permission prompts.
 */
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

/**
 * Requests the necessary push notification permissions on the current platform.
 *
 * On iOS this triggers the system permission prompt; on Android it ensures
 * configuration is performed but does not request runtime permissions.
 *
 * @returns {Promise<void>} Resolves once permissions have been requested or
 * the configuration is complete.
 */
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

/**
 * Schedules a local notification using the shared default channel.
 *
 * When no date is provided, the notification fires one second after the call
 * is made. The configuration call is executed before scheduling to guarantee
 * the channel exists.
 *
 * @param {string} title - Notification title shown to the user.
 * @param {string} message - Body text of the notification.
 * @param {ScheduleOptions} [options] - Optional scheduling settings including
 * the target date and idle behavior.
 * @returns {Promise<void>} Resolves after the notification has been queued for
 * delivery on the device.
 */
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

/**
 * Cancels a previously scheduled local notification.
 *
 * @param {string} id - Platform-specific notification identifier that was used
 * when scheduling the notification.
 * @returns {void}
 */
export function cancelLocalNotification(id: string): void {
  configure();
  PushNotification.cancelLocalNotification(id);
  if (Platform.OS === 'ios') {
    PushNotificationIOS.removePendingNotificationRequests([id]);
  }
}

configure();
