import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { formatRecipeSteps } from '../../components/utils/AITextFormatter';
import type { RecipeStep } from '../../components/utils/AITextFormatter';
import type { BrewDevice } from '../../types/Recipe';
import { materialYouCoffee } from '../../theme/materialYouColors';

export interface RecipeStepsScreenProps {
  recipe: string;
  brewDevice?: BrewDevice;
  onBack: () => void;
}

type StepId = string;

interface TimerConfig {
  id: string;
  label: string;
  duration: number;
}

interface StepConfig {
  id: StepId;
  title: string;
  subtitle?: string;
  icon: string;
  timers?: TimerConfig[];
  pills?: { icon: string; text: string; dynamic?: boolean; unit?: string; base?: number }[];
  tips?: string[];
  troubleshoot?: string[];
  description?: string;
}

type TimerState = {
  remaining: number;
  running: boolean;
  completed: boolean;
};

const STEP_CONFIG: StepConfig[] = [
  {
    id: 'intro',
    icon: '☕',
    title: 'V60 Pour Over',
    subtitle: 'PERSONALIZOVANÝ RECEPT',
  },
  {
    id: 'ingredients',
    icon: '📝',
    title: 'Ingrediencie',
    subtitle: 'ČO POTREBUJEŠ',
    tips: [
      'Čerstvosť kávy je kľúčová - ideálne do 30 dní od praženia',
      'Mletie tesne pred prípravou zachová arómu',
      'Filtrovaná voda zlepší chuť kávy',
    ],
  },
  {
    id: 'preparation',
    icon: '🚰',
    title: 'Príprava',
    subtitle: 'KROK 1',
    timers: [
      {
        id: 'heat',
        label: 'Čas zahrievania',
        duration: 120,
      },
    ],
    pills: [
      { icon: '🌡️', text: '93°C' },
      { icon: '⏱️', text: '2 min' },
    ],
    troubleshoot: [
      'Voda veľmi horúca? Počkaj 1-2 minúty',
      'Nemáš teplomer? Po vare počkaj 30s',
    ],
  },
  {
    id: 'coffee',
    icon: '⚖️',
    title: 'Pridaj kávu',
    subtitle: 'KROK 2',
    pills: [
      { icon: '⚖️', text: '', dynamic: true, base: 15, unit: 'g' },
      { icon: '📏', text: 'Stredne hrubá' },
    ],
    tips: [
      'Jamka v strede pomôže rovnomernému zalievaniu',
      'Konzistencia ako krupicový cukor je ideálna',
      'Príliš jemné mletie = pomalá extrakcia',
    ],
  },
  {
    id: 'bloom',
    icon: '💧',
    title: 'Blooming',
    subtitle: 'KROK 3',
    timers: [
      {
        id: 'bloom',
        label: 'Blooming čas',
        duration: 30,
      },
    ],
    pills: [
      { icon: '💧', text: '', dynamic: true, base: 50, unit: 'ml' },
      { icon: '⏱️', text: '30s' },
      { icon: '🌡️', text: '93°C' },
    ],
    troubleshoot: [
      'Žiadne bubliny? Káva môže byť stará',
      'Veľa bublín? Perfektne čerstvá káva!'
    ],
  },
  {
    id: 'pour1',
    icon: '⏰',
    title: 'Prvé liatie',
    subtitle: 'KROK 4',
    timers: [
      {
        id: 'pour1',
        label: 'Čas liatia',
        duration: 30,
      },
    ],
    pills: [
      { icon: '💧', text: '', dynamic: true, base: 150, unit: 'ml' },
      { icon: '⏱️', text: '1:00' },
    ],
    tips: [
      'Udržuj prúd vody tenký ako ceruzka',
      'Vyhni sa zalievaniu okrajov filtra',
      'Hladina by nemala klesnúť úplne',
    ],
  },
  {
    id: 'pour2',
    icon: '🌀',
    title: 'Druhé liatie',
    subtitle: 'KROK 5',
    timers: [
      {
        id: 'pour2',
        label: 'Čas liatia',
        duration: 45,
      },
    ],
    pills: [
      { icon: '💧', text: '', dynamic: true, base: 250, unit: 'ml' },
      { icon: '⏱️', text: '2:00' },
    ],
  },
  {
    id: 'finish',
    icon: '☕',
    title: 'Dokončenie',
    subtitle: 'KROK 6',
    timers: [
      {
        id: 'finish',
        label: 'Finálne kvapkanie',
        duration: 30,
      },
    ],
    pills: [
      { icon: '⏱️', text: '2:30-3:00' },
      { icon: '🌡️', text: '60-65°C' },
    ],
    troubleshoot: [
      '< 2:00? Zmeľ jemnejšie',
      '> 3:30? Zmeľ hrubšie',
      '2:30-3:00? Perfektné! ✅',
    ],
  },
  {
    id: 'enjoy',
    icon: '🎉',
    title: 'Hotovo!',
    subtitle: 'VYCHUTNAJ SI',
  },
  {
    id: 'rating',
    icon: '⭐',
    title: 'Hodnotenie',
    subtitle: 'AKO CHUTILA?',
  },
];

