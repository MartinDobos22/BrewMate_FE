import { BrewDevice } from './Recipe';

/**
 * Log entry capturing a single brewing session for analytics and journaling.
 *
 * @typedef {object} BrewLog
 * @property {string} id - Unique identifier generated for the log entry.
 * @property {string} [recipeId] - Optional recipe reference used to prepare the brew.
 * @property {string} date - ISO string representing when the brew was created.
 * @property {number} waterTemp - Target water temperature in Celsius used for extraction.
 * @property {string} grindSize - Freeform grind size description such as "medium-fine".
 * @property {number} coffeeDose - Amount of coffee grounds used, measured in grams.
 * @property {number} waterVolume - Water volume in milliliters used during brewing.
 * @property {string} brewTime - Total brew duration in human-readable format (e.g., "03:30").
 * @property {string} notes - Tasting or process notes added by the user.
 * @property {import('./Recipe').BrewDevice} brewDevice - Brewing device used for the session.
 */
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

/**
 * Convenience alias for collections of brew log entries used in history screens.
 *
 * @typedef {BrewLog[]} BrewLogs
 */
export type BrewLogs = BrewLog[];
