import { differenceInMinutes, formatISO, isAfter, startOfWeek, startOfMonth } from 'date-fns';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';
import {
  BrewContext,
  BrewHistoryEntry,
  DiaryStorageAdapter,
  FlavorNotePreferences,
  LearningEvent,
} from '../types/Personalization';

export interface AudioEventAdapter {
  onGrinderDetected: (listener: () => void) => void;
  onExtractionDetected: (listener: () => void) => void;
  stop: () => void;
}

export interface LocationProvider {
  getCurrentLocation: () => Promise<BrewContext['location'] | undefined>;
}

export interface MoodEstimator {
  inferMood: () => Promise<string | undefined>;
}

export interface OCRAnalyzer {
  analyzeBrewSettings: (imageUri: string) => Promise<Partial<BrewHistoryEntry>>;
}

export interface CoffeeDiaryConfig {
  storage: DiaryStorageAdapter;
  audioAdapter?: AudioEventAdapter;
  locationProvider?: LocationProvider;
  moodEstimator?: MoodEstimator;
  ocrAnalyzer?: OCRAnalyzer;
  learningEngine: PreferenceLearningEngine;
}

export interface QuickEntryPayload {
  beans?: string;
  grindSize?: string;
  waterTemp?: number;
  brewTimeSeconds?: number;
  flavorNotes?: FlavorNotePreferences;
  context?: BrewContext;
}

export interface DiaryInsights {
  weeklySummary: InsightSummary;
  monthlySummary: InsightSummary;
  bestMomentOfDay: string;
  dominantMethod?: string;
  moodImpact: MoodImpactInsight;
  skillProgression: SkillProgression;
}

export interface InsightSummary {
  averageRating: number;
  brewsCount: number;
  topFlavorNotes: string[];
}

export interface MoodImpactInsight {
  positiveMoods: string[];
  negativeMoods: string[];
  moodShiftScore: number;
}

export interface SkillProgression {
  trend: 'improving' | 'stable' | 'declining';
  slope: number;
}

/**
 * CoffeeDiary spája automatické sledovanie s analytickými náhľadmi.
 */
export class CoffeeDiary {
  private readonly storage: DiaryStorageAdapter;
  private readonly audioAdapter?: AudioEventAdapter;
  private readonly locationProvider?: LocationProvider;
  private readonly moodEstimator?: MoodEstimator;
  private readonly ocrAnalyzer?: OCRAnalyzer;
  private readonly learningEngine: PreferenceLearningEngine;

  private autoTrackingActive = false;

  constructor(config: CoffeeDiaryConfig) {
    this.storage = config.storage;
    this.audioAdapter = config.audioAdapter;
    this.locationProvider = config.locationProvider;
    this.moodEstimator = config.moodEstimator;
    this.ocrAnalyzer = config.ocrAnalyzer;
    this.learningEngine = config.learningEngine;
  }

  /**
   * Aktivuje detekciu prípravy na základe zvuku mlynčeka a extrakcie.
   */
  public enableAutoTracking(): void {
    if (!this.audioAdapter || this.autoTrackingActive) {
      return;
    }
    this.autoTrackingActive = true;
    this.audioAdapter.onGrinderDetected(async () => {
      const entry = await this.createQuickEntry('grinder');
      await this.persistAndLearn(entry, {
        id: `auto-${Date.now()}`,
        userId: entry.userId,
        eventType: 'repeated',
        eventWeight: 0.7,
        createdAt: entry.createdAt,
      } as LearningEvent);
    });

    this.audioAdapter.onExtractionDetected(async () => {
      const entry = await this.createQuickEntry('brew');
      await this.persistAndLearn(entry, {
        id: `auto-${Date.now()}-extraction`,
        userId: entry.userId,
        eventType: 'liked',
        eventWeight: 0.9,
        createdAt: entry.createdAt,
      } as LearningEvent);
    });
  }

  /**
   * Vypne senzory auto-trackingu.
   */
  public disableAutoTracking(): void {
    this.audioAdapter?.stop();
    this.autoTrackingActive = false;
  }

