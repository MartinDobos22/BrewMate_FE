// src/utils/AITextFormatter.ts


/**
 * Parses a free-form AI response into structured sections with optional emojis, bullets, and highlights.
 *
 * Attempts to detect headings, bullet points, and brewing parameters (temperature, time, ratios) so that
 * downstream UI components can render them in a rich layout.
 *
 * @param {string} text - Raw message from the AI model; may contain emoji headers, numbered lists, or plain text.
 * @returns {ParsedContent} Structured representation containing extracted sections.
 */
export const parseAIResponse = (text: string): ParsedContent => {
  if (!text) return { sections: [] };

  const sections: Section[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  let currentSection: Section | null = null;

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Detekcia hlavičiek s emoji alebo číslami
    if (/^[🎯☕🔥💡⚠️✨📝🌟🏆👍]/.test(trimmedLine) || /^\d+\./.test(trimmedLine)) {
      if (currentSection) sections.push(currentSection);

      const emoji = trimmedLine.match(/^[🎯☕🔥💡⚠️✨📝🌟🏆👍]/)?.[0];
      const title = trimmedLine.replace(/^[🎯☕🔥💡⚠️✨📝🌟🏆👍]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-•]\s*/, '');

      currentSection = {
        type: 'section',
        emoji,
        title: title.split(':')[0].trim(),
        content: title.includes(':') ? [title.split(':').slice(1).join(':').trim()] : [],
        bullets: []
      };
    }
    // Detekcia odrážok
    else if (/^[-•*]/.test(trimmedLine)) {
      const bulletText = trimmedLine.replace(/^[-•*]\s*/, '');
      if (currentSection) {
        currentSection.bullets.push(bulletText);
      } else {
        currentSection = {
          type: 'section',
          title: '',
          content: [],
          bullets: [bulletText]
        };
      }
    }
    // Detekcia dôležitých parametrov (teplota, čas, pomer)
    else if (/(\d+°C|\d+\s*min|\d+:\d+|\d+g|\d+ml)/i.test(trimmedLine)) {
      if (!currentSection) {
        currentSection = {
          type: 'section',
          title: '',
          content: [],
          bullets: []
        };
      }
      currentSection.highlights = currentSection.highlights || [];
      currentSection.highlights.push(extractHighlight(trimmedLine));
    }
    // Obyčajný text
    else {
      if (!currentSection) {
        currentSection = {
          type: 'section',
          title: '',
          content: [trimmedLine],
          bullets: []
        };
      } else {
        currentSection.content.push(trimmedLine);
      }
    }
  });

  if (currentSection) sections.push(currentSection);

  return { sections };
};

/**
 * Extracts highlighted brewing metrics such as temperature, time, ratio, weight, or volume from a string.
 *
 * @param {string} text - Line of text potentially containing brewing parameters.
 * @returns {Highlight} Identified highlight with a type and label; defaults to a text highlight when no metric is found.
 */
const extractHighlight = (text: string): Highlight => {
  const tempMatch = text.match(/(\d+)°C/);
  const timeMatch = text.match(/(\d+)\s*(min|sek|s)/i);
  const ratioMatch = text.match(/(\d+):(\d+)/);
  const weightMatch = text.match(/(\d+)\s*g/);
  const volumeMatch = text.match(/(\d+)\s*ml/);

  if (tempMatch) {
    return { type: 'temperature', value: tempMatch[0], label: 'Teplota' };
  }
  if (timeMatch) {
    return { type: 'time', value: timeMatch[0], label: 'Čas' };
  }
  if (ratioMatch) {
    return { type: 'ratio', value: ratioMatch[0], label: 'Pomer' };
  }
  if (weightMatch) {
    return { type: 'weight', value: weightMatch[0], label: 'Váha' };
  }
  if (volumeMatch) {
    return { type: 'volume', value: volumeMatch[0], label: 'Objem' };
  }

  return { type: 'text', value: text, label: '' };
};

/**
 * Converts a recipe description into ordered steps with inferred metadata like time, icon, and tips.
 *
 * Supports numbered lists, bullet points, and sentence-based parsing when no explicit structure is present.
 *
 * @param {string} recipe - Free-form recipe text to segment into actionable steps.
 * @returns {RecipeStep[]} Array of structured recipe steps ready for timeline visualization.
 */
