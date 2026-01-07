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
});
