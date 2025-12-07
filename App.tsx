// App.tsx
import React, { useState, useEffect, useMemo, createContext, useCallback } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/components/auth/AuthVisual';
import HomeScreen from './src/screens/HomeScreen';
import CoffeeTasteScanner from './src/screens/CoffeeTasteScanner';
import CoffeeReceipeScanner from './src/screens/CoffeeReceipeScanner';
import RecipeHistoryDetailScreen from './src/screens/CoffeeReceipeScanner/RecipeHistoryDetailScreen';
import {
  DiscoverCoffeesScreen,
} from './src/screens/AllCoffeesScreen';
import UserProfile from './src/screens/UserProfile';
import EditUserProfile from './src/components/profile/EditUserProfile';
import CoffeePreferenceForm from './src/components/personalization/CoffeePreferenceForm';
import EditPreferences from './src/components/personalization/EditPreferences';
import RecipeStepsScreen from './src/screens/RecipeStepsScreen/RecipeStepsScreenMD3';
import PersonalizationDashboard from './src/components/personalization/PersonalizationDashboard';
import BrewHistoryScreen from './src/screens/BrewHistory';
import BrewHistoryDetailScreen from './src/screens/BrewHistory/DetailScreen';
import ScanHistoryScreen from './src/screens/ScanHistoryScreen';
import ScanDetailScreen from './src/screens/ScanDetailScreen';
import BrewLogForm from './src/components/brew/BrewLogForm';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { scale } from './src/theme/responsive';
import ResponsiveWrapper from './src/components/layout/ResponsiveWrapper';
import RecipesScreen from './src/screens/RecipesScreen';
import TasteProfileQuizScreen from './src/screens/TasteProfileQuizScreen';
import BottomNav from './src/components/navigation/BottomNav';
import { scheduleLowStockCheck } from './src/utils/reminders';
import InventoryScreen from './src/screens/InventoryScreen';
import SavedTipsScreen from './src/screens/SavedTipsScreen';
import ScannedCoffeeDetailScreen from './src/screens/ScannedCoffeeDetailScreen';
import TipsScreen from './src/screens/TipsScreen';

import { fetchRecipes, fetchRecipeHistory } from './src/services/recipeServices';
import type { RecipeHistory } from './src/services/recipeServices';
import { fetchCoffees, fetchScanHistory } from './src/services/homePagesService';
import { fetchRecentScans } from './src/services/coffeeServices';
import EncryptedStorage from 'react-native-encrypted-storage';
import Animated, {FadeInRight, FadeOutLeft, Layout as ReanimatedLayout} from 'react-native-reanimated';
import { MorningRitualManager } from './src/services/MorningRitualManager';
import { PreferenceLearningEngine } from './src/services/PreferenceLearningEngine';
import { CoffeeDiary } from './src/services/CoffeeDiary';
import { PrivacyManager } from './src/services/PrivacyManager';
import { SmartDiaryInsight, SmartDiaryService } from './src/services/SmartDiaryService';
import {
  CalendarProvider,
  DiaryStorageAdapter,
  LearningEvent,
  LearningStorageAdapter,
  NotificationChannel,
  WeatherProvider,
  BrewHistoryEntry,
  RecipeProfile,
  CommunityFlavorStats,
  TasteDimension,
  UserTasteProfile,
} from './src/types/Personalization';
import type { MoodSignal, TasteQuizResult } from './src/types/PersonalizationAI';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearningEventProvider } from './src/services/PrivacyManager';
import { supabaseClient } from './src/services/supabaseClient';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './src/config/env';
import type { BrewLog } from './src/types/BrewLog';
import type { BrewDevice, Recipe } from './src/types/Recipe';
import type { OCRHistory } from './src/services/ocrServices';

type ScreenName =
  | 'home'
  | 'scanner'
  | 'profile'
  | 'edit-profile'
  | 'preferences'
  | 'edit-preferences'
  | 'brew'
  | 'discover'
  | 'recipes'
  | 'recipe-steps'
  | 'recipe-history-detail'
  | 'favorites'
  | 'inventory'
  | 'taste-quiz'
  | 'personalization'
  | 'brew-history'
  | 'brew-history-detail'
  | 'brew-log'
  | 'community-recipes'
  | 'saved-tips'
  | 'scan-history'
  | 'scan-detail'
  | 'coffee-detail';

type AuthNotice = {
  message: string;
  id: number;
};

const MORNING_RITUAL_CHANNEL_ID = 'brewmate-morning-ritual';
const WAKE_TIME_STORAGE_KEY = 'brewmate:ritual:wake_time';
const WEEKDAY_PLAN_STORAGE_KEY = 'brewmate:ritual:weekday_plan';
const TASTE_QUIZ_STORAGE_KEY = 'brewmate:taste_quiz:complete';


interface ConfidenceDatum {
  label: string;
  value: number;
}

interface PersonalizationContextValue {
  ready: boolean;
  userId: string | null;
  learningEngine: PreferenceLearningEngine | null;
  coffeeDiary: CoffeeDiary | null;
  morningRitualManager: MorningRitualManager | null;
  privacyManager: PrivacyManager | null;
  smartDiary: SmartDiaryService | null;
  refreshInsights: (() => Promise<void>) | null;
  quizResult: TasteQuizResult | null;
  experimentsEnabled: boolean;
  moodSignals: MoodSignal[];
  sendCoachMessage: ((message: string) => Promise<string>) | null;
  profile: UserTasteProfile | null;
  confidenceScores: ConfidenceDatum[];
  insights: SmartDiaryInsight[];
  onboardingResult:  null;
}

