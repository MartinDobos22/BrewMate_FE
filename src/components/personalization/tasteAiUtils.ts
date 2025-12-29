export type TasteVector = {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  intensity: number;
  experimentalism: number;
};

export type TasteAIResponse = {
  ai_recommendation: string;
  taste_vector: TasteVector;
  confidence: number;
  explanations: string[];
  next_steps: string[];
  deltas: string[];
};

const TASTE_DIMENSIONS: Array<keyof TasteVector> = [
  'acidity',
  'bitterness',
  'sweetness',
  'body',
  'intensity',
  'experimentalism',
];

export const DEFAULT_TASTE_VECTOR: TasteVector = {
  acidity: 0.45,
  bitterness: 0.55,
  sweetness: 0.5,
  body: 0.55,
  intensity: 0.5,
  experimentalism: 0.35,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const coerceNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const coerceStringArray = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    return value.map(entry => String(entry)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|•|-|,/)
      .map(entry => entry.trim())
      .filter(Boolean);
  }
  return fallback;
};

const sanitizeTasteVector = (value: unknown, fallback: TasteVector): TasteVector => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const vector = value as Partial<Record<keyof TasteVector, unknown>>;
  const sanitized: TasteVector = { ...fallback };
  TASTE_DIMENSIONS.forEach(dimension => {
    sanitized[dimension] = clamp01(coerceNumber(vector[dimension], fallback[dimension]));
  });
  return sanitized;
};

export const buildFallbackAIResponse = (fallbackVector: TasteVector): TasteAIResponse => ({
  ai_recommendation:
    'Zatiaľ mám len základný obraz o tvojich preferenciách. Dotazník naznačuje vyvážený profil, takže odporúčam začať s klasickými chuťami a postupne dolaďovať.',
  taste_vector: fallbackVector,
  confidence: 0.6,
  explanations: [
    'Odpovede naznačujú strednú intenzitu a vyvážený profil bez extrémov.',
    'Bez silných signálov pre jasnú aciditu alebo horkosť odporúčam postupné testovanie.',
  ],
  next_steps: [
    'Skús jednu kávu s jemnejším pražením a sleduj, či ti vyhovuje acidita.',
    'Zapíš si, či preferuješ krémovejšie telo alebo čistý, ľahký profil.',
  ],
  deltas: [],
});

export const parseTasteAIResponse = (
  aiResponse: string | undefined,
  fallbackVector: TasteVector,
): { response: TasteAIResponse; warnings: string[] } => {
  const warnings: string[] = [];
  const fallback = buildFallbackAIResponse(fallbackVector);

  if (!aiResponse) {
    warnings.push('AI response missing');
    return { response: fallback, warnings };
  }

  try {
    const parsed = JSON.parse(aiResponse);
    const recommendation =
      typeof parsed?.ai_recommendation === 'string' && parsed.ai_recommendation.trim()
        ? parsed.ai_recommendation.trim()
        : fallback.ai_recommendation;
    const confidence = clamp01(coerceNumber(parsed?.confidence, fallback.confidence));
    const explanations = coerceStringArray(parsed?.explanations, fallback.explanations);
    const nextSteps = coerceStringArray(parsed?.next_steps, fallback.next_steps);
    const deltas = coerceStringArray(parsed?.deltas, fallback.deltas);
    const tasteVector = sanitizeTasteVector(parsed?.taste_vector, fallbackVector);

    return {
      response: {
        ai_recommendation: recommendation,
        confidence,
        explanations,
        next_steps: nextSteps,
        deltas,
        taste_vector: tasteVector,
      },
      warnings,
    };
  } catch (error) {
    warnings.push('AI response JSON parse failed');
    return { response: fallback, warnings };
  }
};

export const buildRecommendationText = (response: TasteAIResponse) => {
  const sections: string[] = [];
  sections.push(`Zhrnutie:\n${response.ai_recommendation}`);

  if (response.deltas.length > 0) {
    sections.push(`Zmeny oproti minule:\n- ${response.deltas.join('\n- ')}`);
  }

  if (response.explanations.length > 0) {
    sections.push(`Prečo:\n- ${response.explanations.join('\n- ')}`);
  }

  if (response.next_steps.length > 0) {
    sections.push(`Ďalšie kroky:\n- ${response.next_steps.join('\n- ')}`);
  }

  if (response.confidence < 0.85) {
    sections.push('Poznámka: Istota odporúčania je stredná – výsledok dolaď ďalšími kávami.');
  }

  return sections.join('\n\n');
};

export const TASTE_AI_RESPONSE_SCHEMA = {
  name: 'coffee_preference_profile',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ai_recommendation: {
        type: 'string',
      },
      taste_vector: {
        type: 'object',
        additionalProperties: false,
        properties: {
          acidity: { type: 'number', minimum: 0, maximum: 1 },
          bitterness: { type: 'number', minimum: 0, maximum: 1 },
          sweetness: { type: 'number', minimum: 0, maximum: 1 },
          body: { type: 'number', minimum: 0, maximum: 1 },
          intensity: { type: 'number', minimum: 0, maximum: 1 },
          experimentalism: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: [
          'acidity',
          'bitterness',
          'sweetness',
          'body',
          'intensity',
          'experimentalism',
        ],
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      explanations: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      next_steps: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      deltas: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'ai_recommendation',
      'taste_vector',
      'confidence',
      'explanations',
      'next_steps',
      'deltas',
    ],
  },
};

export const TASTE_AI_SCHEMA_PROMPT = `JSON schema (all fields required):
{
  "ai_recommendation": "string",
  "taste_vector": {
    "acidity": 0-1,
    "bitterness": 0-1,
    "sweetness": 0-1,
    "body": 0-1,
    "intensity": 0-1,
    "experimentalism": 0-1
  },
  "confidence": 0-1,
  "explanations": ["string", ...],
  "next_steps": ["string", ...],
  "deltas": ["string", ...]
}

Return JSON only.`;

export const callOpenAIJsonSchema = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
): Promise<string | undefined> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      response_format: {
        type: 'json_schema',
        json_schema: TASTE_AI_RESPONSE_SCHEMA,
      },
    }),
  });

  const data = await response.json();
  console.log('📥 [OpenAI] prefs response:', data);
  return data?.choices?.[0]?.message?.content?.trim();
};
