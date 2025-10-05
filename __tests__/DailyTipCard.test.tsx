import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import DailyTipCard from '../src/components/DailyTipCard';
import Share from 'react-native/Libraries/Share/Share';

const store: Record<string, string> = {};

jest.mock('../src/services/contentServices', () => ({
  fetchDailyTip: jest.fn(),
  getTipFromCache: jest.fn(),
}));

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

jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
}));

describe('DailyTipCard', () => {
  const tip = { id: 1, text: 'Tip text', date: '2024-01-01' };

  beforeEach(() => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    Object.keys(store).forEach((k) => delete store[k]);
    (Share.share as jest.Mock).mockClear();
    const services = require('../src/services/contentServices');
    services.fetchDailyTip.mockReset();
    services.getTipFromCache.mockReset();
    services.fetchDailyTip.mockResolvedValue(tip);
    services.getTipFromCache.mockResolvedValue(null);
  });

  it('saves tip to storage', async () => {
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<DailyTipCard tip={tip} />);
    });
    const saveBtn = instance.root.findByProps({ children: 'Ulož' });
    await ReactTestRenderer.act(async () => {
      await saveBtn.props.onPress();
    });
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'SavedTips',
      JSON.stringify([tip])
    );
  });

  it('shares tip text', async () => {
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<DailyTipCard tip={tip} />);
    });
    const shareBtn = instance.root.findByProps({ children: 'Zdieľaj' });
    shareBtn.props.onPress();
    expect(Share.share).toHaveBeenCalledWith({ message: tip.text });
  });

  it('uses stored tip when offline', async () => {
    const services = require('../src/services/contentServices');
    services.getTipFromCache.mockResolvedValue(tip);
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<DailyTipCard />);
    });
    const texts = instance.root.findAllByType(Text);
    const hasTip = texts.some((t) => t.props.children === tip.text);
    expect(hasTip).toBe(true);
    expect(services.fetchDailyTip).not.toHaveBeenCalled();
  });
});
