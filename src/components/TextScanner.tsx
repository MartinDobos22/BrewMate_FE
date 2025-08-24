// TextScanner.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';

const colors = {
  primary: '#6B4423',
  primaryLight: '#8B6544',
  primaryDark: '#4A2F18',
  accent: '#D2691E',
  success: '#4CAF50',
  warning: '#FFA726',
  danger: '#EF5350',
  bgLight: '#FAF7F5',
  cardLight: '#FFFFFF',
  textPrimary: '#2C2C2C',
  textSecondary: '#666666',
  borderLight: '#E0E0E0',
};

interface QuickScan {
  id: string;
  text: string;
  timestamp: Date;
  wordCount: number;
}

interface TextScannerProps {
  onBack?: () => void;
}

const TextScanner: React.FC<TextScannerProps> = ({ onBack }) => {
  const [scannedText, setScannedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [quickScans, setQuickScans] = useState<QuickScan[]>([]);
  const [showQuickScans, setShowQuickScans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    loadQuickScans();
  }, [hasPermission, requestPermission]);

  const loadQuickScans = () => {
    // Mock data - replace with actual storage
    const mockScans: QuickScan[] = [
      {
        id: '1',
        text: 'Rýchla poznámka zo schôdze...',
        timestamp: new Date(2025, 7, 23, 10, 30),
        wordCount: 45,
      },
      {
        id: '2',
        text: 'Nákupný zoznam: mlieko, chlieb...',
        timestamp: new Date(2025, 7, 22, 18, 15),
        wordCount: 12,
      },
    ];
    setQuickScans(mockScans);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadQuickScans();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const takePhoto = async () => {
    if (!camera.current || !device) {
      Alert.alert('Chyba', 'Kamera nie je pripravená');
      return;
    }

    try {
      setIsLoading(true);
      const photo: PhotoFile = await camera.current.takePhoto();
      await processImage(`file://${photo.path}`);
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
      quality: 0.8,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        if (imageUri) {
          processImage(imageUri);
        }
      }
    });
  };

  const processImage = async (imagePath: string) => {
    try {
      setIsLoading(true);
      const result = await TextRecognition.recognize(imagePath);

      if (result.text) {
        setScannedText(result.text);
        setEditedText(result.text);
        setShowCamera(false);

        // Add to quick scans
        const newScan: QuickScan = {
          id: Date.now().toString(),
          text: result.text,
          timestamp: new Date(),
          wordCount: result.text.split(' ').filter(w => w).length,
        };
        setQuickScans(prev => [newScan, ...prev]);

        Alert.alert('✅ Úspech', 'Text bol úspešne rozpoznaný!');
      } else {
        Alert.alert('Žiadny text', 'V obrázku nebol nájdený žiadny čitateľný text.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (editedText) {
      Clipboard.setString(editedText);
      Alert.alert('✅ Skopírované', 'Text bol skopírovaný do schránky');
    }
  };

  const shareText = async () => {
    if (editedText) {
      try {
        await Share.share({
          message: editedText,
          title: 'Skenovaný text - BrewMate',
        });
      } catch (error) {
        Alert.alert('Chyba', 'Nepodarilo sa zdieľať text');
      }
    }
  };

  const translateText = () => {
    Alert.alert(
      '🌐 Prekladač',
      'Funkcia prekladu bude čoskoro dostupná!',
      [{ text: 'OK' }]
    );
  };

  const openCamera = () => {
    if (!hasPermission) {
      Alert.alert(
        'Povolenie kamery',
        'Na skenovanie textu potrebujeme prístup ku kamere',
        [
          { text: 'Zrušiť', style: 'cancel' },
          { text: 'Povoliť', onPress: requestPermission },
        ]
      );
      return;
    }
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const clearText = () => {
    setScannedText('');
    setEditedText('');
  };

  const loadQuickScan = (scan: QuickScan) => {
    setScannedText(scan.text);
    setEditedText(scan.text);
    setShowQuickScans(false);
  };

  const deleteQuickScan = (id: string) => {
    Alert.alert(
      'Vymazať rýchly sken',
      'Naozaj chceš vymazať tento záznam?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: () => {
            setQuickScans(prev => prev.filter(scan => scan.id !== id));
            Alert.alert('Vymazané', 'Záznam bol odstránený');
          }
        }
      ]
    );
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Kamera nie je dostupná</Text>
      </View>
    );
  }

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
            <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCamera}>
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
              Zaostri na text, ktorý chceš skenovať
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Späť</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📄 Rýchly skener textu</Text>
          <Text style={styles.subtitle}>
            Skenuj a upravuj text z obrázkov jednoducho
          </Text>
        </View>

        {/* Main Actions */}
        {!scannedText && (
          <View style={styles.mainActions}>
            <TouchableOpacity
              style={[styles.actionCard, styles.cameraAction]}
              onPress={openCamera}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, styles.primaryActionIcon]}>
                <Text style={styles.actionEmoji}>📷</Text>
              </View>
              <Text style={[styles.actionTitle, styles.primaryText]}>Otvoriť kameru</Text>
              <Text style={[styles.actionDesc, styles.primaryText]}>Skenuj naživo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
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

        {/* Result Section */}
        {scannedText && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>📋 Rozpoznaný text</Text>
              <TouchableOpacity style={styles.clearButton} onPress={clearText}>
                <Text style={styles.clearButtonText}>Vymazať</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.resultCard}>
              <TextInput
                style={styles.resultTextInput}
                multiline
                value={editedText}
                onChangeText={setEditedText}
                placeholder="Tu môžeš upraviť text..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Text Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>📊 Štatistiky</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{editedText.length}</Text>
                  <Text style={styles.statLabel}>Znakov</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{editedText.split(' ').filter(w => w).length}</Text>
                  <Text style={styles.statLabel}>Slov</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{editedText.split('\n').length}</Text>
                  <Text style={styles.statLabel}>Riadkov</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickActionButton} onPress={copyToClipboard}>
                <Text style={styles.quickActionEmoji}>📋</Text>
                <Text style={styles.quickActionText}>Kopírovať</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton} onPress={shareText}>
                <Text style={styles.quickActionEmoji}>📤</Text>
                <Text style={styles.quickActionText}>Zdieľať</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton} onPress={translateText}>
                <Text style={styles.quickActionEmoji}>🌐</Text>
                <Text style={styles.quickActionText}>Preložiť</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Scans History */}
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={() => setShowQuickScans(!showQuickScans)}
          >
            <Text style={styles.historyTitle}>
              ⚡ Rýchle skeny ({quickScans.length})
            </Text>
            <Text style={styles.historyToggle}>
              {showQuickScans ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showQuickScans && (
            <View style={styles.historyList}>
              {quickScans.length > 0 ? (
                quickScans.map((scan) => (
                  <TouchableOpacity
                    key={scan.id}
                    style={styles.historyItem}
                    onPress={() => loadQuickScan(scan)}
                    onLongPress={() => deleteQuickScan(scan.id)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemName}>
                        {scan.text.substring(0, 50)}...
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {scan.timestamp.toLocaleDateString('sk-SK')} {scan.timestamp.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.historyItemMeta}>
                      <Text style={styles.historyItemMatch}>
                        {scan.wordCount} slov
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyHistoryText}>
                  Zatiaľ nemáš žiadne rýchle skeny
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tipy pre lepšie skenovanie</Text>
          <Text style={styles.tipsText}>
            • Drž telefón rovno nad textom{'\n'}
            • Zabezpeč dobré osvetlenie{'\n'}
            • Vyhni sa tieňom a odleskom{'\n'}
            • Text by mal byť ostrý a čitateľný{'\n'}
            • Pre dlhé texty použi viac skenov
          </Text>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Spracovávam obrázok...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },

  scrollView: {
    flex: 1,
  },

  // Back button
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },

  backButtonText: {
    fontSize: 18,
    color: colors.primary,
  },

  // Header - matching HomeScreen hero style
  header: {
    backgroundColor: colors.accent,
    margin: 16,
    marginTop: 60,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.95,
    textAlign: 'center',
  },

  // Main Actions - matching HomeScreen quick actions
  mainActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },

  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  cameraAction: {
    backgroundColor: colors.primary,
  },

  actionIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(107, 68, 35, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  primaryActionIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  actionEmoji: {
    fontSize: 28,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },

  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
    textAlign: 'center',
  },

  primaryText: {
    color: 'white',
  },

  // Camera View
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  cameraHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },

  cameraCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraCloseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  scanFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    height: '35%',
    borderWidth: 2,
    borderColor: 'transparent',
  },

  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.accent,
  },

  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },

  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },

  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },

  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },

  cameraInstructions: {
    position: 'absolute',
    top: '62%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  cameraInstructionText: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },

  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },

  // Result Section
  resultSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  clearButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  clearButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  resultCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  resultTextInput: {
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.bgLight,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  quickActionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },

  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // History Section
  historySection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  historyToggle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  historyList: {
    paddingBottom: 8,
  },

  historyItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  historyItemContent: {
    flex: 1,
  },

  historyItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },

  historyItemDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  historyItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  historyItemMatch: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  emptyHistoryText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },

  // Tips Card
  tipsCard: {
    marginHorizontal: 16,
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  tipsText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },

  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: colors.textPrimary,
  },
});

export default TextScanner;