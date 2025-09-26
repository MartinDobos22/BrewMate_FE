// App.tsx
import React, { useState, useEffect, useMemo, createContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './src/components/AuthVisual.tsx';
import HomeScreen from './src/components/HomeScreen';
import CoffeeTasteScanner from './src/components/CoffeeTasteScanner.tsx';
import CoffeeReceipeScanner from './src/components/CoffeeReceipeScanner.tsx';
import AllCoffeesScreen from './src/components/AllCoffeesScreen';
import AIChatScreen from './src/components/AIChatScreen';
import UserProfile from './src/components/UserProfile';
import GamificationScreen from './src/screens/GamificationScreen';
import EditUserProfile from './src/components/EditUserProfile';
import CoffeePreferenceForm from './src/components/CoffeePreferenceForm';
import EditPreferences from './src/components/EditPreferences';
import RecipeStepsScreen from './src/components/RecipeStepsScreen';
import OnboardingScreen from './src/components/OnboardingScreen';
import PersonalizationDashboard from './src/components/personalization/PersonalizationDashboard';
import FlavorJourneyMap from './src/components/personalization/FlavorJourneyMap';
import AICoachChat from './src/components/personalization/AICoachChat';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { scale } from './src/theme/responsive';
import ResponsiveWrapper from './src/components/ResponsiveWrapper';
import SavedRecipesScreen from './src/components/SavedRecipesScreen';
import TasteProfileQuizScreen from './src/screens/TasteProfileQuizScreen';
import BottomNav from './src/components/BottomNav';
import { scheduleLowStockCheck } from './src/utils/reminders';
import InventoryScreen from './src/screens/InventoryScreen';
import { coffeeOfflineManager, offlineSync } from './src/offline';
import {
  ConnectionStatusBar,
  QueueStatusBadge,
  SyncProgressIndicator,
} from 'src/components/offline';
import { fetchRecipes, fetchRecipeHistory } from './src/services/recipeServices';
import { fetchCoffees, fetchScanHistory } from './src/services/homePagesService';
import { fetchRecentScans } from './src/services/coffeeServices';
import EncryptedStorage from 'react-native-encrypted-storage';
import Animated, {FadeInRight, FadeOutLeft, Layout as ReanimatedLayout} from 'react-native-reanimated';
import { MorningRitualManager } from './src/services/MorningRitualManager';
import { PreferenceLearningEngine } from './src/services/PreferenceLearningEngine';
import { CoffeeDiary } from './src/services/CoffeeDiary';
import { PrivacyManager } from './src/services/PrivacyManager';
import { FlavorJourneyRepository } from './src/services/flavor/FlavorJourneyRepository';
import { FlavorEmbeddingService } from './src/services/flavor/FlavorEmbeddingService';
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
  UserTasteProfile,
} from './src/types/Personalization';
import type { FlavorJourneyMilestone, MoodSignal, TasteQuizResult } from './src/types/PersonalizationAI';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { LearningEventProvider } from './src/services/PrivacyManager';

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
  | 'favorites'
  | 'inventory'
  | 'gamification'
  | 'taste-quiz'
  | 'personalization';

