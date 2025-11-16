export type BrewDevice = 'V60' | 'Aeropress' | 'Espresso' | 'FrenchPress' | 'ColdBrew';

export const BREW_DEVICES: BrewDevice[] = ['V60', 'Aeropress', 'Espresso', 'FrenchPress', 'ColdBrew'];

export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  brewDevice: BrewDevice;
}
