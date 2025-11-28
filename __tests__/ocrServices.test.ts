import * as ocrServices from '../src/services/ocrServices';

const mockUser = {
  getIdToken: jest.fn(() => Promise.resolve('token')),
};

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: mockUser,
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn() },
}));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    CachesDirectoryPath: '/tmp',
    writeFile: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/offline', () => ({
  coffeeOfflineManager: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/config/config', () => ({
  CONFIG: { OPENAI_API_KEY: '' },
}));

describe('processOCR parallel evaluation', () => {
  beforeAll(() => {
    global.fetch = jest.fn();
  });

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
    mockUser.getIdToken.mockClear();
  });

  it('returns recommendation and brewing methods when evaluation succeeds', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            text: 'Original coffee text',
            labels: ['coffee'],
            coffeeConfidence: 0.9,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            match_percentage: 82,
            is_recommended: true,
            id: 'scan-1',
            structured_metadata: null,
            structured_confidence: null,
            structured_uncertainty: null,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ recommendation: 'Great coffee' }),
      });

    const methodsSpy = jest
      .spyOn(ocrServices, 'suggestBrewingMethods')
      .mockResolvedValue(['Espresso', 'V60']);

    const result = await ocrServices.processOCR('image-data');

    expect(result).not.toBeNull();
    expect(result?.recommendation).toBe('Great coffee');
    expect(result?.brewingMethods).toEqual(['Espresso', 'V60']);
    expect(methodsSpy).toHaveBeenCalledWith('Original coffee text');

    methodsSpy.mockRestore();
  });

  it('keeps brewing methods when evaluation fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            text: 'Coffee failure test',
            labels: ['coffee'],
            coffeeConfidence: 0.9,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            match_percentage: 50,
            is_recommended: false,
            id: 'scan-2',
            structured_metadata: null,
            structured_confidence: null,
            structured_uncertainty: null,
          }),
      })
      .mockRejectedValueOnce(new Error('Evaluation failed'));

    const retryableSpy = jest
      .spyOn(ocrServices, 'retryableFetch')
      .mockImplementation(async request => request());

    const methodsSpy = jest
      .spyOn(ocrServices, 'suggestBrewingMethods')
      .mockResolvedValue(['Chemex', 'French press']);

    const result = await ocrServices.processOCR('image-data');

    expect(result).not.toBeNull();
    expect(result?.brewingMethods).toEqual(['Chemex', 'French press']);
    expect(result?.recommendation).toBe(
      'Nepodarilo sa vyhodnotiť kávu. Skontroluj svoje preferencie v profile.',
    );

    methodsSpy.mockRestore();
    retryableSpy.mockRestore();
  });
});
