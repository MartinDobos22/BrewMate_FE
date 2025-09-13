import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatRecipeSteps } from './utils/AITextFormatter';
import Timer from './Timer';
import { AIResponseDisplay } from './AIResponseDisplay';
import { colors, spacing, unifiedStyles } from '../theme/unifiedStyles';

import { useNavigation } from '@react-navigation/native';
interface RecipeStepsScreenProps {
  recipe: string;
  recipeId?: string;
  onBack: () => void;
}

const RecipeStepsScreen: React.FC<RecipeStepsScreenProps> = ({ recipe, recipeId, onBack }) => {
  const navigation = useNavigation<any>();
  const { colors: themeColors } = useTheme();
  const { colors, typography, spacing, componentStyles } = unifiedStyles;
  const steps = useMemo(() => formatRecipeSteps(recipe), [recipe]);
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentStep,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [currentStep, slideAnim]);

  const currentStepData = steps[currentStep];

  if (!currentStepData) {
    return (
      <View style={styles.container}>
        <Text>Žiadne kroky na zobrazenie</Text>
        <TouchableOpacity onPress={onBack}>
          <Text>Späť</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}> 
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Späť</Text>
        </TouchableOpacity>
        <Text style={styles.stepCounter}>
          Krok {currentStep + 1} z {steps.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.stepCard,
            componentStyles.card,
            {
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [currentStep - 1, currentStep, currentStep + 1],
                    outputRange: [-300, 0, 300],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.stepIcon}>{currentStepData.icon}</Text>
          <Text style={[styles.stepTitle, typography.h3]}>Krok {currentStepData.number}</Text>
          <AIResponseDisplay
            text={currentStepData.text}
            type="recipe"
            animate={true}
          />

          {currentStepData.time && (
            <View style={styles.timerContainer}>
              <Timer seconds={currentStepData.time} />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <Text style={styles.navButtonText}>← Predošlý</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            currentStep === steps.length - 1 && styles.navButtonComplete,
          ]}
          onPress={() => {
            if (currentStep === steps.length - 1) {
              navigation.navigate('BrewLog', { recipeId });
            } else {
              setCurrentStep(currentStep + 1);
            }
          }}
        >
          <Text style={styles.navButtonText}>
            {currentStep === steps.length - 1 ? '✓ Hotovo' : 'Ďalší →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B4423',
    fontWeight: '600',
  },
  stepCounter: {
    fontSize: 16,
    color: '#666',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6B4423',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  stepCard: {
    alignItems: 'center',
  },
  stepIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
    color: colors.text,
  },
  stepTitle: {
    marginBottom: spacing.md,
  },
  timerContainer: {
    marginTop: spacing.lg,
  },
  navigation: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#6B4423',
  },
  navButtonComplete: {
    backgroundColor: '#4CAF50',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B4423',
  },
});

export default RecipeStepsScreen;
