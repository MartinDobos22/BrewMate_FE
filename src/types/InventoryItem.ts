/**
 * Represents a single coffee bag tracked in the inventory experience.
 *
 * @typedef {object} InventoryItem
 * @property {string} id - Unique identifier used to update or remove the item.
 * @property {string} coffeeName - Display name of the coffee bag.
 * @property {number} gramsLeft - Remaining coffee weight in grams for depletion tracking.
 * @property {number} dailyUsage - Estimated grams consumed per day to forecast depletion.
 * @property {string} [reminderDate] - Optional ISO date string for low-inventory reminders.
 */
export interface InventoryItem {
  id: string;
  coffeeName: string;
  gramsLeft: number;
  dailyUsage: number;
  reminderDate?: string;
}
