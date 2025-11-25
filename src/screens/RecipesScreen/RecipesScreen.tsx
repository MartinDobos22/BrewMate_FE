import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { homeStyles } from '../HomeScreen/styles';
import BottomNav, {
  BOTTOM_NAV_CONTENT_OFFSET,
} from '../../components/navigation/BottomNav';
import { fetchRecipes, fetchRecipeHistory } from '../../services/recipeServices';
import type { RecipeHistory } from '../../services/recipeServices';
import { BREW_DEVICES } from '../../types/Recipe';
import type { Recipe, BrewDevice } from '../../types/Recipe';

/**
 * Navigation and selection callbacks for the Recipes screen.
 */
export interface RecipesScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
}

type RecipeWithOptionalFields = Recipe & {
  description?: string;
  recipe?: string;
  taste?: string;
};

const ALL_DEVICES_VALUE = '__all__';

type ExtendedRecipe = Recipe & {
  source: 'catalog' | 'history';
  historyMeta?: {
    taste?: string;
    createdAt: string;
  };
};

const HISTORY_FETCH_LIMIT = 50;

/**
 * Displays curated and historical recipes with filtering and selection
 * capabilities.
 *
 * @param onBack - Handler for returning to the previous screen.
 * @param onHomePress - Callback when the Home tab is chosen.
 * @param onDiscoverPress - Callback when the Discover tab is chosen.
 * @param onRecipesPress - Callback when the Recipes tab is chosen.
 * @param onFavoritesPress - Callback when the Favorites tab is chosen.
 * @param onProfilePress - Callback when the Profile tab is chosen.
 * @param onRecipeSelect - Invoked when a recipe with instructions is selected.
 * @returns Rendered recipes listing with filters.
 */
