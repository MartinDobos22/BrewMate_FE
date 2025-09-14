import { fetchDailyTip, Tip } from '../src/services/contentServices';

jest.useFakeTimers();

const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
  },
}));

describe('fetchDailyTip', () => {
  it('returns same tip within a day and different on next day', async () => {
    jest.setSystemTime(new Date('2024-01-01'));
    const tip1 = await fetchDailyTip();
    const tipStored: Tip = JSON.parse(store['lastTip']);
    expect(tipStored.id).toBe(tip1.id);

    const tip2 = await fetchDailyTip();
    expect(tip2.id).toBe(tip1.id);

    jest.setSystemTime(new Date('2024-01-02'));
    const tip3 = await fetchDailyTip();
    expect(tip3.id).not.toBe(tip1.id);
  });
});
