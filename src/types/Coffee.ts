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
