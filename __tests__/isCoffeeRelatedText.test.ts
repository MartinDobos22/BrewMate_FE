import { isCoffeeRelatedText } from '../src/services/ocrServices';

describe('isCoffeeRelatedText', () => {
  it('returns true for direct coffee keywords', () => {
    expect(isCoffeeRelatedText('Toto je balík kávy Espresso')).toBe(true);
    expect(isCoffeeRelatedText('Premium COFFEE beans')).toBe(true);
  });

  it('returns true for keyword combinations', () => {
    expect(isCoffeeRelatedText('Balik kav Arabica 250g')).toBe(true);
    expect(isCoffeeRelatedText('Family pack instant coffee 3v1')).toBe(true);
  });

  it('returns false for unrelated text', () => {
    expect(isCoffeeRelatedText('čajová súprava a hrnček')).toBe(false);
    expect(isCoffeeRelatedText('balik cestovin a ryža')).toBe(false);
  });
});
