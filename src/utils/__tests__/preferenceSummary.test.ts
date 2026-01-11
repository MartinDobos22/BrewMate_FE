import { buildPreferenceSummary } from '../preferenceSummary';

describe('buildPreferenceSummary', () => {
  it('uses preferenceSnapshot.taste_vector when profile preferences are missing', () => {
    const result = buildPreferenceSummary({
      profilePreferences: null,
      preferenceSnapshot: {
        taste_vector: {
          acidity: 0.4,
          sweetness: 0.7,
          bitterness: 9,
          body: 12,
        },
      },
      coffeePreferences: null,
    });

    expect(result.sourceLabel).toBe('uložené preferencie');
    expect(result.summary).toBe('Kyslosť 4/10, Sladkosť 7/10, Horkosť 9/10, Telo 10/10');
  });

  it('prefers stored preferences when profile is stale', () => {
    const result = buildPreferenceSummary({
      profilePreferences: {
        acidity: 1,
        sweetness: 2,
        bitterness: 3,
        body: 4,
      },
      preferenceSnapshot: {
        taste_vector: {
          acidity: 0.6,
          sweetness: 0.4,
          bitterness: 0.2,
          body: 0.8,
        },
      },
      coffeePreferences: null,
      isProfileStale: true,
    });

    expect(result.sourceLabel).toBe('uložené preferencie');
    expect(result.summary).toBe('Kyslosť 6/10, Sladkosť 4/10, Horkosť 2/10, Telo 8/10');
  });
});
