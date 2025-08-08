import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
} from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { launchImageLibrary, ImagePickerResponse, ImageLibraryOptions } from 'react-native-image-picker';

const TextScanner = () => {
  const [scannedText, setScannedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const isDarkMode = useColorScheme() === 'dark';

  const textStyle = {
    color: isDarkMode ? '#ffffff' : '#333333',
  };

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
  };

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const takePhoto = async () => {
    if (!camera.current || !device) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      setIsLoading(true);
      const photo: PhotoFile = await camera.current.takePhoto();
      await processImage(`file://${photo.path}`);
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Error', 'Failed to take photo');
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
        setShowCamera(false);
        Alert.alert('Success', 'Text extracted successfully!');
      } else {
        Alert.alert('No Text Found', 'No readable text was found in the image.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = () => {
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to scan text',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestPermission },
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
  };

  if (!device) {
    return (
      <View style={[styles.container, backgroundStyle]}>
        <Text style={[styles.errorText, textStyle]}>No camera device found</Text>
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

        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.closeButton} onPress={closeCamera}>
            <Text style={styles.buttonText}>✕ Close</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePhoto}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.captureText}>📸</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Position text within the camera view and tap capture
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, backgroundStyle]}>
      <View style={styles.content}>
        <Text style={[styles.title, textStyle]}>📄 Text Scanner</Text>
        <Text style={[styles.subtitle, textStyle]}>
          Scan text from images using your camera or gallery
        </Text>

        <TouchableOpacity style={styles.scanButton} onPress={openCamera}>
          <Text style={styles.buttonText}>📱 Open Camera & Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
          <Text style={styles.buttonText}>🖼️ Choose from Gallery</Text>
        </TouchableOpacity>

        {scannedText ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, textStyle]}>Scanned Text:</Text>
              <TouchableOpacity style={styles.clearButton} onPress={clearText}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.scannedText, textStyle]} selectable>
                {scannedText}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={[styles.placeholderText, textStyle]}>
              No text scanned yet. Use the camera or gallery to scan text from images.
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff6b35" />
            <Text style={[styles.loadingText, textStyle]}>Processing image...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  galleryButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  captureButton: {
    backgroundColor: '#ff6b35',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureText: {
    fontSize: 30,
  },
  instructions: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
  },
  instructionText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  textContainer: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  scannedText: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderContainer: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default TextScanner;