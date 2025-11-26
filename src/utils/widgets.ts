import {
  fetchDailyTip as fetchDailyTipFromService,
  getNextRefreshDelay,
  scheduleDailyTipRefresh,
} from '../services/contentServices';

/**
 * Retrieves a daily tip from the content service and schedules the next refresh.
 *
 * @returns {Promise<string>} Promise resolving to the textual daily tip to display in widgets.
 */
export async function fetchDailyTip(): Promise<string> {
  const tip = await fetchDailyTipFromService();
  scheduleDailyTipRefresh(() => fetchDailyTipFromService());
  return tip.text;
}

export { getNextRefreshDelay as getWidgetRefreshDelay };

export default fetchDailyTip;
