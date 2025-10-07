// CoffeeReceipeScanner.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  TextInput,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import {
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { scannerStyles } from './styles/ProfessionalOCRScanner.styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  getBrewRecipe,
  suggestBrewingMethods,
  rateOCRResult,
} from '../services/ocrServices.ts';
import {
  saveRecipe,
  fetchRecipeHistory,
  RecipeHistory,
} from '../services/recipeServices.ts';
import { coffeeDiary as fallbackCoffeeDiary, preferenceEngine } from '../services/personalizationGateway';
import { BrewContext } from '../types/Personalization';
import { usePersonalization } from '../hooks/usePersonalization';
import { toggleFavorite } from '../services/homePagesService';
import { showToast } from '../utils/toast';
import { offlineSync } from '../offline';

interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number;
  is_recommended?: boolean;
  is_favorite?: boolean;
}

interface ScanResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
  isFavorite?: boolean;
}

interface BrewScannerProps {
  onBack?: () => void;
  onRecipeGenerated?: (recipe: string) => void;
}

const resolveTimeOfDay = (date: Date): BrewContext['timeOfDay'] => {
  const hour = date.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  if (hour < 22) {
    return 'evening';
  }
  return 'night';
};

const getIsoWeekday = (date: Date): number => {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
};

const buildBrewContext = (metadata?: Record<string, unknown>): BrewContext => {
  const now = new Date();
  const context: BrewContext = {
    timeOfDay: resolveTimeOfDay(now),
    weekday: getIsoWeekday(now),
  };

  if (metadata && Object.keys(metadata).length > 0) {
    context.metadata = { ...metadata };
  }

  return context;
};

const isOfflineError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === 'Offline' || error.message.includes('Network request failed');
};

const BACKGROUND_GRADIENT = ['#FFE8D1', '#FFA000', '#D4A574'];
const WELCOME_GRADIENT = ['#FF9966', '#A86B8C'];
const COFFEE_GRADIENT = ['#8B6544', '#6B4423'];
const WARM_GRADIENT = ['#FFA000', '#FF6B6B'];

