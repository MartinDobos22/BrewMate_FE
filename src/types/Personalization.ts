/*
 * Komplexné typy pre personalizačný ekosystém BrewMate.
 * Všetky výpočty prebiehajú lokálne v zariadení používateľa.
 */

export type TasteDimension = 'sweetness' | 'acidity' | 'bitterness' | 'body';

export interface TasteProfileVector {
  sweetness: number;
  acidity: number;
  bitterness: number;
  body: number;
}

export interface FlavorNotePreferences {
  [note: string]: number;
}

export interface MilkPreferences {
  types: string[];
  texture: string;
}

export interface SeasonalAdjustment {
  /** Mesiac v tvare YYYY-MM alebo názov sezóny (napr. 'jar'). */
  key: string;
  delta: Partial<TasteProfileVector>;
  lastApplied: string;
}

export interface UserTasteProfile {
  userId: string;
  preferences: TasteProfileVector;
  flavorNotes: FlavorNotePreferences;
  milkPreferences: MilkPreferences;
  caffeineSensitivity: 'low' | 'medium' | 'high';
  preferredStrength: 'light' | 'balanced' | 'strong';
  seasonalAdjustments: SeasonalAdjustment[];
  preferenceConfidence: number;
  lastRecalculatedAt: string;
  updatedAt: string;
}

export interface BeansDescriptor {
  name: string;
  origin?: string;
  roastLevel?: string;
  roastDate?: string;
}

export interface WeatherContext {
  condition: string;
  temperatureC?: number;
  humidity?: number;
  windSpeed?: number;
  /** Ďalšie detaily v raw podobe. */
  raw?: Record<string, unknown>;
}

export interface BrewContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  weekday?: number;
  weather?: WeatherContext;
  location?: {
    latitude: number;
    longitude: number;
  };
  moodBefore?: string;
  moodAfter?: string;
}

export interface BrewHistoryEntry {
  id: string;
  userId: string;
  recipeId?: string;
  beans?: BeansDescriptor;
  grindSize?: string;
  waterTemp?: number;
  brewTimeSeconds?: number;
  rating: number; // 1-5
  tasteFeedback?: Partial<TasteProfileVector>;
  flavorNotes?: FlavorNotePreferences;
  context?: BrewContext;
  modifications?: string[];
  createdAt: string;
  updatedAt: string;
}

export type LearningEventType = 'liked' | 'disliked' | 'favorited' | 'repeated' | 'shared';

export interface LearningEvent {
  id: string;
  userId: string;
  brewHistoryId?: string;
  eventType: LearningEventType;
  eventWeight: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RecipeProfile {
  recipeId: string;
  tasteVector: TasteProfileVector;
  flavorNotes: FlavorNotePreferences;
  brewMethod?: string;
  tags?: string[];
}

export interface CommunityFlavorStats {
  [flavor: string]: {
    average: number;
    variance: number;
    sampleSize: number;
  };
}

export interface PredictionContext {
  timeOfDay?: BrewContext['timeOfDay'];
  weather?: WeatherContext;
  weekday?: number;
  anticipatedMood?: string;
}

export interface PredictionResult {
  recipeId: string;
  predictedRating: number;
  confidence: number;
  contributingRecipes: string[];
  contextBonuses: string[];
}

export interface NotificationChannel {
  scheduleNotification: (options: {
    id: string;
    title: string;
    message: string;
    date: Date;
    payload?: Record<string, unknown>;
  }) => Promise<void>;
  cancelNotification: (id: string) => Promise<void>;
}

export interface WeatherProvider {
  getWeather: (location?: BrewContext['location']) => Promise<WeatherContext | undefined>;
}

export interface CalendarProvider {
  getNextWakeUpTime: () => Promise<Date>;
  getWeekdayPlan: (weekday: number) => Promise<'light' | 'balanced' | 'strong' | undefined>;
}

export interface DiaryStorageAdapter {
  saveEntry: (entry: BrewHistoryEntry) => Promise<void>;
  getEntries: (userId: string, options?: { since?: Date }) => Promise<BrewHistoryEntry[]>;
  deleteEntries?: (userId: string) => Promise<void>;
}

export interface LearningStorageAdapter {
  loadProfile: (userId: string) => Promise<UserTasteProfile | null>;
  persistProfile: (profile: UserTasteProfile) => Promise<void>;
  fetchRecentHistory: (userId: string, limit?: number) => Promise<BrewHistoryEntry[]>;
  fetchRecipeProfile: (recipeId: string) => Promise<RecipeProfile | null>;
  fetchSimilarRecipes?: (userId: string, recipeId: string, limit?: number) => Promise<RecipeProfile[]>;
  fetchCommunityFlavorStats?: () => Promise<CommunityFlavorStats>;
}

export interface TrackingPreferences {
  analytics: boolean;
  autoTracking: boolean;
  notificationPersonalization: boolean;
  communityInsights: boolean;
}

export interface ExportPayload {
  profile?: UserTasteProfile | null;
  history?: BrewHistoryEntry[];
  events?: LearningEvent[];
  diaryEntries?: BrewHistoryEntry[];
}
