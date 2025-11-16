// CoffeeReceipeScanner.tsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  SafeAreaView,
  Modal,
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
import { scannerStyles } from './styles';
import {
  processOCR,
  fetchOCRHistory,
  getBrewRecipe,
  suggestBrewingMethods,
  rateOCRResult,
  saveRecipe,
  fetchRecipeHistory,
  fallbackCoffeeDiary,
  preferenceEngine,
  toggleFavorite,
  isCoffeeRelatedText,
} from './services';
import type { RecipeHistory } from './services';
import type { RecipeTextPayload } from '../../utils/recipeDetailBuilder';
import { BrewContext } from '../../types/Personalization';
import { usePersonalization } from '../../hooks/usePersonalization';
import { showToast } from '../../utils/toast';
import { offlineSync } from '../../offline';

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
  isCoffee?: boolean;
  nonCoffeeReason?: string;
  detectionLabels?: string[];
  detectionConfidence?: number;
}

interface BrewScannerProps {
  onBack?: () => void;
  onRecipeGenerated?: (recipe: RecipeTextPayload) => void;
  onRecipeHistoryPress?: (entry: RecipeHistory) => void;
  onSeeAllRecipes?: () => void;
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

const WELCOME_GRADIENT = ['#FF9966', '#A86B8C'];
const COFFEE_GRADIENT = ['#8B6544', '#6B4423'];
const WARM_GRADIENT = ['#FFA000', '#FF6B6B'];
const RATING_GRADIENT = ['#FFFFFF', '#F5E6D3'];
const TIP_GRADIENT = ['#9C27B0', '#FF6B6B'];

const brewingMethodHints: Record<string, string> = {
  V60: '2–3 min',
  Chemex: '4–5 min',
  Espresso: '25–30 s',
  AeroPress: '1–2 min',
  'French Press': '4 min',
  'Cold Brew': '12–24 h',
};

const brewingMethodEmojis: Record<string, string> = {
  V60: '☕',
  Chemex: '☕',
  Espresso: '⚡',
  AeroPress: '☕',
  'French Press': '☕',
  'Cold Brew': '❄️',
};

const CoffeeReceipeScanner: React.FC<BrewScannerProps> = ({
  onBack,
  onRecipeGenerated,
  onRecipeHistoryPress,
  onSeeAllRecipes,
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
  const [selectedTasteTags, setSelectedTasteTags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<string>('');
  const [recipeHistory, setRecipeHistory] = useState<RecipeHistory[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'scan' | 'recipe'>('home');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('Analyzujem...');
  const [nonCoffeeModalVisible, setNonCoffeeModalVisible] = useState(false);
  const [nonCoffeeDetails, setNonCoffeeDetails] = useState<{
    reason?: string;
    labels?: string[];
    confidence?: number;
  }>({});

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isDarkMode = useColorScheme() === 'dark';

  const styles = scannerStyles(isDarkMode);
  const backgroundGradient = useMemo(
    () => ({
      colors: ['#FFE8D1', '#FFF3E4', '#FAF8F5'],
      locations: [0, 0.28, 0.7],
    }),
    [],
  );

  const handleSeeAllRecipes = useCallback(() => {
    if (onSeeAllRecipes) {
      onSeeAllRecipes();
      return;
    }
    showToast('Pripravujeme prehľad receptov.');
  }, [onSeeAllRecipes]);

  const nonCoffeeConfidence = useMemo(() => {
    if (typeof nonCoffeeDetails.confidence !== 'number') {
      return null;
    }
    const raw = nonCoffeeDetails.confidence;
    const percent = raw <= 1 ? raw * 100 : raw;
    const bounded = Math.round(Math.max(0, Math.min(100, percent)));
    return Number.isNaN(bounded) ? null : bounded;
  }, [nonCoffeeDetails.confidence]);

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

  const closeNonCoffeeModal = () => {
    setNonCoffeeModalVisible(false);
    setNonCoffeeDetails({});
  };

  const handleNonCoffeeDetected = (details?: {
    reason?: string;
    labels?: string[];
    confidence?: number;
  }) => {
    setScanResult(null);
    setEditedText('');
    setSelectedMethod(null);
    setGeneratedRecipe('');
    setIsFavorite(false);
    setShowCamera(false);
    setOverlayVisible(false);
    setOverlayText('Analyzujem...');
    setIsLoading(false);
    setCurrentView('home');
    const derivedReason =
      details?.reason ||
      (details?.labels && details.labels.length > 0
        ? `Rozpoznané: ${details.labels.slice(0, 3).join(', ')}`
        : undefined);
    setNonCoffeeDetails({
      reason: derivedReason,
      labels: details?.labels,
      confidence: details?.confidence,
    });
    setNonCoffeeModalVisible(true);
    showToast('Skús prosím naskenovať etiketu kávy.');
  };

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
      closeNonCoffeeModal();
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
        closeNonCoffeeModal();
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
        if (result.source === 'offline' && result.isCoffee === false) {
          handleNonCoffeeDetected({
            reason: result.nonCoffeeReason,
            labels: result.detectionLabels,
            confidence: result.detectionConfidence,
          });
          return;
        }

        const detectionLabels = result.detectionLabels?.filter(Boolean) ?? [];
        const computedIsCoffee =
          typeof result.isCoffee === 'boolean'
            ? result.isCoffee
            : detectionLabels.some(label => isCoffeeRelatedText(label)) ||
              isCoffeeRelatedText(result.corrected) ||
              isCoffeeRelatedText(result.original);

        if (!computedIsCoffee) {
          handleNonCoffeeDetected({
            reason: result.nonCoffeeReason,
            labels: detectionLabels.length ? detectionLabels : undefined,
            confidence: result.detectionConfidence,
          });
          return;
        }

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
        const noteSegments = [
          selectedMethod ? `Metóda: ${selectedMethod}` : undefined,
          tastePreference ? `Preferencia: ${tastePreference}` : undefined,
          selectedTasteTags.length > 0 ? `Chuťové tóny: ${selectedTasteTags.join(', ')}` : undefined,
        ].filter((segment): segment is string => Boolean(segment));

        onRecipeGenerated({
          text: recipe,
          method: selectedMethod,
          title: selectedMethod ? `${selectedMethod} recept` : undefined,
          notes: noteSegments.length > 0 ? noteSegments : undefined,
          source: 'ai',
        });
      }
      setCurrentView('recipe');
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
      setIsGenerating(false);

      void saveRecipe(
        selectedMethod,
        tastePreference || 'vyvážená',
        recipe
      )
        .then((saved) => {
          if (saved) {
            setRecipeHistory((prev) => [saved, ...prev]);
          } else {
            console.warn('Failed to save recipe');
          }
        })
        .catch((saveError) => {
          console.error('Error saving recipe:', saveError);
          showToast('Nepodarilo sa uložiť recept');
        });
    } catch (error) {
      console.error('Error generating recipe:', error);
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
      setIsGenerating(false);
      Alert.alert('Chyba', 'Nepodarilo sa vygenerovať recept');
    }
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

  const handleTastePreferenceChange = (value: string) => {
    setTastePreference(value);

    if (value.trim().length === 0 && selectedTasteTags.length > 0) {
      setSelectedTasteTags([]);
    }
  };

  const toggleTasteTag = (tag: string) => {
    setSelectedTasteTags((prev) => {
      const exists = prev.includes(tag);
      const next = exists ? prev.filter((item) => item !== tag) : [...prev, tag];
      setTastePreference(
        next.length ? `Preferujem kávu, ktorá je: ${next.join(', ')}.` : ''
      );
      return next;
    });
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
    setSelectedTasteTags([]);
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
  const tasteSuggestions = useMemo(
    () => [
      'Silná a intenzívna',
      'Jemná a vyvážená',
      'Sladká s nízkou kyslosťou',
      'Živá a ovocná',
      'Čokoládová a krémová',
    ],
    []
  );
  const recognizedLines = useMemo(() => {
    const sourceText =
      editedText || scanResult?.corrected || scanResult?.original || '';
    return sourceText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [editedText, scanResult]);
  const recognizedName = recognizedLines[0] ?? 'Rozpoznaná káva';
  const recognizedDetails = recognizedLines.slice(1, 3).join(' • ');
  const tastingNotes = useMemo(() => {
    if (!scanResult?.recommendation) {
      return [] as string[];
    }

    const bulletNotes = scanResult.recommendation
      .split('\n')
      .map((line) => line.replace(/^[•\-\d\.\s]+/, '').trim())
      .filter((line) => line.length > 0 && line.length <= 28)
      .slice(0, 4);

    if (bulletNotes.length > 0) {
      return bulletNotes;
    }

    const commaSegments = scanResult.recommendation
      .split(',')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0 && segment.length <= 24)
      .slice(0, 4);

    return commaSegments;
  }, [scanResult]);
  const ratingDisplay = useMemo(() => {
    if (userRating > 0) {
      return userRating.toFixed(1);
    }
    return '—';
  }, [userRating]);
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
        <LinearGradient
          colors={backgroundGradient.colors}
          locations={backgroundGradient.locations}
          style={styles.backgroundGradient}
        />
        <Modal
          visible={nonCoffeeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeNonCoffeeModal}
        >
          <View style={styles.validationModalOverlay}>
            <LinearGradient colors={['#FFF8F4', '#FFE0D9']} style={styles.validationModalContent}>
              <View style={styles.validationModalIconCircle}>
                <Text style={styles.validationModalIcon}>🚫</Text>
              </View>
              <Text style={styles.validationModalTitle}>Zdá sa, že toto nie je káva</Text>
              <Text style={styles.validationModalMessage}>
                AI nerozpoznala kávu na vybranom obrázku. Uisti sa, že fotíš etiketu alebo balenie kávy v dobrom svetle.
              </Text>
              {nonCoffeeConfidence !== null ? (
                <Text style={styles.validationModalConfidence}>
                  Istota modelu: {nonCoffeeConfidence}%
                </Text>
              ) : null}
              {nonCoffeeDetails.reason ? (
                <Text style={styles.validationModalReason}>{nonCoffeeDetails.reason}</Text>
              ) : null}
              {nonCoffeeDetails.labels?.length ? (
                <View style={styles.validationModalChips}>
                  {nonCoffeeDetails.labels.slice(0, 4).map(label => (
                    <View key={label} style={styles.validationModalChip}>
                      <Text style={styles.validationModalChipText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={styles.validationModalHint}>
                Tip: Priblíž sa k etikete, aby boli texty ostré a čitateľné.
              </Text>
              <TouchableOpacity
                style={styles.validationModalButton}
                onPress={closeNonCoffeeModal}
                activeOpacity={0.85}
              >
                <Text style={styles.validationModalButtonText}>Skúsiť znova</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>
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
                        <Text style={styles.statNumber}>{recipeHistory.length}</Text>
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

                    {recipeHistory.length > 0 && (
                      <View style={styles.historySection}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyTitle}>📖 História receptov</Text>
                          <TouchableOpacity
                            style={styles.historySeeAll}
                            onPress={handleSeeAllRecipes}
                          >
                            <Text style={styles.historySeeAllText}>Zobraziť všetky →</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.historyGrid}>
                          {recipeHistory.slice(0, 4).map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.historyCard}
                              activeOpacity={0.85}
                              onPress={() => onRecipeHistoryPress?.(item)}
                            >
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
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {currentView === 'scan' && scanResult && (
                  <>
                    <View style={styles.scanReviewContainer}>
                      <View style={styles.scanCoffeeCard}>
                        <View style={styles.scanBadgeRow}>
                          <View style={styles.scanBadge}>
                            <Text style={styles.scanBadgeIcon}>✓</Text>
                            <Text style={styles.scanBadgeText}>Rozpoznané</Text>
                          </View>
                          {matchLabel ? (
                            <View style={styles.scanMatchPill}>
                              <Text style={styles.scanMatchText}>{matchLabel}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.scanCoffeeName}>{recognizedName}</Text>
                        {recognizedDetails ? (
                          <Text style={styles.scanCoffeeDetails}>{recognizedDetails}</Text>
                        ) : null}
                        {tastingNotes.length > 0 ? (
                          <View style={styles.scanNotesRow}>
                            {tastingNotes.map((note) => (
                              <View key={note} style={styles.scanNoteChip}>
                                <Text style={styles.scanNoteChipText}>{note}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        <View style={styles.scanTextInputContainer}>
                          <TextInput
                            style={styles.scanTextInput}
                            multiline
                            value={editedText}
                            onChangeText={setEditedText}
                            placeholder="Upravte rozpoznaný text..."
                            textAlignVertical="top"
                          />
                        </View>
                      </View>

                      <View style={styles.scanRatingWrapper}>
                        <LinearGradient colors={RATING_GRADIENT} style={styles.scanRatingCard}>
                          <View style={styles.scanRatingHeader}>
                            <Text style={styles.scanRatingTitle}>Ohodnoť kávu</Text>
                            <Text style={styles.scanRatingValue}>{ratingDisplay}</Text>
                          </View>
                          <View style={styles.scanStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity
                                key={star}
                                style={styles.scanStarButton}
                                onPress={() => handleRating(star)}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.scanStarIcon,
                                    star <= userRating && styles.scanStarIconActive,
                                  ]}
                                >
                                  ⭐
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity
                            style={[styles.scanFavoriteButton, isFavorite && styles.scanFavoriteButtonActive]}
                            onPress={handleFavoriteToggle}
                            activeOpacity={0.85}
                          >
                            <Text
                              style={[styles.scanFavoriteText, isFavorite && styles.scanFavoriteTextActive]}
                            >
                              {isFavorite ? '❤️ Uložené' : '♡ Obľúbené'}
                            </Text>
                          </TouchableOpacity>
                        </LinearGradient>
                      </View>

                      <View style={styles.scanMethodSection}>
                        <View style={styles.scanSectionHeader}>
                          <View style={styles.scanSectionIcon}>
                            <Text style={styles.scanSectionIconText}>☕</Text>
                          </View>
                          <Text style={styles.scanSectionTitle}>Metóda prípravy</Text>
                        </View>
                        <View style={styles.scanMethodGrid}>
                          {brewingMethods.map((method) => {
                            const hint = brewingMethodHints[method] ?? 'Pripravené na mieru';
                            const emoji = brewingMethodEmojis[method] ?? '☕';
                            const isSelected = selectedMethod === method;
                            return (
                              <TouchableOpacity
                                key={method}
                                style={[styles.scanMethodButton, isSelected && styles.scanMethodButtonSelected]}
                                onPress={() => setSelectedMethod(method)}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.scanMethodEmoji}>{emoji}</Text>
                                <Text
                                  style={[styles.scanMethodName, isSelected && styles.scanMethodNameSelected]}
                                  numberOfLines={1}
                                >
                                  {method}
                                </Text>
                                <Text
                                  style={[styles.scanMethodTime, isSelected && styles.scanMethodTimeSelected]}
                                >
                                  {hint}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {scanResult.recommendation ? (
                        <View style={styles.scanTipWrapper}>
                          <LinearGradient colors={TIP_GRADIENT} style={styles.scanTipCard}>
                            <View style={styles.scanTipHeader}>
                              <View style={styles.scanTipIcon}>
                                <Text style={styles.scanTipIconText}>💡</Text>
                              </View>
                              <Text style={styles.scanTipLabel}>AI TIP</Text>
                            </View>
                            <Text style={styles.scanTipText}>{scanResult.recommendation}</Text>
                          </LinearGradient>
                        </View>
                      ) : null}

                      <View style={styles.scanPreferenceSection}>
                        <View style={styles.scanSectionHeader}>
                          <View style={styles.scanSectionIcon}>
                            <Text style={styles.scanSectionIconText}>✨</Text>
                          </View>
                          <Text style={styles.scanSectionTitle}>Tvoja ideálna káva</Text>
                        </View>
                        <View style={styles.scanPreferenceCard}>
                          <Text style={styles.scanPreferencePrompt}>
                            Opíš, akú kávu máš rád. Čo ti chutí a čo nie? Preferuješ silnú alebo jemnú? Kyslú alebo sladkú?
                          </Text>
                          <TextInput
                            style={styles.scanPreferenceInput}
                            multiline
                            placeholder="Napríklad: Mám rád vyváženú kávu s plným telom, nie príliš kyslú. Chutia mi čokoládové tóny, ale nie som fanúšik výrazne kvetinových káv."
                            value={tastePreference}
                            onChangeText={handleTastePreferenceChange}
                            textAlignVertical="top"
                          />
                          <View style={styles.scanSuggestionsRow}>
                            {tasteSuggestions.map((suggestion) => {
                              const isSelected = selectedTasteTags.includes(suggestion);
                              return (
                                <TouchableOpacity
                                  key={suggestion}
                                  style={[styles.scanSuggestionPill, isSelected && styles.scanSuggestionPillSelected]}
                                  onPress={() => toggleTasteTag(suggestion)}
                                  activeOpacity={0.85}
                                >
                                  <Text
                                    style={[styles.scanSuggestionText, isSelected && styles.scanSuggestionTextSelected]}
                                  >
                                    {suggestion}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.scanGenerateBar}>
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
                            <Text style={styles.generateButtonText}>✨ Vygenerovať môj recept</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
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
