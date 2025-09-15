import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { PreferenceLearningEngine } from './PreferenceLearningEngine';
import {
  NotificationChannel,
  PredictionResult,
  WeatherProvider,
  CalendarProvider,
  BrewContext,
  PredictionContext,
} from '../types/Personalization';

export interface MorningRitualContext {
  anticipatedMood?: string;
  location?: BrewContext['location'];
  fallbackRecipeId?: string;
}

export interface RitualRecommendation {
  recipeId: string;
  strengthHint: 'light' | 'balanced' | 'strong';
  message: string;
  context: PredictionContext;
}

export interface MorningRitualManagerConfig {
  notificationChannel: NotificationChannel;
  weatherProvider: WeatherProvider;
  calendarProvider: CalendarProvider;
  learningEngine: PreferenceLearningEngine;
}

const AB_STORAGE_KEY = 'brewmate:ritual_ab_variant';

/**
 * MorningRitualManager riadi notifikácie, odporúčania a experimenty pre ranný rituál.
 */
export class MorningRitualManager {
  private readonly notificationChannel: NotificationChannel;
  private readonly weatherProvider: WeatherProvider;
  private readonly calendarProvider: CalendarProvider;
  private readonly learningEngine: PreferenceLearningEngine;

  constructor(config: MorningRitualManagerConfig) {
    this.notificationChannel = config.notificationChannel;
    this.weatherProvider = config.weatherProvider;
    this.calendarProvider = config.calendarProvider;
    this.learningEngine = config.learningEngine;
  }

  /**
   * Naplánuje rannú notifikáciu podľa predpokladaného času vstávania a aktuálneho kontextu.
   */
  public async scheduleMorningNotification(userId: string, context: MorningRitualContext = {}): Promise<void> {
    try {
      await this.learningEngine.initialize();
      const wakeTime = await this.resolveWakeTime();
      const weather = await this.weatherProvider.getWeather(context.location);
      const variant = await this.resolveABVariant();
      const weekday = this.getIsoWeekday(wakeTime);
      const { prediction, recommendation } = await this.resolvePrediction(context, weekday, weather);

      const message = this.composeMessage(prediction, weather?.condition, variant, weekday, recommendation?.message);
      const title = variant === 'B' ? 'Objav svoju ideálnu rannú kávu' : 'Dobré ráno s BrewMate';

      await this.notificationChannel.scheduleNotification({
        id: `morning-ritual-${userId}`,
        title,
        message,
        date: wakeTime,
        payload: {
          recipeId: prediction.recipeId,
          variant,
          context,
        },
      });
    } catch (error) {
      console.error('Nepodarilo sa naplánovať rannú notifikáciu', error);
      throw error;
    }
  }

  /**
   * Zruší aktuálnu rannú notifikáciu (napr. pri zmene nastavení).
   */
  public async cancelMorningNotification(userId: string): Promise<void> {
    await this.notificationChannel.cancelNotification(`morning-ritual-${userId}`);
  }

  /**
   * Vyhodnotenie spätnej väzby pre potreby A/B testovania.
   */
  public async recordNotificationFeedback(accepted: boolean): Promise<void> {
    const variant = await this.resolveABVariant();
    const key = `brewmate:ab_stats:${variant}`;
    const raw = (await AsyncStorage.getItem(key)) ?? '0|0';
    const [sentRaw, acceptedRaw] = raw.split('|');
    const sent = Number(sentRaw) + 1;
    const acceptedCount = Number(acceptedRaw) + (accepted ? 1 : 0);
    await AsyncStorage.setItem(key, `${sent}|${acceptedCount}`);
  }

  public async getRecommendationForCard(
    context: MorningRitualContext,
  ): Promise<(PredictionResult & { message: string; strengthHint: RitualRecommendation['strengthHint']; weatherCondition?: string }) | null> {
    const wakeTime = await this.resolveWakeTime();
    const weekday = this.getIsoWeekday(wakeTime);
    const weather = await this.weatherProvider.getWeather(context.location);
    const { prediction, recommendation } = await this.resolvePrediction(context, weekday, weather);
    if (!recommendation) {
      return null;
    }
    return {
      ...prediction,
      message: recommendation.message,
      strengthHint: recommendation.strengthHint,
      weatherCondition: weather?.condition,
    };
  }

  private async resolvePrediction(
    context: MorningRitualContext,
    weekday: number,
    weather?: BrewContext['weather'],
  ): Promise<{ prediction: PredictionResult; recommendation?: RitualRecommendation }> {
    const predictionContext: PredictionContext = {
      timeOfDay: 'morning',
      weekday,
      weather,
      anticipatedMood: context.anticipatedMood,
    };

    const recommendation = await this.buildDecisionTreeRecommendation(weekday, weather, context);
    const recipeId = recommendation?.recipeId ?? context.fallbackRecipeId;

    if (recipeId) {
      const prediction = await this.learningEngine.predictRating(recipeId, predictionContext);
      return { prediction, recommendation: recommendation ?? undefined };
    }

    if (recommendation) {
      const prediction = await this.learningEngine.predictRating(recommendation.recipeId, predictionContext);
      return { prediction, recommendation };
    }

    // fallback bez konkrétneho receptu
    return {
      prediction: {
        recipeId: 'discovery',
        predictedRating: 3.2,
        confidence: 0.25,
        contributingRecipes: [],
        contextBonuses: ['Fallback odporúčanie'],
      },
    };
  }