const MORNING_RITUAL_CHANNEL_ID = 'brewmate-morning-ritual';
const WEATHER_CACHE_KEY = 'brewmate:ritual:last_weather';
const WAKE_TIME_STORAGE_KEY = 'brewmate:ritual:wake_time';
const WEEKDAY_PLAN_STORAGE_KEY = 'brewmate:ritual:weekday_plan';
const TASTE_QUIZ_STORAGE_KEY = 'brewmate:taste_quiz:complete';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabaseClient: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
  quizResult: TasteQuizResult | null;
  journeyMilestones: FlavorJourneyMilestone[];
  experimentsEnabled: boolean;
  moodSignals: MoodSignal[];
  sendCoachMessage: ((message: string) => Promise<string>) | null;
  profile: UserTasteProfile | null;
  confidenceScores: ConfidenceDatum[];
  insights: SmartDiaryInsight[];
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
  quizResult: null,
  journeyMilestones: [],
  experimentsEnabled: false,
  moodSignals: [],
  sendCoachMessage: null,
  profile: null,
  confidenceScores: [],
  insights: [],
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
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isTasteQuizComplete, setIsTasteQuizComplete] = useState(false);
  const [checkingTasteQuiz, setCheckingTasteQuiz] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncVisible, setSyncVisible] = useState(false);
  const { isDark, colors } = useTheme();
  const {
    ready: personalizationReady,
    morningRitualManager,
    learningEngine,
    coffeeDiary,
    privacyManager,
    userId,
  } = personalization;
  const flavorJourneyRepository = useMemo(() => new FlavorJourneyRepository(), []);
  const flavorEmbeddingService = useMemo(
    () => new FlavorEmbeddingService(flavorJourneyRepository),
    [flavorJourneyRepository],
  );
  const indicatorVisible = syncVisible || queueLength > 0;

  const timelineData = useMemo(() => {
    return personalization.journeyMilestones.slice(0, 6).map((milestone) => {
      const date = new Date(milestone.date);
      const formatted = Number.isNaN(date.getTime())
        ? milestone.date
        : date.toLocaleDateString('sk-SK');
      return {
        date: formatted,
        description: milestone.description,
      };
    });
  }, [personalization.journeyMilestones]);

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

  const handleCoachSend = useCallback(
    async (message: string) => {
      if (personalization.sendCoachMessage) {
        return personalization.sendCoachMessage(message);
      }
      return 'Personalizačné dáta sa ešte pripravujú.';
    },
    [personalization.sendCoachMessage],
  );

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
    const checkOnboarding = async () => {
      const value = await AsyncStorage.getItem('@OnboardingComplete');
      setIsOnboardingComplete(value === 'true');
      setCheckingOnboarding(false);
    };
    checkOnboarding();
  }, []);

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
    let isMounted = true;

    coffeeOfflineManager
      .purgeExpired()
      .catch((error) => console.warn('App: failed to purge offline cache', error));

    coffeeOfflineManager.startWifiPrefetch(fetchRecipes);
    offlineSync.start();

    const handleQueueChange = (count: number) => {
      if (!isMounted) {
        return;
      }
      setQueueLength(count);
      setSyncVisible(count > 0);
      setSyncProgress(count === 0 ? 1 : Math.max(0.1, Math.min(0.95, 1 / (count + 1))));
    };

    const unsubscribe = offlineSync.addListener(handleQueueChange);

    return () => {
      isMounted = false;
      unsubscribe();
    };
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

    if (!supabaseClient) {
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
      profile: null,
      confidenceScores: [],
      insights: [],
    }));

    const initializeServices = async () => {
      try {
        const learningStorage = new SupabaseLearningStorageAdapter(supabaseClient);
        const diaryStorage = new SupabaseDiaryStorageAdapter(supabaseClient);
        const eventProvider = new SupabaseLearningEventAdapter(supabaseClient);

        const engine = new PreferenceLearningEngine(activeUserId, { storage: learningStorage });
        await engine.initialize();

        const smartDiaryService = new SmartDiaryService(engine, flavorEmbeddingService);
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
        const insights = await smartDiaryService.generateInsights(activeUserId, existingEntries);
        if (cancelled) {
          return;
        }
        setPersonalization((prev) => ({
          ...prev,
          insights,
        }));

        setPersonalization((prev) => ({
          ...prev,
          userId: activeUserId,
          learningEngine: engine,
          coffeeDiary: diary,
          privacyManager: privacy,
          smartDiary: smartDiaryService,
          ready: true,
          profile: engine.getProfile(),
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
          }));
        }
      }
    };

    initializeServices();

    return () => {
      cancelled = true;
    };
  }, [flavorEmbeddingService, isAuthenticated, setPersonalization, userId]);

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

    const weatherProvider: WeatherProvider = {
      async getWeather() {
        try {
          const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as { condition?: string; temperatureC?: number; humidity?: number };
            if (parsed?.condition) {
              return parsed;
            }
          }
        } catch (error) {
          console.warn('App: failed to read cached weather', error);
        }

        const now = new Date();
        const hour = now.getHours();

        if (hour < 6) {
          return { condition: 'Skoré jasno', temperatureC: 12 };
        }
        if (hour < 12) {
          return { condition: 'Ranné slnko', temperatureC: 18 };
        }
        if (hour < 18) {
          return { condition: 'Jemná oblačnosť', temperatureC: 23 };
        }
        return { condition: 'Večerný vánok', temperatureC: 17 };
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
      weatherProvider,
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
    if (!userId) {
      return;
    }

    let active = true;

    const loadJourney = async () => {
      try {
        const milestones = await flavorJourneyRepository.fetchJourney(userId);
        if (!active) {
          return;
        }
        setPersonalization((prev) => {
          const identical =
            prev.journeyMilestones.length === milestones.length &&
            prev.journeyMilestones.every((existing, index) => existing.id === milestones[index]?.id);
          if (identical) {
            return prev;
          }
          return { ...prev, journeyMilestones: milestones };
        });
      } catch (error) {
        console.warn('App: failed to load flavor journey', error);
      }
    };

    loadJourney();

    return () => {
      active = false;
    };
  }, [flavorJourneyRepository, setPersonalization, userId, personalization.quizResult]);

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

  // Open dedicated scanner for preparing a drink (same as scan for now)
  const handleBrewPress = () => {
    setCurrentScreen('brew');
  };

  const handleProfilePress = () => {
    setCurrentScreen('profile');
  };

  const handleDiscoverPress = () => {
    setCurrentScreen('discover');
  };

  const handleRecipesPress = () => {
    setCurrentScreen('recipes');
  };

  const handleFavoritesPress = () => {
    setCurrentScreen('favorites');
  };

  const handleInventoryPress = () => {
    setCurrentScreen('inventory');
  };

  const handlePersonalizationPress = () => {
    setCurrentScreen('personalization');
  };

  const handleBackPress = () => {
    setCurrentScreen('home');
  };

  if (checkingOnboarding || checkingTasteQuiz) {
    return null;
  }

  if (!isOnboardingComplete) {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.background}
      >
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <OnboardingScreen onFinish={() => setIsOnboardingComplete(true)} />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <AuthScreen />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <QueueStatusBadge />
        </View>
        <CoffeeTasteScanner />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <QueueStatusBadge />
        </View>
        <CoffeeReceipeScanner
          onRecipeGenerated={(recipe) => {
            setGeneratedRecipe(recipe);
            setCurrentScreen('recipe-steps');
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <RecipeStepsScreen
          recipe={generatedRecipe}
          onBack={() => setCurrentScreen('brew')}
        />
        <BottomNav
          active="home"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <UserProfile
          onEdit={() => setCurrentScreen('edit-profile')}
          onPreferences={() => setCurrentScreen('preferences')}
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
          onGamification={() => setCurrentScreen('gamification')}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
      </ResponsiveWrapper>
    );
  }

  if (currentScreen === 'gamification') {
    return (
      <ResponsiveWrapper
        backgroundColor={colors.background}
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackground={colors.primary}
      >
        <ConnectionStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => setCurrentScreen('profile')}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <QueueStatusBadge />
        </View>
        <GamificationScreen />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <CoffeePreferenceForm onBack={() => setCurrentScreen('profile')} />
        <BottomNav
          active="profile"
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <SavedRecipesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <AllCoffeesScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <QueueStatusBadge />
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
          <QueueStatusBadge />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexGrow: 0, flexShrink: 1 }}>
            <PersonalizationDashboard
              quizResult={personalization.quizResult ?? undefined}
              profile={personalization.profile ?? undefined}
              confidence={personalization.confidenceScores}
              timeline={timelineData}
              onToggleExperiment={handleExperimentToggle}
              experimentsEnabled={personalization.experimentsEnabled}
              journey={personalization.journeyMilestones}
              insights={personalization.insights}
            />
          </View>
          {personalization.journeyMilestones.length ? (
            <View style={{ paddingHorizontal: scale(24), marginBottom: scale(16) }}>
              <FlavorJourneyMap milestones={personalization.journeyMilestones} />
            </View>
          ) : null}
          <View style={{ flex: 1, marginTop: scale(8) }}>
            <AICoachChat onSend={handleCoachSend} moodSignals={personalization.moodSignals} />
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
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
        <ConnectionStatusBar />
        <View style={styles.header}>
          <QueueStatusBadge />
        </View>
        <AIChatScreen
          onBack={handleBackPress}
          onHomePress={handleBackPress}
          onDiscoverPress={handleDiscoverPress}
          onRecipesPress={handleRecipesPress}
          onFavoritesPress={handleFavoritesPress}
          onProfilePress={handleProfilePress}
        />
        <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
      </ResponsiveWrapper>
    );
  }

  return (
    <ResponsiveWrapper
      backgroundColor={colors.background}
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackground={colors.background}
    >
      <ConnectionStatusBar />
      <View style={styles.header}>
        <QueueStatusBadge />
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
      <SyncProgressIndicator progress={syncProgress} visible={indicatorVisible} />
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