export const formatRecipeSteps = (recipe: string): RecipeStep[] => {
  const steps: RecipeStep[] = [];
  const lines = recipe.split('\n').filter(line => line.trim());

  let stepNumber = 1;
  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Detekcia krokov (číslované, pomenované alebo odrážkové)
    const isNumberedStep = /^\d+[.)]\s*/.test(trimmedLine);
    const isNamedStep = /^Krok\s+\d+/i.test(trimmedLine) || /^Step\s+\d+/i.test(trimmedLine);
    const isBulletStep = /^[-•*]\s+/.test(trimmedLine);

    if (isNumberedStep || isNamedStep || isBulletStep) {
      const content = trimmedLine
        .replace(/^\d+[.)]\s*/, '')
        .replace(/^Krok\s+\d+:?\s*/i, '')
        .replace(/^Step\s+\d+:?\s*/i, '')
        .replace(/^[-•*]\s*/, '')
        .trim();

      if (content.length === 0) {
        return;
      }

      const timeMatch = content.match(/(\d+)\s*(min|sek|s)/i);

      const stepType = getStepType(content, stepNumber - 1, lines.length);
      steps.push({
        number: stepNumber++,
        text: content,
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(content),
        type: stepType,
        tip: getBaristaTip(stepType),
      });
    }
  });

  // Ak nie sú očíslované kroky, rozdeľ po vetách
  if (steps.length === 0) {
    const sentences = recipe.split(/[.!?]+/).filter(s => s.trim().length > 3);
    sentences.forEach((sentence, index) => {
      const cleaned = sentence.trim();
      if (!cleaned) {
        return;
      }

      const timeMatch = cleaned.match(/(\d+)\s*(min|sek|s)/i);
      const stepType = getStepType(cleaned, index, sentences.length);
      steps.push({
        number: index + 1,
        text: cleaned.replace(/^[-•*]\s*/, ''),
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(cleaned),
        type: stepType,
        tip: getBaristaTip(stepType),
      });
    });
  }

  if (steps.length === 0 && lines.length > 0) {
    lines.forEach((line, index) => {
      const cleaned = line.trim();
      if (!cleaned) {
        return;
      }

      const normalized = cleaned
        .replace(/^\d+[.)]\s*/, '')
        .replace(/^Krok\s+\d+:?\s*/i, '')
        .replace(/^Step\s+\d+:?\s*/i, '')
        .replace(/^[-•*]\s*/, '')
        .trim();

      if (!normalized) {
        return;
      }

      const timeMatch = normalized.match(/(\d+)\s*(min|sek|s)/i);
      const stepType = getStepType(normalized, index, lines.length);
      steps.push({
        number: index + 1,
        text: normalized,
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(normalized),
        type: stepType,
        tip: getBaristaTip(stepType),
      });
    });
  }

  return steps;
};

/**
 * Determines an emoji icon representing the dominant action within a recipe step.
 *
 * @param {string} text - Step description used to match keyword groups.
 * @returns {string} Emoji string conveying the action category for the step.
 */
const getStepIcon = (text: string): string => {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('zomeľ') || lowerText.includes('mlieť')) return '⚙️';
  if (lowerText.includes('voda') || lowerText.includes('zohrej')) return '💧';
  if (lowerText.includes('nalej') || lowerText.includes('prelej')) return '🫗';
  if (lowerText.includes('čakaj') || lowerText.includes('nechaj')) return '⏱️';
  if (lowerText.includes('mieša') || lowerText.includes('zamiešaj')) return '🥄';
  if (lowerText.includes('filter') || lowerText.includes('papier')) return '📄';
  if (lowerText.includes('káva') || lowerText.includes('zrnk')) return '☕';
  if (lowerText.includes('váž') || lowerText.includes('gram')) return '⚖️';
  if (lowerText.includes('teplota') || lowerText.includes('°c')) return '🌡️';
  if (lowerText.includes('bloom') || lowerText.includes('kvit')) return '🌸';
  if (lowerText.includes('ingredien') || lowerText.includes('potrebuj')) return '🛒';
  if (lowerText.includes('náčin') || lowerText.includes('pripr')) return '🔧';

  return '☕';
};

/**
 * Infers the recipe step type from text content and position in the sequence.
 *
 * @param {string} text - Step text used for keyword detection.
 * @param {number} index - Zero-based position of the step.
 * @param {number} totalSteps - Total number of detected steps for identifying hero/summary steps.
 * @returns {RecipeStep['type']} Semantic step category used for styling and tips.
 */