const STEP_TYPE_LABELS: Partial<Record<RecipeStep['type'], string>> = {
  hero: 'ÚVOD',
  ingredients: 'INGREDIENCIE',
  equipment: 'NÁČINIE',
  grind: 'MLETIE',
  heat: 'ZAHRIATIE',
  bloom: 'BLOOM',
  pour1: 'LIATIE',
  pour2: 'LIATIE',
  finish: 'DOKONČENIE',
  summary: 'ZHRNUTIE',
};

const SERVING_OPTIONS = [1, 2, 4] as const;

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const pluralize = (base: number, unit: string, servings: number) => {
  const value = base * servings;
  if (unit === ' šálku') {
    if (value === 1) return '1 šálku';
    if (value >= 2 && value <= 4) return `${value} šálky`;
    return `${value} šálok`;
  }
  if (unit === ' porciu') {
    if (value === 1) return '1 porciu';
    if (value >= 2 && value <= 4) return `${value} porcie`;
    return `${value} porcií`;
  }
  return `${value}${unit}`;
};

const DynamicValue: React.FC<{
  base: number;
  unit: string;
  servings: number;
}> = ({ base, unit, servings }) => {
  return <Text style={styles.dynamicValue}>{pluralize(base, unit, servings)}</Text>;
};

const ChecklistItem: React.FC<{
  label: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
}> = ({ label, checked, onToggle }) => {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.checklistItem, checked && styles.checklistItemChecked]}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxCheck}>✓</Text>}
      </View>
      <Text style={[styles.checklistLabel, checked && styles.checklistLabelChecked]}>{label}</Text>
    </TouchableOpacity>
  );
};

const TipsCarousel: React.FC<{
  tips: string[];
}> = ({ tips }) => {
  const [index, setIndex] = useState(0);

  return (
    <View style={styles.tipsContainer}>
      <View style={styles.tipContent}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>{tips[index]}</Text>
      </View>
      <View style={styles.tipDots}>
        {tips.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.tipDot, i === index && styles.tipDotActive]}
            onPress={() => setIndex(i)}
          />
        ))}
      </View>
    </View>
  );
};

