/**
 * Barrel exports for home screen data dependencies, keeping UI components decoupled from service paths.
 */
export { fetchCoffees } from '../../../services/homePagesService';

export {
  clearScheduledDailyTipRefresh,
  fetchDailyTip,
  getScheduledDailyTipRefreshHandle,
  getTipFromCache,
  scheduleDailyTipRefresh,
} from '../../../services/contentServices';
export type { Tip } from '../../../services/dailyTipService';

export { fetchRecentScans } from '../../../services/coffeeServices';
export type { RecentScan } from '../../../services/coffeeServices';

export {
  fetchHomeStatistics,
  getEmptyStatistics,
} from '../../../services/homeStatisticsService';
export type {
  HomeStatistics,
  TopRecipeStat,
  TastingNoteStat,
} from '../../../services/homeStatisticsService';
