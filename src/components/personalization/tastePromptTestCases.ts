/**
 * Manuálne testy promptov pre chuťový dotazník.
 *
 * Slúžia na rýchle overenie, že AI výstup reaguje na zmeny profilu a
 * že obsahuje personalizované, akčné odporúčania v slovenčine.
 */
export interface TastePromptTestCase {
  name: string;
  tasteVector: {
    acidity: number;
    bitterness: number;
    sweetness: number;
    body: number;
    intensity: number;
    experimentalism: number;
  };
  expectedTraits: string[];
}

export const TASTE_PROMPT_TEST_CASES: TastePromptTestCase[] = [
  {
    name: 'Sladký a krémový profil',
    tasteVector: {
      acidity: 0.2,
      bitterness: 0.25,
      sweetness: 0.8,
      body: 0.75,
      intensity: 0.45,
      experimentalism: 0.25,
    },
    expectedTraits: [
      'zdôrazni vyššiu sladkosť a plné telo',
      'odporúčaj jemné praženie alebo mliečne varianty',
      'nízka acidita a horkosť',
    ],
  },
  {
    name: 'Ovocný experimentátor',
    tasteVector: {
      acidity: 0.8,
      bitterness: 0.35,
      sweetness: 0.45,
      body: 0.35,
      intensity: 0.4,
      experimentalism: 0.9,
    },
    expectedTraits: [
      'spomenúť vyššiu aciditu a chuť na ovocné tóny',
      'navrhnúť experimentálne metódy alebo svetlé praženie',
      'vyššia otvorenosť novým chutiam',
    ],
  },
  {
    name: 'Silný, horkejší profil',
    tasteVector: {
      acidity: 0.3,
      bitterness: 0.8,
      sweetness: 0.3,
      body: 0.7,
      intensity: 0.85,
      experimentalism: 0.4,
    },
    expectedTraits: [
      'zdôrazni vysokú intenzitu a horkosť',
      'spomenúť robustnejšie praženie a plné telo',
      'nižšia sladkosť',
    ],
  },
  {
    name: 'Vyvážený profil (bez extrémov)',
    tasteVector: {
      acidity: 0.5,
      bitterness: 0.5,
      sweetness: 0.5,
      body: 0.5,
      intensity: 0.5,
      experimentalism: 0.5,
    },
    expectedTraits: [
      'popíš profil ako vyvážený',
      'navrhni postupné dolaďovanie podľa ďalších degustácií',
      'žiadne výrazné extrémy',
    ],
  },
];
