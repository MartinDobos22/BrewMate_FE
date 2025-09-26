import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { PersonalizationContext } from '../../App';
import { TasteProfileQuizEngine } from '../services/TasteProfileQuizEngine';
import { FlavorEmbeddingService } from '../services/flavor/FlavorEmbeddingService';
import { FlavorJourneyRepository } from '../services/flavor/FlavorJourneyRepository';
import { DefaultRecommendationTelemetry } from '../services/recommendation/RecommendationTelemetry';
import { RecommendationEngine } from '../services/recommendation/RecommendationEngine';
import { TravelModeManager } from '../services/recommendation/TravelModeManager';
import { SmartSuggestionCard } from '../components/personalization/SmartSuggestionCard';
import {
  PersonalizedLearningModule,
  TasteQuizAnswer,
  TasteQuizQuestion,
  TasteQuizResult,
} from '../types/PersonalizationAI';
import { WeatherAwareProvider } from '../services/weather/WeatherAwareProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuizSlideProps {
  question: TasteQuizQuestion;
  onSubmit: (answer: TasteQuizAnswer['value']) => void;
  onSkip: () => void;
  initialValue?: TasteQuizAnswer['value'];
}

const QuizSlide: React.FC<QuizSlideProps> = ({ question, onSubmit, onSkip, initialValue }) => {
  const [value, setValue] = useState<TasteQuizAnswer['value']>(initialValue ?? (question.allowsMultiple ? [] : ''));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue ?? (question.allowsMultiple ? [] : ''));
  }, [initialValue, question.allowsMultiple]);

  const toggleOption = useCallback(
    (optionValue: string | number) => {
      if (question.allowsMultiple) {
        setValue((prev) => {
          const arrayValue = Array.isArray(prev) ? [...prev] : [];
          const index = arrayValue.indexOf(optionValue);
          if (index >= 0) {
            arrayValue.splice(index, 1);
          } else {
            arrayValue.push(optionValue);
          }
          return arrayValue;
        });
        return;
      }
      setValue(optionValue);
    },
    [question.allowsMultiple],
  );

  const handleSubmit = useCallback(() => {
    if (!question.skippable && (value === '' || (Array.isArray(value) && value.length === 0))) {
      setLocalError('Prosím vyber aspoň jednu odpoveď.');
      return;
    }
    setLocalError(null);
    onSubmit(value);
  }, [onSubmit, question.skippable, value]);

  const renderOptions = () => {
    if (!question.options) {
      return null;
    }
    const selected = Array.isArray(value) ? value : [value];
    return (
      <View style={styles.optionsContainer}>
        {question.options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <AnimatedPressable
              key={option.id}
              entering={FadeInRight.springify().mass(0.5)}
              onPress={() => toggleOption(option.value)}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
              {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
            </AnimatedPressable>
          );
        })}
      </View>
    );
  };

  if (question.type === 'slider') {
    const min = question.min ?? 0;
    const max = question.max ?? 10;
    const step = question.step ?? 1;
    const numericValue = typeof value === 'number' ? value : min;
    return (
      <View>
        <AdaptiveSlider
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={(val) => setValue(val)}
        />
        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Pokračovať</Text>
        </Pressable>
        {question.skippable ? (
          <Pressable onPress={onSkip}>
            <Text style={styles.skipText}>Preskočiť</Text>
          </Pressable>
        ) : null}
        {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      </View>
    );
  }

  if (question.type === 'text') {
    return (
      <View>
        <Animated.Text entering={FadeInDown.springify().mass(0.6)} style={styles.helperText}>
          Zdieľaním príbehu zrýchliš učenie AI.
        </Animated.Text>
        <TextInput
          multiline
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => setValue(text)}
          style={styles.textArea}
          placeholder="Opiš zážitok, ktorý ti utkvel v pamäti..."
        />
        <View style={styles.inlineActions}>
          <Pressable style={styles.secondaryButton} onPress={() => setValue('')}>
            <Text style={styles.secondaryButtonText}>Vymazať</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onSkip}>
            <Text style={styles.secondaryButtonText}>Preskočiť</Text>
          </Pressable>
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Hotovo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      {renderOptions()}
      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Pokračovať</Text>
      </Pressable>
      {question.skippable ? (
        <Pressable onPress={onSkip}>
          <Text style={styles.skipText}>Preskočiť</Text>
        </Pressable>
      ) : null}
      {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
    </View>
  );
};

interface AdaptiveSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

const AdaptiveSlider: React.FC<AdaptiveSliderProps> = ({ min, max, step, value, onChange }) => {
  const [width, setWidth] = useState(0);
  const handlePress = useCallback(
    (event: any) => {
      if (!width) {
        return;
      }
      const x = event.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, x / width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(snapped);
    },
    [max, min, onChange, step, width],
  );

  return (
    <Pressable
      style={styles.sliderContainer}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onPress={handlePress}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
      </View>
      <Text style={styles.sliderValueText}>{value}</Text>
    </Pressable>
  );
};

interface TasteProfileQuizScreenProps {
  onComplete: (result: TasteQuizResult) => void;
}

