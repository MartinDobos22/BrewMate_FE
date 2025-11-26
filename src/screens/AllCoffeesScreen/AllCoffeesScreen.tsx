import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { fetchCoffees } from '../../services/homePagesService';
import BottomNav, {
  BOTTOM_NAV_CONTENT_OFFSET,
} from '../../components/navigation/BottomNav';
import type { NavItem } from '../../components/navigation/BottomNav';
import type { Coffee } from '../../types/Coffee';

type CoffeeLibraryMode = 'all' | 'favorites';

export interface CoffeeLibraryScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
  onCoffeePress?: (coffeeId: string) => void;
}

interface CoffeeLibraryInternalProps extends CoffeeLibraryScreenProps {
  mode: CoffeeLibraryMode;
  title: string;
  activeNav: NavItem;
  allowFavoriteToggle?: boolean;
}

const ALL_OPTION_VALUE = '__all__';

const CoffeeLibraryScreen: React.FC<CoffeeLibraryInternalProps> = ({
  mode,
  title,
  activeNav,
  allowFavoriteToggle = false,
  onBack,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}) => {
  const baseStyles = homeStyles();
  const styles = libraryStyles;
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Local state holding the current coffee filter selection (search, roast/process metadata, favorites flag)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>(ALL_OPTION_VALUE);
  const [selectedProcess, setSelectedProcess] = useState<string>(ALL_OPTION_VALUE);
  const [selectedVariety, setSelectedVariety] = useState<string>(ALL_OPTION_VALUE);
  const [favoritesOnly, setFavoritesOnly] = useState(mode === 'favorites');

  useEffect(() => {
    setFavoritesOnly(mode === 'favorites');
  }, [mode]);

  const loadCoffees = useCallback(
    async (useRefreshingState = false) => {
      if (!useRefreshingState) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchCoffees();
        setCoffees(data);
      } catch (err) {
        console.error('Error loading coffees:', err);
        setError('Nepodarilo sa načítať kávy. Skúste to znova neskôr.');
      } finally {
        if (!useRefreshingState) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadCoffees();
  }, [loadCoffees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCoffees(true);
    setRefreshing(false);
  }, [loadCoffees]);

  const brandOptions = useMemo(() => {
    const values = new Set<string>();
    coffees.forEach((coffee) => {
      if (coffee.brand) {
        values.add(coffee.brand);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [coffees]);

  const processOptions = useMemo(() => {
    const values = new Set<string>();
    coffees.forEach((coffee) => {
      if (coffee.process) {
        values.add(coffee.process);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [coffees]);

  const varietyOptions = useMemo(() => {
    const values = new Set<string>();
    coffees.forEach((coffee) => {
      if (coffee.variety) {
        values.add(coffee.variety);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [coffees]);

  const filteredCoffees = useMemo(
    () =>
      applyCoffeeFilter(coffees, {
        favoritesOnly,
        searchQuery,
        selectedBrand,
        selectedProcess,
        selectedVariety,
      }),
    [coffees, favoritesOnly, searchQuery, selectedBrand, selectedProcess, selectedVariety],
  );

  const emptyMessage = useMemo(() => {
    if (favoritesOnly) {
      return 'Žiadne obľúbené kávy zatiaľ nemáte.';
    }
    return 'Žiadne kávy sa nenašli.';
  }, [favoritesOnly]);

  // Navigate to the dedicated coffee detail screen when an item is tapped.
  const handleCoffeePress = useCallback(
    (coffee: Coffee) => {
      if (onCoffeePress) {
        onCoffeePress(coffee.id);
      }
    },
    [onCoffeePress],
  );

  return (
    <View style={baseStyles.container}>
      <View style={baseStyles.appHeader}>
        <TouchableOpacity onPress={onBack} style={baseStyles.logoSection}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={[baseStyles.appTitle, { flex: 1, textAlign: 'center' }]}>{title}</Text>
        <View style={{ width: 32 }} />
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
            placeholder="Hľadať podľa názvu, pražiarne alebo chutí"
            placeholderTextColor="#8B7355"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {allowFavoriteToggle ? (
            <TouchableOpacity
              onPress={() => setFavoritesOnly((prev) => !prev)}
              style={[
                styles.favoriteToggle,
                favoritesOnly && styles.favoriteToggleActive,
              ]}
            >
              <Text
                style={[
                  styles.favoriteToggleText,
                  favoritesOnly && styles.favoriteToggleTextActive,
                ]}
              >
                {favoritesOnly ? '❤️ Len obľúbené' : '♡ Zobraziť obľúbené'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.pickersRow}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Pražiareň</Text>
              <Picker
                selectedValue={selectedBrand}
                onValueChange={(value) => setSelectedBrand(String(value))}
              >
                <Picker.Item label="Všetky" value={ALL_OPTION_VALUE} />
                {brandOptions.map((brand) => (
                  <Picker.Item key={brand} label={brand} value={brand} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Proces</Text>
              <Picker
                selectedValue={selectedProcess}
                onValueChange={(value) => setSelectedProcess(String(value))}
              >
                <Picker.Item label="Všetky" value={ALL_OPTION_VALUE} />
                {processOptions.map((process) => (
                  <Picker.Item key={process} label={process} value={process} />
                ))}
              </Picker>
            </View>
            <View style={[styles.pickerWrapper, styles.lastPicker]}>
              <Text style={styles.pickerLabel}>Odroda</Text>
              <Picker
                selectedValue={selectedVariety}
                onValueChange={(value) => setSelectedVariety(String(value))}
              >
                <Picker.Item label="Všetky" value={ALL_OPTION_VALUE} />
                {varietyOptions.map((variety) => (
                  <Picker.Item key={variety} label={variety} value={variety} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" color="#6B4423" style={styles.loader} />
        ) : null}

        {!loading && filteredCoffees.length === 0 ? (
          <Text style={styles.emptyState}>{emptyMessage}</Text>
        ) : null}

        {!loading &&
          filteredCoffees.map((coffee) => (
            <TouchableOpacity
              key={coffee.id}
              style={[baseStyles.coffeeCard, styles.coffeeCard]}
              activeOpacity={0.85}
              onPress={() => handleCoffeePress(coffee)}
            >
              <View style={baseStyles.coffeeImage}>
                <Text style={baseStyles.coffeeEmoji}>☕</Text>
              </View>
              <View style={styles.cardHeader}>
                <Text style={baseStyles.coffeeName}>{coffee.name}</Text>
                {coffee.isFavorite ? <Text style={styles.favoriteBadge}>❤️</Text> : null}
              </View>
              {coffee.brand ? (
                <Text style={baseStyles.coffeeOrigin}>{coffee.brand}</Text>
              ) : null}
              {coffee.origin ? (
                <Text style={baseStyles.coffeeOrigin}>{coffee.origin}</Text>
              ) : null}
              {coffee.process ? (
                <Text style={baseStyles.coffeeOrigin}>Proces: {coffee.process}</Text>
              ) : null}
              {coffee.variety ? (
                <Text style={baseStyles.coffeeOrigin}>Odroda: {coffee.variety}</Text>
              ) : null}
              {coffee.flavorNotes && coffee.flavorNotes.length > 0 ? (
                <Text style={baseStyles.coffeeOrigin}>
                  Chuťové tóny: {coffee.flavorNotes.join(', ')}
                </Text>
              ) : null}
              {coffee.roastLevel !== undefined || coffee.intensity !== undefined ? (
                <Text style={baseStyles.coffeeOrigin}>
                  {coffee.roastLevel !== undefined ? `Praženie: ${coffee.roastLevel}` : ''}
                  {coffee.roastLevel !== undefined && coffee.intensity !== undefined ? ' • ' : ''}
                  {coffee.intensity !== undefined ? `Intenzita: ${coffee.intensity}` : ''}
                </Text>
              ) : null}
              {coffee.match !== undefined || coffee.rating !== undefined ? (
                <View style={baseStyles.coffeeMatch}>
                  {coffee.match !== undefined ? (
                    <Text style={baseStyles.matchScore}>{coffee.match}% zhoda</Text>
                  ) : null}
                  {coffee.rating !== undefined ? (
                    <Text style={styles.rating}>⭐ {coffee.rating.toFixed(1)}</Text>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
      </ScrollView>
    <BottomNav
      active={activeNav}
      onHomePress={onHomePress}
      onDiscoverPress={onDiscoverPress}
      onRecipesPress={onRecipesPress}
      onFavoritesPress={onFavoritesPress}
      onProfilePress={onProfilePress}
    />
  </View>
  );
};

export const DiscoverCoffeesScreen: React.FC<CoffeeLibraryScreenProps> = (props) => (
  <CoffeeLibraryScreen
    {...props}
    mode="all"
    title="Moje kávy"
    activeNav="discover"
    allowFavoriteToggle
  />
);

export const FavoriteCoffeesScreen: React.FC<CoffeeLibraryScreenProps> = (props) => (
  <CoffeeLibraryScreen
    {...props}
    mode="favorites"
    title="Obľúbené kávy"
    activeNav="favorites"
  />
);

export default DiscoverCoffeesScreen;

const libraryStyles = StyleSheet.create({
  backIcon: {
    color: '#2C1810',
    fontSize: 18,
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
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerWrapper: {
    flex: 1,
    marginRight: 12,
  },
  lastPicker: {
    marginRight: 0,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#5D4E37',
    fontWeight: '600',
    marginBottom: 4,
  },
  favoriteToggle: {
    alignSelf: 'flex-start',
    backgroundColor: '#FAF0E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  favoriteToggleActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  favoriteToggleText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  favoriteToggleTextActive: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#D9534F',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyState: {
    textAlign: 'center',
    color: '#8B7355',
    marginTop: 24,
    fontSize: 15,
  },
  loader: {
    marginTop: 24,
  },
  coffeeCard: {
    width: '100%',
    marginRight: 0,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  favoriteBadge: {
    fontSize: 18,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFA000',
  },
});

/**
 * Filters the user's coffees based on the current in-memory criteria.
 *
 * @param {Coffee[]} coffees - Complete set of coffees fetched from the API/offline cache.
 * @param {object} options - Current filter values used to narrow the list.
 * @param {boolean} options.favoritesOnly - When true, hides all non-favorite coffees.
 * @param {string} options.searchQuery - Free-text search term matched against name, brand, origin, process, variety and flavor notes.
 * @param {string} options.selectedBrand - Selected roastery/brand identifier or the ALL_OPTION sentinel.
 * @param {string} options.selectedProcess - Selected processing method or the ALL_OPTION sentinel.
 * @param {string} options.selectedVariety - Selected bean variety or the ALL_OPTION sentinel.
 * @returns {Coffee[]} Coffees that satisfy all active filters.
 */
const applyCoffeeFilter = (
  coffees: Coffee[],
  {
    favoritesOnly,
    searchQuery,
    selectedBrand,
    selectedProcess,
    selectedVariety,
  }: {
    favoritesOnly: boolean;
    searchQuery: string;
    selectedBrand: string;
    selectedProcess: string;
    selectedVariety: string;
  },
): Coffee[] => {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return coffees.filter((coffee) => {
    if (favoritesOnly && !coffee.isFavorite) {
      return false;
    }

    if (
      selectedBrand !== ALL_OPTION_VALUE &&
      (coffee.brand ?? '').toLowerCase() !== selectedBrand.toLowerCase()
    ) {
      return false;
    }

    if (
      selectedProcess !== ALL_OPTION_VALUE &&
      (coffee.process ?? '').toLowerCase() !== selectedProcess.toLowerCase()
    ) {
      return false;
    }

    if (
      selectedVariety !== ALL_OPTION_VALUE &&
      (coffee.variety ?? '').toLowerCase() !== selectedVariety.toLowerCase()
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      coffee.name,
      coffee.brand,
      coffee.origin,
      coffee.process,
      coffee.variety,
      ...(coffee.flavorNotes ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};
