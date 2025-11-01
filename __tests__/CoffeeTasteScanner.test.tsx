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

jest.mock('../src/services/ocrServices.ts', () => ({
  processOCR: jest.fn(() => Promise.resolve({
    corrected: 'káva test',
    original: 'káva test',
    scanId: '1',
    isRecommended: false,
    matchPercentage: 0,
    isCoffee: true,
  })),
  fetchOCRHistory: jest.fn(() => Promise.resolve([])),
  deleteOCRRecord: jest.fn(),
  markCoffeePurchased: jest.fn(),
  extractCoffeeName: jest.fn(() => 'Test Coffee'),
}));

const saveCoffeeRating = jest.fn(() => Promise.resolve(true));
const toggleFavorite = jest.fn(() => Promise.resolve(true));

jest.mock('../src/services/homePagesService.ts', () => ({
  saveCoffeeRating: (...args: any[]) => saveCoffeeRating(...args),
  toggleFavorite: (...args: any[]) => toggleFavorite(...args),
}));

jest.mock('../src/services/offlineCache', () => ({
  saveOCRResult: jest.fn(() => Promise.resolve()),
  loadOCRResult: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../src/services/profileServices', () => ({
  incrementProgress: jest.fn(() => Promise.resolve()),
}));

const addRecentScan = jest.fn(() => Promise.resolve());
jest.mock('../src/services/coffeeServices.ts', () => ({
  addRecentScan: (scan: any) => addRecentScan(scan),
}));

describe('CoffeeTasteScanner', () => {
  beforeEach(() => {
    addRecentScan.mockClear();
    saveCoffeeRating.mockClear();
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

  it('calls saveCoffeeRating when rating star is pressed', async () => {
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

    expect(saveCoffeeRating).toHaveBeenCalledWith(expect.any(String), 1, undefined);
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