export const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(undefined);

const emptyPersonalizationState: PersonalizationContextValue = {
  ready: false,
  userId: null,
  learningEngine: null,
  coffeeDiary: null,
  morningRitualManager: null,
  privacyManager: null,
  smartDiary: null,
  refreshInsights: null,
  quizResult: null,
  experimentsEnabled: false,
  moodSignals: [],
  sendCoachMessage: null,
  profile: null,
  confidenceScores: [],
  insights: [],
  onboardingResult: null,
};

class SupabaseLearningStorageAdapter implements LearningStorageAdapter {
  constructor(private readonly client: SupabaseClient) {}

  public async loadProfile(userId: string): Promise<UserTasteProfile | null> {
    const { data, error } = await this.client
      .from('user_taste_profile')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('SupabaseLearningStorageAdapter: loadProfile failed', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      userId,
      preferences: {
        sweetness: Number(data.sweetness ?? 5),
        acidity: Number(data.acidity ?? 5),
        bitterness: Number(data.bitterness ?? 5),
        body: Number(data.body ?? 5),
      },
      flavorNotes: (data.flavor_notes as Record<string, number> | null) ?? {},
      milkPreferences: (data.milk_preferences as UserTasteProfile['milkPreferences'] | null) ?? {
        types: ['plnotučné'],
        texture: 'krémová',
      },
      caffeineSensitivity: (data.caffeine_sensitivity as UserTasteProfile['caffeineSensitivity']) ?? 'medium',
      preferredStrength: (data.preferred_strength as UserTasteProfile['preferredStrength']) ?? 'balanced',
      seasonalAdjustments: Array.isArray(data.seasonal_adjustments)
        ? (data.seasonal_adjustments as UserTasteProfile['seasonalAdjustments'])
        : [],
      preferenceConfidence: Number(data.preference_confidence ?? 0.35),
      lastRecalculatedAt:
        typeof data.last_recalculated_at === 'string'
          ? data.last_recalculated_at
          : new Date().toISOString(),
      updatedAt:
        typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString(),
    };
  }

  public async persistProfile(profile: UserTasteProfile): Promise<void> {
    const payload = {
      user_id: profile.userId,
      sweetness: profile.preferences.sweetness,
      acidity: profile.preferences.acidity,
      bitterness: profile.preferences.bitterness,
      body: profile.preferences.body,
      flavor_notes: profile.flavorNotes,
      milk_preferences: profile.milkPreferences,
      caffeine_sensitivity: profile.caffeineSensitivity,
      preferred_strength: profile.preferredStrength,
      seasonal_adjustments: profile.seasonalAdjustments,
      preference_confidence: profile.preferenceConfidence,
      last_recalculated_at: profile.lastRecalculatedAt,
      updated_at: profile.updatedAt,
    };

    const { error } = await this.client.from('user_taste_profile').upsert(payload);
    if (error) {
      console.warn('SupabaseLearningStorageAdapter: persistProfile failed', error);
    }
  }

  public async fetchRecentHistory(userId: string, limit: number = 200): Promise<BrewHistoryEntry[]> {
    const { data, error } = await this.client
      .from('brew_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('SupabaseLearningStorageAdapter: fetchRecentHistory failed', error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id ?? `remote-${Date.now()}`),
      userId: row.user_id ?? userId,
      recipeId: row.recipe_id ?? undefined,
      beans: (row.beans as BrewHistoryEntry['beans']) ?? undefined,
      grindSize: row.grind_size ?? undefined,
      waterTemp: typeof row.water_temp === 'number' ? row.water_temp : undefined,
      brewTimeSeconds: undefined,
      rating: typeof row.rating === 'number' ? row.rating : 0,
      tasteFeedback: (row.taste_feedback as BrewHistoryEntry['tasteFeedback']) ?? undefined,
      flavorNotes: (row.flavor_notes as BrewHistoryEntry['flavorNotes']) ?? undefined,
      // context: {
      //   timeOfDay: row.context_time_of_day ?? undefined,
      //   weather: (row.context_weather as BrewHistoryEntry['context']?.weather) ?? undefined,
      //  },
      modifications: (row.modifications as string[]) ?? undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }));
  }

  public async fetchRecipeProfile(recipeId: string): Promise<RecipeProfile | null> {
    void recipeId;
    return null;
  }

  public async fetchSimilarRecipes(userId: string, recipeId: string, limit: number = 3): Promise<RecipeProfile[]> {
    void userId;
    void recipeId;
    void limit;
    return [];
  }

  public async fetchCommunityFlavorStats(): Promise<CommunityFlavorStats> {
    return {};
  }
}

class SupabaseDiaryStorageAdapter implements DiaryStorageAdapter {
  constructor(private readonly client: SupabaseClient) {}

