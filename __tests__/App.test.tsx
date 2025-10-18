/**
 * @format
 */

import React from 'react';
import TestRenderer, { act, ReactTestRenderer as ReactRendererInstance } from 'react-test-renderer';
import OnboardingScreen from '../src/screens/OnboardingScreen';
import type { PersonalizationResult } from '../src/components/personalization/PersonalizationOnboarding';

const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
};

const mockFirebaseUser = {
  uid: 'user-123',
  getIdToken: jest.fn(() => Promise.resolve('token')),
  reload: jest.fn(() => Promise.resolve()),
};

const onAuthStateChangedMock = jest.fn();

jest.mock(
  '@react-native-firebase/auth',
  () => ({
    __esModule: true,
    default: () => ({
      currentUser: null,
      onAuthStateChanged: onAuthStateChangedMock,
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

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

jest.mock('react-native-encrypted-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/screens/CoffeeTasteScanner', () => 'View');

import App from '../App';

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
  onAuthStateChangedMock.mockImplementation(() => jest.fn());
});

test('renders without crashing', async () => {
  await act(async () => {
    TestRenderer.create(<App />);
  });
});

test('shows onboarding questions after first login when not completed', async () => {
  onAuthStateChangedMock.mockImplementation((callback: (user: typeof mockFirebaseUser) => void) => {
    callback(mockFirebaseUser);
    return jest.fn();
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(renderer!.root.findByType(OnboardingScreen)).toBeTruthy();
});

test('completing onboarding stores answers and hides the flow', async () => {
  const sampleResult: PersonalizationResult = {
    answers: {
      sweetness: '6',
      'dimension:sweetness': '6',
      strength: 'balanced',
    },
  };

  onAuthStateChangedMock.mockImplementation((callback: (user: typeof mockFirebaseUser) => void) => {
    callback(mockFirebaseUser);
    return jest.fn();
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByType(OnboardingScreen).props.onFinish(sampleResult);
  });

  expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith([
    ['@OnboardingComplete', 'true'],
    ['brewmate:personalization:onboarding_status_v1', 'completed'],
    ['brewmate:personalization:onboarding_result_v1', JSON.stringify(sampleResult)],
  ]);
  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_status_v1',
    'completed',
  );
  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_result_v1',
    JSON.stringify(sampleResult),
  );

  await act(async () => {
    await Promise.resolve();
  });

  expect(renderer!.root.findAllByType(OnboardingScreen)).toHaveLength(0);
});

test('skipping onboarding marks it as completed without answers', async () => {
  onAuthStateChangedMock.mockImplementation((callback: (user: typeof mockFirebaseUser) => void) => {
    callback(mockFirebaseUser);
    return jest.fn();
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByType(OnboardingScreen).props.onSkip();
  });

  expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith([
    ['@OnboardingComplete', 'true'],
    ['brewmate:personalization:onboarding_status_v1', 'skipped'],
  ]);
  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_status_v1',
    'skipped',
  );
  expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_result_v1',
  );
});