  /**
   * Pripraví predvyplnené údaje pre rýchly zápis.
   */
  public async createQuickEntry(trigger: 'manual' | 'grinder' | 'brew'): Promise<BrewHistoryEntry> {
    const now = new Date();
    const location = await this.locationProvider?.getCurrentLocation();
    const moodBefore = await this.moodEstimator?.inferMood();

    const quickPayload: QuickEntryPayload = {
      context: {
        timeOfDay: this.resolveTimeOfDay(now),
        weekday: this.getIsoWeekday(now),
        location,
        moodBefore,
      },
      brewTimeSeconds: trigger === 'grinder' ? 30 : trigger === 'brew' ? 180 : undefined,
    };

    return {
      id: `diary-${Date.now()}`,
      userId: this.learningEngine.getProfile()?.userId ?? 'local-user',
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
      rating: 0,
      ...quickPayload,
    };
  }

  public async addManualEntry(payload: {
    recipe: string;
    notes?: string;
    brewedAt?: Date | string;
    rating?: number;
    recipeId?: string;
    metadata?: Record<string, unknown>;
    context?: BrewContext;
  }): Promise<BrewHistoryEntry> {
    const now = payload.brewedAt ? new Date(payload.brewedAt) : new Date();
    const isoNow = formatISO(now);
    const baseContext: BrewContext = payload.context ?? {
      timeOfDay: this.resolveTimeOfDay(now),
      weekday: this.getIsoWeekday(now),
    };

    const context: BrewContext = {
      ...baseContext,
      metadata: {
        ...(baseContext.metadata ?? {}),
        ...(payload.metadata ?? {}),
      },
    };

    const modifications: string[] = [];
    if (payload.recipe) {
      modifications.push(`recipe:${payload.recipe}`);
    }
    if (payload.notes) {
      modifications.push(`note:${payload.notes}`);
    }
    if (payload.metadata) {
      Object.entries(payload.metadata).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        const normalizedValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        modifications.push(`meta:${key}=${normalizedValue}`.slice(0, 160));
      });
    }

    const entry: BrewHistoryEntry = {
      id: `manual-${Date.now()}`,
      userId: this.learningEngine.getProfile()?.userId ?? 'local-user',
      recipeId: payload.recipeId,
      rating: payload.rating ?? 0,
      flavorNotes: {},
      context,
      modifications,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    await this.persistEntry(entry);
    return entry;
  }

  /**
   * Spracuje fotografiu pomocou OCR a doplní nastavenia kávovaru.
   */
  public async processPhotoForEntry(imageUri: string): Promise<Partial<BrewHistoryEntry>> {
    if (!this.ocrAnalyzer) {
      throw new Error('OCR analyzátor nie je nakonfigurovaný');
    }
    try {
      return await this.ocrAnalyzer.analyzeBrewSettings(imageUri);
    } catch (error) {
      console.error('OCR zlyhalo', error);
      throw error;
    }
  }

  /**
   * Uloží zápis a notifikuje learning engine pre adaptáciu.
   */
  public async persistEntry(entry: BrewHistoryEntry, event?: LearningEvent): Promise<void> {
    await this.persistAndLearn(entry, event);
  }

  /**
   * Generuje týždenné a mesačné insighty vrátane nálady a progresu zručností.
   */
  public async generateInsights(userId: string): Promise<DiaryInsights> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const entries = await this.storage.getEntries(userId);
    const weeklyEntries = entries.filter((entry) => isAfter(new Date(entry.createdAt), weekStart));
    const monthlyEntries = entries.filter((entry) => isAfter(new Date(entry.createdAt), monthStart));

    const weeklySummary = this.buildSummary(weeklyEntries);
    const monthlySummary = this.buildSummary(monthlyEntries);

    const bestMoment = this.identifyBestMoment(entries);
    const dominantMethod = this.identifyDominantMethod(entries);
    const moodImpact = this.calculateMoodImpact(entries);
    const skillProgression = this.calculateSkillTrend(entries);

    return {
      weeklySummary,
      monthlySummary,
      bestMomentOfDay: bestMoment,
      dominantMethod,
      moodImpact,
      skillProgression,
    };
  }

  private async persistAndLearn(entry: BrewHistoryEntry, event?: LearningEvent): Promise<void> {
    await this.storage.saveEntry(entry);
    if (entry.rating > 0) {
      await this.learningEngine.ingestBrew(entry, event);
    }
  }

  private buildSummary(entries: BrewHistoryEntry[]): InsightSummary {
    if (entries.length === 0) {
      return { averageRating: 0, brewsCount: 0, topFlavorNotes: [] };
    }
    const averageRating =
      entries.reduce((sum, entry) => sum + (entry.rating || 0), 0) / Math.max(1, entries.length);
    const flavorFrequency: Record<string, number> = {};
    entries.forEach((entry) => {
      Object.keys(entry.flavorNotes ?? {}).forEach((note) => {
        flavorFrequency[note] = (flavorFrequency[note] ?? 0) + 1;
      });
    });
    const topFlavorNotes = Object.entries(flavorFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([note]) => note);

    return {
      averageRating: Number(averageRating.toFixed(2)),
      brewsCount: entries.length,
      topFlavorNotes,
    };
  }

  private identifyBestMoment(entries: BrewHistoryEntry[]): string {
    const grouped: Record<string, { total: number; count: number }> = {};
    entries.forEach((entry) => {
      const moment = entry.context?.timeOfDay ?? 'unknown';
      grouped[moment] = grouped[moment] || { total: 0, count: 0 };
      grouped[moment].total += entry.rating ?? 0;
      grouped[moment].count += 1;
    });
    const best = Object.entries(grouped).sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)[0];
    return best ? best[0] : 'unknown';
  }

  private identifyDominantMethod(entries: BrewHistoryEntry[]): string | undefined {
    const methodFrequency: Record<string, number> = {};
    entries.forEach((entry) => {
      const method = entry.modifications?.find((item) => item.startsWith('method:'));
      if (method) {
        methodFrequency[method] = (methodFrequency[method] ?? 0) + 1;
      }
    });
    const top = Object.entries(methodFrequency).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].replace('method:', '') : undefined;
  }

  private calculateMoodImpact(entries: BrewHistoryEntry[]): MoodImpactInsight {
    const moodShift: Record<string, { delta: number; count: number }> = {};
    entries.forEach((entry) => {
      const before = entry.context?.moodBefore ?? 'neutrál';
      const after = entry.context?.moodAfter ?? before;
      if (!moodShift[before]) {
        moodShift[before] = { delta: 0, count: 0 };
      }
      moodShift[before].delta += this.moodToScore(after) - this.moodToScore(before);
      moodShift[before].count += 1;
    });

    const positiveMoods: string[] = [];
    const negativeMoods: string[] = [];
    let totalShift = 0;

    Object.entries(moodShift).forEach(([mood, stats]) => {
      const average = stats.delta / Math.max(1, stats.count);
      totalShift += average;
      if (average > 0.1) {
        positiveMoods.push(mood);
      } else if (average < -0.1) {
        negativeMoods.push(mood);
      }
    });

    return {
      positiveMoods,
      negativeMoods,
      moodShiftScore: Number(totalShift.toFixed(2)),
    };
  }

  private calculateSkillTrend(entries: BrewHistoryEntry[]): SkillProgression {
    if (entries.length < 3) {
      return { trend: 'stable', slope: 0 };
    }
    const sorted = [...entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstDate = new Date(sorted[0].createdAt);
    const linearData = sorted.map((entry) => {
      const minutes = differenceInMinutes(new Date(entry.createdAt), firstDate);
      return { x: minutes, y: entry.rating };
    });

    const { slope } = this.linearRegression(linearData);
    let trend: SkillProgression['trend'] = 'stable';
    if (slope > 0.01) {
      trend = 'improving';
    } else if (slope < -0.01) {
      trend = 'declining';
    }

    return { trend, slope: Number(slope.toFixed(4)) };
  }

  private linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
    const n = data.length;
    const sumX = data.reduce((acc, point) => acc + point.x, 0);
    const sumY = data.reduce((acc, point) => acc + point.y, 0);
    const sumXY = data.reduce((acc, point) => acc + point.x * point.y, 0);
    const sumXX = data.reduce((acc, point) => acc + point.x * point.x, 0);
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) {
      return { slope: 0, intercept: 0 };
    }
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  private moodToScore(mood: string | undefined): number {
    if (!mood) {
      return 0;
    }
    const normalized = mood.toLowerCase();
    if (normalized.includes('šťast') || normalized.includes('radost')) {
      return 2;
    }
    if (normalized.includes('pokoj') || normalized.includes('relax')) {
      return 1;
    }
    if (normalized.includes('stres') || normalized.includes('úzk') || normalized.includes('unav')) {
      return -1;
    }
    return 0;
  }

  private resolveTimeOfDay(date: Date): BrewContext['timeOfDay'] {
    const hour = date.getHours();
    if (hour < 12) {
      return 'morning';
    }
    if (hour < 18) {
      return 'afternoon';
    }
    if (hour < 22) {
      return 'evening';
    }
    return 'night';
  }

  private getIsoWeekday(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }
}
