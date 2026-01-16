import type { StructuredCoffeeMetadata } from './services';

export type StructuredFieldKey = keyof Pick<
  StructuredCoffeeMetadata,
  'roaster' | 'origin' | 'roastLevel' | 'processing' | 'flavorNotes' | 'roastDate' | 'varietals'
>;
export type StructuredTextFieldKey = Exclude<StructuredFieldKey, 'flavorNotes' | 'varietals'>;
export type StructuredListFieldKey = Extract<StructuredFieldKey, 'flavorNotes' | 'varietals'>;

export type StructuredFieldState<T> = {
  value: T;
  isAutoFilled: boolean;
  confidence: number | null;
  warning: string | null;
};

export type StructuredTextFieldState = StructuredFieldState<string | null>;
export type StructuredListFieldState = StructuredFieldState<string[] | null>;

export interface StructuredFieldsState {
  roaster: StructuredTextFieldState;
  origin: StructuredTextFieldState;
  roastLevel: StructuredTextFieldState;
  processing: StructuredTextFieldState;
  flavorNotes: StructuredListFieldState;
  roastDate: StructuredTextFieldState;
  varietals: StructuredListFieldState;
}
