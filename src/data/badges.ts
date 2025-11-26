/**
 * Describes a gamification badge displayed to users based on their in-app activity.
 *
 * @typedef {object} Badge
 * @property {string} id - Unique identifier used to track progress and unlock state.
 * @property {string} title - Human-readable name shown in badge lists.
 * @property {string} description - Short explanation of the action required to earn the badge.
 * @property {string} icon - Emoji or asset reference used as the badge visual.
 * @property {{ type: 'scan' | 'recipe', count: number, device?: string }} criteria -
 * A rule describing which event type and count unlocks the badge; device narrows recipe badges
 * to a specific brew method when present.
 */
export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // placeholder string or path to icon
  criteria: {
    type: 'scan' | 'recipe';
    count: number;
    device?: string;
  };
}

/**
 * Static catalog of all available badges used by the gamification layer to determine earned rewards.
 * The array is consumed by badge services and profile views to render progress and achievements.
 *
 * @type {Badge[]}
 */
export const badges: Badge[] = [
  {
    id: 'scan_10',
    title: 'Skener Nováčik',
    description: 'Vykonaj 10 skenov kávy',
    icon: '🔍',
    criteria: { type: 'scan', count: 10 },
  },
  {
    id: 'scan_50',
    title: 'Skener Expert',
    description: 'Vykonaj 50 skenov kávy',
    icon: '🔎',
    criteria: { type: 'scan', count: 50 },
  },
  {
    id: 'recipe_espresso_5',
    title: 'Espresso Učeň',
    description: 'Dokonči 5 espresso receptov',
    icon: '☕',
    criteria: { type: 'recipe', device: 'espresso', count: 5 },
  },
  {
    id: 'recipe_pourover_10',
    title: 'Pour Over Majster',
    description: 'Dokonči 10 pour-over receptov',
    icon: '🫖',
    criteria: { type: 'recipe', device: 'pourover', count: 10 },
  },
  {
    id: 'all_rounder',
    title: 'Všestranný Barista',
    description: 'Dosiahni 20 skenov a 20 receptov',
    icon: '🏆',
    criteria: { type: 'scan', count: 20 }, // additional check in code for recipes
  },
];
