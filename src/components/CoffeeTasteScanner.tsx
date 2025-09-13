// CoffeeTasteScanner.tsx - Light & Optimized Design
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
  Modal,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { scannerStyles } from './styles/ProfessionalOCRScanner.styles';
import {
  processOCR,
  fetchOCRHistory,
  deleteOCRRecord,
  rateOCRResult,
  markCoffeePurchased,
  extractCoffeeName
} from '../services/ocrServices.ts';
import { saveOCRResult, loadOCRResult } from '../services/offlineCache';

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
}

interface ScanResult {
  original: string;
  corrected: string;
  recommendation: string;
  matchPercentage?: number;
  isRecommended?: boolean;
  scanId?: string;
}

interface ProfessionalOCRScannerProps {
  onBack?: () => void;
}

const CoffeeTasteScanner: React.FC<ProfessionalOCRScannerProps> = () => {
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
        setOfflineModalVisible(true);
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
   * Vyberie fotku z galérie a odošle ju na spracovanie.
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
   * Vykoná OCR pipeline a uloží výsledok do stavu.
   */
  const processImage = async (base64image: string) => {
    try {
      setIsLoading(true);
      setShowCamera(false);

      const result = await processOCR(base64image);

      if (result) {
        setScanResult(result);
        setEditedText(result.corrected);
        setPurchaseSelection(null);
        setPurchased(null);
        await saveOCRResult(result.scanId || 'last', result);

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
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
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
    });
    setEditedText(item.corrected_text);
    setUserRating(item.rating || 0);
    setPurchaseSelection(null);
    setPurchased(item.is_purchased ?? null);

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
    setUserRating(rating);
    if (scanResult?.scanId) {
      try {
        await rateOCRResult(scanResult.scanId, rating);
      } catch (error) {
        console.error('Error rating result:', error);
      }
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
    const cached = await loadOCRResult();
    if (cached) {
      setScanResult(cached);
      setEditedText(cached.corrected);
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
      <Modal
        visible={offlineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOfflineModalVisible(false)}
      >
        <View style={styles.offlineModalOverlay}>
          <View style={styles.offlineModalContent}>
            <Text style={styles.offlineModalText}>
              Ste offline, chcete použiť posledný výsledok?
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleUseLastResult}>
              <Text style={styles.buttonText}>Použiť naposledy uložený výsledok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isConnected !== null && (
        <View
          style={[
            styles.connectionBanner,
            isConnected ? styles.bannerOnline : styles.bannerOffline,
          ]}
        >
          <Text style={styles.bannerText}>
            {isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      )}
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
            <Text style={styles.headerTitle}>Analýza kávy</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Zisti či ti káva bude chutiť pomocou AI
          </Text>
        </View>

        {/* Main Actions */}
        {!scanResult ? (
          <>
          {console.log('No scanResult - rendering main actions')}
          <View style={styles.actionSection}>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardPrimary]}
                onPress={openCamera}
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
          </>
        ) : (
          <>
            {console.log('scanResult exists - hiding main actions')}
            <Text>Výsledok skenovania je dostupný.</Text>
          </>
        )}

        {/* Scan Result */}
        {scanResult ? (
          <>
          {console.log('Rendering scan result', scanResult)}
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Výsledok</Text>
                {scanResult.matchPercentage ? (
                    <>
                    {console.log('Rendering match percentage', scanResult.matchPercentage)}
                  <View style={[
                    styles.matchBadge,
                    scanResult.isRecommended ? styles.matchBadgeGood : styles.matchBadgeFair
                  ]}>
                    <Text style={styles.matchText}>
                      {scanResult.matchPercentage}%
                    </Text>
                  </View>
                    </>
                ) : (
                  <>
                    {console.log('matchPercentage missing')}
                    <Text>Zhoda nie je k dispozícii.</Text>
                  </>
                )}
              </View>
              <Text style={styles.resultLabel}>Rozpoznaný text</Text>
              <TextInput
                style={styles.resultTextInput}
                multiline
                value={editedText}
                onChangeText={setEditedText}
                placeholder="Upraviť text..."
              />
            </View>

            {scanResult.recommendation ? (
              <>
              {console.log('Rendering recommendation', scanResult.recommendation)}

              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>
                  {scanResult.isRecommended ? '✅ Odporúčame' : '⚠️ Pozor'}
                </Text>
                <Text style={styles.recommendationText}>
                  {scanResult.recommendation}
                </Text>
              </View>
              </>
            ) : (
              <>
                {console.log('Recommendation missing')}
                <Text>Odporúčanie nie je k dispozícii.</Text>
              </>
            )}

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Hodnotenie:</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => handleRating(star)}
                  >
                    <Text style={styles.starText}>
                      {star <= userRating ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {purchased === null && (
              <View style={styles.purchaseContainer}>
                <Text style={styles.purchaseLabel}>Kúpil si túto kávu?</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      purchaseSelection === true && styles.buttonSelected,
                    ]}
                    onPress={() => handlePurchaseSelect(true)}
                  >
                    <Text style={styles.buttonText}>Áno</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonSecondary,
                      purchaseSelection === false && styles.buttonSelected,
                    ]}
                    onPress={() => handlePurchaseSelect(false)}
                  >
                    <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Nie</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    purchaseSelection === null && styles.buttonDisabled,
                  ]}
                  onPress={submitPurchaseAnswer}
                  disabled={purchaseSelection === null}
                >
                  <Text style={styles.buttonText}>Odoslať</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Actions */}
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
                  Vymazať
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </>
        ) : (
          <>
            {console.log('scanResult missing - no result section')}
            <Text>Žiadny výsledok na zobrazenie.</Text>
          </>
        )}

        {/* Statistics */}
        {ocrHistory.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{ocrHistory.length}</Text>
              <Text style={styles.statLabel}>Skenov</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {ocrHistory.filter(h => h.is_recommended).length}
              </Text>
              <Text style={styles.statLabel}>Odporúčané</Text>
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
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>História</Text>
            {ocrHistory.length > 4 && (
              <TouchableOpacity style={styles.historyFilter}>
                <Text style={styles.historyFilterText}>Filter</Text>
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
                Žiadne skenovania
              </Text>
              <Text style={styles.emptyStateDesc}>
                Začni skenovať kávy a vytvor si databázu obľúbených chutí
              </Text>
            </View>
          )}
        </View>

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

export default CoffeeTasteScanner;