const RecipeStepsScreenMD3: React.FC<RecipeStepsScreenProps> = ({
  recipe,
  brewDevice,
  onBack,
}) => {
  const parsedSteps = useMemo(() => formatRecipeSteps(recipe), [recipe]);
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [servings, setServings] = useState<typeof SERVING_OPTIONS[number]>(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [mainTimer, setMainTimer] = useState(0);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(0);
  const achievementAnim = useRef(new Animated.Value(-120)).current;
  const [achievementText, setAchievementText] = useState('');
  const achievementTimeout = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<FlatList<StepConfig> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const steps = useMemo(() => {
    const baseFlowSteps = STEP_CONFIG.filter((step) => step.id !== 'rating');
    const ratingStep = STEP_CONFIG.find((step) => step.id === 'rating');
    const hasAIContent = parsedSteps.length > 0;

    const mergeStep = (baseStep: StepConfig | undefined, aiStep: RecipeStep, index: number): StepConfig => {
      const stepId = baseStep?.id ?? `ai-step-${aiStep.number ?? index + 1}`;
      const aiDescription = aiStep.text?.trim();
      const aiTip = aiStep.tip ? [aiStep.tip] : [];
      const baseTips = baseStep?.tips ?? [];
      const combinedTips = [...aiTip, ...baseTips];

      const baseTimers = baseStep?.timers ?? [];
      const timers = [...baseTimers];
      if (aiStep.time) {
        const aiTimerIdBase = `${stepId}-ai-timer`;
        const uniqueAiTimerId = timers.some((timer) => timer.id === aiTimerIdBase)
          ? `${aiTimerIdBase}-${timers.length}`
          : aiTimerIdBase;
        timers.push({
          id: uniqueAiTimerId,
          label: baseTimers[0]?.label ?? 'Odhadovaný čas kroku',
          duration: aiStep.time,
        });
      }

      const subtitleFromAI = aiStep.type ? STEP_TYPE_LABELS[aiStep.type] ?? aiStep.type.toUpperCase() : undefined;

      return {
        ...(baseStep ? { ...baseStep } : {}),
        id: stepId,
        icon: baseStep?.icon ?? aiStep.icon ?? '☕',
        title:
          baseStep?.title ??
          (aiStep.type === 'hero'
            ? 'Začnime'
            : `Krok ${aiStep.number ?? index + 1}`),
        subtitle: baseStep?.subtitle ?? subtitleFromAI,
        tips: combinedTips.length > 0 ? combinedTips : undefined,
        timers: timers.length > 0 ? timers : undefined,
        description: aiDescription || baseStep?.description,
      };
    };

    if (!hasAIContent) {
      return ratingStep ? [...baseFlowSteps, ratingStep] : [...baseFlowSteps];
    }

    const mergedBaseSteps: StepConfig[] = parsedSteps
      .slice(0, baseFlowSteps.length)
      .map((aiStep, index) => mergeStep(baseFlowSteps[index], aiStep, index));

    const additionalAISteps: StepConfig[] = parsedSteps
      .slice(baseFlowSteps.length)
      .map((aiStep, index) => mergeStep(undefined, aiStep, index + baseFlowSteps.length));

    const combined = [...mergedBaseSteps, ...additionalAISteps];

    if (ratingStep) {
      combined.push({ ...ratingStep });
    }

    return combined;
  }, [parsedSteps]);

  const allTimers = useMemo(() => {
    const states: Record<string, TimerState> = {};
    steps.forEach((step) => {
      step.timers?.forEach((timer) => {
        states[timer.id] = {
          remaining: timer.duration,
          running: false,
          completed: false,
        };
      });
    });
    return states;
  }, [steps]);

  const [timerStates, setTimerStates] = useState<Record<string, TimerState>>(allTimers);
  const timerIntervals = useRef<Record<string, NodeJS.Timeout | null>>({});

  useEffect(() => {
    const validTimerIds = new Set(Object.keys(allTimers));
    Object.entries(timerIntervals.current).forEach(([timerId, interval]) => {
      if (!validTimerIds.has(timerId) && interval) {
        clearInterval(interval);
        delete timerIntervals.current[timerId];
      }
    });
    setTimerStates(allTimers);
  }, [allTimers]);

  useEffect(() => {
    mainTimerRef.current = setInterval(() => {
      setMainTimer((prev) => prev + 1);
    }, 1000);
    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timerIntervals.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
      if (achievementTimeout.current) clearTimeout(achievementTimeout.current);
    };
  }, []);

  useEffect(() => {
    setCompleted((prev) => prev.filter((index) => index < steps.length));
    setCurrentIndex((prev) => {
      if (steps.length === 0) {
        return 0;
      }
      return prev >= steps.length ? steps.length - 1 : prev;
    });
  }, [steps.length]);

  const showAchievement = useCallback(
    (text: string) => {
      if (achievementTimeout.current) {
        clearTimeout(achievementTimeout.current);
      }
      setAchievementText(text);
      Animated.spring(achievementAnim, {
        toValue: 100,
        useNativeDriver: true,
        friction: 6,
      }).start();

      achievementTimeout.current = setTimeout(() => {
        Animated.spring(achievementAnim, {
          toValue: -120,
          useNativeDriver: true,
        }).start();
      }, 3000);
    },
    [achievementAnim]
  );

  const resetTimers = useCallback(() => {
    Object.values(timerIntervals.current).forEach((interval) => {
      if (interval) clearInterval(interval);
    });
    timerIntervals.current = {};
    setTimerStates(allTimers);
  }, [allTimers]);

  const resetExperience = useCallback(() => {
    setCurrentIndex(0);
    setCompleted([]);
    setServings(1);
    setMainTimer(0);
    setCheckedItems({});
    setRating(0);
    setNotes({});
    resetTimers();
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = setInterval(() => {
        setMainTimer((prev) => prev + 1);
      }, 1000);
    }
  }, [resetTimers]);

  const startTimer = useCallback(
    (timer: TimerConfig) => {
      setTimerStates((prev) => ({
        ...prev,
        [timer.id]: {
          remaining: timer.duration,
          running: true,
          completed: false,
        },
      }));

      if (timerIntervals.current[timer.id]) {
        clearInterval(timerIntervals.current[timer.id]!);
      }

      timerIntervals.current[timer.id] = setInterval(() => {
        setTimerStates((prev) => {
          const current = prev[timer.id];
          if (!current) return prev;
          if (!current.running) return prev;
          const nextRemaining = current.remaining - 1;
          if (nextRemaining < 0) {
            clearInterval(timerIntervals.current[timer.id]!);
            timerIntervals.current[timer.id] = null;
            showAchievement('Časovač dokončený! ⏰');
            return {
              ...prev,
              [timer.id]: {
                remaining: 0,
                running: false,
                completed: true,
              },
            };
          }
          return {
            ...prev,
            [timer.id]: {
              remaining: nextRemaining,
              running: true,
              completed: false,
            },
          };
        });
      }, 1000);
    },
    [showAchievement]
  );

  const toggleChecklist = useCallback((key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onShare = useCallback(async () => {
    const shareTitle = brewDevice
      ? `BrewMate ${brewDevice} recept`
      : 'BrewMate recept';
    const recipeSteps = steps.filter((step) => step.id !== 'rating');
    const maxCount = Math.max(parsedSteps.length, recipeSteps.length);
    const shareLines = Array.from({ length: maxCount }, (_, index) => {
      const aiStep = parsedSteps[index];
      const configStep = recipeSteps[index];
      const text = aiStep?.text?.trim() || configStep?.description || configStep?.title;
      if (!text) return null;
      const label = aiStep?.number ?? index + 1;
      return `${label}. ${text}`;
    }).filter(Boolean) as string[];

    const message = shareLines.join('\n');

    try {
      await Share.share({
        title: shareTitle,
        message: message || 'Skvelý recept z BrewMate!',
      });
    } catch (error) {
      console.error('share failed', error);
    }
  }, [brewDevice, parsedSteps, steps]);

  const goToIndex = (index: number) => {
    if (index < 0 || index >= steps.length) {
      return;
    }
    listRef.current?.scrollToOffset({
      offset: index * width,
      animated: true,
    });
  };

  const navigate = (direction: 1 | -1) => {
    if (direction === 1) {
      if (!completed.includes(currentIndex)) {
        setCompleted((prev) => [...prev, currentIndex]);
      }
      if (currentIndex < steps.length - 1) {
        goToIndex(currentIndex + 1);
      } else {
        completeExperience();
      }
    } else {
      if (currentIndex > 0) {
        goToIndex(currentIndex - 1);
      }
    }
  };

  const completeExperience = () => {
    const totalRecipeSteps = steps.filter((step) => step.id !== 'rating').length;
    const totalForSummary = totalRecipeSteps || Math.max(steps.length - 1, 0);
    const safeTotalForSummary = totalForSummary || steps.length || 1;
    const completedSteps = completed.filter((index) => steps[index]?.id !== 'rating').length;
    const clampedCompleted = Math.min(completedSteps, safeTotalForSummary);
    const summary = `☕ Recept dokončený!\n⏱️ Čas: ${formatTime(mainTimer)}\n⭐ Hodnotenie: ${rating || 'bez hodnotenia'}\n✅ Kroky: ${clampedCompleted}/${safeTotalForSummary}`;
    Alert.alert('Skvelá práca!', summary, [{ text: 'Super!', onPress: onBack }]);
  };

  const toggleVoice = () => {
    setVoiceEnabled((prev) => !prev);
    setVoiceVisible(true);
    setTimeout(() => setVoiceVisible(false), 2500);
    showAchievement('Audio sprievodca je dostupný 🎤');
  };

  const openNotes = () => {
    setNotesModalVisible(true);
  };

  const closeNotes = () => {
    setNotesModalVisible(false);
  };

  const saveNotes = (text: string) => {
    const stepId = steps[currentIndex]?.id;
    if (!stepId) return;
    setNotes((prev) => ({ ...prev, [stepId]: text }));
    showAchievement('Poznámka uložená 📝');
    closeNotes();
  };

  const renderTimer = (timer: TimerConfig) => {
    const state = timerStates[timer.id];
    const display = state?.completed
      ? 'Hotovo!'
      : state
      ? formatTime(state.remaining)
      : formatTime(timer.duration);
    return (
      <View key={timer.id} style={styles.timerSection}>
        <Text style={styles.timerLabel}>{timer.label}</Text>
        <Text style={styles.timerCountdown}>{display}</Text>
        <TouchableOpacity
          style={styles.timerButton}
          onPress={() => startTimer(timer)}
        >
          <Text style={styles.timerButtonText}>Štart</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTips = (tips?: string[]) => {
    if (!tips || tips.length === 0) return null;
    return <TipsCarousel tips={tips} />;
  };

  const renderTroubleshoot = (items?: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={styles.troubleshootContainer}>
        <Text style={styles.troubleshootTitle}>⚠️ Riešenie problémov:</Text>
        {items.map((item, index) => (
          <Text key={index} style={styles.troubleshootText}>
            • {item}
          </Text>
        ))}
      </View>
    );
  };

  const renderPills = (step: StepConfig) => {
    if (!step.pills || step.pills.length === 0) return null;
    return (
      <View style={styles.pillsContainer}>
        {step.pills.map((pill, index) => (
          <View key={index} style={styles.pill}>
            <Text style={styles.pillIcon}>{pill.icon}</Text>
            <Text style={styles.pillText}>
              {pill.dynamic && pill.base && pill.unit
                ? pluralize(pill.base, ` ${pill.unit}`, servings)
                : pill.text}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderIntroChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'intro-gear', label: 'Mám všetky potrebné veci' },
        { id: 'intro-ready', label: 'Som pripravený začať' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderIngredientsChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        {
          id: 'ing-coffee',
          label: (
            <Text>
              ☕ <DynamicValue base={15} unit=" g" servings={servings} /> kávy
            </Text>
          ),
        },
        {
          id: 'ing-water',
          label: (
            <Text>
              💧 <DynamicValue base={250} unit=" ml" servings={servings} /> vody (93°C)
            </Text>
          ),
        },
        { id: 'ing-dripper', label: '📐 V60 dripper' },
        { id: 'ing-filter', label: '📄 Papierový filter' },
        { id: 'ing-scale', label: '⚖️ Váha s časovačom' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderPreparationChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'prep-temp', label: 'Voda je na teplote' },
        { id: 'prep-filter', label: 'Filter je vo V60' },
        { id: 'prep-rinse', label: 'Filter opláchnutý horúcou vodou' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderCoffeeChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'coffee-grind', label: 'Káva pomletá' },
        { id: 'coffee-filter', label: 'Nasypaná do filtra' },
        { id: 'coffee-well', label: 'Vytvorená jamka v strede' },
        { id: 'coffee-tare', label: 'Váha vynulovaná' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderBloomChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'bloom-timer', label: 'Stopky spustené' },
        {
          id: 'bloom-water',
          label: (
            <Text>
              <DynamicValue base={50} unit=" ml" servings={servings} /> vody zaliate
            </Text>
          ),
        },
        { id: 'bloom-bubbles', label: 'Káva "kvitne" (bubliny CO2)' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderPour1Checklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'pour1-spiral', label: 'Liatie v špirále' },
        { id: 'pour1-level', label: 'Konštantná výška hladiny' },
        {
          id: 'pour1-volume',
          label: (
            <Text>
              Dosiahnuté <DynamicValue base={150} unit=" ml" servings={servings} />
            </Text>
          ),
        },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderPour2Checklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'pour2-continue', label: 'Pokračujem v lievaní' },
        {
          id: 'pour2-volume',
          label: (
            <Text>
              Dosiahnuté <DynamicValue base={250} unit=" ml" servings={servings} />
            </Text>
          ),
        },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderFinishChecklist = () => (
    <View style={styles.checklistWrapper}>
      {[
        { id: 'finish-drip', label: 'Všetka voda prekvapkala' },
        { id: 'finish-filter', label: 'Filter odstránený' },
        { id: 'finish-stir', label: 'Káva zamiešaná' },
      ].map((item) => (
        <ChecklistItem
          key={item.id}
          label={item.label}
          checked={!!checkedItems[item.id]}
          onToggle={() => toggleChecklist(item.id)}
        />
      ))}
    </View>
  );

  const renderEnjoyChecklist = () => (
    <View style={styles.checklistWrapper}>
      <ChecklistItem label="Recept dokončený! 🎉" checked onToggle={() => {}} />
    </View>
  );

  const renderRating = () => (
    <View style={styles.ratingContainer}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={[styles.starButton, star <= rating && styles.starFilled]}
            onPress={() => {
              setRating(star);
              if (star === 5) {
                showAchievement('Master Barista! ☕');
              }
            }}
          >
            <Text style={[styles.starIcon, star <= rating && styles.starIconFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingMessage}>
        {rating === 0
          ? 'Klikni na hviezdičky'
          : {
              1: 'Ďakujeme za spätnú väzbu 📝',
              2: 'Pokúsime sa zlepšiť 💪',
              3: 'Dobré! 👍',
              4: 'Výborné! 😊',
              5: 'Perfektné! Si profík! 🎉',
            }[rating]}
      </Text>
    </View>
  );

  const renderPrimaryText = (
    description: string | undefined,
    fallback: React.ReactNode
  ) => {
    if (description) {
      return <Text style={styles.cardText}>{description}</Text>;
    }
    return <>{fallback}</>;
  };

  const renderStepContent = (step: StepConfig) => {
    const { description } = step;

    switch (step.id) {
      case 'intro':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <>
                <Text style={styles.introHighlight}>
                  Pripravíme <DynamicValue base={1} unit=" šálku" servings={servings} /> perfektnej kávy!
                </Text>
                <Text style={styles.cardText}>
                  Tento interaktívny recept ťa prevedie každým krokom s časovačmi, tipmi a riešením problémov.
                </Text>
              </>
            )}
            {renderIntroChecklist()}
          </View>
        );
      case 'ingredients':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <Text style={styles.cardText}>
                Pre <DynamicValue base={1} unit=" porciu" servings={servings} />:
              </Text>
            )}
            {renderIngredientsChecklist()}
            <View style={styles.troubleshootContainer}>
              <Text style={styles.troubleshootTitle}>⚠️ Alternatívy:</Text>
              <Text style={styles.troubleshootText}>• Bez váhy: 1 polievková lyžica = ~7g kávy</Text>
              <Text style={styles.troubleshootText}>• Bez teplomera: Voda 30s po vare = ~93°C</Text>
            </View>
          </View>
        );
      case 'preparation':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <Text style={styles.cardText}>
                <Text style={styles.bold}>Zahrej </Text>
                <DynamicValue base={300} unit=" ml" servings={servings} /> vody na 93°C
              </Text>
            )}
            {step.timers?.map(renderTimer)}
            {renderPreparationChecklist()}
          </View>
        );
      case 'coffee':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <>
                <Text style={styles.cardText}>
                  <Text style={styles.bold}>Odvážte </Text>
                  <DynamicValue base={15} unit=" g" servings={servings} /> kávy
                </Text>
                <Text style={styles.cardText}>Pomeľ na stredne hrubú konzistenciu (ako krupicový cukor)</Text>
              </>
            )}
            {renderCoffeeChecklist()}
          </View>
        );
      case 'bloom':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <Text style={styles.cardText}>
                <Text style={styles.bold}>Zalej </Text>
                <DynamicValue base={50} unit=" ml" servings={servings} /> vody a čakaj
              </Text>
            )}
            {step.timers?.map(renderTimer)}
            {renderBloomChecklist()}
            {renderTroubleshoot(step.troubleshoot)}
          </View>
        );
      case 'pour1':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <>
                <Text style={styles.cardText}>
                  <Text style={styles.bold}>Dolej do </Text>
                  <DynamicValue base={150} unit=" ml" servings={servings} /> celkovo
                </Text>
                <Text style={styles.cardSubtext}>Lievaj v špirále od stredu von</Text>
              </>
            )}
            {step.timers?.map(renderTimer)}
            {renderPour1Checklist()}
          </View>
        );
      case 'pour2':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <Text style={styles.cardText}>
                <Text style={styles.bold}>Dolej do </Text>
                <DynamicValue base={250} unit=" ml" servings={servings} /> celkovo
              </Text>
            )}
            {step.timers?.map(renderTimer)}
            {renderPour2Checklist()}
          </View>
        );
      case 'finish':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <>
                <Text style={styles.cardText}>
                  <Text style={styles.bold}>Nechaj všetko prekvapkať</Text>
                </Text>
                <Text style={styles.cardSubtext}>Celkový čas: 2:30 - 3:00</Text>
              </>
            )}
            {step.timers?.map(renderTimer)}
            {renderFinishChecklist()}
            {renderTroubleshoot(step.troubleshoot)}
          </View>
        );
      case 'enjoy':
        return (
          <View style={styles.cardContent}>
            {renderPrimaryText(
              description,
              <>
                <Text style={styles.cardText}>
                  <Text style={styles.bold}>Tvoja káva je pripravená! ☕</Text>
                </Text>
                <Text style={styles.cardSubtext}>Celkový čas prípravy: {formatTime(mainTimer)}</Text>
              </>
            )}
            {renderEnjoyChecklist()}
          </View>
        );
      case 'rating':
        return <View style={styles.cardContent}>{renderRating()}</View>;
      default:
        return (
          <View style={styles.cardContent}>
            {description ? (
              <Text style={styles.cardText}>{description}</Text>
            ) : (
              <Text style={styles.cardText}>Pokračuj podľa pokynov na obrazovke.</Text>
            )}
          </View>
        );
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems[0]) {
      const index = viewableItems[0].index ?? 0;
      setCurrentIndex(index);
      if (voiceEnabled) {
        setVoiceVisible(true);
        setTimeout(() => setVoiceVisible(false), 2000);
      }
    }
  }).current;

  const currentStepId = steps[currentIndex]?.id;
  const currentNoteValue = currentStepId ? notes[currentStepId] || '' : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={materialYouCoffee.gradients.hero}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.topBar}>
        <View style={[styles.timerDisplay, mainTimer > 0 && styles.timerDisplayActive]}>
          <Text style={styles.timerIcon}>⏱️</Text>
          <Text style={styles.timerText}>{formatTime(mainTimer)}</Text>
        </View>
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[styles.controlButton, voiceEnabled && styles.controlButtonActive]}
            onPress={toggleVoice}
          >
            <Text style={styles.controlIcon}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => Alert.alert('Nastavenia', 'Táto sekcia je vo vývoji.')}
          >
            <Text style={styles.controlIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={resetExperience}>
            <Text style={styles.controlIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressSection}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = completed.includes(index);
          return (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.progressStep,
                isCompleted && styles.progressStepCompleted,
                isActive && styles.progressStepActive,
              ]}
              onPress={() => goToIndex(index)}
            />
          );
        })}
      </View>

      <View style={styles.servingSelector}>
        {SERVING_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.servingOption, servings === option && styles.servingOptionActive]}
            onPress={() => setServings(option)}
          >
            <Text
              style={[
                styles.servingOptionText,
                servings === option && styles.servingOptionTextActive,
              ]}
            >
              {option} {option === 1 ? 'šálka' : 'šálky'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={steps}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 70 }}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.95, 1, 0.95],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });
          return (
            <View style={{ width }}>
              <View style={styles.slideContainer}>
                <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}
                >
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconContainer}>
                      <Text style={styles.stepIcon}>{item.icon}</Text>
                      {completed.includes(index) && <Text style={styles.stepCheck}>✓</Text>}
                    </View>
                    <Text style={styles.stepTitle}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.stepSubtitle}>{item.subtitle}</Text>}
                  </View>
                  <View style={styles.cardBody}>{renderStepContent(item)}</View>
                  {renderPills(item)}
                  {renderTips(item.tips)}
                  {renderTroubleshoot(item.troubleshoot)}
                </Animated.View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={() => navigate(-1)}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton} onPress={openNotes}>
            <Text style={styles.actionIcon}>📝</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, voiceEnabled && styles.controlButtonActive]}
            onPress={() => Alert.alert('Pomoc', 'Pokračuj podľa krokov na obrazovke.')}
          >
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={() => navigate(1)}>
          <Text style={styles.navButtonText}>{currentIndex === steps.length - 1 ? '✓' : '→'}</Text>
        </TouchableOpacity>
      </View>

      {voiceVisible && (
        <View style={styles.voiceIndicator} pointerEvents="none">
          <View style={styles.voiceIcon}>
            <Text style={styles.voiceIconText}>🎤</Text>
          </View>
          <Text style={styles.voiceText}>Čítam pokyny...</Text>
        </View>
      )}

      <Animated.View
        style={[styles.achievement, { transform: [{ translateY: achievementAnim }] }]}
        pointerEvents="none"
      >
        <Text style={styles.achievementIcon}>🏆</Text>
        <Text style={styles.achievementText}>{achievementText}</Text>
      </Animated.View>

      <Modal visible={notesModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeNotes} />
        <View style={styles.notesModal}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>Moje poznámky</Text>
            <TouchableOpacity onPress={closeNotes}>
              <Text style={styles.notesClose}>×</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Napíš si poznámky k tomuto kroku..."
            value={currentNoteValue}
            onChangeText={(text) => {
              if (!currentStepId) return;
              setNotes((prev) => ({ ...prev, [currentStepId]: text }));
            }}
          />
          <TouchableOpacity
            style={styles.notesSave}
            onPress={() => {
              if (!currentStepId) return;
              saveNotes(currentNoteValue);
            }}
          >
            <Text style={styles.notesSaveText}>Uložiť</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6F4E37',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerDisplayActive: {
    backgroundColor: '#4CAF50',
  },
  timerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A3728',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#4CAF50',
  },
  controlIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  progressSection: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 6,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressStepCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressStepActive: {
    backgroundColor: '#FFFFFF',
  },
  servingSelector: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  servingOption: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  servingOptionActive: {
    backgroundColor: '#6F4E37',
  },
  servingOptionText: {
    color: '#6F4E37',
    fontWeight: '600',
  },
  servingOptionTextActive: {
    color: '#FFFFFF',
  },
  slideContainer: {
    paddingTop: 200,
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  stepIcon: {
    fontSize: 40,
  },
  stepCheck: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4A3728',
    marginTop: 16,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 6,
    letterSpacing: 1.5,
  },
  cardBody: {
    gap: 16,
  },
  cardContent: {
    gap: 16,
  },
  introHighlight: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A3728',
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4A3728',
  },
  cardSubtext: {
    fontSize: 15,
    color: '#6F4E37',
  },
  bold: {
    fontWeight: '700',
  },
  checklistWrapper: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 12,
  },
  checklistItemChecked: {
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A0826D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checklistLabel: {
    flex: 1,
    color: '#4A3728',
    fontWeight: '500',
  },
  checklistLabelChecked: {
    textDecorationLine: 'line-through',
    color: '#4A3728AA',
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  timerLabel: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  timerCountdown: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  timerButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFE4B5',
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipText: {
    flex: 1,
    color: '#4A3728',
    fontWeight: '600',
  },
  tipDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tipDotActive: {
    width: 24,
    backgroundColor: '#6F4E37',
  },
  troubleshootContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,167,38,0.12)',
  },
  troubleshootTitle: {
    fontWeight: '700',
    color: '#FFA726',
    marginBottom: 8,
  },
  troubleshootText: {
    color: '#4A3728',
    marginBottom: 6,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  pillIcon: {
    fontSize: 18,
  },
  pillText: {
    fontWeight: '600',
    color: '#6F4E37',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 24,
    color: '#6F4E37',
    fontWeight: '700',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  voiceIndicator: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 40,
    padding: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  voiceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF5350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIconText: {
    color: '#FFFFFF',
  },
  voiceText: {
    color: '#4A3728',
    fontWeight: '600',
  },
  achievement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  achievementIcon: {
    fontSize: 28,
    color: '#FFD700',
  },
  achievementText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  notesModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -160 }, { translateY: -200 }],
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6F4E37',
  },
  notesClose: {
    fontSize: 22,
    color: '#6F4E37',
  },
  notesInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E0D0C0',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
  },
  notesSave: {
    marginTop: 16,
    backgroundColor: '#6F4E37',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  notesSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dynamicValue: {
    backgroundColor: '#C4A574',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    borderRadius: 12,
    fontWeight: '700',
  },
  ratingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  starButton: {
    padding: 8,
  },
  starFilled: {},
  starIcon: {
    fontSize: 38,
    color: 'rgba(255,255,255,0.3)',
  },
  starIconFilled: {
    color: '#FFD700',
  },
  ratingMessage: {
    color: '#4A3728',
    fontWeight: '700',
    fontSize: 18,
  },
});

export default RecipeStepsScreenMD3;
