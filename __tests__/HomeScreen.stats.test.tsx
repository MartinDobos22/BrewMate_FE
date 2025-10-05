import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';

import HomeScreen from '../src/components/HomeScreen';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const fetchCoffeesMock = jest.fn(() => Promise.resolve([]));
const fetchDashboardDataMock = jest.fn();
const fetchUserStatsMock = jest.fn();
const fetchDailyTipMock = jest.fn(() => Promise.resolve(null));
const fetchRecentScansMock = jest.fn(() => Promise.resolve([]));

jest.mock('../src/services/homePagesService.ts', () => ({
  fetchCoffees: fetchCoffeesMock,
  fetchDashboardData: fetchDashboardDataMock,
  fetchUserStats: fetchUserStatsMock,
}));

jest.mock('../src/services/contentServices', () => ({
  fetchDailyTip: fetchDailyTipMock,
}));

jest.mock('../src/services/coffeeServices.ts', () => ({
  fetchRecentScans: fetchRecentScansMock,
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
  });

  it('loads dashboard statistics on mount', async () => {
    fetchDashboardDataMock.mockResolvedValueOnce({
      stats: { coffeeCount: 12, avgRating: 4.3, favoritesCount: 5 },
    });
    fetchUserStatsMock.mockResolvedValueOnce({
      coffeeCount: 1,
      avgRating: 3.1,
      favoritesCount: 2,
    });

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...baseProps} />);
    });

    expect(fetchDashboardDataMock).toHaveBeenCalledTimes(1);
    expect(fetchUserStatsMock).toHaveBeenCalledTimes(1);

    const coffeeCount = component.root.findByProps({ testID: 'stat-value-coffeeCount' });
    const avgRating = component.root.findByProps({ testID: 'stat-value-avgRating' });
    const favoritesCount = component.root.findByProps({ testID: 'stat-value-favoritesCount' });

    expect(coffeeCount.props.children).toBe(12);
    expect(avgRating.props.children).toBe('4.3');
    expect(favoritesCount.props.children).toBe(5);
    expect(() => component.root.findByProps({ testID: 'stats-fallback-message' })).toThrow();
  });

  it('shows fallback statistics when dashboard data is unavailable', async () => {
    fetchDashboardDataMock.mockResolvedValueOnce(null);
    fetchUserStatsMock.mockResolvedValueOnce({
      coffeeCount: 2,
      avgRating: 3.5,
      favoritesCount: 1,
    });

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...baseProps} />);
    });

    const fallbackMessage = component.root.findByProps({ testID: 'stats-fallback-message' });
    expect(fallbackMessage.props.children).toContain('Zobrazujú sa posledné známe údaje');

    const coffeeCount = component.root.findByProps({ testID: 'stat-value-coffeeCount' });
    const avgRating = component.root.findByProps({ testID: 'stat-value-avgRating' });
    const favoritesCount = component.root.findByProps({ testID: 'stat-value-favoritesCount' });

    expect(coffeeCount.props.children).toBe(2);
    expect(avgRating.props.children).toBe('3.5');
    expect(favoritesCount.props.children).toBe(1);
  });
});
