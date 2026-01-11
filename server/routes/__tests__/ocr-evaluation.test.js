import {
  formatTasteProfileSummary,
  isValidEvaluationResponse,
  resolveCorrectedText,
} from '../ocr.js';

describe('isValidEvaluationResponse', () => {
  it('accepts a valid evaluation response', () => {
    const response = {
      status: 'ok',
      verdict: 'suitable',
      confidence: 0.82,
      verdict_explanation: {
        user_preferences_summary: 'Používateľ preferuje sladšie kávy.',
        coffee_profile_summary: 'Káva má ovocné tóny a strednú aciditu.',
        comparison_summary: 'Profil kávy zodpovedá preferenciám.',
      },
      insight: {
        headline: 'Dobrá zhoda',
        why: ['Profil kávy zapadá do preferencií.'],
        what_youll_like: ['Jemná sladkosť a ovocné tóny.'],
        what_might_bother_you: [],
        how_to_brew_for_better_match: ['Skús kratšiu extrakciu.'],
        recommended_alternatives: [],
      },
      disclaimer: 'Vyhodnotenie je orientačné.',
    };

    expect(isValidEvaluationResponse(response)).toBe(true);
  });

  it('rejects responses that violate the schema rules', () => {
    const response = {
      status: 'ok',
      verdict: null,
      confidence: null,
      verdict_explanation: {
        user_preferences_summary: 'Chýba verdict.',
        coffee_profile_summary: 'Chýba verdict.',
        comparison_summary: 'Chýba verdict.',
      },
      insight: {
        headline: 'Neplatné',
        why: ['Nesprávne hodnotenie.'],
        what_youll_like: [],
        what_might_bother_you: [],
        how_to_brew_for_better_match: [],
        recommended_alternatives: [],
      },
      disclaimer: 'Neplatné hodnotenie.',
    };

    expect(isValidEvaluationResponse(response)).toBe(false);
  });

  it('accepts insufficient coffee data responses without verdicts', () => {
    const response = {
      status: 'insufficient_coffee_data',
      verdict: null,
      confidence: null,
      verdict_explanation: {
        user_preferences_summary: 'Tvoje preferencie sú uložené.',
        coffee_profile_summary: 'Profil kávy je neúplný.',
        comparison_summary: 'Porovnanie zatiaľ nie je možné.',
      },
      insight: {
        headline: 'Máme málo údajov',
        why: ['Chýbajú kľúčové informácie o káve.'],
        what_youll_like: [],
        what_might_bother_you: [],
        how_to_brew_for_better_match: ['Skús doplniť údaje o pôvode.'],
        recommended_alternatives: [],
      },
      disclaimer: 'Vyhodnotenie bude možné po doplnení údajov.',
    };

    expect(isValidEvaluationResponse(response)).toBe(true);
  });
});

describe('resolveCorrectedText', () => {
  it('falls back to coffee_attributes.corrected_text when top-level is null', () => {
    const resolved = resolveCorrectedText({
      corrected_text: null,
      coffee_attributes: { corrected_text: 'Valid fallback text.' },
    });

    expect(resolved).toBe('Valid fallback text.');
  });
});

describe('formatTasteProfileSummary', () => {
  it('includes intensity and experimentalism for a 6D taste vector', () => {
    const summary = formatTasteProfileSummary({
      taste_vector: {
        sweetness: 6,
        acidity: 5,
        bitterness: 4,
        body: 7,
        intensity: 8,
        experimentalism: 3,
      },
    });

    expect(summary).toContain('intenzita 8/10');
    expect(summary).toContain('experimentalnosť 3/10');
  });
});
