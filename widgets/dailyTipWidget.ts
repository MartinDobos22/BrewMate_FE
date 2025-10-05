import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler } from 'expo-widget';

import { fetchDailyTip, getWidgetRefreshDelay } from '../src/utils/widgets';

const WIDGET_LAST_TIP_KEY = 'widget:dailyTip:last';
const DEFAULT_TIP = 'Enjoy your brew!';

async function persistLastTip(tip: string) {
  try {
    await AsyncStorage.setItem(WIDGET_LAST_TIP_KEY, tip);
  } catch (error) {
    console.warn('[dailyTipWidget] Unable to persist last tip for offline use', error);
  }
}

async function readCachedTip(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(WIDGET_LAST_TIP_KEY);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn('[dailyTipWidget] Unable to read cached tip', error);
  }

  return DEFAULT_TIP;
}

type DailyTipWidgetData = {
  tip: string;
};

type DailyTipWidgetTimelineEntry = {
  date: Date;
  data: DailyTipWidgetData;
};

type DailyTipWidgetResult = {
  timeline: DailyTipWidgetTimelineEntry[];
  nextRefresh?: number;
};

registerWidgetTaskHandler(async (): Promise<DailyTipWidgetResult> => {
  const nextRefresh = Date.now() + getWidgetRefreshDelay();

  try {
    const tip = await fetchDailyTip();
    await persistLastTip(tip);

    return {
      timeline: [
        {
          date: new Date(),
          data: { tip },
        },
      ],
      nextRefresh,
    };
  } catch (error) {
    console.warn('[dailyTipWidget] Falling back to cached tip', error);
    const tip = await readCachedTip();

    return {
      timeline: [
        {
          date: new Date(),
          data: { tip },
        },
      ],
      nextRefresh,
    };
  }
});
