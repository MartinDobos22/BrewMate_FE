/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock(
  '@react-native-firebase/auth',
  () => ({
    __esModule: true,
    default: () => ({
      currentUser: null,
      onAuthStateChanged: jest.fn(),
    }),
  }),
  { virtual: true },
);

jest.mock(
  '@react-native-google-signin/google-signin',
  () => ({
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(),
      signIn: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock('../src/components/CoffeeTasteScanner.tsx', () => 'View');

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
