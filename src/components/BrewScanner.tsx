// BrewScanner.tsx
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
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { scannerStyles } from './styles/ProfessionalOCRScanner.styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  rateOCRResult,
  getBrewRecipe,
} from '../services/ocrServices.ts';

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
}

const BrewScanner: React.FC<BrewScannerProps> = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrHistory, setOcrHistory] = useState<OCRHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [tastePreference, setTastePreference] = useState('');
  const [brewRecipe, setBrewRecipe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const loadHistory = async () => {
    try {
      const history = await fetchOCRHistory(10);
      setOcrHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

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
          result.isRecommended
            ? `Táto káva má ${result.matchPercentage}% zhodu s tvojimi preferenciami!`
            : `Zhoda s preferenciami: ${result.matchPercentage}%`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Process image error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
    }
  };

  const rateCoffee = async (rating: number) => {
    if (!scanResult?.scanId) return;

    try {
      const success = await rateOCRResult(scanResult.scanId, rating);
      if (success) {
        setUserRating(rating);
        Alert.alert('Hodnotenie uložené', `Ohodnotil si kávu na ${rating}/5 ⭐`);
        await loadHistory();
      }
    } catch (error) {
      console.error('Error rating coffee:', error);
    }
  };

  const exportText = async () => {
    if (editedText) {
      try {
        await Share.share({
          message: editedText,
          title: 'Skenovaná káva - BrewMate',
        });
      } catch (error) {
        Alert.alert('Chyba', 'Nepodarilo sa zdieľať text');
      }
    }
  };

  const loadFromHistory = (item: OCRHistory) => {
    setScanResult({
      original: item.original_text,
      corrected: item.corrected_text,
      recommendation: '',
      matchPercentage: item.match_percentage,
      isRecommended: item.is_recommended,
      scanId: item.id,
    });
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setShowHistory(false);
  };

  const deleteFromHistory = async (id: string) => {
    Alert.alert(
      'Vymazať záznam',
      'Naozaj chceš vymazať tento záznam?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteOCRRecord(id);
            if (success) {
              await loadHistory();
              Alert.alert('Vymazané', 'Záznam bol odstránený');
            }
          }
        }
      ]
    );
  };

  const handleMethodPress = (method: string) => {
    setSelectedMethod(method);
    setTastePreference('');
    setBrewRecipe('');
  };

  const generateRecipe = async () => {
    if (!selectedMethod) return;
    try {
      setIsGenerating(true);
      const recipe = await getBrewRecipe(selectedMethod, tastePreference);
      setBrewRecipe(recipe);
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Chyba', 'Nepodarilo sa získať recept');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const clearAll = () => {
    setScanResult(null);
    setEditedText('');
    setUserRating(0);
    setSelectedMethod(null);
    setTastePreference('');
    setBrewRecipe('');
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Kamera nie je dostupná</Text>
      </View>
    );
  }

  // Camera View
  if (showCamera) {
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
              Zaostri na etiketu kávy
            </Text>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="large" />
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>☕ Skener kávy</Text>
          <Text style={styles.subtitle}>
            Naskenuj etiketu a zisti, či ti káva bude chutiť
          </Text>
        </View>

        {/* Main Actions */}
        {!scanResult && (
          <View style={styles.mainActions}>
            <TouchableOpacity
              style={[styles.actionCard, styles.cameraAction]}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>📷</Text>
              </View>
              <Text style={styles.actionTitle}>Odfotiť kávu</Text>
              <Text style={styles.actionDesc}>Použi fotoaparát</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.galleryAction]}
              onPress={pickImageFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>🖼️</Text>
              </View>
              <Text style={styles.actionTitle}>Vybrať z galérie</Text>
              <Text style={styles.actionDesc}>Použi existujúcu fotku</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan Result */}
        {scanResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>📋 Výsledok skenovania</Text>
              {scanResult.matchPercentage && (
                <View style={[
                  styles.matchBadge,
                  scanResult.isRecommended ? styles.matchBadgeGood : styles.matchBadgeFair
                ]}>
                  <Text style={styles.matchText}>
                    {scanResult.matchPercentage}% zhoda
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Rozpoznaný text:</Text>
              <TextInput
                style={styles.resultTextInput}
                multiline
                value={editedText}
                onChangeText={setEditedText}
                placeholder="Tu môžeš upraviť text..."
                placeholderTextColor="#999"
              />
            </View>

            {scanResult.recommendation && (
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>🤖 AI Hodnotenie</Text>
                <Text style={styles.recommendationText}>
                  {scanResult.recommendation}
                </Text>
              </View>
            )}

            {scanResult.brewingMethods && scanResult.brewingMethods.length > 0 && (
              <View style={styles.brewingCard}>
                <Text style={styles.brewingTitle}>🍽️ Odporúčané prípravy</Text>
                  {scanResult.brewingMethods.map((method, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.brewingMethod,
                        selectedMethod === method && styles.brewingMethodSelected,
                      ]}
                      onPress={() => handleMethodPress(method)}
                    >
                      <Text style={styles.brewingText}>• {method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedMethod && (
              <View style={styles.recipeSection}>
                <Text style={styles.recipeTitle}>Zvolené: {selectedMethod}</Text>
                <TextInput
                  style={styles.tasteInput}
                  placeholder="Akú chuť chceš? napr. sladšie"
                  placeholderTextColor="#999"
                  value={tastePreference}
                  onChangeText={setTastePreference}
                />
                <TouchableOpacity
                  style={styles.recipeButton}
                  onPress={generateRecipe}
                  disabled={isGenerating}
                >
                  <Text style={styles.recipeButtonText}>
                    {isGenerating ? 'Generujem...' : 'Vyhodnoť recept'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {brewRecipe !== '' && (
              <View style={styles.recipeCard}>
                <Text style={styles.recipeResultTitle}>☕ Recept</Text>
                <Text style={styles.recipeResultText}>{brewRecipe}</Text>
              </View>
            )}


            {/* Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Ohodnoť túto kávu:</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => rateCoffee(star)}
                    style={styles.starButton}
                  >
                    <Text style={styles.starText}>
                      {star <= userRating ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.shareButton} onPress={exportText}>
                <Text style={styles.buttonText}>📤 Zdieľať</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                <Text style={styles.buttonText}>🗑️ Vymazať</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History Section */}
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={styles.historyTitle}>
              📚 História skenovaní ({ocrHistory.length})
            </Text>
            <Text style={styles.historyToggle}>
              {showHistory ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyList}>
              {ocrHistory.length > 0 ? (
                ocrHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => loadFromHistory(item)}
                    onLongPress={() => deleteFromHistory(item.id)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemName}>
                        {item.coffee_name || 'Neznáma káva'}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(item.created_at).toLocaleDateString('sk-SK')}
                      </Text>
                    </View>
                    <View style={styles.historyItemMeta}>
                      {item.match_percentage && (
                        <Text style={styles.historyItemMatch}>
                          {item.match_percentage}%
                        </Text>
                      )}
                      {item.rating && (
                        <Text style={styles.historyItemRating}>
                          ⭐ {item.rating}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyHistoryText}>
                  Zatiaľ nemáš žiadne skenovania
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8B4513" />
            <Text style={styles.loadingText}>Spracovávam obrázok...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default BrewScanner;