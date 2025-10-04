import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import SavedTipsScreen from '../src/screens/SavedTipsScreen';

const mockStorage: Record<string, string | null> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  },
}));

describe('SavedTipsScreen', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it('shows loading state while tips are being read', async () => {
    let resolveGet: (value: string | null) => void = () => {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<SavedTipsScreen />);
    });

    const loading = component.root.findByProps({ testID: 'saved-tips-loading' });
    expect(loading).toBeDefined();

    await act(async () => {
      resolveGet(null);
    });
  });

  it('renders stored tips after loading', async () => {
    const tip = { id: 1, date: '2024-01-01', text: 'Skvelý tip' };
    mockStorage.SavedTips = JSON.stringify([tip]);

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<SavedTipsScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const texts = component.root.findAllByType(Text);
    const hasTip = texts.some((node) => node.props.children === tip.text);
    expect(hasTip).toBe(true);
  });

  it('shows error state when reading tips fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Read failed'));

    let component!: ReactTestRenderer;
    await act(async () => {
      component = renderer.create(<SavedTipsScreen />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const error = component.root.findByProps({ testID: 'saved-tips-error' });
    expect(error).toBeDefined();
  });
});
