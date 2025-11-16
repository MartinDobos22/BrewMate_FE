import React, { useCallback, useMemo } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import RecipeDetail from '../../components/recipes/RecipeDetail';
import { useTheme } from '../../theme/ThemeProvider';
import type { BrewDevice, RecipeDetail as RecipeDetailType } from '../../types/Recipe';
import { buildRecipeDetail } from '../../utils/recipeDetailBuilder';
import { incrementProgress } from '../../services/profileServices';

export interface RecipeStepsScreenProps {
  recipe: RecipeDetailType | string;
  brewDevice?: BrewDevice;
  onBack: () => void;
}

const RecipeStepsScreenMD3: React.FC<RecipeStepsScreenProps> = ({ recipe, brewDevice, onBack }) => {
  const { colors } = useTheme();

  const detail = useMemo<RecipeDetailType>(() => {
    if (typeof recipe === 'string') {
      return buildRecipeDetail({
        title: brewDevice ? `${brewDevice} recept` : 'Personalizovaný recept',
        instructions: recipe,
        brewDevice: brewDevice ?? 'V60',
        source: 'ai',
      });
    }

    if (recipe.steps && recipe.parameters) {
      return recipe;
    }

    return buildRecipeDetail(recipe);
  }, [brewDevice, recipe]);

  const handleStart = useCallback(() => {
    Alert.alert('Tip', 'Spusti časovač pri ďalšom kroku receptu.');
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await incrementProgress('recipe', detail.brewDevice || 'V60');
      Alert.alert('Hotovo', 'Pridali sme tento recept do tvojho progresu.');
    } catch (error) {
      console.warn('RecipeStepsScreenMD3: failed to increment progress', error);
    }
  }, [detail.brewDevice]);

  const handleShare = useCallback(() => {
    const message = detail.steps
      ?.map((step, index) => `${index + 1}. ${step.description}`)
      .join('\n');
    void Share.share({
      title: detail.title,
      message: message ?? detail.instructions,
    });
  }, [detail.instructions, detail.steps, detail.title]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <RecipeDetail
        recipe={detail}
        onBack={onBack}
        onStart={handleStart}
        onSave={handleSave}
        onShare={handleShare}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});

export default RecipeStepsScreenMD3;
