import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import HomeScreen from '../src/screens/HomeScreen';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const fetchCoffeesMock = jest.fn(() => Promise.resolve([]));
const fetchHomeStatisticsMock = jest.fn();
const fetchDailyTipMock = jest.fn(() => Promise.resolve(null));
const fetchRecentScansMock = jest.fn(() => Promise.resolve([]));
const getTipFromCacheMock = jest.fn(() => Promise.resolve(null));
const getEmptyStatisticsMock = jest.fn(() => ({
  monthlyBrewCount: 0,
  topRecipe: null,
  topTastingNotes: [],
}));

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

const baseProps = {
  onHomePress: jest.fn(),
  onScanPress: jest.fn(),
  onBrewPress: jest.fn(),
  onBrewHistoryPress: jest.fn(),
  onLogBrewPress: jest.fn(),
  onProfilePress: jest.fn(),
  onDiscoverPress: jest.fn(),
  onRecipesPress: jest.fn(),
  onFavoritesPress: jest.fn(),
  onInventoryPress: jest.fn(),
  onPersonalizationPress: jest.fn(),
  onCommunityRecipesPress: jest.fn(),
  onSavedTipsPress: jest.fn(),
  userName: 'Tester',
};

describe('HomeScreen statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCoffeesMock.mockResolvedValue([]);
    fetchDailyTipMock.mockResolvedValue(null);
    fetchRecentScansMock.mockResolvedValue([]);
    getTipFromCacheMock.mockResolvedValue(null);
    getEmptyStatisticsMock.mockReturnValue({
      monthlyBrewCount: 0,
      topRecipe: null,
      topTastingNotes: [],
    });
  });

  it('renders statistics from the data source', async () => {
    fetchHomeStatisticsMock.mockResolvedValueOnce({
      monthlyBrewCount: 12,
      topRecipe: { id: 'recipe-1', name: 'Espresso', brewCount: 5 },
      topTastingNotes: [
        { note: 'Čokoláda', occurrences: 4 },
        { note: 'Orechy', occurrences: 2 },
      ],
    });

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...baseProps} />);
    });

    expect(fetchHomeStatisticsMock).toHaveBeenCalledTimes(1);

    const monthly = component.root.findByProps({ testID: 'stat-monthly-brew-count' });
    const recipeName = component.root.findByProps({ testID: 'stat-top-recipe-name' });
    const recipeCount = component.root.findByProps({ testID: 'stat-top-recipe-count' });
    const firstNote = component.root.findByProps({ testID: 'stat-top-note-0' });

    expect(monthly.props.children).toBe(12);
    expect(recipeName.props.children).toBe('Espresso');
    expect(recipeCount.props.children).toBe('5 príprav');
    expect(firstNote.props.children).toBe('Čokoláda · 4');
    expect(() => component.root.findByProps({ testID: 'stats-fallback-message' })).toThrow();
  });

  it('shows a fallback message when statistics cannot be loaded', async () => {
    fetchHomeStatisticsMock.mockRejectedValueOnce(new Error('network')); 

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...baseProps} />);
    });

    expect(fetchHomeStatisticsMock).toHaveBeenCalledTimes(1);
    expect(getEmptyStatisticsMock).toHaveBeenCalled();

    const fallbackMessage = component.root.findByProps({ testID: 'stats-fallback-message' });
    expect(fallbackMessage.props.children).toBe('Nepodarilo sa načítať štatistiky.');

    const monthly = component.root.findByProps({ testID: 'stat-monthly-brew-count' });
    expect(monthly.props.children).toBe(0);
  });
});