const getStepType = (text: string, index: number, totalSteps: number): RecipeStep['type'] => {
  const lowerText = text.toLowerCase();

  if (index === 0) return 'hero';
  if (index === totalSteps - 1) return 'summary';
  if (lowerText.includes('ingredien') || lowerText.includes('potrebuj')) return 'ingredients';
  if (lowerText.includes('náčin') || lowerText.includes('pripr')) return 'equipment';
  if (lowerText.includes('zomeľ') || lowerText.includes('mlieť')) return 'grind';
  if (lowerText.includes('voda') || lowerText.includes('zohrej')) return 'heat';
  if (lowerText.includes('bloom') || lowerText.includes('kvit')) return 'bloom';
  if (lowerText.includes('dokončen') || lowerText.includes('finish')) return 'finish';
  if (lowerText.includes('nalej') || lowerText.includes('prelej')) {
    return index % 2 === 0 ? 'pour1' : 'pour2';
  }

  return 'pour1';
};

/**
 * Returns a contextual barista tip tailored to the provided step type.
 *
 * @param {RecipeStep['type']} type - Semantic step category.
 * @returns {string} Encouraging or instructional tip for the user.
 */
const getBaristaTip = (type: RecipeStep['type']): string => {
  const tips = {
    hero: 'Priprav sa na dokonalý šálku kávy',
    ingredients: 'Pomer 1:16 (káva:voda) je skvelý štartovací bod',
    equipment: 'Príprava náčinia vopred ušetrí čas a zlepší výsledok',
    grind: 'Stredné mletie = konzistencia morskej soli',
    heat: 'Ideálna teplota pre svetlé praženie: 92-94°C',
    bloom: 'Nalej 40ml vody v kruhu, nechaj 30s vypúšťať CO2',
    pour1: 'Lej pomaly v špirále od stredu k okrajom',
    pour2: 'Drž stabilnú rýchlosť - cca 10ml/s',
    finish: 'Celkový čas by mal byť 2:30 - 3:00 min',
    summary: 'Skús zmeniť pomer káva:voda a porovnaj chuť!',
  };

  return tips[type || 'pour1'] || 'Sleduj farbu a rytmus extrakcie';
};

/**
 * Parses and enriches an AI coffee recommendation with sentiment and match percentage signals.
 *
 * @param {string} text - AI-generated recommendation text block.
 * @returns {FormattedRecommendation} Structured recommendation including sections, sentiment, and optional match percentage.
 */
export const formatCoffeeRecommendation = (text: string): FormattedRecommendation => {
  const parsed = parseAIResponse(text);

  // Extrahuj match percentage ak existuje
  const matchMatch = text.match(/(\d+)\s*%\s*(zhoda|match)/i);
  const match_percentage = matchMatch ? parseInt(matchMatch[1]) : null;

  // Určí sentiment
  const positivePhrases = ['výborná', 'perfektná', 'ideálna', 'odporúčam', 'skvelá'];
  const negativePhrases = ['nevhodná', 'neodporúčam', 'slabá', 'príliš'];

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  const lowerText = text.toLowerCase();

  if (positivePhrases.some(phrase => lowerText.includes(phrase))) {
    sentiment = 'positive';
  } else if (negativePhrases.some(phrase => lowerText.includes(phrase))) {
    sentiment = 'negative';
  }

  return {
    sections: parsed.sections,
    match_percentage,
    sentiment,
    summary: parsed.sections[0]?.content[0] || text.substring(0, 100)
  };
};

// TypeScript types
export interface Section {
  type: 'section';
  emoji?: string;
  title: string;
  content: string[];
  bullets: string[];
  highlights?: Highlight[];
}

export interface Highlight {
  type: 'temperature' | 'time' | 'ratio' | 'weight' | 'volume' | 'text';
  value: string;
  label: string;
}

export interface ParsedContent {
  sections: Section[];
}

export interface RecipeStep {
  number: number;
  text: string;
  time?: number; // v sekundách
  icon: string;
  type?: 'hero' | 'ingredients' | 'equipment' | 'grind' | 'heat' | 'bloom' | 'pour1' | 'pour2' | 'finish' | 'summary';
  tip?: string; // Tip od baristu pre tento krok
}

export interface FormattedRecommendation {
  sections: Section[];
  match_percentage: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}
