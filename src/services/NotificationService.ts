import { Platform } from 'react-native';
import PushNotification, {Importance} from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

class NotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    PushNotification.configure({
      onRegister: () => {},
      onNotification: (notification) => {
        if (Platform.OS === 'ios') {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
      requestPermissions: Platform.OS === 'ios'
    });

    PushNotification.createChannel(
      {
        channelId: 'default-channel',
        channelName: 'General Notifications',
        importance: Importance.HIGH,
      },
      () => {}
    );
  }

  requestPermissions() {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.requestPermissions();
    }
  }

  cancelLocalNotification(id: string) {
    PushNotification.cancelLocalNotification(id);
  }
}

export default new NotificationService();