  public async saveEntry(entry: BrewHistoryEntry): Promise<void> {
    const payload = {
      user_id: entry.userId,
      recipe_id: entry.recipeId ?? null,
      beans: entry.beans ?? null,
      grind_size: entry.grindSize ?? null,
      water_temp: entry.waterTemp ?? null,
      rating: entry.rating,
      taste_feedback: entry.tasteFeedback ?? null,
      flavor_notes: entry.flavorNotes ?? null,
      context_time_of_day: entry.context?.timeOfDay ?? null,
      context_weather: entry.context?.weather ?? null,
      mood_before: entry.context?.moodBefore ?? null,
      mood_after: entry.context?.moodAfter ?? null,
      modifications: entry.modifications ?? null,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
    };

    const { error } = await this.client.from('brew_history').upsert(payload);
    if (error) {
      console.warn('SupabaseDiaryStorageAdapter: saveEntry failed', error);
    }
  }

  public async getEntries(userId: string): Promise<BrewHistoryEntry[]> {
    const { data, error } = await this.client
      .from('brew_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('SupabaseDiaryStorageAdapter: getEntries failed', error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id ?? `remote-${Date.now()}`),
      userId: row.user_id ?? userId,
      recipeId: row.recipe_id ?? undefined,
      beans: (row.beans as BrewHistoryEntry['beans']) ?? undefined,
      grindSize: row.grind_size ?? undefined,
      waterTemp: typeof row.water_temp === 'number' ? row.water_temp : undefined,
      brewTimeSeconds: undefined,
      rating: typeof row.rating === 'number' ? row.rating : 0,
      tasteFeedback: (row.taste_feedback as BrewHistoryEntry['tasteFeedback']) ?? undefined,
      flavorNotes: (row.flavor_notes as BrewHistoryEntry['flavorNotes']) ?? undefined,
      // context: {
      //   timeOfDay: row.context_time_of_day ?? undefined,
      //   weather: (row.context_weather as BrewHistoryEntry['context']?.weather) ?? undefined,
      //   moodBefore: row.mood_before ?? undefined,
      //   moodAfter: row.mood_after ?? undefined,
      // },
      modifications: (row.modifications as string[]) ?? undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
    }));
  }

  public async deleteEntries(userId: string): Promise<void> {
    const { error } = await this.client.from('brew_history').delete().eq('user_id', userId);
    if (error) {
      console.warn('SupabaseDiaryStorageAdapter: deleteEntries failed', error);
    }
  }
}

class SupabaseLearningEventAdapter implements LearningEventProvider {
  constructor(private readonly client: SupabaseClient) {}

  public async getEvents(userId: string): Promise<LearningEvent[]> {
    const { data, error } = await this.client
      .from('learning_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.warn('SupabaseLearningEventAdapter: getEvents failed', error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id ?? `event-${Date.now()}`),
      userId: row.user_id ?? userId,
      brewHistoryId: row.brew_history_id ? String(row.brew_history_id) : undefined,
      eventType: row.event_type ?? 'liked',
      eventWeight: Number(row.event_weight ?? 1),
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.created_at ?? new Date().toISOString(),
    }));
  }

  public async deleteEvents(userId: string): Promise<void> {
    const { error } = await this.client.from('learning_events').delete().eq('user_id', userId);
    if (error) {
      console.warn('SupabaseLearningEventAdapter: deleteEvents failed', error);
    }
  }
}

interface AppContentProps {
  personalization: PersonalizationContextValue;
  setPersonalization: React.Dispatch<React.SetStateAction<PersonalizationContextValue>>;
}

