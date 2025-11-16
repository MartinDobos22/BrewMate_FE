import { formatRecipeSteps } from '../components/utils/AITextFormatter';
import type {
  BrewDevice,
  Recipe,
  RecipeDetail,
  RecipeParameters,
  RecipeStepDetail,
} from '../types/Recipe';
import { BREW_DEVICES } from '../types/Recipe';

const STEP_LABELS: Record<string, string> = {
  hero: 'Úvod',
  ingredients: 'Ingrediencie',
  equipment: 'Náčinie',
  grind: 'Mletie',
  heat: 'Zahrievanie',
  bloom: 'Bloom',
  pour1: 'Prvé liatie',
  pour2: 'Druhé liatie',
  finish: 'Dokončenie',
  summary: 'Zhrnutie',
};

const DEFAULT_DEVICE: BrewDevice = 'V60';

const normalizeDevice = (device?: string): BrewDevice => {
  if (!device) {
    return DEFAULT_DEVICE;
  }
  const normalizedInput = device.replace(/\s+/g, '').toLowerCase();
  const matched = BREW_DEVICES.find(
    (option) => option.replace(/\s+/g, '').toLowerCase() === normalizedInput,
  );
  return matched ?? DEFAULT_DEVICE;
};

const formatDuration = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const extractParametersFromText = (
  instructions: string,
  steps: RecipeStepDetail[],
): RecipeParameters => {
  const text = instructions.toLowerCase();
  const parameters: RecipeParameters = {};

  const doseMatch = instructions.match(/(\d{1,3})\s*(g|gram|gramov)/i);
  if (doseMatch) {
    parameters.dose = `${doseMatch[1]} g`;
  }

  const ratioMatch = instructions.match(/(\d{1,2})\s*:\s*(\d{1,3})/);
  if (ratioMatch) {
    parameters.ratio = `${ratioMatch[1]}:${ratioMatch[2]}`;
  }

  const tempMatch = instructions.match(/(\d{2,3})\s*°\s*[Cc]/);
  if (tempMatch) {
    parameters.temperature = `${tempMatch[1]}°C`;
  }

  const minuteMatch = instructions.match(/(\d{1,2})\s*(min|minút|minúty|minuty)/i);
  if (minuteMatch) {
    parameters.time = `${minuteMatch[1]} min`;
  } else {
    const secondMatch = instructions.match(/(\d{1,3})\s*(sek|sec|s)/i);
    if (secondMatch) {
      parameters.time = `${secondMatch[1]} s`;
    }
  }

  if (!parameters.time) {
    const totalDuration = steps.reduce((acc, step) => acc + (step.durationSeconds ?? 0), 0);
    if (totalDuration > 0) {
      parameters.time = formatDuration(totalDuration);
    }
  }

  if (!parameters.dose) {
    const doseHint = text.includes('dávka') ? '—' : undefined;
    if (doseHint) {
      parameters.dose = doseHint;
    }
  }

  return parameters;
};

const extractNotesFromText = (instructions: string): string[] | undefined => {
  const lines = instructions.split('\n');
  const notes = lines
    .map((line) => line.trim())
    .filter((line) => /tip|poznámk|pozn\.|💡/i.test(line));
  return notes.length > 0 ? notes : undefined;
};

const createSteps = (instructions: string): RecipeStepDetail[] => {
  const parsed = formatRecipeSteps(instructions);
  if (parsed.length === 0) {
    return [
      {
        id: 'step-1',
        order: 1,
        description: instructions,
      },
    ];
  }

  return parsed.map((step) => ({
    id: `step-${step.number}`,
    order: step.number,
    title: step.type ? STEP_LABELS[step.type] ?? undefined : undefined,
    description: step.text,
    durationSeconds: step.time,
  }));
};

export interface RecipeDetailInput
  extends Pick<Recipe, 'title' | 'instructions'>,
    Partial<Omit<RecipeDetail, 'title' | 'instructions'>> {
  id?: string;
  brewDevice?: string | BrewDevice;
}

export interface RecipeTextPayload {
  id?: string;
  text: string;
  title?: string;
  brewDevice?: string;
  method?: string;
  parameters?: RecipeParameters;
  notes?: string[];
  source?: RecipeDetail['source'];
}

export const buildRecipeDetail = (input: RecipeDetailInput): RecipeDetail => {
  const steps = input.steps ?? createSteps(input.instructions);
  const recipeId = input.id ?? `recipe-${Date.now()}`;
  const baseTitle = input.title?.trim().length ? input.title.trim() : 'Recept BrewMate';
  const normalizedDevice = normalizeDevice(
    typeof input.brewDevice === 'string' ? input.brewDevice : input.brewDevice ?? DEFAULT_DEVICE,
  );

  const parameters = input.parameters ?? extractParametersFromText(input.instructions, steps);

  return {
    id: recipeId,
    title: baseTitle,
    instructions: input.instructions,
    brewDevice: normalizedDevice,
    description: input.description,
    parameters,
    steps,
    notes: input.notes ?? extractNotesFromText(input.instructions),
    rating: input.rating,
    liked: input.liked,
    source: input.source,
  };
};

export const recipeTextToDetail = (payload: RecipeTextPayload): RecipeDetail => {
  return buildRecipeDetail({
    id: payload.id,
    title: payload.title ?? (payload.method ? `${payload.method} recept` : 'Personalizovaný recept'),
    instructions: payload.text,
    brewDevice: payload.brewDevice ?? payload.method,
    parameters: payload.parameters,
    notes: payload.notes,
    source: payload.source ?? 'ai',
  });
};
