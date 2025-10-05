// src/utils/AITextFormatter.ts


/**
 * Rozdelí text z OpenAI na štruktúrované sekcie
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
 * Extrahuje dôležité hodnoty z textu
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
 * Formátuje recept na kroky
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

      steps.push({
        number: stepNumber++,
        text: content,
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(content)
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
      steps.push({
        number: index + 1,
        text: cleaned.replace(/^[-•*]\s*/, ''),
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(cleaned)
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
      steps.push({
        number: index + 1,
        text: normalized,
        time: timeMatch
          ? parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().startsWith('m') ? 60 : 1)
          : undefined,
        icon: getStepIcon(normalized)
      });
    });
  }

  return steps;
};

/**
 * Vráti ikonu pre krok receptu
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

  return '☕';
};

/**
 * Formátuje coffee evaluation/odporúčanie
 */
export const formatCoffeeRecommendation = (text: string): FormattedRecommendation => {
  const parsed = parseAIResponse(text);

  // Extrahuj match percentage ak existuje
  const matchMatch = text.match(/(\d+)\s*%\s*(zhoda|match)/i);
  const matchPercentage = matchMatch ? parseInt(matchMatch[1]) : null;

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
    matchPercentage,
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
}

export interface FormattedRecommendation {
  sections: Section[];
  matchPercentage: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}