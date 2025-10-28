// CoffeeTasteScanner.tsx - Light & Optimized Design
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { scannerStyles } from './styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  markCoffeePurchased,
  extractCoffeeName,
  rateOCRResult,
  incrementProgress,
  saveOCRResult,
  loadOCRResult,
  addRecentScan,
  fallbackCoffeeDiary,
  preferenceEngine,
  toggleFavorite,
} from './services';
import { BrewContext } from '../../types/Personalization';
import { usePersonalization } from '../../hooks/usePersonalization';
import { recognizeCoffee } from '../../offline/VisionService';
import { coffeeOfflineManager, offlineSync } from '../../offline';
import { showToast } from '../../utils/toast';

interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number;
  is_recommended?: boolean;
  is_purchased?: boolean;
  is_favorite?: boolean;
}

interface ScanResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  source?: 'offline' | 'online';
  isFavorite?: boolean;
}

interface ProfessionalOCRScannerProps {
  onBack?: () => void;
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

const BACKGROUND_GRADIENT_COLORS = ['#FFE8D1', '#FFE8D1', '#FAF8F5'];
const BACKGROUND_GRADIENT_LOCATIONS = [0, 0.4, 1];
const WELCOME_GRADIENT = ['#FF9966', '#A86B8C'];
const COFFEE_GRADIENT = ['#8B6544', '#6B4423'];
const WARM_GRADIENT = ['#FFA000', '#FF6B6B'];

const FLAVOR_KEYWORDS = [
  { keyword: 'kvet', label: '🌺 Kvetinová' },
  { keyword: 'citr', label: '🍋 Citrusová' },
  { keyword: 'brosky', label: '🍑 Broskyňa' },
  { keyword: 'med', label: '🍯 Medová' },
  { keyword: 'čaj', label: '🍵 Čajová' },
  { keyword: 'čokol', label: '🍫 Čokoládová' },
  { keyword: 'karamel', label: '🍮 Karamelová' },
  { keyword: 'ovoc', label: '🍒 Ovocná' },
];

const POSITIVE_REASON_KEYWORDS = [
  'vyhovuje',
  'nízka horkosť',
  'nízku horkosť',
  'jemná',
  'čistá',
  'kvetin',
  'citrus',
  'čajov',
  'sladk',
  'doporuč',
  'odporúč',
  'ideál',
];

const CAUTION_REASON_KEYWORDS = ['pozor', 'ak preferuješ', 'môže', 'siln', 'hork', 'telo'];

const clampTasteValue = (value: number): number => {
  if (Number.isNaN(value)) {
    return 5;
  }
  return Math.min(10, Math.max(0, value));
};

const CoffeeTasteScanner: React.FC<ProfessionalOCRScannerProps> = ({ onBack }) => {
  const { coffeeDiary: personalizationDiary, refreshInsights } = usePersonalization();
  const diary = personalizationDiary ?? fallbackCoffeeDiary;
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrHistory, setOcrHistory] = useState<OCRHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [purchaseSelection, setPurchaseSelection] = useState<boolean | null>(null);
  const [purchased, setPurchased] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [offlineModalVisible, setOfflineModalVisible] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<'prompt' | 'modelUsed'>('prompt');
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'scan'>('home');
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
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) {
        setOfflineStatus('prompt');
        setOfflineModalVisible(true);
      } else {
        setOfflineModalVisible(false);
        setOfflineStatus('prompt');
      }
    });
    return () => {
      unsubscribe();
      setIsConnected(null);
    };
  }, []);

  /**
   * Načíta nedávne OCR skeny pre používateľa.
   */
  const loadHistory = async () => {
    try {
      const history = await fetchOCRHistory(10);
      setOcrHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  /**
   * Obnoví históriu potiahnutím.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  /**
   * Odfotí etiketu a odošle ju na OCR spracovanie.
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

      setShowCamera(false);
      const base64 = await RNFS.readFile(photo.path, 'base64');

      if (isConnected === false) {
        await handleOfflineScan(photo.path, base64);
        return;
      }

      await processImage(base64, { imagePath: photo.path, base64 });
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa urobiť fotografiu');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vyberie fotku z galérie a odošle ju na spracovanie.
   */
  const pickImageFromGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1.0,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;

      if (response.assets && response.assets[0]?.base64) {
        const base64 = response.assets[0].base64;
        try {
          const cacheDir =
            RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath || RNFS.DocumentDirectoryPath;
          if (!cacheDir) {
            throw new Error('Temporary directory is not available');
          }
          const tempPath = `${cacheDir}/brew-offline-${Date.now()}.jpg`;
          await RNFS.writeFile(tempPath, base64, 'base64');

          if (isConnected === false) {
            setIsLoading(true);
            setShowCamera(false);
            try {
              await handleOfflineScan(tempPath, base64);
            } finally {
              setIsLoading(false);
            }
            return;
          }

          await processImage(base64, { imagePath: tempPath, base64 });
        } catch (err) {
          console.error('Gallery processing error:', err);
          Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
        }
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
      }
    });
  };

  /**
   * Vykoná OCR pipeline a uloží výsledok do stavu.
   */
  type ProcessImageExtra = { imagePath?: string; base64?: string };

  const processImage = async (base64image: string, extra?: ProcessImageExtra) => {
    try {
      setIsLoading(true);
      setShowCamera(false);
      setOverlayText('Analyzujem...');
      setOverlayVisible(true);

      const result = await processOCR(base64image, { imagePath: extra?.imagePath });

      if (result) {
        if (result.source === 'offline') {
          await handleOfflineScan(extra?.imagePath || '', extra?.base64 ?? base64image, result);
          return;
        }

        setScanResult(result);
        setIsFavorite(result.isFavorite ?? false);
        setEditedText(result.corrected);
        setPurchaseSelection(null);
        setPurchased(null);
        await saveOCRResult(result.scanId || 'last', result);

        setCurrentView('scan');
        setOverlayVisible(false);
        setOverlayText('Analyzujem...');

        // Update user progress for successful scan
        try {
          await incrementProgress('scan');
        } catch (e) {
          console.error('Failed to update progress', e);
        }

        // Ulož do zoznamu posledných skenov
        const name = extractCoffeeName(result.corrected || result.original);
        const scanIdentifier = result.scanId || Date.now().toString();
        await addRecentScan({
          id: scanIdentifier,
          name,
          imageUrl: `data:image/jpeg;base64,${base64image}`,
        });

        // Načítaj aktualizovanú históriu
        await loadHistory();

        // Zobraz výsledok
        Alert.alert(
          '✅ Skenovanie dokončené',
          result.isRecommended
            ? `Táto káva má ${result.matchPercentage}% zhodu s tvojimi preferenciami!`
            : `Zhoda s preferenciami: ${result.matchPercentage}%`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing image:', error);
      if (
        extra?.imagePath &&
        error instanceof Error &&
        /offline|network request failed/i.test(error.message)
      ) {
        await handleOfflineScan(extra.imagePath, extra.base64 ?? base64image);
        return;
      }
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
  };

  const handleOfflineScan = async (
    imagePath: string,
    base64image: string,
    existingResult?: ScanResult | null
  ) => {
    try {
      setOverlayText('Analyzujem offline...');
      setOverlayVisible(true);
      const label = existingResult?.corrected || (await recognizeCoffee(imagePath));
      if (!label) {
        Alert.alert('Chyba', 'Nepodarilo sa rozpoznať kávu offline');
        setOverlayVisible(false);
        setOverlayText('Analyzujem...');
        return;
      }

      const timestamp = Date.now();
      const scanId = existingResult?.scanId || `offline-${timestamp}`;
      const offlineResult: ScanResult = existingResult
        ? { ...existingResult, source: 'offline' }
        : {
          original: '',
          corrected: label,
          recommendation: 'Výsledok z lokálneho modelu.',
          scanId,
          source: 'offline',
        };

      setScanResult(offlineResult);
      setIsFavorite(offlineResult.isFavorite ?? false);
      setEditedText(offlineResult.corrected);
      setPurchaseSelection(null);
      setPurchased(null);
      setCurrentView('scan');
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');

      try {
        const payload = imagePath
          ? { ...offlineResult, imagePath, createdAt: timestamp }
          : { ...offlineResult, createdAt: timestamp };
        await coffeeOfflineManager.setItem(
          'taste:last-offline',
          payload,
          24 * 30,
          5
        );
      } catch (cacheError) {
        console.error('Failed to cache offline scan', cacheError);
      }

      try {
        await saveOCRResult(scanId, offlineResult);
      } catch (cacheError) {
        console.error('Failed to save offline result', cacheError);
      }

      try {
        const name = extractCoffeeName(label);
        await addRecentScan({
          id: scanId,
          name,
          imageUrl: `data:image/jpeg;base64,${base64image}`,
        });
      } catch (recentError) {
        console.error('Failed to store offline recent scan', recentError);
      }

      setOfflineStatus('modelUsed');
      setOfflineModalVisible(true);
    } catch (err) {
      console.error('Offline recognition failed:', err);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok offline');
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
  };

  /**
   * Uloží hodnotenie vybranej kávy.
   */
  // const rateCoffee = async (rating: number) => {
  //   if (!scanResult?.scanId) return;
  //
  //   try {
  //     const success = await rateOCRResult(scanResult.scanId, rating);
  //     if (success) {
  //       setUserRating(rating);
  //       Alert.alert('Hodnotenie uložené', `Ohodnotil si kávu na ${rating}/5 ⭐`);
  //       await loadHistory();
  //     }
  //   } catch (error) {
  //     console.error('Error rating coffee:', error);
  //   }
  // };

  /**
   * Zdieľa text prostredníctvom natívneho dialógu.
   */
  // const exportText = async () => {
  //   if (editedText) {
  //     try {
  //       await Share.share({
  //         message: editedText,
  //         title: 'Skenovaná káva - BrewMate',
  //       });
  //     } catch (error) {
  //       Alert.alert('Chyba', 'Nepodarilo sa zdieľať text');
  //     }
  //   }
  // };

  /**
   * Načíta záznam z histórie do editora.
   */
  const loadFromHistory = (item: OCRHistory) => {
    setScanResult({
      original: item.original_text,
      corrected: item.corrected_text,
      recommendation: '',
      matchPercentage: item.match_percentage,
      isRecommended: item.is_recommended,
      isFavorite: item.is_favorite,
    });
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setPurchaseSelection(null);
    setPurchased(item.is_purchased ?? null);
    setIsFavorite(item.is_favorite ?? false);
    setCurrentView('scan');

    // Scroll to top to show loaded result
    // scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

  /**
   * Skontroluje povolenia a otvorí kameru.
   */
  const openCamera = () => {
    if (!hasPermission) {
      Alert.alert(
        'Povolenie kamery',
        'Na skenovanie kávy potrebujeme prístup ku kamere',
        [
          { text: 'Zrušiť', style: 'cancel' },
          { text: 'Povoliť', onPress: requestPermission },
        ]
      );
      return;
    }
    setShowCamera(true);
  };
  const handleRating = async (rating: number) => {
    if (!scanResult) {
      return;
    }

    const previousRating = userRating;
    setUserRating(rating);

    const fallbackId = `taste-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const noteParts = [scanResult.recommendation, editedText].filter(
      (part): part is string => Boolean(part),
    );
    const notes = noteParts.length > 0 ? noteParts.join('\n\n') : undefined;

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
            console.error('Failed to enqueue rating for offline sync', queueError);
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
      const metadata: Record<string, unknown> = {
        source: 'taste-scanner',
        scanId: scanResult.scanId,
        matchPercentage: scanResult.matchPercentage,
        isRecommended: scanResult.isRecommended,
      };

      if (scanResult.recommendation) {
        metadata.recommendation = scanResult.recommendation;
      }
      if (editedText) {
        metadata.correctedText = editedText;
      }

      const context = buildBrewContext(metadata);
      const recipeLabel = extractCoffeeName(editedText || scanResult.corrected || scanResult.original);
      await diary.addManualEntry({
        recipe: recipeLabel,
        notes,
        brewedAt: new Date(),
        rating,
        recipeId: recordId,
        metadata,
        context,
      });

      if (refreshInsights) {
        refreshInsights().catch((error) => {
          console.warn('CoffeeTasteScanner: failed to refresh diary insights', error);
        });
      }

      const learningEvent = await preferenceEngine.recordBrew(recordId, rating, context);
      await preferenceEngine.saveEvents(learningEvent);

      await loadHistory();

      Alert.alert('Hodnotenie uložené', `Ohodnotil si kávu na ${rating}/5 ⭐`);
      if (queuedOffline || isConnected === false) {
        showToast('Hodnotenie uložené offline. Synchronizujeme neskôr.');
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

    const fallbackId = `taste-${Date.now()}`;
    const recordId = scanResult.scanId ?? fallbackId;
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);

    try {
      const success = await toggleFavorite(recordId);
      if (!success) {
        setIsFavorite(!nextValue);
        Alert.alert('Chyba', 'Nepodarilo sa aktualizovať obľúbenú kávu');
        return;
      }

      if (isConnected === false) {
        showToast('Zmena obľúbených uložená offline.');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setIsFavorite(!nextValue);
      Alert.alert('Chyba', 'Nepodarilo sa aktualizovať obľúbenú kávu');
    }
  };

  const handlePurchaseSelect = (answer: boolean) => {
    setPurchaseSelection(answer);
  };

  const submitPurchaseAnswer = async () => {
    if (purchaseSelection === null) return;
    setPurchased(purchaseSelection);
    if (purchaseSelection && scanResult?.scanId) {
      try {
        const name = extractCoffeeName(editedText || scanResult.corrected);
        await markCoffeePurchased(scanResult.scanId, name);
      } catch (err) {
        console.error('Error marking purchase:', err);
      }
    }
  };

  const handleUseLastResult = async () => {
    setOfflineModalVisible(false);
    setOfflineStatus('prompt');
    const cached = await loadOCRResult();
    if (cached) {
      setScanResult(cached);
      setEditedText(cached.corrected);
      setIsFavorite(cached.isFavorite ?? false);
    } else {
      Alert.alert('Chyba', 'Žiadny uložený výsledok');
    }
  };

  const exportText = async () => {
    try {
      await Share.share({
        message: editedText,
        title: 'Exportovaný text kávy',
      });
    } catch (error) {
      Alert.alert('Chyba', 'Nepodarilo sa exportovať text');
    }
  };

  /**
   * Vymaže aktuálny výsledok skenovania.
   */
  const clearAll = () => {
    setScanResult(null);
    setEditedText('');
    setUserRating(0);
    setPurchaseSelection(null);
    setPurchased(null);
    setIsFavorite(false);
    setCurrentView('home');
    setOverlayVisible(false);
    setOverlayText('Analyzujem...');
  };

  const handleBack = () => {
    if (currentView === 'scan') {
      clearAll();
      return;
    }

    if (onBack) {
      onBack();
    }
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
  const matchLabel = scanResult?.matchPercentage
    ? `${scanResult.matchPercentage}% zhoda`
    : undefined;
  const refreshControl =
    currentView === 'home'
      ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        )
      : undefined;

  const recognizedText = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    return (editedText || scanResult.corrected || scanResult.original || '').trim();
  }, [editedText, scanResult]);

  const coffeeName = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    const extractedName = extractCoffeeName(recognizedText);
    if (extractedName && extractedName.length > 2) {
      return extractedName;
    }
    const lines = recognizedText.split('\n').map(line => line.trim()).filter(Boolean);
    return lines[0] ?? 'Neznáma káva';
  }, [recognizedText, scanResult]);

  const coffeeSubtitle = useMemo(() => {
    if (!scanResult) {
      return '';
    }
    const lines = recognizedText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.slice(1, 3).join(' • ');
    }
    return scanResult.corrected?.length ? 'Rozpoznaná etiketa' : 'Pripravené na úpravy';
  }, [recognizedText, scanResult]);

  const recommendationSentences = useMemo(() => {
    if (!scanResult?.recommendation) {
      return [];
    }
    return scanResult.recommendation
      .split(/[\.\n]/)
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }, [scanResult]);

  const insightText = recommendationSentences[0] ??
    'Táto káva má potenciál osloviť tvoje chuťové preferencie na základe posledných hodnotení.';

  const reasonSentences = recommendationSentences.slice(1);

  const positiveReasons = useMemo(() => {
    if (!reasonSentences.length && recommendationSentences.length) {
      return recommendationSentences;
    }

    return reasonSentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return POSITIVE_REASON_KEYWORDS.some(keyword => lower.includes(keyword));
    });
  }, [reasonSentences, recommendationSentences]);

  const cautionReasons = useMemo(() => {
    if (!reasonSentences.length) {
      return [];
    }
    return reasonSentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      const isPositive = POSITIVE_REASON_KEYWORDS.some(keyword => lower.includes(keyword));
      return !isPositive && CAUTION_REASON_KEYWORDS.some(keyword => lower.includes(keyword));
    });
  }, [reasonSentences]);

  const combinedLowerText = useMemo(() => {
    const combined = `${recognizedText}\n${scanResult?.recommendation ?? ''}`;
    return combined.toLowerCase();
  }, [recognizedText, scanResult]);

  const tasteAttributes = useMemo(() => {
    const computeScore = (
      base: number,
      positiveKeywords: string[],
      negativeKeywords: string[] = []
    ) => {
      let score = base;
      positiveKeywords.forEach(keyword => {
        if (combinedLowerText.includes(keyword)) {
          score += 1.5;
        }
      });
      negativeKeywords.forEach(keyword => {
        if (combinedLowerText.includes(keyword)) {
          score -= 1.5;
        }
      });
      return clampTasteValue(score);
    };

    return [
      {
        key: 'acidity',
        label: 'Kyslosť',
        value: computeScore(6, ['acid', 'kys', 'citr', 'jasn'], ['ploch', 'tlmen']),
        style: styles.tasteFillAcidity,
      },
      {
        key: 'sweetness',
        label: 'Sladkosť',
        value: computeScore(5, ['slad', 'med', 'karamel', 'cukr'], ['such', 'sviež']),
        style: styles.tasteFillSweetness,
      },
      {
        key: 'bitterness',
        label: 'Horkosť',
        value: computeScore(3, ['intenzívna horkosť', 'tmav', 'čokol'], ['nízka horkosť', 'jemná horkosť']),
        style: styles.tasteFillBitterness,
      },
      {
        key: 'body',
        label: 'Telo',
        value: computeScore(5, ['plné telo', 'krém', 'bohaté telo'], ['ľahké telo', 'jemné telo']),
        style: styles.tasteFillBody,
      },
    ];
  }, [combinedLowerText, styles.tasteFillAcidity, styles.tasteFillSweetness, styles.tasteFillBitterness, styles.tasteFillBody]);

  const flavorTags = useMemo(() => {
    const detected = FLAVOR_KEYWORDS.filter(item => combinedLowerText.includes(item.keyword)).map(
      item => item.label
    );
    if (detected.length) {
      return detected;
    }
    return ['🌺 Kvetinová', '🍋 Citrón', '🍯 Jemne sladká'];
  }, [combinedLowerText]);

  const verdictLabel = scanResult?.isRecommended === false ? 'Skôr NIE' : 'Skôr ÁNO';
  const verdictExplanation =
    scanResult?.recommendation ??
    'Na základe tvojich posledných hodnotení to vyzerá, že táto káva zapadne do tvojho chuťového profilu.';

  const ratingDisplay = userRating > 0 ? `${userRating}/5` : 'Ohodnoť';

  const metrics = useMemo(
    () => [
      { icon: '🎯', value: matchLabel ?? '—', label: 'Zhoda' },
      { icon: '⭐', value: ratingDisplay, label: 'Tvoje skóre' },
      {
        icon: '📡',
        value: scanResult?.source === 'offline' ? 'Offline' : 'Live',
        label: 'Zdroj',
      },
    ],
    [matchLabel, ratingDisplay, scanResult?.source]
  );

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
          colors={BACKGROUND_GRADIENT_COLORS}
          locations={BACKGROUND_GRADIENT_LOCATIONS}
          style={styles.backgroundGradient}
        />
        <Modal
          visible={offlineModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setOfflineModalVisible(false);
            setOfflineStatus('prompt');
          }}
        >
          <View style={styles.offlineModalOverlay}>
            <View style={styles.offlineModalContent}>
              <Text style={styles.offlineModalText}>
                {offlineStatus === 'modelUsed'
                  ? 'Použitý lokálny model'
                  : 'Ste offline, chcete použiť posledný výsledok?'}
              </Text>
              {offlineStatus === 'modelUsed' ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setOfflineModalVisible(false);
                    setOfflineStatus('prompt');
                  }}
                >
                  <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={handleUseLastResult}>
                  <Text style={styles.buttonText}>Použiť naposledy uložený výsledok</Text>
                </TouchableOpacity>
              )}
            </View>
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
                  <Text style={styles.statusIcon}>
                    {isConnected === false ? '⚠️' : '📶'}
                  </Text>
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
                    <Text style={styles.headerTitle}>Analýza kávy</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    Zisti, či ti káva bude chutiť pomocou AI
                  </Text>
                </View>
              </View>

              <View style={styles.mainContent}>
                {currentView === 'home' && (
                  <>
                    <LinearGradient colors={WELCOME_GRADIENT} style={styles.welcomeCard}>
                      <Text style={styles.welcomeEmoji}>✨</Text>
                      <Text style={styles.welcomeText}>Vitaj v analyzátore chutí!</Text>
                      <Text style={styles.welcomeDesc}>
                        Naskenuj etiketu kávy a získaj personalizovaný rozbor chuti.
                      </Text>
                    </LinearGradient>

                    <View style={styles.actionSection}>
                      <View style={styles.actionGrid}>
                        <TouchableOpacity
                          style={[styles.actionCard, styles.actionCardPrimary]}
                          onPress={openCamera}
                          activeOpacity={0.9}
                        >
                          <LinearGradient
                            colors={COFFEE_GRADIENT}
                            style={[styles.actionIconContainer, styles.actionIconContainerPrimary]}
                          >
                            <Text style={styles.actionIcon}>📸</Text>
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
                        <Text style={styles.statLabel}>Skenov</Text>
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
                          <Text style={styles.emptyStateTitle}>Žiadne skenovania</Text>
                          <Text style={styles.emptyStateDesc}>
                            Začni analyzovať svoje kávy a objav nové chute.
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {currentView === 'scan' && scanResult && (
                  <>
                    <View style={styles.scanResultContainer}>
                      <LinearGradient colors={['#FFFFFF', '#F5E9E0']} style={styles.scanHeroCard}>
                        <View style={styles.scanHeroBadge}>
                          <Text style={styles.scanHeroBadgeIcon}>✓</Text>
                          <Text style={styles.scanHeroBadgeText}>Výsledok skenu</Text>
                        </View>
                        <Text style={styles.scanHeroTitle}>{coffeeName}</Text>
                        <Text style={styles.scanHeroSubtitle} numberOfLines={2}>
                          {coffeeSubtitle}
                        </Text>
                        <View style={styles.scanMetricsRow}>
                          {metrics.map(metric => (
                            <View key={metric.label} style={styles.scanMetricCard}>
                              <Text style={styles.scanMetricIcon}>{metric.icon}</Text>
                              <Text style={styles.scanMetricValue}>{metric.value}</Text>
                              <Text style={styles.scanMetricLabel}>{metric.label}</Text>
                            </View>
                          ))}
                        </View>
                      </LinearGradient>

                      <View style={styles.verdictCard}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Verdikt</Text>
                          <View
                            style={[
                              styles.verdictBadge,
                              scanResult.isRecommended === false
                                ? styles.verdictBadgeNo
                                : styles.verdictBadgeYes,
                            ]}
                          >
                            <Text
                              style={[
                                styles.verdictBadgeText,
                                scanResult.isRecommended === false
                                  ? styles.verdictBadgeTextNo
                                  : styles.verdictBadgeTextYes,
                              ]}
                            >
                              {verdictLabel}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.verdictDescription}>{verdictExplanation}</Text>
                      </View>

                      <View style={styles.ownershipCardModern}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Kúpil si túto kávu?</Text>
                          {purchased ? (
                            <View style={styles.ownershipStatePill}>
                              <Text style={styles.ownershipStateText}>✓ Pridané do zbierky</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.sectionSubtitle}>
                          Po potvrdení sa pridá do tvojej zbierky BrewMate.
                        </Text>
                        <View style={styles.ownershipActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.ownershipButton,
                              purchaseSelection === true && styles.ownershipButtonActive,
                            ]}
                            onPress={() => handlePurchaseSelect(true)}
                          >
                            <Text
                              style={[
                                styles.ownershipButtonText,
                                purchaseSelection === true && styles.ownershipButtonTextActive,
                              ]}
                            >
                              Áno
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.ownershipButton,
                              styles.ownershipButtonSecondary,
                              purchaseSelection === false && styles.ownershipButtonActive,
                            ]}
                            onPress={() => handlePurchaseSelect(false)}
                          >
                            <Text
                              style={[
                                styles.ownershipButtonText,
                                styles.ownershipButtonTextSecondary,
                                purchaseSelection === false && styles.ownershipButtonTextActive,
                              ]}
                            >
                              Nie
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.ownershipConfirmButton,
                              purchaseSelection === null && styles.ownershipConfirmDisabled,
                            ]}
                            onPress={submitPurchaseAnswer}
                            disabled={purchaseSelection === null}
                          >
                            <Text style={styles.ownershipConfirmText}>Potvrdiť</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.compatibilityCardModern}>
                        <View style={styles.compatibilityHeaderRow}>
                          <View style={styles.compatibilityIconWrapper}>
                            <Text style={styles.compatibilityIcon}>🤖</Text>
                          </View>
                          <Text style={styles.sectionTitle}>AI vysvetlenie</Text>
                        </View>
                        <Text style={styles.compatibilityIntro}>
                          {insightText}
                        </Text>
                        {positiveReasons.length > 0 && (
                          <View style={styles.reasonBlock}>
                            <Text style={styles.reasonTitle}>Prečo áno</Text>
                            {positiveReasons.map(reason => (
                              <View key={reason} style={styles.reasonRow}>
                                <View style={[styles.reasonBadge, styles.reasonBadgePositive]}>
                                  <Text style={styles.reasonBadgeText}>✓</Text>
                                </View>
                                <Text style={styles.reasonText}>{reason}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {cautionReasons.length > 0 && (
                          <View style={styles.reasonBlock}>
                            <Text style={styles.reasonTitle}>Na čo si dať pozor</Text>
                            {cautionReasons.map(reason => (
                              <View key={reason} style={styles.reasonRow}>
                                <View style={[styles.reasonBadge, styles.reasonBadgeNegative]}>
                                  <Text style={styles.reasonBadgeText}>✗</Text>
                                </View>
                                <Text style={styles.reasonText}>{reason}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      <View style={styles.tasteProfileCard}>
                        <View style={styles.profileHeaderRow}>
                          <Text style={styles.sectionTitle}>Chuťový profil</Text>
                          {matchLabel ? (
                            <Text style={styles.profileScore}>{matchLabel}</Text>
                          ) : null}
                        </View>
                        <View style={styles.tasteAttributesGrid}>
                          {tasteAttributes.map(attribute => (
                            <View key={attribute.key} style={styles.tasteAttributeItem}>
                              <View style={styles.tasteAttributeHeader}>
                                <Text style={styles.tasteAttributeName}>{attribute.label}</Text>
                                <Text style={styles.tasteAttributeValue}>
                                  {Math.round(attribute.value)}/10
                                </Text>
                              </View>
                              <View style={styles.tasteBar}>
                                <View
                                  style={[
                                    styles.tasteFill,
                                    attribute.style,
                                    { width: `${attribute.value * 10}%` },
                                  ]}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                        <View style={styles.flavorTagsRow}>
                          {flavorTags.map(tag => (
                            <TouchableOpacity
                              key={tag}
                              style={styles.flavorTag}
                              onPress={() => showToast(`Pripravujeme tipy pre ${tag}.`)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.flavorTagText}>{tag}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <LinearGradient colors={['#7FB069', '#00897B']} style={styles.insightCard}>
                        <View style={styles.insightHeaderRow}>
                          <View style={styles.insightIconWrapper}>
                            <Text style={styles.insightIcon}>🤖</Text>
                          </View>
                          <Text style={styles.insightTitle}>AI Insight</Text>
                        </View>
                        <Text style={styles.insightText}>{insightText}</Text>
                      </LinearGradient>

                      <View style={styles.editorCard}>
                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.sectionTitle}>Rozpoznaný text</Text>
                          <Text style={styles.editorHint}>Uprav, ak niečo nesedí</Text>
                        </View>
                        <TextInput
                          style={styles.editorInput}
                          multiline
                          value={editedText}
                          onChangeText={setEditedText}
                          placeholder="Uprav rozpoznaný text..."
                          textAlignVertical="top"
                        />
                      </View>

                      <View style={styles.ratingCardModern}>
                        <View style={styles.ratingHeaderRow}>
                          <View>
                            <Text style={styles.sectionTitle}>Tvoje hodnotenie</Text>
                            <Text style={styles.sectionSubtitle}>Ako veľmi ti sedí?</Text>
                          </View>
                          <Text style={styles.ratingDisplay}>{ratingDisplay}</Text>
                        </View>
                        <View style={styles.ratingStarsRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity
                              key={star}
                              style={styles.ratingStarButton}
                              onPress={() => handleRating(star)}
                            >
                              <Text
                                style={[
                                  styles.ratingStarIcon,
                                  star <= userRating && styles.ratingStarIconActive,
                                ]}
                              >
                                ⭐
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.favoriteToggle, isFavorite && styles.favoriteToggleActive]}
                          onPress={handleFavoriteToggle}
                        >
                          <Text
                            style={[styles.favoriteToggleText, isFavorite && styles.favoriteToggleTextActive]}
                          >
                            {isFavorite ? '❤️ Uložené medzi obľúbené' : '♡ Pridať medzi obľúbené'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.bottomSpacer} />
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {currentView === 'scan' && (
          <View style={styles.bottomActionBar}>
            <TouchableOpacity
              style={[styles.bottomActionButton, styles.bottomActionSecondary]}
              onPress={exportText}
              activeOpacity={0.85}
            >
              <Text style={styles.bottomActionIcon}>📤</Text>
              <Text style={styles.bottomActionText}>Zdieľať poznámky</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomActionButton, styles.bottomActionPrimary]}
              onPress={() => {
                clearAll();
                openCamera();
              }}
              activeOpacity={0.9}
            >
              <Text style={[styles.bottomActionIcon, styles.bottomActionIconPrimary]}>📷</Text>
              <Text style={[styles.bottomActionText, styles.bottomActionTextPrimary]}>
                Nový scan
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.fab, currentView === 'home' ? styles.fabVisible : null]}
          onPress={openCamera}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>📷</Text>
        </TouchableOpacity>

        {(overlayVisible || isLoading) && (
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

export default CoffeeTasteScanner;