const RecipesScreen: React.FC<RecipesScreenProps> = ({
  onBack,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
  onRecipeSelect,
}) => {
  const baseStyles = homeStyles();
  const styles = recipesStyles;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [historyRecipes, setHistoryRecipes] = useState<RecipeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>(ALL_DEVICES_VALUE);

  /**
   * Fetches catalog and history recipes, normalizing responses and handling
   * fallback states when either request fails.
   *
   * @param useRefreshingState - When true, avoids toggling the primary loading
   *   spinner to preserve the pull-to-refresh UX.
   */
  const loadRecipes = useCallback(
    async (useRefreshingState = false) => {
      if (!useRefreshingState) {
        setLoading(true);
      }
      setError(null);
      try {
        const [recipesResult, historyResult] = await Promise.allSettled([
          fetchRecipes(),
          fetchRecipeHistory(HISTORY_FETCH_LIMIT),
        ]);

        if (recipesResult.status === 'fulfilled') {
          const normalized = recipesResult.value.map((recipe) => normalizeRecipe(recipe));
          setRecipes(normalized);
        } else {
          console.error('Error loading recipes:', recipesResult.reason);
          setRecipes([]);
          setError('Nepodarilo sa načítať recepty. Skúste to prosím znova.');
        }

        if (historyResult.status === 'fulfilled') {
          setHistoryRecipes(historyResult.value);
        } else {
          console.error('Error loading recipe history:', historyResult.reason);
          setHistoryRecipes([]);
        }
      } catch (err) {
        console.error('Error loading recipes:', err);
        setError('Nepodarilo sa načítať recepty. Skúste to prosím znova.');
      } finally {
        if (!useRefreshingState) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  /**
   * Refresh handler for pull-to-refresh interactions.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes(true);
    setRefreshing(false);
  }, [loadRecipes]);

  const extendedRecipes = useMemo<ExtendedRecipe[]>(() => {
    const catalogRecipes = recipes.map((recipe) => ({
      ...recipe,
      source: 'catalog' as const,
    }));
    const historyItems = historyRecipes.map((entry) => historyToRecipe(entry));
    return [...historyItems, ...catalogRecipes];
  }, [recipes, historyRecipes]);

  const devices = useMemo(() => {
    const values = new Set<string>();
    extendedRecipes.forEach((recipe) => {
      if (recipe.brewDevice) {
        values.add(recipe.brewDevice);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [extendedRecipes]);

  /**
   * Filters recipes based on the selected brew device and search query while
   * preserving both catalog and history entries.
   */
  const filteredRecipes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return extendedRecipes.filter((recipe) => {
      if (
        selectedDevice !== ALL_DEVICES_VALUE &&
        recipe.brewDevice?.toLowerCase() !== selectedDevice.toLowerCase()
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        recipe.title,
        recipe.brewDevice,
        recipe.instructions,
        (recipe as RecipeWithOptionalFields).description,
        (recipe as RecipeWithOptionalFields).taste,
        recipe.historyMeta?.taste,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [extendedRecipes, searchQuery, selectedDevice]);

  /**
   * Validates selection and surfaces instructions or alerts when missing.
   *
   * @param recipe - Selected recipe item from the list.
   */
  const handleRecipePress = useCallback(
    (recipe: Recipe) => {
      if (!recipe.instructions || recipe.instructions.trim().length === 0) {
        Alert.alert(
          'Recept nemá inštrukcie',
          'Tento recept nemá dostupný postup na prípravu. Skúste iný recept.',
        );
        return;
      }
      onRecipeSelect(recipe);
    },
    [onRecipeSelect],
  );

  return (
    <View style={baseStyles.container}>
      <View style={baseStyles.appHeader}>
        <TouchableOpacity onPress={onBack} style={baseStyles.logoSection}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={[baseStyles.appTitle, { flex: 1, textAlign: 'center' }]}>Recepty</Text>
        <TouchableOpacity onPress={() => void loadRecipes()} style={styles.reloadButton}>
          <Text style={styles.reloadText}>↻</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: BOTTOM_NAV_CONTENT_OFFSET,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Hľadať recept"
            placeholderTextColor="#8B7355"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Zariadenie</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedDevice}
                onValueChange={(value) => setSelectedDevice(String(value))}
              >
                <Picker.Item label="Všetky" value={ALL_DEVICES_VALUE} />
                {devices.map((device) => (
                  <Picker.Item key={device} label={device} value={device} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color="#6B4423" style={styles.loader} />
        ) : null}

        {!loading && filteredRecipes.length === 0 ? (
          <Text style={styles.emptyState}>Žiadne recepty sa nenašli.</Text>
        ) : null}

        {!loading &&
          filteredRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={[baseStyles.coffeeCard, styles.recipeCard]}
              activeOpacity={0.85}
              onPress={() => handleRecipePress(recipe)}
            >
              <View style={styles.recipeHeaderRow}>
                <Text style={baseStyles.coffeeName}>
                  {recipe.title}
                </Text>
                {recipe.source === 'history' ? (
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>História</Text>
                  </View>
                ) : null}
              </View>
              {recipe.brewDevice ? (
                <Text style={baseStyles.coffeeOrigin}>{recipe.brewDevice}</Text>
              ) : null}
              {recipe.source === 'history' && recipe.historyMeta?.taste ? (
                <Text style={styles.historyTaste}>{recipe.historyMeta.taste}</Text>
              ) : null}
              {recipe.source === 'history' && recipe.historyMeta?.createdAt ? (
                <Text style={styles.historyTimestamp}>
                  {new Date(recipe.historyMeta.createdAt).toLocaleDateString('sk-SK')}
                </Text>
              ) : null}
              <Text style={styles.instructionsPreview}>
                {recipe.instructions.length > 160
                  ? `${recipe.instructions.slice(0, 160).trim()}…`
                  : recipe.instructions}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
      <BottomNav
        active="recipes"
        onHomePress={onHomePress}
        onDiscoverPress={onDiscoverPress}
        onRecipesPress={onRecipesPress}
        onFavoritesPress={onFavoritesPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
};

const normalizeRecipe = (recipe: RecipeWithOptionalFields): Recipe => {
  const instructions = recipe.instructions ?? recipe.recipe ?? '';
  const brewDevice =
    recipe.brewDevice ?? (recipe as Record<string, unknown>).brew_device;

  return {
    ...recipe,
    instructions,
    brewDevice: typeof brewDevice === 'string' ? (brewDevice as BrewDevice) : recipe.brewDevice,
  };
};

const historyToRecipe = (entry: RecipeHistory): ExtendedRecipe => {
  const title = entry.method && entry.method.trim().length > 0 ? entry.method : 'Uložený recept';
  const isValidDevice = (device: unknown): device is BrewDevice =>
    typeof device === 'string' && (BREW_DEVICES as string[]).includes(device);
  const fallbackDevice: BrewDevice = isValidDevice(entry.brewDevice) ? entry.brewDevice : 'V60';

  return {
    id: `history-${entry.id}`,
    title,
    instructions: entry.recipe,
    brewDevice: fallbackDevice,
    source: 'history',
    historyMeta: {
      taste: entry.taste,
      createdAt: entry.created_at,
    },
  };
};

export default RecipesScreen;

const recipesStyles = StyleSheet.create({
  backIcon: {
    color: '#2C1810',
    fontSize: 18,
  },
  reloadButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FAF0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadText: {
    fontSize: 18,
    color: '#6B4423',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.12)',
  },
  searchInput: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C1810',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.15)',
  },
  pickerContainer: {
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.15)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  pickerLabel: {
    fontSize: 12,
    color: '#5D4E37',
    fontWeight: '600',
    marginBottom: 6,
  },
  errorText: {
    color: '#D9534F',
    textAlign: 'center',
    marginBottom: 12,
  },
  loader: {
    marginTop: 24,
  },
  emptyState: {
    textAlign: 'center',
    color: '#8B7355',
    marginTop: 24,
    fontSize: 15,
  },
  recipeCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  instructionsPreview: {
    marginTop: 8,
    fontSize: 13,
    color: '#5D4E37',
    lineHeight: 18,
  },
  recipeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyBadge: {
    backgroundColor: 'rgba(139, 111, 71, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  historyBadgeText: {
    fontSize: 11,
    color: '#6B4423',
    fontWeight: '600',
  },
  historyTaste: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B4423',
    fontWeight: '500',
  },
  historyTimestamp: {
    marginTop: 4,
    fontSize: 11,
    color: '#8B7355',
  },
});
