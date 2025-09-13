export enum BrewDevice {
  V60 = 'V60',
  Aeropress = 'Aeropress',
  Espresso = 'Espresso',
  FrenchPress = 'FrenchPress',
  Chemex = 'Chemex',
  Other = 'Other',
}

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
