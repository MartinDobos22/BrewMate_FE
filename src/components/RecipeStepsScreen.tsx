import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { recipeStepsStyles } from './styles/RecipeSteps.styles';
import Timer from './Timer';

interface RecipeStepsScreenProps {
  recipe: string;
  onBack: () => void;
}

const stepIcons = ['🫘', '⚖️', '🔥', '⏱️', '☕'];

const RecipeStepsScreen: React.FC<RecipeStepsScreenProps> = ({ recipe, onBack }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => recipeStepsStyles(colors), [colors]);
  const steps = useMemo(() => recipe.split(/\n+/).filter((s) => s.trim().length > 0), [recipe]);
  const [index, setIndex] = useState(0);

  const parseTime = (step: string): number | null => {
    const match = step.match(/(\d+)\s*(sek|min|s|min|sec|minút|minuty)/i);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('m')) return value * 60;
      return value;
    }
    return null;
  };

  const timeInStep = useMemo(() => parseTime(steps[index] ?? ''), [steps, index]);
  const formattedStep = useMemo(
    () => steps[index]?.split(/\.\s+/).filter((s) => s.trim().length > 0) ?? [],
    [steps, index],
  );

  const handleNext = () => {
    if (index < steps.length - 1) setIndex(index + 1);
  };

  const handlePrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (steps.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Späť</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.stepText}>Recept nie je k dispozícii</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Späť</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.stepCounter}>{`Krok ${index + 1} / ${steps.length}`}</Text>
        {timeInStep !== null && <Timer seconds={timeInStep} />}
        <View style={styles.stepCard}>
          <Text style={styles.stepIcon}>{stepIcons[index % stepIcons.length]}</Text>
          {formattedStep.map((s, i) => (
            <Text key={i} style={styles.stepBullet}>{`• ${s}`}</Text>
          ))}
        </View>
      </View>
      <View style={styles.nav}>
        <TouchableOpacity
          style={[styles.navButton, index === 0 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={index === 0}>
          <Text style={styles.navButtonText}>Predchádzajúci</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            index === steps.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={index === steps.length - 1}>
          <Text style={styles.navButtonText}>Ďalší</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RecipeStepsScreen;
