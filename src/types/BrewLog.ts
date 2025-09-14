import { BrewDevice } from './Recipe';

export interface BrewLog {
  id: string;
  recipeId?: string;
  date: string;
  waterTemp: number;
  grindSize: string;
  coffeeDose: number;
  waterVolume: number;
  brewTime: string;
  notes: string;
  brewDevice: BrewDevice;
}

export type BrewLogs = BrewLog[];
