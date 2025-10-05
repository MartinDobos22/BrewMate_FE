import { saveCoffeeRating, toggleFavorite } from '../src/services/homePagesService';
import { offlineSync } from '../src/offline';

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: {
    getIdToken: jest.fn(() => Promise.resolve('token')),
  },
}));

jest.mock('../src/offline', () => {
  const enqueue = jest.fn();
  return {
    coffeeOfflineManager: {},
    offlineSync: { enqueue },
  };
});

const enqueueMock = (offlineSync.enqueue as unknown) as jest.Mock;

beforeAll(() => {
  global.fetch = jest.fn();
});

beforeEach(() => {
  enqueueMock.mockClear();
  (global.fetch as jest.Mock).mockReset();
});

describe('homePagesService offline helpers', () => {
  it('enqueues coffee rating when network request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

    const result = await saveCoffeeRating('coffee-123', 4, 'note');

    expect(result).toBe(true);
    expect(enqueueMock).toHaveBeenCalledWith('coffee:rate', {
      coffeeId: 'coffee-123',
      rating: 4,
      notes: 'note',
    });
  });

  it('enqueues favorite toggle on unauthorized response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });

    const result = await toggleFavorite('coffee-abc');

    expect(result).toBe(true);
    expect(enqueueMock).toHaveBeenCalledWith('coffee:favorite', { coffeeId: 'coffee-abc' });
  });
});

