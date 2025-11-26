/**
 * Represents a coffee product returned from scans, recommendations, or inventory.
 *
 * @typedef {object} Coffee
 * @property {string} id - Unique identifier for the coffee item.
 * @property {string} name - Product or bean name displayed to users.
 * @property {string} [brand] - Coffee roaster or brand name.
 * @property {string} [origin] - Country or region of origin.
 * @property {number} [roastLevel] - Numeric roast level (e.g., 1-10) inferred from scans or metadata.
 * @property {number} [intensity] - Flavor intensity indicator used in UI summaries.
 * @property {string[]} [flavorNotes] - List of tasting notes associated with the coffee.
 * @property {number} [rating] - User or community rating score.
 * @property {number} [match] - Percentage match score versus the user's taste profile.
 * @property {string} [process] - Processing method such as washed or natural.
 * @property {string} [variety] - Bean variety information.
 * @property {boolean} [isFavorite] - Whether the user has favorited the coffee.
 */
export interface Coffee {
  id: string;
  name: string;
  brand?: string;
  origin?: string;
  roastLevel?: number;
  intensity?: number;
  flavorNotes?: string[];
  rating?: number;
  match?: number;
  process?: string;
  variety?: string;
  isFavorite?: boolean;
}
