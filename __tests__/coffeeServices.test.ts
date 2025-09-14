import { addRecentScan, fetchRecentScans } from '../src/services/coffeeServices';

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

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ isConnected: false })),
  },
}));

describe('coffeeServices', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k]);
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    const NetInfo = require('@react-native-community/netinfo').default;
    (NetInfo.fetch as jest.Mock).mockClear();
  });

  it('stores scan and returns it from fetchRecentScans', async () => {
    await addRecentScan({ id: '1', name: 'Test Coffee' });
    const scans = await fetchRecentScans(10);
    expect(scans).toEqual([{ id: '1', name: 'Test Coffee' }]);
  });
});

