import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TasteDimension } from '../../types/Personalization';

interface OnboardingOption {
  label: string;
  value: string;
  image: string;
  hint?: string;
}

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  dimension?: TasteDimension;
  options: OnboardingOption[];
}

export interface PersonalizationResult {
  answers: Record<string, string>;
}

export interface PersonalizationOnboardingProps {
  onComplete: (result: PersonalizationResult) => void;
  onSkip: () => void;
}

const steps: OnboardingStep[] = [
  {
    key: 'wake-up',
    title: 'Ako rýchlo chceš kofeín?',
    description: 'Vyber obrázok, ktorý najviac vystihuje tvoje ranné tempo a potrebu energie.',
    options: [
      {
        label: 'Slow brew',
        value: 'slow',
        image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187',
        hint: 'Rád si dopraješ pokojné ráno a jemnejšie nápoje.',
      },
      {
        label: 'Ready to go',
        value: 'fast',
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
        hint: 'Potrebujem rýchlu dávku energie a výraznú chuť.',
      },
    ],
  },
  {
    key: 'sweetness',
    title: 'Sladkosť',
    description: 'Aká intenzívna sladkosť ti vyhovuje v káve?',
    dimension: 'sweetness',
    options: [
      { label: 'Jemná', value: '3', image: 'https://images.unsplash.com/photo-1461988320302-91bde64fc8e4' },
      { label: 'Vyvážená', value: '5', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17' },
      { label: 'Dezertná', value: '8', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93' },
    ],
  },
  {
    key: 'acidity',
    title: 'Kyslosť',
    description: 'Vyber kyslosť, ktorá ti sedí pri filtrovaných aj espresso nápojoch.',
    dimension: 'acidity',
    options: [
      { label: 'Jemná', value: '2', image: 'https://images.unsplash.com/photo-1432107294469-414527cb5c65' },
      { label: 'Iskrivá', value: '5', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2' },
      { label: 'Živá', value: '7', image: 'https://images.unsplash.com/photo-1481398123172-6f0ae0c7b3e9' },
    ],
  },
  {
    key: 'bitterness',
    title: 'Horkosť',
    description: 'Ako veľmi môže byť káva horká, aby ti stále chutila?',
    dimension: 'bitterness',
    options: [
      { label: 'Takmer žiadna', value: '2', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93' },
      { label: 'Vyvážená', value: '5', image: 'https://images.unsplash.com/photo-1432107294469-414527cb5c65' },
      { label: 'Intenzívna', value: '8', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187' },
    ],
  },
  {
    key: 'body',
    title: 'Plnosť tela',
    description: 'Preferuješ ľahké telo alebo hustú, sirupovú konzistenciu?',
    dimension: 'body',
    options: [
      { label: 'Čisté a ľahké', value: '3', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e' },
      { label: 'Krémové', value: '6', image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e' },
      { label: 'Husté a sirupové', value: '8', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17' },
    ],
  },
  {
    key: 'milk',
    title: 'Mliečna textúra',
    description: 'Čo preferuješ v latté alebo cappuccine?',
    options: [
      { label: 'Mikropena', value: 'microfoam', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772' },
      { label: 'Hustá pena', value: 'dense', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17' },
      { label: 'Bez mlieka', value: 'black', image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31' },
    ],
  },
  {
    key: 'strength',
    title: 'Sila kávy',
    description: 'Ktorá fotka vystihuje tvoju ideálnu intenzitu?',
    options: [
      { label: 'Ľahká', value: 'light', image: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e' },
      { label: 'Stredná', value: 'balanced', image: 'https://images.unsplash.com/photo-1432107294469-414527cb5c65' },
      { label: 'Silná', value: 'strong', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187' },
    ],
  },
];

/**
 * Päťkrokový onboarding s obrazovým vyjadrením preferencií.
 */
const PersonalizationOnboarding: React.FC<PersonalizationOnboardingProps> = ({ onComplete, onSkip }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const fadeValue = useSharedValue(1);

  useEffect(() => {
    fadeValue.value = 0;
    fadeValue.value = withTiming(1, { duration: 250 });
  }, [currentIndex, fadeValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
    transform: [{ translateY: (1 - fadeValue.value) * 16 }],
  }));

  const progressText = useMemo(() => `${currentIndex + 1} / ${steps.length}`, [currentIndex]);

  const handleSelect = (step: OnboardingStep, option: OnboardingOption) => {
    const nextAnswers = { ...answers, [step.key]: option.value };
    setAnswers(nextAnswers);
    if (step.dimension) {
      nextAnswers[`dimension:${step.dimension}`] = option.value;
    }
    const isLast = currentIndex === steps.length - 1;
    if (isLast) {
      onComplete({ answers: nextAnswers });
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const step = steps[currentIndex];

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.progress}>{progressText}</Text>
        <TouchableOpacity onPress={onSkip}>
          <Text style={styles.skip}>Preskočiť</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
          {step.options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, answers[step.key] === option.value && styles.optionSelected]}
              onPress={() => handleSelect(step, option)}
            >
              <Image source={{ uri: option.image }} style={styles.optionImage} />
              <Text style={styles.optionLabel}>{option.label}</Text>
              {option.hint && <Text style={styles.optionHint}>{option.hint}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progress: {
    fontSize: 14,
    color: '#666',
  },
  skip: {
    fontSize: 14,
    color: '#3558cd',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  optionsRow: {
    gap: 12,
  },
  option: {
    width: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#ff8000',
    shadowColor: '#ff8000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  optionImage: {
    width: '100%',
    height: 140,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 12,
    color: '#222',
  },
  optionHint: {
    fontSize: 12,
    color: '#777',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});

export default PersonalizationOnboarding;
