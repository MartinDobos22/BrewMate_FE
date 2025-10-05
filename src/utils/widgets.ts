import {
  fetchDailyTip as fetchDailyTipFromService,
  getNextRefreshDelay,
  scheduleDailyTipRefresh,
} from '../services/contentServices';

export async function fetchDailyTip(): Promise<string> {
  const tip = await fetchDailyTipFromService();
  scheduleDailyTipRefresh(() => fetchDailyTipFromService());
  return tip.text;
}

export { getNextRefreshDelay as getWidgetRefreshDelay };

export default fetchDailyTip;
