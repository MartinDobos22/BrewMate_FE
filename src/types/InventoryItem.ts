export interface InventoryItem {
  id: string;
  coffeeName: string;
  gramsLeft: number;
  dailyUsage: number;
  reminderDate?: string;
}
