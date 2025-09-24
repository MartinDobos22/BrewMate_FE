/*
 * Pomocník pre plánovanie notifikácií na denné úlohy.
 */
import PushNotification from 'react-native-push-notification';
import type {DailyQuestInstance} from '../../types/gamification';

class QuestNotificationService {
  scheduleQuestReminders(quests: DailyQuestInstance[]) {
    quests.forEach((quest, index) => {
      const remindAt = new Date(quest.activeFrom);
      remindAt.setHours(9 + index * 3, 0, 0, 0);
      if (remindAt.getTime() < Date.now()) {
        remindAt.setHours(new Date().getHours() + 1);
      }
      PushNotification.localNotificationSchedule({
        id: quest.id,
        channelId: 'default-channel',
        title: `🎯 Výzva: ${quest.title}`,
        message: quest.description,
        date: remindAt,
        allowWhileIdle: true,
      });
    });
  }

  cancelQuestNotifications(quests: DailyQuestInstance[]) {
    quests.forEach((quest) => {
      PushNotification.cancelLocalNotification(quest.id);
    });
  }
}

export default new QuestNotificationService();
