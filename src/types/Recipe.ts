export type BrewDevice = 'V60' | 'Aeropress' | 'Espresso' | 'FrenchPress' | 'ColdBrew';

export const BREW_DEVICES: BrewDevice[] = ['V60', 'Aeropress', 'Espresso', 'FrenchPress', 'ColdBrew'];

export interface RecipeParameters {
  dose?: string;
  ratio?: string;
  temperature?: string;
  time?: string;
}

export interface RecipeStepDetail {
  id: string;
  order: number;
  title?: string;
  description: string;
  durationSeconds?: number;
}

export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  brewDevice: BrewDevice;
  description?: string;
  parameters?: RecipeParameters;
  steps?: RecipeStepDetail[];
  notes?: string[];
  rating?: number;
  liked?: boolean;
  source?: 'catalog' | 'history' | 'ai';
}

export type RecipeDetail = Recipe;
