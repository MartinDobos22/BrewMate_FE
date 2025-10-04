import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

import HomeScreen from '../src/components/HomeScreen';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('../src/services/homePagesService.ts', () => ({
  fetchCoffees: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../src/services/contentServices', () => ({
  fetchDailyTip: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../src/services/coffeeServices.ts', () => ({
  fetchRecentScans: jest.fn(() => Promise.resolve([])),
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

    act(() => {
      historyButton?.props.onPress();
      logButton?.props.onPress();
    });

    expect(props.onBrewHistoryPress).toHaveBeenCalled();
    expect(props.onLogBrewPress).toHaveBeenCalled();
  });
});