  private async resolveWakeTime(): Promise<Date> {
    try {
      return await this.calendarProvider.getNextWakeUpTime();
    } catch (error) {
      console.warn('Nepodarilo sa získať čas budenia, použije sa 07:00', error);
      const now = new Date();
      now.setHours(7, 0, 0, 0);
      return now;
    }
  }

  private async resolveABVariant(): Promise<'A' | 'B'> {
    const stored = await AsyncStorage.getItem(AB_STORAGE_KEY);
    if (stored === 'A' || stored === 'B') {
      return stored;
    }
    const variant: 'A' | 'B' = Math.random() > 0.5 ? 'A' : 'B';
    await AsyncStorage.setItem(AB_STORAGE_KEY, variant);
    return variant;
  }

  private composeMessage(
    prediction: PredictionResult,
    weatherCondition: string | undefined,
    variant: 'A' | 'B',
    weekday: number,
    recommendationMessage?: string,
  ): string {
    const ratingText = prediction.predictedRating >= 4.2 ? 'Top výber' : 'Zlepši si ráno';
    const weatherFragment = weatherCondition ? ` Vonku je ${weatherCondition.toLowerCase()}, prispôsobili sme extrakciu.` : '';
    const weekdayName = format(this.isoToDate(weekday), 'EEEE', { locale: sk });
    const basePrefix = recommendationMessage ? `${recommendationMessage} ` : '';
    const base = `${basePrefix}${ratingText}: recept ${prediction.recipeId}. ${weatherFragment}`;

    if (weekday >= 6) {
      return `${base} Víkendový špeciál – dopraj si pomalší rituál.`;
    }

    if (variant === 'B') {
      return `${base} ${weekdayName} posilní extra crema a vyvážená sladkosť.`;
    }

    return `${base} ${weekdayName} zvládneš s energiou a štipkou kakaa.`;
  }

  private async buildDecisionTreeRecommendation(
    weekday: number,
    weather?: BrewContext['weather'],
    context: MorningRitualContext = {},
  ): Promise<RitualRecommendation | null> {
    const strengthFromCalendar = await this.calendarProvider.getWeekdayPlan(weekday);
    const contextStrength: RitualRecommendation['strengthHint'] = strengthFromCalendar ?? this.inferStrength(weekday);
    const mood = context.anticipatedMood?.toLowerCase();
    const isWeekend = weekday === 6 || weekday === 7;
    const condition = weather?.condition?.toLowerCase();

    // Rozhodovací strom
    if (condition?.includes('rain')) {
      return {
        recipeId: 'comfort-pour-over',
        strengthHint: isWeekend ? 'balanced' : 'strong',
        message: 'Dážď? Ideálny čas na hutnejšie telo a čokoládové tóny.',
        context: {
          timeOfDay: 'morning',
          weather,
          weekday,
          anticipatedMood: context.anticipatedMood,
        },
      };
    }

    if (condition?.includes('sun') && weekday <= 5) {
      return {
        recipeId: 'citrus-iced-v60',
        strengthHint: 'light',
        message: 'Slnečné ráno si pýta citrusové tóny a nižšiu teplotu vody.',
        context: {
          timeOfDay: 'morning',
          weather,
          weekday,
          anticipatedMood: context.anticipatedMood,
        },
      };
    }

    if (mood?.includes('stres') || weekday === 1) {
      return {
        recipeId: 'focus-flat-white',
        strengthHint: 'strong',
        message: 'Vyrovnaný pondelok so silnejším shotom a krémovým mliekom.',
        context: {
          timeOfDay: 'morning',
          weather,
          weekday,
          anticipatedMood: context.anticipatedMood,
        },
      };
    }

    if (isWeekend) {
      return {
        recipeId: 'slow-bloom-chemex',
        strengthHint: 'balanced',
        message: 'Víkendový rituál s dlhšou extrakciou a orieškovým dozvukom.',
        context: {
          timeOfDay: 'morning',
          weather,
          weekday,
          anticipatedMood: context.anticipatedMood,
        },
      };
    }

    if (contextStrength === 'strong') {
      return {
        recipeId: 'power-aeropress',
        strengthHint: 'strong',
        message: 'Kalendár hlási náročný deň – odporúčame Aeropress s vyšším pomerom kávy.',
        context: {
          timeOfDay: 'morning',
          weather,
          weekday,
          anticipatedMood: context.anticipatedMood,
        },
      };
    }

    // Fallback odporúčanie
    return {
      recipeId: 'balanced-house-espresso',
      strengthHint: contextStrength,
      message: 'Udrž stabilitu – klasický espresso recept so strednou sladkosťou.',
      context: {
        timeOfDay: 'morning',
        weather,
        weekday,
        anticipatedMood: context.anticipatedMood,
      },
    };
  }

  private inferStrength(weekday: number): RitualRecommendation['strengthHint'] {
    if (weekday === 1) {
      return 'strong';
    }
    if (weekday >= 6) {
      return 'balanced';
    }
    return 'balanced';
  }

  private getIsoWeekday(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  private isoToDate(weekday: number): Date {
    const now = new Date();
    const currentIso = this.getIsoWeekday(now);
    const diff = weekday - currentIso;
    const clone = new Date(now);
    clone.setDate(now.getDate() + diff);
    return clone;
  }
}
