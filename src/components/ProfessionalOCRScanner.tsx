// ProfessionalOCRScanner.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
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
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { scannerStyles } from './styles/ProfessionalOCRScanner.styles';

interface ScanHistory {
  id: string;
  text: string;
  timestamp: Date;
  title: string;
}

interface ProfessionalOCRScannerProps {
  onBack?: () => void;
}

const ProfessionalOCRScanner: React.FC<ProfessionalOCRScannerProps> = ({ onBack }) => {
  const [scannedText, setScannedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const styles = scannerStyles(false); // Using light mode

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    loadHistory();
  }, [hasPermission, requestPermission]);

  const loadHistory = () => {
    // Load from AsyncStorage or your storage solution
    // Mock data for demonstration
    const mockHistory: ScanHistory[] = [
      {
        id: '1',
        title: 'Zmluva o dielo',
        text: 'Zmluva uzatvorená podľa...',
        timestamp: new Date(2025, 7, 22),
      },
      {
        id: '2',
        title: 'Faktúra č. 2025/08',
        text: 'Faktúra za služby...',
        timestamp: new Date(2025, 7, 21),
      },
    ];
    setScanHistory(mockHistory);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadHistory();
    setTimeout(() => setRefreshing(false), 1500);
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
      quality: 1.0,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;

      if (response.assets && response.assets[0]?.uri) {
        processImage(response.assets[0].uri);
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
      }
    });
  };

  const processImage = async (imagePath: string) => {
    try {
      setIsLoading(true);
      setShowCamera(false);

      const result = await TextRecognition.recognize(imagePath);

      if (result.text) {
        setScannedText(result.text);
        setEditedText(result.text);

        // Add to history
        const newHistoryItem: ScanHistory = {
          id: Date.now().toString(),
          title: documentTitle || `Dokument ${new Date().toLocaleDateString('sk-SK')}`,
          text: result.text,
          timestamp: new Date(),
        };

        setScanHistory(prev => [newHistoryItem, ...prev]);

        Alert.alert(
          '✅ Skenovanie dokončené',
          'Text bol úspešne rozpoznaný a uložený do histórie',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Žiadny text', 'V obrázku nebol nájdený žiadny čitateľný text');
      }
    } catch (error) {
      console.error('Process image error:', error);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
    }
  };

  const exportText = async () => {
    if (editedText) {
      try {
        await Share.share({
          message: editedText,
          title: documentTitle || 'Skenovaný dokument - BrewMate',
        });
      } catch (error) {
        Alert.alert('Chyba', 'Nepodarilo sa zdieľať text');
      }
    }
  };

  const saveToFiles = async () => {
    if (editedText) {
      const fileName = `${documentTitle || 'dokument'}_${Date.now()}.txt`;
      const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      try {
        await RNFS.writeFile(path, editedText, 'utf8');
        Alert.alert('✅ Uložené', `Dokument bol uložený ako ${fileName}`);
      } catch (error) {
        Alert.alert('Chyba', 'Nepodarilo sa uložiť dokument');
      }
    }
  };

  const loadFromHistory = (item: ScanHistory) => {
    setScannedText(item.text);
    setEditedText(item.text);
    setDocumentTitle(item.title);
    setShowHistory(false);
  };

  const deleteFromHistory = (id: string) => {
    Alert.alert(
      'Vymazať záznam',
      'Naozaj chceš vymazať tento dokument z histórie?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vymazať',
          style: 'destructive',
          onPress: () => {
            setScanHistory(prev => prev.filter(item => item.id !== id));
            Alert.alert('Vymazané', 'Dokument bol odstránený z histórie');
          }
        }
      ]
    );
  };

  const openCamera = () => {
    if (!hasPermission) {
      Alert.alert(
        'Povolenie kamery',
        'Na skenovanie dokumentov potrebujeme prístup ku kamere',
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
    setScannedText('');
    setEditedText('');
    setDocumentTitle('');
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
              Zaostri na dokument
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
          <Text style={styles.title}>📄 Profesionálny skener</Text>
          <Text style={styles.subtitle}>
            Skenuj dokumenty s vysokou presnosťou OCR
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
              <Text style={[styles.actionTitle, styles.primaryText]}>Skenovať dokument</Text>
              <Text style={[styles.actionDesc, styles.primaryText]}>Použi fotoaparát</Text>
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

        {/* Scan Result */}
        {scannedText && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>📋 Výsledok skenovania</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>
                  {editedText.split(' ').length} slov
                </Text>
              </View>
            </View>

            {/* Document Title Input */}
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Názov dokumentu:</Text>
              <TextInput
                style={styles.tasteInput}
                value={documentTitle}
                onChangeText={setDocumentTitle}
                placeholder="Zadaj názov dokumentu..."
                placeholderTextColor="#999"
              />
            </View>

            {/* Scanned Text */}
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

            {/* Text Analysis */}
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>📊 Analýza textu</Text>
              <Text style={styles.recommendationText}>
                • Počet znakov: {editedText.length}{'\n'}
                • Počet slov: {editedText.split(' ').filter(w => w).length}{'\n'}
                • Počet riadkov: {editedText.split('\n').length}{'\n'}
                • Jazyk: Slovenčina
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.shareButton} onPress={exportText}>
                <Text style={styles.buttonText}>📤 Zdieľať</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={saveToFiles}>
                <Text style={styles.buttonText}>💾 Uložiť</Text>
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
              📚 História dokumentov ({scanHistory.length})
            </Text>
            <Text style={styles.historyToggle}>
              {showHistory ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyList}>
              {scanHistory.length > 0 ? (
                scanHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => loadFromHistory(item)}
                    onLongPress={() => deleteFromHistory(item.id)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemName}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyItemDate}>
                        {item.timestamp.toLocaleDateString('sk-SK')} • {item.text.substring(0, 30)}...
                      </Text>
                    </View>
                    <View style={styles.historyItemMeta}>
                      <Text style={styles.historyItemMatch}>
                        {item.text.split(' ').filter(w => w).length} slov
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyHistoryText}>
                  Zatiaľ nemáš žiadne skenované dokumenty
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Features Info */}
        <View style={styles.brewingCard}>
          <Text style={styles.brewingTitle}>✨ Funkcie skenera</Text>
          <Text style={styles.brewingText}>
            • Vysoká presnosť OCR rozpoznávania{'\n'}
            • Podpora viacerých jazykov{'\n'}
            • Automatické vylepšenie kvality{'\n'}
            • Export do rôznych formátov{'\n'}
            • História skenovaných dokumentov{'\n'}
            • Offline spracovanie
          </Text>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D2691E" />
            <Text style={styles.loadingText}>Spracovávam dokument...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProfessionalOCRScanner;