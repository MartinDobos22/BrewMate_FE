import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';
import CoffeeTasteScanner from '../src/screens/CoffeeTasteScanner';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => () => {}),
  },
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(() => null),
  useCameraDevice: jest.fn(() => ({})),
  useCameraPermission: jest.fn(() => ({ hasPermission: true, requestPermission: jest.fn() })),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn((options, callback) => {
    callback({ assets: [{ base64: 'abc123' }] });
  }),
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
}));

const addRecentScan = jest.fn(() => Promise.resolve());
const rateOCRResult = jest.fn(() => Promise.resolve(true));
const toggleFavorite = jest.fn(() => Promise.resolve(true));
const incrementProgress = jest.fn(() => Promise.resolve());
const fallbackDiary = {
  addManualEntry: jest.fn(() => Promise.resolve()),
};

jest.mock('../src/screens/CoffeeTasteScanner/services', () => ({
  processOCR: jest.fn(() =>
    Promise.resolve({
      corrected: 'text',
      original: 'text',
      scanId: '1',
      isRecommended: false,
      matchPercentage: 0,
    }),
  ),
  fetchOCRHistory: jest.fn(() => Promise.resolve([])),
  deleteOCRRecord: jest.fn(),
  markCoffeePurchased: jest.fn(),
  extractCoffeeName: jest.fn(() => 'Test Coffee'),
  rateOCRResult: (...args: any[]) => rateOCRResult(...args),
  incrementProgress: (...args: any[]) => incrementProgress(...args),
  saveOCRResult: jest.fn(() => Promise.resolve()),
  loadOCRResult: jest.fn(() => Promise.resolve(null)),
  addRecentScan: (...args: any[]) => addRecentScan(...args),
  fallbackCoffeeDiary: fallbackDiary,
  preferenceEngine: {
    recordBrew: jest.fn(() => Promise.resolve({})),
    saveEvents: jest.fn(() => Promise.resolve()),
  },
  toggleFavorite: (...args: any[]) => toggleFavorite(...args),
}));

describe('CoffeeTasteScanner', () => {
  beforeEach(() => {
    addRecentScan.mockClear();
    rateOCRResult.mockClear();
    toggleFavorite.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('calls addRecentScan after selecting image', async () => {
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<CoffeeTasteScanner />);
    });
    const buttons = instance.root.findAllByType(TouchableOpacity);
    const galleryButton = buttons.find(btn =>
      btn.findAllByType(Text).some(t => t.props.children === 'Vybrať z galérie')
    );
    expect(galleryButton).toBeTruthy();
    await ReactTestRenderer.act(async () => {
      await galleryButton.props.onPress();
    });
    expect(addRecentScan).toHaveBeenCalled();
  });

  it('calls rateOCRResult when rating star is pressed', async () => {
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<CoffeeTasteScanner />);
    });

    const buttons = instance.root.findAllByType(TouchableOpacity);
    const galleryButton = buttons.find(btn =>
      btn.findAllByType(Text).some(t => t.props.children === 'Vybrať z galérie')
    );
    expect(galleryButton).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await galleryButton.props.onPress();
    });

    const starButton = instance.root.findAllByType(TouchableOpacity).find(btn =>
      btn.findAllByType(Text).some(t => t.props.children === '☆'),
    );

    expect(starButton).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await starButton!.props.onPress();
    });

    expect(rateOCRResult).toHaveBeenCalledWith(expect.any(String), 1);
  });

  it('calls toggleFavorite when favorite button is pressed', async () => {
    let instance: any;
    await ReactTestRenderer.act(async () => {
      instance = ReactTestRenderer.create(<CoffeeTasteScanner />);
    });

    const buttons = instance.root.findAllByType(TouchableOpacity);
    const galleryButton = buttons.find(btn =>
      btn.findAllByType(Text).some(t => t.props.children === 'Vybrať z galérie')
    );
    expect(galleryButton).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await galleryButton.props.onPress();
    });

    const favoriteButton = instance.root.findAllByType(TouchableOpacity).find(btn =>
      btn.findAllByType(Text).some(t => t.props.children === '♡ Obľúbené'),
    );

    expect(favoriteButton).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await favoriteButton!.props.onPress();
    });

    expect(toggleFavorite).toHaveBeenCalled();
  });
});

