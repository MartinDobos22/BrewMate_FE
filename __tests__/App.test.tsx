/**
 * @format
 */

import React from 'react';
import TestRenderer, { act, ReactTestRenderer as ReactRendererInstance } from 'react-test-renderer';
import PersonalizationOnboarding from '../src/components/PersonalizationOnboarding';
import type { PersonalizationResult } from '../src/components/PersonalizationOnboarding';

const mockAsyncStorage = {
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
};

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

jest.mock('../src/components/CoffeeTasteScanner.tsx', () => 'View');

import App from '../App';

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
});

test('renders without crashing', async () => {
  await act(async () => {
    TestRenderer.create(<App />);
  });
});

test('shows personalization onboarding when not completed', async () => {
  mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
    if (key === '@OnboardingComplete') {
      return 'true';
    }
    if (key === 'brewmate:personalization:onboarding_status_v1') {
      return null;
    }
    return null;
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(renderer!.root.findByType(PersonalizationOnboarding)).toBeTruthy();
});

test('completing personalization onboarding persists result and hides the flow', async () => {
  const sampleResult: PersonalizationResult = {
    answers: {
      sweetness: '6',
      'dimension:sweetness': '6',
      strength: 'balanced',
    },
  };

  mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
    if (key === '@OnboardingComplete') {
      return 'true';
    }
    if (key === 'brewmate:personalization:onboarding_status_v1') {
      return null;
    }
    return null;
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByType(PersonalizationOnboarding).props.onComplete(sampleResult);
  });

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

  expect(renderer!.root.findAllByType(PersonalizationOnboarding)).toHaveLength(0);
});

test('skipping personalization onboarding stores skipped state without a result', async () => {
  mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
    if (key === '@OnboardingComplete') {
      return 'true';
    }
    if (key === 'brewmate:personalization:onboarding_status_v1') {
      return null;
    }
    return null;
  });

  let renderer: ReactRendererInstance;

  await act(async () => {
    renderer = TestRenderer.create(<App />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    renderer!.root.findByType(PersonalizationOnboarding).props.onSkip();
  });

  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_status_v1',
    'skipped',
  );
  expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
    'brewmate:personalization:onboarding_result_v1',
  );
});
