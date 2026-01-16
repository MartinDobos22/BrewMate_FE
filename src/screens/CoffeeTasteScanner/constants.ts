import type { StructuredFieldKey } from './types';

export const WELCOME_GRADIENT = ['#FF9966', '#A86B8C'];
export const COFFEE_GRADIENT = ['#8B6544', '#6B4423'];
export const WARM_GRADIENT = ['#FFA000', '#FF6B6B'];

export const FLAVOR_KEYWORDS = [
  { keyword: 'kvet', label: '🌺 Kvetinová' },
  { keyword: 'citr', label: '🍋 Citrusová' },
  { keyword: 'brosky', label: '🍑 Broskyňa' },
  { keyword: 'med', label: '🍯 Medová' },
  { keyword: 'čaj', label: '🍵 Čajová' },
  { keyword: 'čokol', label: '🍫 Čokoládová' },
  { keyword: 'karamel', label: '🍮 Karamelová' },
  { keyword: 'ovoc', label: '🍒 Ovocná' },
];

export const MAX_IMAGE_DIMENSION = 1600;
export const IMAGE_QUALITY = 0.75;
export const MAX_BASE64_LENGTH = 1300000;

export const STRUCTURED_CONFIDENCE_KEYS: Record<StructuredFieldKey, string[]> = {
  roaster: ['roaster', 'roaster_name', 'brand'],
  origin: ['origin'],
  roastLevel: ['roastLevel', 'roast_level'],
  processing: ['processing', 'process'],
  flavorNotes: ['flavorNotes', 'flavor_notes', 'notes'],
  roastDate: ['roastDate', 'roast_date'],
  varietals: ['varietals', 'variety', 'varieties'],
};

export const STRUCTURED_FIELD_LABELS: Record<StructuredFieldKey, string> = {
  roaster: 'Pražiareň',
  origin: 'Pôvod',
  roastLevel: 'Stupeň praženia',
  processing: 'Spracovanie',
  flavorNotes: 'Chuťové tóny',
  roastDate: 'Dátum praženia',
  varietals: 'Odrody',
};

export const STRUCTURED_FIELD_ORDER: Array<{
  key: StructuredFieldKey;
  type: 'text' | 'list';
  placeholder: string;
}> = [
  { key: 'roaster', type: 'text', placeholder: 'Napr. pražiareň alebo brand' },
  { key: 'origin', type: 'text', placeholder: 'Napr. krajina alebo región pôvodu' },
  { key: 'roastLevel', type: 'text', placeholder: 'Napr. light, medium, dark' },
  { key: 'processing', type: 'text', placeholder: 'Napr. washed, natural, honey' },
  { key: 'flavorNotes', type: 'list', placeholder: 'Oddeluj čiarkou: čokoláda, čerešňa' },
  { key: 'roastDate', type: 'text', placeholder: 'Napr. 12.02.2024' },
  { key: 'varietals', type: 'list', placeholder: 'Oddeluj čiarkou: Bourbon, Typica' },
];