export const TasteProfileQuizScreen: React.FC<TasteProfileQuizScreenProps> = ({ onComplete }) => {
  const personalization = React.useContext(PersonalizationContext);
  const [engine, setEngine] = useState<TasteProfileQuizEngine | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<TasteQuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<TasteQuizQuestion[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!personalization?.learningEngine || !personalization?.userId) {
        return;
      }
      const telemetry = new DefaultRecommendationTelemetry();
      const travelMode = new TravelModeManager();
      const weatherProvider = new WeatherAwareProvider();
      const recommendationEngine = new RecommendationEngine({
        learningEngine: personalization.learningEngine,
        weatherProvider,
        supabaseFetcher: async () => [],
        telemetry,
        travelModeManager: travelMode,
      });
      const flavorRepository = new FlavorJourneyRepository();
      const flavorService = new FlavorEmbeddingService(flavorRepository);

      const quizEngine = new TasteProfileQuizEngine({
        learningEngine: personalization.learningEngine,
        recommendationEngine,
        flavorEmbeddingService: flavorService,
        userId: personalization.userId,
      });
      await quizEngine.hydrateFromCache();
      setQuestions(Array.from({ length: 10 }, (_, index) => quizEngine.getCurrentQuestion(index)).filter(Boolean) as TasteQuizQuestion[]);
      setEngine(quizEngine);
    };
    bootstrap();
  }, [personalization?.learningEngine, personalization?.userId]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = useMemo(() => engine?.getAnswer(currentQuestion?.id ?? ''), [engine, currentQuestion]);

  const handleSubmit = useCallback(
    async (value: TasteQuizAnswer['value']) => {
      if (!engine || !currentQuestion) {
        return;
      }
      await engine.submitAnswer({ questionId: currentQuestion.id, value });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsLoading(true);
        const context = {
          answers: [],
          userId: personalization?.userId,
        };
        const quizResult = await engine.completeQuiz(context);
        setResult(quizResult);
        onComplete(quizResult);
        setIsLoading(false);
      }
    },
    [currentIndex, currentQuestion, engine, onComplete, personalization?.userId, questions.length],
  );

  const handleSkip = useCallback(async () => {
    if (!engine || !currentQuestion) {
      return;
    }
    await engine.skipQuestion(currentQuestion.id);
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  }, [currentQuestion, engine, questions.length]);

  const renderResult = () => {
    if (!result) {
      return null;
    }
    return (
      <ScrollView style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Tvoj personalizovaný štart</Text>
        <Text style={styles.resultSubtitle}>
          Na základe odpovedí sme nastavili počítačný profil a pripravili prvé odporúčania.
        </Text>
        {result.suggestedRecipes.map((prediction) => (
          <SmartSuggestionCard
            key={prediction.recipeId}
            prediction={prediction}
            onFeedback={(signal) => {
              void signal;
            }}
            explanation={engine?.explainPrediction(prediction)}
          />
        ))}
        <View style={styles.learningPathContainer}>
          <Text style={styles.sectionTitle}>Učiaca trajektória</Text>
          {result.learningPath.map((module) => (
            <LearningModuleCard key={module.id} module={module} />
          ))}
        </View>
      </ScrollView>
    );
  };

  if (!engine || !currentQuestion) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Vypočítavame tvoj chuťový profil…</Text>
      </View>
    );
  }

  if (result) {
    return renderResult();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.Text entering={FadeInDown.duration(450)} style={styles.questionCategory}>
        {currentQuestion.category.toUpperCase()}
      </Animated.Text>
      <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
      {currentQuestion.subtitle ? <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text> : null}
      <QuizSlide question={currentQuestion} onSubmit={handleSubmit} onSkip={handleSkip} initialValue={currentAnswer?.value} />
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>
    </ScrollView>
  );
};

interface LearningModuleCardProps {
  module: PersonalizedLearningModule;
}

const LearningModuleCard: React.FC<LearningModuleCardProps> = ({ module }) => {
  return (
    <View style={styles.learningModuleCard}>
      <Text style={styles.learningModuleTitle}>{module.title}</Text>
      <Text style={styles.learningModuleDescription}>{module.description}</Text>
      <View style={styles.learningActions}>
        {module.actions.map((action) => (
          <View key={action.id} style={styles.learningActionPill}>
            <Text style={styles.learningActionText}>{action.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  questionCategory: {
    fontSize: 13,
    letterSpacing: 1.2,
    color: '#888',
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  questionSubtitle: {
    marginTop: 4,
    color: '#666',
  },
  optionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  optionButtonSelected: {
    borderColor: '#6F4E37',
    backgroundColor: '#F5F0EB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#6F4E37',
  },
  optionDescription: {
    marginTop: 8,
    color: '#555',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#6F4E37',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 32,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  skipText: {
    marginTop: 12,
    color: '#6F4E37',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    color: '#D7263D',
    marginTop: 12,
  },
  sliderContainer: {
    marginTop: 24,
  },
  sliderTrack: {
    height: 12,
    backgroundColor: '#EEE',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#6F4E37',
  },
  sliderValueText: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  textArea: {
    marginTop: 24,
    borderRadius: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
  },
  placeholderText: {
    color: '#888',
  },
  helperText: {
    color: '#6F4E37',
    fontWeight: '600',
    fontSize: 13,
  },
  inlineActions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EFE8E2',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEE',
    marginTop: 24,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#6F4E37',
  },
  resultContainer: {
    padding: 24,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  resultSubtitle: {
    marginTop: 8,
    color: '#555',
  },
  learningPathContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  learningModuleCard: {
    padding: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F7F2EC',
  },
  learningModuleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  learningModuleDescription: {
    marginTop: 8,
    color: '#555',
  },
  learningActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  learningActionPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#6F4E3715',
  },
  learningActionText: {
    fontWeight: '600',
    color: '#6F4E37',
  },
});

export default TasteProfileQuizScreen;
