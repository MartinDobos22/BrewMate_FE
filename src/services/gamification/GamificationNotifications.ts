import PushNotification from 'react-native-push-notification';
import type { GamificationNotificationChannel, DailyQuestInstance } from '../../types/gamification';

const CHANNEL_ID = 'brewmate-gamification';

PushNotification.createChannel(
  {
    channelId: CHANNEL_ID,
    channelName: 'BrewMate questy',
    channelDescription: 'Pripomienky denných výziev',
    importance: 4,
  },
  () => {},
);

/**
 * Lokálne notifikácie pre denné questy.
 */
export class GamificationNotifications implements GamificationNotificationChannel {
  async scheduleQuestReminder(quest: DailyQuestInstance): Promise<void> {
    const date = new Date(quest.expiresAt);
    date.setHours(date.getHours() - 2);
    if (date <= new Date()) {
      return;
    }
    PushNotification.localNotificationSchedule({
      channelId: CHANNEL_ID,
      id: quest.id,
      title: 'Nezabudni na výzvu',
      message: `${quest.metadata?.title ?? 'Denná úloha'} čaká na dokončenie`,
      date,
      allowWhileIdle: true,
      userInfo: { questId: quest.id },
    });
  }

  async cancelQuestReminder(questId: string): Promise<void> {
    PushNotification.cancelLocalNotifications({ id: questId });
  }
}
