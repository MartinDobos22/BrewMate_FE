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
import { scannerStyles } from './styles/ProfessionalOCRScanner.styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  rateOCRResult,
  getBrewRecipe,
  suggestBrewingMethods,
} from '../services/ocrServices.ts';
import {
  saveRecipe,
  fetchRecipeHistory,
  RecipeHistory,
} from '../services/recipeServices.ts';
import { AIResponseDisplay } from './AIResponseDisplay';

interface OCRHistory {
  id: string;
  coffee_name: string;
  original_text: string;
  corrected_text: string;
  created_at: Date;
  rating?: number;
  match_percentage?: number;
  is_recommended?: boolean;
}

interface ScanResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
  brewingMethods?: string[];
}

interface BrewScannerProps {
  onBack?: () => void;
  onRecipeGenerated?: (recipe: string) => void;
}

const CoffeeReceipeScanner: React.FC<BrewScannerProps> = ({
  onBack,
  onRecipeGenerated,
}) => {
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

      const result = await processOCR(base64image);

      if (result) {
        setScanResult(result);
        setEditedText(result.corrected);

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
      const recipe = await getBrewRecipe(
        selectedMethod,
        tastePreference || 'vyvážená'
      );

      setGeneratedRecipe(recipe);
      if (onRecipeGenerated) {
        onRecipeGenerated(recipe);
      }
      await saveRecipe(selectedMethod, tastePreference || 'vyvážená', recipe);
      await loadRecipeHistory();
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Chyba', 'Nepodarilo sa vygenerovať recept');
    } finally {
      setIsGenerating(false);
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
    });
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setSelectedMethod(null);
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

  // const handleRating = async (rating: number) => {
  //   setUserRating(rating);
  //   if (scanResult?.scanId) {
  //     try {
  //       await rateOCRResult(scanResult.scanId, rating);
  //     } catch (error) {
  //       console.error('Error rating result:', error);
  //     }
  //   }
  // };

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

  const clearAll = () => {
    setScanResult(null);
    setEditedText('');
    setUserRating(0);
    setSelectedMethod(null);
    setTastePreference('');
    setGeneratedRecipe('');
  };

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.coffeeIcon}>☕</Text>
            <Text style={styles.headerTitle}>Generátor receptov</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Vytvor si personalizovaný recept na prípravu kávy
          </Text>
        </View>

        {/* Elegant Action Cards */}
        {!scanResult && !generatedRecipe && (
          <View style={styles.actionSection}>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardPrimary]}
                onPress={takePhoto}
                activeOpacity={0.9}
              >
                <View style={[styles.actionIconContainer, styles.actionIconContainerPrimary]}>
                  <Text style={styles.actionIcon}>📸</Text>
                </View>
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
        )}

        {/* Scan Result */}
        {scanResult && !generatedRecipe && (
          <>
            <View style={styles.resultContainer}>
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Informácie o káve</Text>
                  {scanResult.matchPercentage && (
                    <View style={[
                      styles.matchBadge,
                      scanResult.isRecommended ? styles.matchBadgeGood : styles.matchBadgeFair
                    ]}>
                      <Text style={styles.matchText}>
                        {scanResult.matchPercentage}%
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.resultTextInput}
                  multiline
                  value={editedText}
                  onChangeText={setEditedText}
                  placeholder="Popis kávy..."
                />
              </View>
            </View>

            {/* Brewing Methods */}
            <View style={styles.brewingSection}>
              <Text style={styles.brewingTitle}>Metóda prípravy</Text>
              <View style={styles.brewingGrid}>
                {scanResult.brewingMethods?.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={styles.brewingMethod}
                    onPress={() => setSelectedMethod(method)}
                  >
                    <View
                      style={[
                        styles.brewingButton,
                        selectedMethod === method && styles.brewingButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.brewingText,
                          selectedMethod === method && styles.brewingTextSelected,
                        ]}
                      >
                        {method}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Taste Preference */}
            <View style={styles.tasteSection}>
              <Text style={styles.tasteLabel}>Preferovaná chuť (voliteľné)</Text>
              <TextInput
                style={styles.tasteInput}
                placeholder="Napr. silná, jemná, kyslá, sladká..."
                value={tastePreference}
                onChangeText={setTastePreference}
              />
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateRecipe}
              disabled={isGenerating || !selectedMethod}
              activeOpacity={0.9}
            >
              {isGenerating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.generateButtonText}>
                  ✨ Vygenerovať recept
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Generated Recipe */}
        {generatedRecipe && (
          <View style={styles.resultContainer}>
            <AIResponseDisplay content={generatedRecipe} />
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.button}
                onPress={exportText}
              >
                <Text style={styles.buttonText}>Zdieľať</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={clearAll}
              >
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  Nový recept
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Statistics */}
        {ocrHistory.length > 0 && !scanResult && !generatedRecipe && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{ocrHistory.length}</Text>
              <Text style={styles.statLabel}>Receptov</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {ocrHistory.filter(h => h.is_recommended).length}
              </Text>
              <Text style={styles.statLabel}>Obľúbené</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {Math.round(
                  ocrHistory.reduce((acc, h) => acc + (h.rating || 0), 0) /
                  ocrHistory.filter(h => h.rating).length || 0
                )}
              </Text>
              <Text style={styles.statLabel}>Priem. ⭐</Text>
            </View>
          </View>
        )}

        {/* History Section */}
        {!scanResult && !generatedRecipe && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Nedávne recepty</Text>
              {ocrHistory.length > 4 && (
                <TouchableOpacity style={styles.historyFilter}>
                  <Text style={styles.historyFilterText}>Všetky</Text>
                  <Text style={{ fontSize: 10, color: '#8B7F72' }}>▼</Text>
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
                    activeOpacity={0.8}
                  >
                    <View style={styles.historyCardInner}>
                      <View style={styles.historyCardTop}>
                        <Text style={styles.historyCardName} numberOfLines={1}>
                          {item.coffee_name || 'KRAJINA PÔVODU'}
                        </Text>
                        {item.match_percentage && (
                          <View style={styles.historyCardPercentage}>
                            <Text style={styles.historyCardPercentageText}>
                              {item.match_percentage}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.historyCardDate}>
                        {new Date(item.created_at).toLocaleDateString('sk-SK')}
                      </Text>
                      {item.rating && (
                        <Text style={styles.historyCardRating}>
                          {'⭐'.repeat(item.rating)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateImage}>
                  <Text style={styles.emptyStateIcon}>☕</Text>
                </View>
                <Text style={styles.emptyStateTitle}>
                  Žiadne recepty
                </Text>
                <Text style={styles.emptyStateDesc}>
                  Naskenuj svoju prvú kávu a vytvor si personalizovaný recept
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recipe History Section */}
        {recipeHistory.length > 0 && !scanResult && !generatedRecipe && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>História receptov</Text>
            </View>
            <View style={styles.historyGrid}>
              {recipeHistory.slice(0, 6).map(item => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardInner}>
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

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B6F47" />
              <Text style={styles.loadingText}>Analyzujem...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CoffeeReceipeScanner;