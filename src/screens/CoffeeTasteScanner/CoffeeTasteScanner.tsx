import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
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
import { scannerStyles } from './styles';
import { processOCR } from './services';
import { showToast } from '../../utils/toast';
import { COFFEE_GRADIENT, WELCOME_GRADIENT } from './constants';

interface ProfessionalOCRScannerProps {
  onBack?: () => void;
  onQuestionnairePress?: () => void;
}

const CoffeeTasteScanner: React.FC<ProfessionalOCRScannerProps> = ({ onBack }) => {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isDarkMode = useColorScheme() === 'dark';

  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('Analyzujem...');

  const styles = scannerStyles(isDarkMode);
  const backgroundGradient = useMemo(
    () => ({
      colors: ['#FFE8D1', '#FFF3E4', '#FAF8F5'],
      locations: [0, 0.28, 0.7],
    }),
    [],
  );

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const processImage = async (base64image: string) => {
    try {
      setIsLoading(true);
      setOverlayText('Analyzujem...');
      setOverlayVisible(true);
      await processOCR(base64image);
      showToast('Sken dokončený. Text prešiel AI korektúrou.');
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Chyba', 'Nepodarilo sa spracovať obrázok');
    } finally {
      setIsLoading(false);
      setOverlayVisible(false);
      setOverlayText('Analyzujem...');
    }
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
      setShowCamera(false);
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

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) return;

      if (response.assets && response.assets[0]?.base64) {
        setShowCamera(false);
        await processImage(response.assets[0].base64);
      } else {
        Alert.alert('Chyba', 'Nepodarilo sa načítať obrázok');
      }
    });
  };

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.phoneContainer}>
              <View style={styles.appHeader}>
                <TouchableOpacity
                  style={[styles.backButton, styles.backButtonVisible]}
                  onPress={onBack}
                  activeOpacity={0.8}
                  disabled={!onBack}
                >
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <View style={styles.headerRow}>
                    <Text style={styles.coffeeIcon}>☕</Text>
                    <Text style={styles.headerTitle}>Skener kávy</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    Sken prejde cez Google Vision a AI korektúru textu
                  </Text>
                </View>
              </View>

              <View style={styles.mainContent}>
                <LinearGradient colors={WELCOME_GRADIENT} style={styles.welcomeCard}>
                  <Text style={styles.welcomeEmoji}>☕</Text>
                  <Text style={styles.welcomeText}>Pripravený na skenovanie?</Text>
                  <Text style={styles.welcomeDesc}>
                    Odfoť etiketu kávy alebo nahraj fotku. Výsledok sa spracuje automaticky.
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
              </View>
            </View>
          </View>
        </ScrollView>

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

export default CoffeeTasteScanner;