const AppContent = ({ personalization, setPersonalization }: AppContentProps): React.JSX.Element | null => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState('');
  const [selectedRecipeDevice, setSelectedRecipeDevice] =
    useState<BrewDevice | undefined>(undefined);
  const [recipeStepsReturnTo, setRecipeStepsReturnTo] =
    useState<ScreenName>('brew');
  const [preferencesReturnTo, setPreferencesReturnTo] =
    useState<'profile' | 'home'>('profile');
  const [isTasteQuizComplete, setIsTasteQuizComplete] = useState(false);
  const [checkingTasteQuiz, setCheckingTasteQuiz] = useState(true);
  const [hasAppliedPersonalizationOnboarding, setHasAppliedPersonalizationOnboarding] =
    useState(false);

  const [selectedBrewLog, setSelectedBrewLog] = useState<BrewLog | null>(null);
  const [selectedRecipeHistory, setSelectedRecipeHistory] = useState<RecipeHistory | null>(null);
  const [selectedScan, setSelectedScan] = useState<OCRHistory | null>(null);
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);
  const [authNotice] = useState<AuthNotice | null>(null);
  const { isDark, colors } = useTheme();
  const {
    ready: personalizationReady,
    morningRitualManager,
    learningEngine,
    coffeeDiary,
    privacyManager,
    userId,
  } = personalization;

  const missingEnvVars = useMemo(
    () =>
      [
        SUPABASE_URL ? null : 'SUPABASE_URL',
        SUPABASE_ANON_KEY ? null : 'SUPABASE_ANON_KEY',
      ].filter(Boolean) as string[],
    [],
  );
  const supabaseConfigured = missingEnvVars.length === 0 && Boolean(supabaseClient);

  const handleExperimentToggle = useCallback(
    async (enabled: boolean) => {
      if (!privacyManager || !userId) {
        return;
      }

      try {
        await privacyManager.setTrackingConsent(userId, 'analytics', enabled);
        setPersonalization((prev) => ({ ...prev, experimentsEnabled: enabled }));
      } catch (error) {
        console.warn('App: failed to update experiment consent', error);
      }
    },
    [privacyManager, setPersonalization, userId],
  );

  useEffect(() => {
    setHasAppliedPersonalizationOnboarding(false);
  }, [learningEngine]);

  useEffect(() => {
    const init = async () => {
      const stored = await AsyncStorage.getItem('@AuthToken');
      if (stored) {
        setIsAuthenticated(true);
      }
    };
    init();

    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          await user.reload();
        } catch (reloadError) {
          console.warn('App: failed to reload user state', reloadError);
        }

        const token = await user.getIdToken();
        await AsyncStorage.setItem('@AuthToken', token);
        setIsAuthenticated(true);
        setCurrentScreen('home');
        setPersonalization((prev) => ({
          ...prev,
          userId: user.uid,
        }));
      } else {
        await AsyncStorage.removeItem('@AuthToken');
        setIsAuthenticated(false);
        setPersonalization(() => ({ ...emptyPersonalizationState }));
      }
    });
    return unsubscribe;
  }, [setPersonalization]);


  useEffect(() => {
    const checkTasteQuiz = async () => {
      try {
        const value = await EncryptedStorage.getItem(TASTE_QUIZ_STORAGE_KEY);
        setIsTasteQuizComplete(value === 'true');
      } catch (error) {
        console.warn('App: failed to read taste quiz status', error);
      } finally {
        setCheckingTasteQuiz(false);
      }
    };
    checkTasteQuiz();
  }, []);

  useEffect(() => {
    scheduleLowStockCheck();
    const now = new Date();
    const next = new Date();
    next.setHours(9, 0, 0, 0);
    let timeout = next.getTime() - now.getTime();
    if (timeout < 0) timeout += 24 * 60 * 60 * 1000;
    const timer = setTimeout(() => {
      scheduleLowStockCheck();
      setInterval(scheduleLowStockCheck, 24 * 60 * 60 * 1000);
    }, timeout);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const prefetchPriorityContent = async () => {
      try {
        await Promise.allSettled([
          fetchRecipes(),
          fetchCoffees(),
          fetchRecipeHistory(50),
          fetchScanHistory(20),
          fetchRecentScans(20),
        ]);
      } catch (error) {
        console.warn('App: priority cache prefetch failed', error);
      }
    };

    prefetchPriorityContent();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const activeUserId = userId ?? auth().currentUser?.uid ?? null;
    if (!activeUserId) {
      return;
    }

    const client = supabaseClient;

    if (missingEnvVars.length > 0) {
      console.warn('App: Missing Supabase environment variables', missingEnvVars);
      return;
    }

    if (!client) {
      console.warn('App: Supabase client is not configured');
      return;
    }

    let cancelled = false;

    setPersonalization((prev) => ({
      ...prev,
      ready: false,
      learningEngine: null,
      coffeeDiary: null,
      privacyManager: null,
      morningRitualManager: null,
      smartDiary: null,
      refreshInsights: null,
      profile: null,
      confidenceScores: [],
      insights: [],
    }));

    const initializeServices = async () => {
      try {
        const learningStorage = new SupabaseLearningStorageAdapter(client);
        const diaryStorage = new SupabaseDiaryStorageAdapter(client);
        const eventProvider = new SupabaseLearningEventAdapter(client);

        const engine = new PreferenceLearningEngine(activeUserId, { storage: learningStorage });
        await engine.initialize();

        const smartDiaryService = new SmartDiaryService(engine);
        const diary = new CoffeeDiary({
          storage: diaryStorage,
          learningEngine: engine,
          smartDiary: smartDiaryService,
          onInsightsUpdated: (insights) => {
            if (!cancelled) {
              setPersonalization((prev) => {
                const identical =
                  prev.insights.length === insights.length &&
                  prev.insights.every((item, index) => item.id === insights[index]?.id);
                if (identical) {
                  return prev;
                }
                return { ...prev, insights };
              });
            }
          },
        });
        const privacy = new PrivacyManager({
          learningStorage,
          diaryStorage,
          eventProvider,
        });

        if (cancelled) {
          return;
        }

        const existingEntries = await diaryStorage.getEntries(activeUserId);
        const initialInsights = await smartDiaryService.generateInsights(activeUserId, existingEntries);
        if (cancelled) {
          return;
        }

        const refreshInsights = async () => {
          if (cancelled) {
            return;
          }
          try {
            const entries = await diaryStorage.getEntries(activeUserId);
            const nextInsights = await smartDiaryService.generateInsights(activeUserId, entries);
            if (!cancelled) {
              setPersonalization((prev) => ({
                ...prev,
                insights: nextInsights,
              }));
            }
          } catch (error) {
            console.warn('App: failed to refresh smart diary insights', error);
          }
        };

        setPersonalization((prev) => ({
          ...prev,
          userId: activeUserId,
          learningEngine: engine,
          coffeeDiary: diary,
          privacyManager: privacy,
          smartDiary: smartDiaryService,
          refreshInsights,
          ready: true,
          profile: engine.getProfile(),
          insights: initialInsights,
        }));
      } catch (error) {
        console.warn('App: failed to initialize personalization services', error);
        if (!cancelled) {
          setPersonalization((prev) => ({
            ...prev,
            ready: false,
            insights: [],
            profile: null,
            confidenceScores: [],
            refreshInsights: null,
          }));
        }
      }
    };

    initializeServices();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setPersonalization, userId]);

  useEffect(() => {
    if (!personalizationReady || !learningEngine || morningRitualManager) {
      return;
    }

    PushNotification.createChannel(
      {
        channelId: MORNING_RITUAL_CHANNEL_ID,
        channelName: 'Ranný rituál BrewMate',
        channelDescription: 'Personalizované ranné pripomienky a odporúčania',
        importance: 4,
      },
      () => {},
    );

    const notificationChannel: NotificationChannel = {
      async scheduleNotification({ id, title, message, date, payload }) {
        PushNotification.localNotificationSchedule({
          channelId: MORNING_RITUAL_CHANNEL_ID,
          id,
          title,
          message,
          date,
          allowWhileIdle: true,
          userInfo: payload,
        });
      },
      async cancelNotification(id: string) {
        PushNotification.cancelLocalNotifications({ id });
      },
    };



    const calendarProvider: CalendarProvider = {
      async getNextWakeUpTime() {
        const fallback = () => {
          const next = new Date();
          next.setHours(7, 0, 0, 0);
          if (next.getTime() <= Date.now()) {
            next.setDate(next.getDate() + 1);
          }
          return next;
        };

        try {
          const stored = await AsyncStorage.getItem(WAKE_TIME_STORAGE_KEY);
          if (!stored) {
            return fallback();
          }

          try {
            const parsed = JSON.parse(stored) as unknown;

            if (typeof parsed === 'string') {
              const candidate = new Date(parsed);
              if (!Number.isNaN(candidate.getTime())) {
                if (candidate.getTime() <= Date.now()) {
                  candidate.setDate(candidate.getDate() + 1);
                }
                return candidate;
              }
            }

            if (parsed && typeof parsed === 'object') {
              const { hour, minute } = parsed as { hour?: number; minute?: number };
              if (typeof hour === 'number') {
                const candidate = new Date();
                candidate.setHours(hour, typeof minute === 'number' ? minute : 0, 0, 0);
                if (candidate.getTime() <= Date.now()) {
                  candidate.setDate(candidate.getDate() + 1);
                }
                return candidate;
              }
            }
          } catch (parseError) {
            const candidate = new Date(stored);
            if (!Number.isNaN(candidate.getTime())) {
              if (candidate.getTime() <= Date.now()) {
                candidate.setDate(candidate.getDate() + 1);
              }
              return candidate;
            }
            console.warn('App: failed to parse stored wake time', parseError);
          }
        } catch (error) {
          console.warn('App: failed to read wake time preference', error);
        }

        return fallback();
      },
      async getWeekdayPlan(weekday: number) {
        try {
          const stored = await AsyncStorage.getItem(WEEKDAY_PLAN_STORAGE_KEY);
          if (!stored) {
            return undefined;
          }
          const parsed = JSON.parse(stored) as Record<string, unknown>;
          const value = parsed[String(weekday)];
          if (value === 'light' || value === 'balanced' || value === 'strong') {
            return value;
          }
        } catch (error) {
          console.warn('App: failed to read weekday ritual plan', error);
        }
        return undefined;
      },
    };

    const manager = new MorningRitualManager({
      notificationChannel,
      calendarProvider,
      learningEngine,
      userId: userId ?? 'local-user',
    });

    setPersonalization((prev) => ({
      ...prev,
      morningRitualManager: manager,
    }));
  }, [personalizationReady, learningEngine, morningRitualManager, setPersonalization, userId]);

  useEffect(() => {
    if (!userId || !privacyManager) {
      return;
    }

    let active = true;

    privacyManager
      .loadPreferences(userId)
      .then((prefs) => {
        if (!active) {
          return;
        }
        setPersonalization((prev) => {
          const enabled = Boolean(prefs.analytics);
          if (prev.experimentsEnabled === enabled) {
            return prev;
          }
          return { ...prev, experimentsEnabled: enabled };
        });
      })
      .catch((error) => {
        console.warn('App: failed to load privacy preferences', error);
      });

    return () => {
      active = false;
    };
  }, [privacyManager, setPersonalization, userId]);

  useEffect(() => {
    if (!personalizationReady || !coffeeDiary || !userId) {
      return;
    }

    let cancelled = false;

    const resolveSignals = async () => {
      try {
        const insights = await coffeeDiary.generateInsights(userId);
        if (cancelled) {
          return;
        }

        const now = Date.now();
        const normalizedScore = Math.min(1, Math.max(-1, insights.moodImpact.moodShiftScore / 3));
        const baseSignal: MoodSignal = {
          source: 'diary',
          value: normalizedScore >= 0 ? 'energized' : 'tired',
          confidence: Math.abs(normalizedScore),
          timestamp: new Date(now).toISOString(),
        };

        const additionalSignals: MoodSignal[] = [];
        insights.moodImpact.positiveMoods.forEach((_mood, index) => {
          additionalSignals.push({
            source: 'diary',
            value: 'focused',
            confidence: 0.6,
            timestamp: new Date(now - (index + 1) * 60 * 60 * 1000).toISOString(),
          });
        });
        insights.moodImpact.negativeMoods.forEach((_mood, index) => {
          additionalSignals.push({
            source: 'diary',
            value: 'stressed',
            confidence: 0.4,
            timestamp: new Date(now - (index + insights.moodImpact.positiveMoods.length + 1) * 60 * 60 * 1000).toISOString(),
          });
        });

        const signals = [baseSignal, ...additionalSignals].slice(0, 5);

        setPersonalization((prev) => {
          const identical =
            prev.moodSignals.length === signals.length &&
            prev.moodSignals.every((signal, index) => signal.value === signals[index]?.value);
          if (identical) {
            return prev;
          }
          return { ...prev, moodSignals: signals };
        });
      } catch (error) {
        console.warn('App: failed to compute mood signals', error);
      }
    };

    resolveSignals();

    return () => {
      cancelled = true;
    };
  }, [coffeeDiary, personalizationReady, setPersonalization, userId]);

  const coachResponder = useMemo(() => {
    if (!learningEngine) {
      return null;
    }

    return async (message: string) => {
      const profile = learningEngine.getProfile();
      const preferenceSummary = profile
        ? `Tvoje preferencie sú nastavené na sladkosť ${profile.preferences.sweetness.toFixed(1)}/10, aciditu ${profile.preferences.acidity.toFixed(1)}/10 a silu ${profile.preferredStrength}.`
        : 'Zatiaľ zbieram dáta o tvojich chuťových preferenciách.';

      let diarySummary: string | null = null;
      if (coffeeDiary && userId) {
        try {
          const insights = await coffeeDiary.generateInsights(userId);
          diarySummary = `Najviac ti chutí káva cez ${insights.bestMomentOfDay} a tvoje zručnosti sú momentálne ${insights.skillProgression.trend}.`;
        } catch (error) {
          console.warn('App: coach responder failed to load diary insights', error);
        }
      }

      const lowered = message.toLowerCase();
      let suggestion = 'Pokojne pokračuj v experimentoch a daj vedieť, ako chutnali.';
      if (profile) {
        if (lowered.includes('energ')) {
          suggestion = profile.preferredStrength === 'strong'
            ? 'Skús dvojité espresso alebo aeropress s kratšou extrakciou pre rýchly energizujúci efekt.'
            : 'Odporúčam flat white s vyváženou sladkosťou – podporí energiu bez prílišného kofeínu.';
        } else if (lowered.includes('relax') || lowered.includes('večer')) {
          suggestion = 'Vhodnou voľbou môže byť decaf pour-over s jemným ovocným profilom.';
        } else if (lowered.includes('nov')) {
          suggestion = 'Do chuťového denníka si skús zapísať cold brew s citrusovými tónmi – rozšíri tvoju flavor journey.';
        }
      }

      return [preferenceSummary, diarySummary, suggestion].filter(Boolean).join('\n\n');
    };
  }, [coffeeDiary, learningEngine, userId]);

  useEffect(() => {
    setPersonalization((prev) => {
      if (prev.sendCoachMessage === coachResponder) {
        return prev;
      }
      return { ...prev, sendCoachMessage: coachResponder };
    });
  }, [coachResponder, setPersonalization]);

  useEffect(() => {
    const mapLabel = (dimension: string): string => {
      switch (dimension) {
        case 'sweetness':
          return 'Sladkosť';
        case 'acidity':
          return 'Kyslosť';
        case 'bitterness':
          return 'Horkosť';
        case 'body':
          return 'Telo';
        case 'milk':
          return 'Mlieko';
        case 'diet':
          return 'Životný štýl';
        case 'budget':
          return 'Rozpočet';
        default:
          return dimension;
      }
    };

    const profile = learningEngine?.getProfile() ?? null;

    let confidence: ConfidenceDatum[] = [];

    if (personalization.quizResult) {
      confidence = personalization.quizResult.confidenceScores.map((item) => ({
        label: mapLabel(item.dimension),
        value: Math.min(1, Math.max(0, item.confidence)),
      }));
    } else if (profile) {
      confidence = [
        { label: 'Chuťové preferencie', value: Math.min(1, Math.max(0, profile.preferenceConfidence)) },
        { label: 'Mliečne nápoje', value: 0.6 },
        { label: 'Experimentovanie', value: 0.5 },
      ];
    }

    setPersonalization((prev) => {
      const sameProfile = prev.profile === profile;
      const sameConfidence =
        prev.confidenceScores.length === confidence.length &&
        prev.confidenceScores.every(
          (item, index) => item.label === confidence[index]?.label && item.value === confidence[index]?.value,
        );

      if (sameProfile && sameConfidence) {
        return prev;
      }

      return {
        ...prev,
        profile,
        confidenceScores: confidence,
      };
    });
  }, [learningEngine, personalization.quizResult, setPersonalization]);

  const handleScannerPress = () => {
    setCurrentScreen('scanner');
  };

  const handleScanHistoryPress = () => {
    setCurrentScreen('scan-history');
  };

  const handleScanDetailPress = (scan: OCRHistory) => {
    setSelectedScan(scan);
    setCurrentScreen('scan-detail');
  };

  // Open dedicated scanner for preparing a drink (same as scan for now)
  const handleBrewPress = () => {
    setCurrentScreen('brew');
  };

  const handleProfilePress = () => {
    setCurrentScreen('profile');
  };

  const handleProfilePreferencesPress = () => {
    setPreferencesReturnTo('profile');
    setCurrentScreen('preferences');
  };

  const handleDiscoverPress = () => {
    setCurrentScreen('discover');
  };

  const handleRecipesPress = () => {
    setCurrentScreen('recipes');
  };

  const handleSeeAllRecipes = () => {
    setCurrentScreen('recipes');
  };

  const handleFavoritesPress = () => {
    setCurrentScreen('favorites');
  };

  const handleInventoryPress = () => {
    setCurrentScreen('inventory');
  };

  const handlePersonalizationPress = () => {
    setPreferencesReturnTo('home');
    setCurrentScreen('preferences');
  };

  const handlePreferencesBack = () => {
    const target = preferencesReturnTo === 'home' ? 'home' : 'profile';
    setCurrentScreen(target);
    setPreferencesReturnTo('profile');
  };

  const handleBrewHistoryPress = () => {
    setSelectedBrewLog(null);
    setCurrentScreen('brew-history');
  };

  const handleBrewLogPress = () => {
    setCurrentScreen('brew-log');
  };

  const handleBrewHistoryLogPress = (log: BrewLog) => {
    setSelectedBrewLog(log);
    setCurrentScreen('brew-history-detail');
  };

  const handleBrewHistoryDetailBack = () => {
    setSelectedBrewLog(null);
    setCurrentScreen('brew-history');
  };

  const handleRecipeHistoryEntryPress = (entry: RecipeHistory) => {
    setSelectedRecipeHistory(entry);
    setCurrentScreen('recipe-history-detail');
  };

  const handleRecipeHistoryDetailBack = () => {
    setSelectedRecipeHistory(null);
    setCurrentScreen('brew');
  };

  const handleCommunityRecipesPress = () => {
    setCurrentScreen('community-recipes');
  };

  const handleSavedTipsPress = () => {
    setCurrentScreen('saved-tips');
  };

  const handleScanHistoryBack = () => {
    setSelectedScan(null);
    setCurrentScreen('scanner');
  };

  const handleScanDetailBack = () => {
    setSelectedScan(null);
    setCurrentScreen('scan-history');
  };

  // Navigate to coffee detail when a card is tapped in "Moje kávy".
  const handleCoffeePress = (coffeeId: string) => {
    setSelectedCoffeeId(coffeeId);
    setCurrentScreen('coffee-detail');
  };

  // Navigate back from coffee detail to the coffee list, resetting selected state.
  const handleCoffeeDetailBack = () => {
    setSelectedCoffeeId(null);
    setCurrentScreen('discover');
  };

  const handleBackPress = () => {
    setSelectedBrewLog(null);
    setSelectedRecipeHistory(null);
    setSelectedScan(null);
    setSelectedCoffeeId(null);
    setCurrentScreen('home');
  };

  if (!supabaseConfigured) {
    const envSummary =
      missingEnvVars.length > 0
        ? `Missing env vars: ${missingEnvVars.join(', ')}`
        : 'Supabase client is not initialized.';

    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.alertWrapper}>
          <View
            style={[
              styles.alertCard,
              {
                borderColor: colors.primary,
                backgroundColor: colors.cardBackground,
              },
            ]}
          >
            <Text style={[styles.alertTitle, { color: colors.primary }]}>Supabase configuration needed</Text>
            <Text style={[styles.alertMessage, { color: colors.text }]}>{envSummary}</Text>
            <Text style={[styles.alertMessage, { color: colors.text }]}>Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.</Text>
          </View>
        </View>
      </ResponsiveWrapper>
    );
  }


  if (!isAuthenticated) {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >

        <AuthScreen notice={authNotice ?? undefined} />
      </ResponsiveWrapper>
    );
  }



  if (!isTasteQuizComplete && personalizationReady) {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >

        <TasteProfileQuizScreen
          onComplete={async (quizResult) => {
            try {
              await EncryptedStorage.setItem(TASTE_QUIZ_STORAGE_KEY, 'true');
            } catch (error) {
              console.warn('App: failed to persist taste quiz status', error);
            }
            setPersonalization((prev) => ({
              ...prev,
              quizResult,
            }));
            setIsTasteQuizComplete(true);
          }}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'scanner') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <CoffeeTasteScanner onHistoryPress={handleScanHistoryPress} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'scan-history') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleScanHistoryBack}
          >
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <ScanHistoryScreen onBack={handleScanHistoryBack} onSelectScan={handleScanDetailPress} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'scan-detail') {
    if (!selectedScan) {
      return null;
    }

    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleScanDetailBack}
          >
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <ScanDetailScreen scan={selectedScan} onBack={handleScanDetailBack} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'coffee-detail') {
    if (!selectedCoffeeId) {
      return null;
    }

    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleCoffeeDetailBack}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <ScannedCoffeeDetailScreen coffeeId={selectedCoffeeId} onBack={handleCoffeeDetailBack} />
        <BottomNav
          active="discover"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'brew') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <CoffeeReceipeScanner
          onRecipeGenerated={(recipe) => {
            setGeneratedRecipe(recipe);
            setSelectedRecipeDevice(undefined);
            setRecipeStepsReturnTo('brew');
            setCurrentScreen('recipe-steps');
          }}
          onRecipeHistoryPress={handleRecipeHistoryEntryPress}
          onSeeAllRecipes={handleSeeAllRecipes}
        />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'recipe-steps') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
        </View>
        <RecipeStepsScreen
          recipe={generatedRecipe}
          brewDevice={selectedRecipeDevice}
          onBack={() => {
            const target = recipeStepsReturnTo;
            setCurrentScreen(target);
            if (target !== 'brew') {
              setSelectedRecipeDevice(undefined);
            }
            setRecipeStepsReturnTo('brew');
          }}
        />
        <BottomNav
          active={recipeStepsReturnTo === 'recipes' ? 'recipes' : 'home'}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'recipe-history-detail') {
    if (!selectedRecipeHistory) {
      return null;
    }

    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleRecipeHistoryDetailBack}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <RecipeHistoryDetailScreen entry={selectedRecipeHistory} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'profile') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <UserProfile
          onEdit={() => setCurrentScreen('edit-profile')}
          onPreferences={handleProfilePreferencesPress}
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'edit-profile') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <EditUserProfile onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'preferences') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <CoffeePreferenceForm onBack={handlePreferencesBack} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'edit-preferences') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <EditPreferences onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'recipes') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <RecipesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
          onRecipeSelect={(recipe: Recipe) => {
            setGeneratedRecipe(recipe.instructions);
            setSelectedRecipeDevice(recipe.brewDevice);
            setRecipeStepsReturnTo('recipes');
            setCurrentScreen('recipe-steps');
          }}
        />
      </ResponsiveWrapper>
    );
  }


  if (currentScreen === 'favorites') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <TipsScreen />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'saved-tips') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <SavedTipsScreen />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'inventory') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <InventoryScreen />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'brew-history') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <View style={styles.headerActionsGroup}>
            <TouchableOpacity
              style={[styles.headerActionButton, { backgroundColor: colors.accent }]}
              onPress={handleBrewLogPress}
              testID="open-brew-log-form">
              <Text style={styles.headerActionButtonText}>+ Nový záznam</Text>
            </TouchableOpacity>
          </View>
        </View>
        <BrewHistoryScreen onAddLog={handleBrewLogPress} onLogPress={handleBrewHistoryLogPress} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'brew-history-detail') {
    if (!selectedBrewLog) {
      return null;
    }

    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBrewHistoryDetailBack}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <BrewHistoryDetailScreen log={selectedBrewLog} />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'brew-log') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <BrewLogForm
          onSaved={() => {
            Alert.alert('Záznam uložený', 'Tvoj záznam bol pridaný do histórie.', [
              {
                text: 'OK',
                onPress: () => setCurrentScreen('brew-history'),
              },
            ]);
          }}
          onError={() => {
            Alert.alert('Chyba', 'Nepodarilo sa uložiť záznam. Skúste to znova neskôr.');
          }}
        />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'personalization') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexGrow: 0, flexShrink: 1 }}>
            <PersonalizationDashboard
              quizResult={personalization.quizResult ?? undefined}
              profile={personalization.profile ?? undefined}
              confidence={personalization.confidenceScores}
              onToggleExperiment={handleExperimentToggle}
              experimentsEnabled={personalization.experimentsEnabled}
            />
          </View>

        </View>
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'discover') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <View style={styles.header}>
        </View>
        <DiscoverCoffeesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
          onCoffeePress={handleCoffeePress}
        />
      </ResponsiveWrapper>
    );
  }

  return (
    <ResponsiveWrapper
      backgroundColor={colors.background}
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackground={colors.background}
    >
      <View style={styles.header}>
      </View>
      <HomeScreen
        onHomePress={handleBackPress}
        onScanPress={handleScannerPress}
        onBrewPress={handleBrewPress}
        onProfilePress={handleProfilePress}
        onDiscoverPress={handleDiscoverPress}
        onRecipesPress={handleRecipesPress}
        onFavoritesPress={handleFavoritesPress}
        onInventoryPress={handleInventoryPress}
        onPersonalizationPress={handlePersonalizationPress}
      />
    </ResponsiveWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  headerActionButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(14),
  },
  headerActionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: scale(14),
  },
  alertWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  alertCard: {
    width: '100%',
    maxWidth: 520,
    padding: scale(20),
    borderRadius: scale(16),
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: scale(8),
  },
  alertMessage: {
    fontSize: scale(14),
    lineHeight: scale(20),
    marginBottom: scale(8),
  },
  backButton: {
    paddingHorizontal: scale(15),
    paddingVertical: scale(8),
    borderRadius: scale(15),
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: scale(14),
  },
});

export default function App(): React.JSX.Element {
  const [personalization, setPersonalization] = useState<PersonalizationContextValue>(
    () => ({ ...emptyPersonalizationState }),
  );

  const contextValue = useMemo(() => personalization, [personalization]);

  return (
    <ThemeProvider>
      <PersonalizationContext.Provider value={contextValue}>
        <AppContent personalization={personalization} setPersonalization={setPersonalization} />
      </PersonalizationContext.Provider>
    </ThemeProvider>
  );
}
