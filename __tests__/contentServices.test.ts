import {
  TIP_OFFLINE_CACHE_KEY_PREFIX,
  TIP_STORAGE_KEY,
  fetchDailyTip,
  getNextRefreshDelay,
  scheduleDailyTipRefresh,
} from '../src/services/contentServices';
import type { Tip } from '../src/services/contentServices';

jest.useFakeTimers();

const asyncStore: Record<string, string> = {};
const offlineStore: Record<string, Tip> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(asyncStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      asyncStore[key] = value;
      return Promise.resolve();
    }),
  },
}));

jest.mock('../src/offline', () => ({
  coffeeOfflineManager: {
    getItem: jest.fn((key: string) => Promise.resolve(offlineStore[key] ?? null)),
    setItem: jest.fn((key: string, value: Tip) => {
      offlineStore[key] = value;
      return Promise.resolve();
    }),
  },
}));

describe('daily tip service', () => {
  beforeEach(() => {
    jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
    Object.keys(asyncStore).forEach(key => delete asyncStore[key]);
    Object.keys(offlineStore).forEach(key => delete offlineStore[key]);
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('returns same tip within a day and different on next day', async () => {
    const firstTip = await fetchDailyTip();
    expect(firstTip.date).toBe('2024-01-01');
    const storedTip: Tip = JSON.parse(asyncStore[TIP_STORAGE_KEY]);
    expect(storedTip.id).toBe(firstTip.id);

    const secondTip = await fetchDailyTip();
    expect(secondTip.id).toBe(firstTip.id);

    jest.setSystemTime(new Date('2024-01-02T09:00:00.000Z'));
    const thirdTip = await fetchDailyTip();
    expect(thirdTip.id).not.toBe(firstTip.id);
  });

  it('prefers offline cache over async storage', async () => {
    const offlineKey = `${TIP_OFFLINE_CACHE_KEY_PREFIX}:2024-01-01`;
    const offlineTip: Tip = { id: 99, text: 'from offline', date: '2024-01-01' };
    offlineStore[offlineKey] = offlineTip;

    const fetched = await fetchDailyTip();
    expect(fetched).toEqual(offlineTip);
  });

  it('hydrates offline cache from async storage when needed', async () => {
    const storedTip: Tip = { id: 42, text: 'stored', date: '2024-01-01' };
    asyncStore[TIP_STORAGE_KEY] = JSON.stringify(storedTip);

    const fetched = await fetchDailyTip();

    expect(fetched).toEqual(storedTip);
    const offlineKey = `${TIP_OFFLINE_CACHE_KEY_PREFIX}:2024-01-01`;
    expect(offlineStore[offlineKey]).toEqual(storedTip);
  });

  it('schedules refresh at midnight', () => {
    const now = new Date('2024-01-01T20:00:00.000Z');
    const expectedDelay = getNextRefreshDelay(now);
    const refreshSpy = jest.fn();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    scheduleDailyTipRefresh(refreshSpy, now);

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelay);

    jest.advanceTimersByTime(expectedDelay);
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    timeoutSpy.mockRestore();
  });
});
