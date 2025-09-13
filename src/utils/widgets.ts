import AsyncStorage from '@react-native-async-storage/async-storage';
import tips from '../../content/dailyTips.json';

const TIP_KEY = 'dailyTip';

export async function fetchDailyTip(): Promise<string> {
  const today = new Date().toDateString();
  try {
    const cachedRaw = await AsyncStorage.getItem(TIP_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached.date === today && cached.tip) {
        return cached.tip;
      }
    }
  } catch (e) {
    // ignore parsing errors
  }

  let tip = tips[Math.floor(Math.random() * tips.length)];
  // TODO: Optionally fetch from remote API here

  try {
    await AsyncStorage.setItem(TIP_KEY, JSON.stringify({ date: today, tip }));
  } catch (e) {
    // ignore write errors
  }
  scheduleNextUpdate();
  return tip;
}

function scheduleNextUpdate() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const timeout = midnight.getTime() - now.getTime();
  setTimeout(fetchDailyTip, timeout);
}

export default fetchDailyTip;
