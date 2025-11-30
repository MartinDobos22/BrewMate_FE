/**
 * Supported brew methods available throughout the recipe creator and timers.
 */
export type BrewDevice = 'V60' | 'Aeropress' | 'Espresso' | 'FrenchPress' | 'ColdBrew';

/**
 * Convenience list of brew devices used for pickers and validation logic.
 *
 * @type {BrewDevice[]}
 */
export const BREW_DEVICES: BrewDevice[] = ['V60', 'Aeropress', 'Espresso', 'FrenchPress', 'ColdBrew'];

/**
 * Represents a coffee brewing recipe exposed in community feeds and saved recipes.
 *
 * @typedef {object} Recipe
 * @property {string} id - Unique identifier persisted in Supabase.
 * @property {string} title - Human readable recipe name shown in lists.
 * @property {string} instructions - Freeform preparation steps or markdown instructions.
 * @property {BrewDevice} brewDevice - Brewing device type the recipe is optimized for.
 */
export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  brewDevice: BrewDevice;
}