const CoffeeReceipeScanner: React.FC<BrewScannerProps> = ({
  onBack,
  onRecipeGenerated,
}) => {
  const { coffeeDiary: personalizationDiary, refreshInsights } = usePersonalization();
  const diary = personalizationDiary ?? fallbackCoffeeDiary;
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrHistory, setOcrHistory] = useState<OCRHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [tastePreference, setTastePreference] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<string>('');
  const [recipeHistory, setRecipeHistory] = useState<RecipeHistory[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'recipe'>('home');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('Analyzujem...');

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isDarkMode = useColorScheme() === 'dark';

  const styles = scannerStyles(isDarkMode);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    loadHistory();
    loadRecipeHistory();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const setInitialConnection = async () => {
      const state = await NetInfo.fetch();
      setIsConnected(state.isConnected ?? null);
    };
    void setInitialConnection();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? null);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Načíta posledné OCR skenovania zo servera.
   */
  const loadHistory = async () => {
    try {
      const history = await fetchOCRHistory(10);
      setOcrHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadRecipeHistory = async () => {
    try {
      const history = await fetchRecipeHistory(10);
      setRecipeHistory(history);
    } catch (error) {
      console.error('Error loading recipe history:', error);
    }
  };

  /**
   * Refreshuje históriu potiahnutím v zozname.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(), loadRecipeHistory()]);
    setRefreshing(false);
  };

  /**
   * Zachytí fotografiu pomocou kamery a odošle ju na spracovanie.
   */
  const takePhoto = async () => {
    if (!camera.current || !device) {
      Alert.alert('Chyba', 'Kamera nie je pripravená');
      return;
    }

    try {
      setIsLoading(true);
      const photo: PhotoFile = await camera.current.takePhoto({
        flash: 'auto',
      });

      const base64 = await RNFS.readFile(photo.path, 'base64');
      await processImage(base64);
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa urobiť fotografiu');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vyberie obrázok z galérie a pošle ho na spracovanie.
   */
  const pickImageFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1.0,
      includeBase64: true,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;

      if (response.assets && response.assets[0]?.base64) {
        processImage(response.assets[0].base64);
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
      }
    });
  };

  /**
   * Spracuje obrázok cez OCR pipeline a uloží výsledok.
   */
  const processImage = async (base64image: string) => {
    try {
      setIsLoading(true);
      setShowCamera(false);
      setOverlayText('Analyzujem...');
      setOverlayVisible(true);

      const result = await processOCR(base64image);

      if (result) {
        let methods = result.brewingMethods;
        if (!methods || methods.length === 0) {
          try {
            methods = await suggestBrewingMethods(result.corrected || result.original);
          } catch (methodError) {
            console.warn('CoffeeReceipeScanner: failed to suggest brewing methods', methodError);
          }
        }

        const enhancedResult: ScanResult = {
          ...result,
          brewingMethods: methods ?? result.brewingMethods,
        };

        setScanResult(enhancedResult);
        setIsFavorite(enhancedResult.isFavorite ?? false);
        setEditedText(enhancedResult.corrected);
        if (methods && methods.length > 0) {
          setSelectedMethod(methods[0]);
        }
        setCurrentView('scan');

        // Načítaj aktualizovanú históriu
        await loadHistory();

        // Zobraz výsledok
        Alert.alert(
          '✅ Skenovanie dokončené',
          result.recommendation ||
            'Skontroluj výsledok nižšie.',
          [{ text: 'OK', style: 'default' }],
        );
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
      setOverlayVisible(false);
    }
  };

  /**
   * Uloží hodnotenie skenovanej kávy.
   */
  // const rateCoffee = async (rating: number) => {
  //   if (!scanResult?.scanId) return;
  //
  //   try {
  //     const success = await rateOCRResult(scanResult.scanId, rating);
  //     if (success) {
  //       setUserRating(rating);
  //       Alert.alert(
  //         'Hodnotenie uložené',
  //         `Ohodnotil si kávu na ${rating}/5 ⭐`,
  //       );
  //       await loadHistory();
  //     }
  //   } catch (error) {
  //     console.error('Error rating coffee:', error);
  //   }
  // };

  const generateRecipe = async () => {
    if (!selectedMethod) {
      Alert.alert('Upozornenie', 'Prosím vyber metódu prípravy');
      return;
    }

    setIsGenerating(true);
    try {
      setOverlayText('Generujem recept...');
      setOverlayVisible(true);
      const recipe = await getBrewRecipe(
        selectedMethod,
        tastePreference || 'vyvážená'
      );

      setGeneratedRecipe(recipe);
      if (onRecipeGenerated) {
        onRecipeGenerated(recipe);
      }
      setCurrentView('recipe');

      const saved = await saveRecipe(
        selectedMethod,
        tastePreference || 'vyvážená',
        recipe
      );
      if (saved) {
        setRecipeHistory((prev) => [saved, ...prev]);
      } else {
        console.warn('Failed to save recipe');
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Chyba', 'Nepodarilo sa vygenerovať recept');
    } finally {
      setIsGenerating(false);
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
  };

  const loadFromHistory = async (item: OCRHistory) => {
    const methods = await suggestBrewingMethods(item.corrected_text);
    setScanResult({
      original: item.original_text,
      corrected: item.corrected_text,
      recommendation: '',
      matchPercentage: item.match_percentage,
      isRecommended: item.is_recommended,
      brewingMethods: methods,
      isFavorite: item.is_favorite,
    });
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setSelectedMethod(methods[0] ?? null);
    setIsFavorite(item.is_favorite ?? false);
    setGeneratedRecipe('');
    setCurrentView('scan');
  };

  const deleteFromHistory = async (id: string) => {
    Alert.alert(
      'Vymazať záznam',
      'Naozaj chcete vymazať tento záznam?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOCRRecord(id);
              await loadHistory();
            } catch (error) {
              Alert.alert('Chyba', 'Nepodarilo sa vymazať záznam');
            }
          },
        },
      ]
    );
  };

  const handleRating = async (rating: number) => {
    if (!scanResult) {
      return;
    }

    const previousRating = userRating;
    setUserRating(rating);

    const fallbackId = `recipe-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const notesSegments = [
      selectedMethod ? `Metóda: ${selectedMethod}` : undefined,
      tastePreference ? `Preferencia: ${tastePreference}` : undefined,
    ].filter((part): part is string => Boolean(part));
    const notes = notesSegments.length > 0 ? notesSegments.join('\n') : undefined;

    let queuedOffline = false;

    if (scanResult.scanId) {
      try {
        const success = await rateOCRResult(scanResult.scanId, rating);
        if (!success) {
          throw new Error('RATE_FAILED');
        }
      } catch (error) {
        if (isOfflineError(error) || isConnected === false) {
          try {
            const payload = notes
              ? { coffeeId: scanResult.scanId, rating, notes }
              : { coffeeId: scanResult.scanId, rating };
            await offlineSync.enqueue('coffee:rate', payload);
            queuedOffline = true;
          } catch (queueError) {
            console.error('Failed to enqueue recipe rating for offline sync', queueError);
            setUserRating(previousRating);
            Alert.alert('Chyba', 'Nepodarilo sa uložiť hodnotenie offline');
            return;
          }
        } else {
          console.error('Error rating result:', error);
          setUserRating(previousRating);
          Alert.alert('Chyba', 'Nepodarilo sa uložiť hodnotenie');
          return;
        }
      }
    } else {
      queuedOffline = true;
    }

    try {
      const recipeMetadata: Record<string, unknown> = {
        source: 'recipe-scanner',
        scanId: scanResult.scanId,
        brewingMethods: scanResult.brewingMethods ?? [],
        selectedMethod: selectedMethod ?? undefined,
        tastePreference: tastePreference || undefined,
        generatedRecipe: generatedRecipe || undefined,
        correctedText: editedText,
      };

      const context = buildBrewContext(recipeMetadata);
      await diary.addManualEntry({
        recipe: generatedRecipe || scanResult.corrected || scanResult.original,
        notes,
        brewedAt: new Date(),
        rating,
        recipeId: recordId,
        metadata: recipeMetadata,
        context,
      });

      if (refreshInsights) {
        refreshInsights().catch((error) => {
          console.warn('CoffeeReceipeScanner: failed to refresh diary insights', error);
        });
      }

      const learningEvent = await preferenceEngine.recordBrew(recordId, rating, context);
      await preferenceEngine.saveEvents(learningEvent);

      await Promise.all([loadHistory(), loadRecipeHistory()]);

      Alert.alert('Hodnotenie uložené', `Ohodnotil si recept na ${rating}/5 ⭐`);
      if (queuedOffline || isConnected === false) {
        showToast('Hodnotenie uložené offline. Synchronizácia prebehne neskôr.');
      }
    } catch (error) {
      console.error('Error rating result:', error);
      setUserRating(previousRating);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať hodnotenie');
    }
  };

  const handleFavoriteToggle = async () => {
    if (!scanResult) {
      return;
    }

    const fallbackId = `recipe-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);

    try {
      const success = await toggleFavorite(recordId);
      if (!success) {
        setIsFavorite(!nextValue);
        Alert.alert('Chyba', 'Nepodarilo sa upraviť obľúbené recepty');
        return;
      }

      if (isConnected === false) {
        showToast('Zmena obľúbených uložená offline.');
      }
    } catch (error) {
      console.error('Error toggling favorite recipe:', error);
      setIsFavorite(!nextValue);
      Alert.alert('Chyba', 'Nepodarilo sa upraviť obľúbené recepty');
    }
  };

  const exportText = async () => {
    try {
      await Share.share({
        message: generatedRecipe || editedText,
        title: 'Recept na kávu',
      });
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa exportovať recept');
    }
  };

  const handleBack = () => {
    if (currentView === 'recipe') {
      setGeneratedRecipe('');
      setCurrentView('scan');
      return;
    }

    if (currentView === 'scan') {
      clearAll();
      if (onBack) {
        onBack();
      }
      return;
    }

    if (onBack) {
      onBack();
    }
  };

  const clearAll = () => {
    setScanResult(null);
    setEditedText('');
    setUserRating(0);
    setSelectedMethod(null);
    setTastePreference('');
    setGeneratedRecipe('');
    setIsFavorite(false);
    setCurrentView('home');
  };

  const ratedHistory = ocrHistory.filter(
    (item) => typeof item.rating === 'number' && (item.rating ?? 0) > 0
  );
  const averageRating = ratedHistory.length
    ? (
        ratedHistory.reduce((acc, item) => acc + (item.rating ?? 0), 0) /
        ratedHistory.length
      ).toFixed(1)
    : '0.0';
  const favoritesCount = ocrHistory.filter((item) => item.is_favorite).length;
  const showBackButton = currentView !== 'home';
  const brewingMethods = scanResult?.brewingMethods ?? [];
  const matchLabel = scanResult?.matchPercentage
    ? `${scanResult.matchPercentage}% zhoda`
    : undefined;
  const refreshControl =
    currentView === 'home'
      ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      : undefined;

  // Camera View
  if (showCamera && device) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={showCamera}
          photo={true}
        />
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>

          <View style={styles.cameraInstructions}>
            <Text style={styles.cameraInstructionText}>
              Zarovnaj etiketu kávy do rámčeka
            </Text>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#8B6F47" size="large" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

      // Main Scanner View
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <LinearGradient colors={BACKGROUND_GRADIENT} style={styles.backgroundGradient} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.phoneContainer}>
              <View style={styles.statusBar}>
                <Text style={styles.statusTime}>9:41</Text>
                <View style={styles.statusIcons}>
                  <Text style={styles.statusIcon}>📶</Text>
                  <Text style={styles.statusIcon}>📶</Text>
                  <Text style={styles.statusIcon}>🔋</Text>
                </View>
              </View>

              <View style={styles.appHeader}>
                <TouchableOpacity
                  style={[styles.backButton, showBackButton ? styles.backButtonVisible : null]}
                  onPress={handleBack}
                  activeOpacity={0.8}
                  disabled={!showBackButton}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.coffeeIcon}>☕</Text>
                    <Text style={styles.headerTitle}>Generátor receptov</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    Vytvor si personalizovaný recept na prípravu kávy
                  </Text>
                </View>
              </View>

              <View style={styles.mainContent}>
                {currentView === 'home' && (
                  <>
                    <LinearGradient colors={WELCOME_GRADIENT} style={styles.welcomeCard}>
                      <Text style={styles.welcomeEmoji}>☕</Text>
                      <Text style={styles.welcomeText}>Vitaj v generátore receptov!</Text>
                      <Text style={styles.welcomeDesc}>
                        Naskenuj kávu a vytvor si perfektný recept
                      </Text>
                    </LinearGradient>

                    <View style={styles.actionSection}>
                      <View style={styles.actionGrid}>
                        <TouchableOpacity
                          style={[styles.actionCard, styles.actionCardPrimary]}
                          onPress={() => {
                            if (!device) {
                              Alert.alert('Chyba', 'Kamera nie je dostupná');
                              return;
                            }
                            setShowCamera(true);
                          }}
                          activeOpacity={0.9}
                        >
                          <LinearGradient
                            colors={COFFEE_GRADIENT}
                            style={[styles.actionIconContainer, styles.actionIconContainerPrimary]}
                          >
                            <Text style={styles.actionIcon}>📷</Text>
                          </LinearGradient>
                          <Text style={styles.actionLabel}>Odfotiť kávu</Text>
                          <Text style={styles.actionSublabel}>Použiť kameru</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionCard}
                          onPress={pickImageFromGallery}
                          activeOpacity={0.9}
                        >
                          <View style={styles.actionIconContainer}>
                            <Text style={styles.actionIcon}>🖼️</Text>
                          </View>
                          <Text style={styles.actionLabel}>Vybrať z galérie</Text>
                          <Text style={styles.actionSublabel}>Nahrať fotku</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{ocrHistory.length}</Text>
                        <Text style={styles.statLabel}>Receptov</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{favoritesCount}</Text>
                        <Text style={styles.statLabel}>Obľúbené</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{averageRating}</Text>
                        <Text style={styles.statLabel}>Priemer ⭐</Text>
                      </View>
                    </View>

                    <View style={styles.historySection}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>📚 História skenovaní</Text>
                        {ocrHistory.length > 0 && (
                          <TouchableOpacity
                            style={styles.historySeeAll}
                            onPress={() => showToast('Pripravujeme prehľad histórie.')}
                          >
                            <Text style={styles.historySeeAllText}>Zobraziť všetky →</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {ocrHistory.length > 0 ? (
                        <View style={styles.historyGrid}>
                          {ocrHistory.slice(0, 6).map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.historyCard}
                              onPress={() => loadFromHistory(item)}
                              onLongPress={() => deleteFromHistory(item.id)}
                              activeOpacity={0.85}
                            >
                              <View style={styles.historyCardAccent} />
                              <View style={styles.historyCardContent}>
                                <Text style={styles.historyCardName} numberOfLines={1}>
                                  {item.coffee_name || 'Neznáma káva'}
                                </Text>
                                <Text style={styles.historyCardDate}>
                                  {new Date(item.created_at).toLocaleDateString('sk-SK')}
                                </Text>
                                {item.rating ? (
                                  <Text style={styles.historyCardRating}>
                                    {'⭐'.repeat(item.rating)}
                                  </Text>
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <View style={styles.emptyStateImage}>
                            <Text style={styles.emptyStateIcon}>☕</Text>
                          </View>
                          <Text style={styles.emptyStateTitle}>Žiadne recepty</Text>
                          <Text style={styles.emptyStateDesc}>
                            Naskenuj svoju prvú kávu a vytvor si personalizovaný recept
                          </Text>
                        </View>
                      )}
                    </View>

                    {recipeHistory.length > 0 && (
                      <View style={styles.historySection}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyTitle}>📖 História receptov</Text>
                          <TouchableOpacity
                            style={styles.historySeeAll}
                            onPress={() => showToast('Pripravujeme prehľad receptov.')}
                          >
                            <Text style={styles.historySeeAllText}>Zobraziť všetky →</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.historyGrid}>
                          {recipeHistory.slice(0, 4).map((item) => (
                            <View key={item.id} style={styles.historyCard}>
                              <View style={styles.historyCardAccent} />
                              <View style={styles.historyCardContent}>
                                <Text style={styles.historyCardName} numberOfLines={1}>
                                  {item.method}
                                </Text>
                                <Text style={styles.historyCardDate}>
                                  {new Date(item.created_at).toLocaleDateString('sk-SK')}
                                </Text>
                                <Text style={styles.historyCardRating} numberOfLines={2}>
                                  {item.recipe}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {currentView === 'scan' && scanResult && (
                  <>
                    <View style={styles.resultSection}>
                      <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                          <Text style={styles.resultTitle}>📝 Informácie o káve</Text>
                          {matchLabel && (
                            <View
                              style={[
                                styles.matchBadge,
                                scanResult.isRecommended ? styles.matchBadgeGood : styles.matchBadgeFair,
                              ]}
                            >
                              <Text style={styles.matchText}>{matchLabel}</Text>
                            </View>
                          )}
                        </View>
                        <TextInput
                          style={styles.resultTextInput}
                          multiline
                          value={editedText}
                          onChangeText={setEditedText}
                          placeholder="Upravte rozpoznaný text..."
                          textAlignVertical="top"
                        />
                      </View>
                    </View>

                    <View style={styles.ratingCard}>
                      <View style={styles.ratingContent}>
                        <Text style={styles.ratingLabel}>Hodnotenie:</Text>
                        <View style={styles.ratingStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              style={styles.starButton}
                              onPress={() => handleRating(star)}
                            >
                              <Text
                                style={[
                                  styles.starIcon,
                                  star <= userRating && styles.starIconFilled,
                                ]}
                              >
                                ⭐
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                          onPress={handleFavoriteToggle}
                        >
                          <Text
                            style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}
                          >
                            {isFavorite ? '❤️ Uložené' : '♡ Obľúbené'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.brewingSection}>
                      <Text style={styles.sectionTitle}>☕ Metóda prípravy</Text>
                      <View style={styles.brewingGrid}>
                        {brewingMethods.map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={[
                              styles.brewingChip,
                              selectedMethod === method && styles.brewingChipSelected,
                            ]}
                            onPress={() => setSelectedMethod(method)}
                          >
                            <Text
                              style={[
                                styles.brewingChipText,
                                selectedMethod === method && styles.brewingChipTextSelected,
                              ]}
                            >
                              {method}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.tasteSection}>
                      <Text style={styles.sectionTitle}>✨ Chuťová preferencia</Text>
                      <View style={styles.tasteInputContainer}>
                        <TextInput
                          style={styles.tasteInput}
                          placeholder="napr. silná, jemná, kyslá, sladká..."
                          value={tastePreference}
                          onChangeText={setTastePreference}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.generateButton, (!selectedMethod || isGenerating) && styles.generateButtonDisabled]}
                      onPress={generateRecipe}
                      disabled={isGenerating || !selectedMethod}
                      activeOpacity={0.9}
                    >
                      <LinearGradient colors={WARM_GRADIENT} style={styles.generateButtonGradient}>
                        {isGenerating ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.generateButtonText}>✨ Vygenerovať recept</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {currentView === 'recipe' && generatedRecipe && (
                  <View style={styles.recipeSection}>
                    <View style={styles.recipeCard}>
                      <View style={styles.recipeHeader}>
                        <View style={styles.recipeIcon}>
                          <Text style={styles.recipeIconText}>☕</Text>
                        </View>
                        <View style={styles.recipeHeaderContent}>
                          <Text style={styles.recipeTitle}>Váš personalizovaný recept</Text>
                          <Text style={styles.recipeMethod}>{selectedMethod?.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={styles.recipeContentBox}>
                        <Text style={styles.recipeContent}>{generatedRecipe}</Text>
                      </View>
                      <View style={styles.recipeActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonPrimary]}
                          onPress={exportText}
                        >
                          <Text style={styles.actionButtonPrimaryText}>📤 Zdieľať</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={clearAll}
                        >
                          <Text style={styles.actionButtonSecondaryText}>🔄 Nový recept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, currentView === 'recipe' ? styles.fabVisible : null]}
          onPress={clearAll}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>➕</Text>
        </TouchableOpacity>

        {overlayVisible && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B4423" />
              <Text style={styles.loadingText}>{overlayText}</Text>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

export default CoffeeReceipeScanner;