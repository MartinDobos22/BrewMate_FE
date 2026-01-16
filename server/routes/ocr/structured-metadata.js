import axios from 'axios';

const parseStructuredResponseJson = (content) => {
  if (!content || typeof content !== 'string') {
    return null;
  }
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
};

const extractStructuredMetadataFromText = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { structured_metadata: null, structured_confidence: null };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { structured_metadata: null, structured_confidence: null };
  }

  const prompt = `Z OCR textu extrahuj štruktúrované údaje o káve.
Vráť JSON s dvomi kľúčmi: structured_metadata a structured_confidence.
structured_metadata musí obsahovať presne tieto kľúče:
name, roast_level, processing, origin, varietals, flavor_notes, roaster, roast_date, coffee_type, weight, brew_methods.
Použi null, ak hodnota nie je z textu jasná. Odrody (varietals), flavor_notes a brew_methods vráť ako pole stringov.
structured_confidence má rovnaké kľúče a obsahuje číslo 0 až 1 alebo null podľa istoty.
Nepridávaj ďalší text, iba čistý JSON.

OCR text:
${text}`;

  try {
    console.log('📤 [OpenAI] Structured metadata prompt meta:', {
      model: 'gpt-4o',
      chars: prompt.length,
    });
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Si expert na kávu. Extrahuješ štruktúrované údaje z OCR textu etikiet kávy.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 [OpenAI] Structured metadata response meta:', {
      id: response.data?.id,
      model: response.data?.model,
      usage: response.data?.usage,
    });

    const content = response.data?.choices?.[0]?.message?.content || '';
    const parsed = parseStructuredResponseJson(content);
    if (!parsed || typeof parsed !== 'object') {
      return { structured_metadata: null, structured_confidence: null };
    }

    const structuredMetadata =
      parsed.structured_metadata ||
      parsed.structuredMetadata ||
      parsed.metadata ||
      parsed.data ||
      null;
    const structuredConfidence =
      parsed.structured_confidence ||
      parsed.structuredConfidence ||
      parsed.confidence ||
      null;

    const resolvedMetadata =
      structuredMetadata && typeof structuredMetadata === 'object'
        ? structuredMetadata
        : parsed;
    const resolvedConfidence =
      structuredConfidence && typeof structuredConfidence === 'object'
        ? structuredConfidence
        : null;

    return {
      structured_metadata: resolvedMetadata,
      structured_confidence: resolvedConfidence,
    };
  } catch (error) {
    console.error('Structured metadata AI error:', error?.message ?? error);
    return { structured_metadata: null, structured_confidence: null };
  }
};

export { extractStructuredMetadataFromText, parseStructuredResponseJson };
