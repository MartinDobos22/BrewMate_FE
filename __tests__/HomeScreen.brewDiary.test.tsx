import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import HomeScreen from '../src/screens/HomeScreen';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const fetchCoffeesMock = jest.fn(() => Promise.resolve([]));
const fetchHomeStatisticsMock = jest.fn(() =>
  Promise.resolve({
    monthlyBrewCount: 0,
    topRecipe: null,
    topTastingNotes: [],
    scanCount: 0,
    recipeGenerationCount: 0,
  }),
);
const fetchDailyTipMock = jest.fn(() => Promise.resolve(null));
const fetchRecentScansMock = jest.fn(() => Promise.resolve([]));
const getTipFromCacheMock = jest.fn(() => Promise.resolve(null));
const getEmptyStatisticsMock = jest.fn(() => ({
  monthlyBrewCount: 0,
  topRecipe: null,
  topTastingNotes: [],
  scanCount: 0,
  recipeGenerationCount: 0,
}));

const getIdTokenMock = jest.fn(() => Promise.resolve('test-token'));

jest.mock('@react-native-firebase/auth', () => {
  const authMock = () => ({
    currentUser: {
      getIdToken: getIdTokenMock,
    },
  });
  return authMock;
});

jest.mock('../src/screens/HomeScreen/services', () => ({
  __esModule: true,
  fetchCoffees: (...args: unknown[]) => fetchCoffeesMock(...args),
  fetchDailyTip: (...args: unknown[]) => fetchDailyTipMock(...args),
  fetchHomeStatistics: (...args: unknown[]) => fetchHomeStatisticsMock(...args),
  fetchRecentScans: (...args: unknown[]) => fetchRecentScansMock(...args),
  getTipFromCache: (...args: unknown[]) => getTipFromCacheMock(...args),
  getEmptyStatistics: () => getEmptyStatisticsMock(),
}));

jest.mock('../src/hooks/usePersonalization', () => ({
  usePersonalization: () => ({ morningRitualManager: null }),
}));

const originalFetch = global.fetch;
const fetchMock = jest.fn();

describe('HomeScreen brew diary actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    (global as any).fetch = fetchMock;
    getIdTokenMock.mockResolvedValue('test-token');
    fetchCoffeesMock.mockResolvedValue([]);
    fetchDailyTipMock.mockResolvedValue(null);
    fetchRecentScansMock.mockResolvedValue([]);
    getTipFromCacheMock.mockResolvedValue(null);
    getEmptyStatisticsMock.mockReturnValue({
      monthlyBrewCount: 0,
      topRecipe: null,
      topTastingNotes: [],
    });
    fetchHomeStatisticsMock.mockImplementation(() =>
      Promise.resolve({
        monthlyBrewCount: 0,
        topRecipe: null,
        topTastingNotes: [],
      }),
    );
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it('invokes callbacks when brew diary CTAs are pressed', async () => {
    const props = {
      onHomePress: jest.fn(),
      onScanPress: jest.fn(),
      onBrewPress: jest.fn(),
      onProfilePress: jest.fn(),
      onDiscoverPress: jest.fn(),
      onRecipesPress: jest.fn(),
      onFavoritesPress: jest.fn(),
      onInventoryPress: jest.fn(),
      onPersonalizationPress: jest.fn(),
      userName: 'Tester',
    };

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...props} />);
    });

    expect(() => component.root.findByProps({ testID: 'brew-history-cta' })).toThrow();
    expect(() => component.root.findByProps({ testID: 'brew-log-cta' })).toThrow();
    expect(() => component.root.findByProps({ testID: 'saved-tips-cta' })).toThrow();
    expect(() => component.root.findByProps({ testID: 'community-recipes-cta' })).toThrow();
  });
});

