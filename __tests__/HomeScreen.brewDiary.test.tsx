import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

import HomeScreen from '../src/screens/HomeScreen';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const fetchCoffeesMock = jest.fn(() => Promise.resolve([]));
const fetchHomeStatisticsMock = jest.fn(() =>
  Promise.resolve({ monthlyBrewCount: 0, topRecipe: null, topTastingNotes: [] }),
);
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

describe('HomeScreen brew diary actions', () => {
  it('invokes callbacks when brew diary CTAs are pressed', async () => {
    const props = {
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

    let component!: ReactTestRenderer;

    await act(async () => {
      component = renderer.create(<HomeScreen {...props} />);
    });

    const buttons = component.root.findAllByType(TouchableOpacity);
    const historyButton = buttons.find((btn) => btn.props.testID === 'brew-history-cta');
    const logButton = buttons.find((btn) => btn.props.testID === 'brew-log-cta');

    expect(historyButton).toBeDefined();
    expect(logButton).toBeDefined();

    const savedTipsButton = component.root.findByProps({ testID: 'saved-tips-cta' });
    const communityButton = component.root.findByProps({ testID: 'community-recipes-cta' });

    act(() => {
      historyButton?.props.onPress();
      logButton?.props.onPress();
      savedTipsButton.props.onPress();
      communityButton.props.onPress();
    });

    expect(props.onBrewHistoryPress).toHaveBeenCalled();
    expect(props.onLogBrewPress).toHaveBeenCalled();
    expect(props.onSavedTipsPress).toHaveBeenCalled();
    expect(props.onCommunityRecipesPress).toHaveBeenCalled();
  });
});

