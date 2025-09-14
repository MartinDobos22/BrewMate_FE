import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TouchableOpacity, Alert } from 'react-native';
import CoffeeTasteScanner from '../src/components/CoffeeTasteScanner';

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

jest.mock('react-native-fs', () => ({}));

jest.mock('../src/services/ocrServices.ts', () => ({
  processOCR: jest.fn(() => Promise.resolve({
    corrected: 'text',
    original: 'text',
    scanId: '1',
    isRecommended: false,
    matchPercentage: 0,
  })),
  fetchOCRHistory: jest.fn(() => Promise.resolve([])),
  deleteOCRRecord: jest.fn(),
  rateOCRResult: jest.fn(),
  markCoffeePurchased: jest.fn(),
  extractCoffeeName: jest.fn(() => 'Test Coffee'),
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
});

