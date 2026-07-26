import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import storyService from '../../services/StoryService';

type CameraFacing = 'back' | 'front';
type FlashModeType = 'off' | 'auto' | 'on';

const { width, height } = Dimensions.get('window');

interface CameraControlsProps {
  onTakePicture: () => void;
  onToggleCamera: () => void;
  onToggleFlash: () => void;
  onPickFromGallery: () => void;
  onClose: () => void;
  isRecording: boolean;
  flashMode: FlashModeType;
  cameraType: CameraFacing;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  onTakePicture,
  onToggleCamera,
  onToggleFlash,
  onPickFromGallery,
  onClose,
  isRecording,
  flashMode,
  cameraType,
}) => {
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  const handleTakePicture = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onTakePicture();
  };

  return (
    <>
      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onToggleFlash}>
          <Ionicons
            name={
              flashMode === 'on'
                ? 'flash'
                : flashMode === 'auto'
                  ? 'flash-outline'
                  : 'flash-off'
            }
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.galleryButton} onPress={onPickFromGallery}>
          <Ionicons name="images" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
          <TouchableOpacity
            style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
            onPress={handleTakePicture}
            disabled={isRecording}
          >
            <View style={[styles.captureInner, isRecording && styles.captureInnerRecording]} />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity style={styles.flipButton} onPress={onToggleCamera}>
          <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
};

interface StoryOverlayProps {
  visible: boolean;
  photoUri: string | null;
  overlayText: string;
  setOverlayText: (text: string) => void;
  showTextInput: boolean;
  setShowTextInput: (show: boolean) => void;
  overlaySticker: string | null;
  onAddText: () => void;
  onAddSticker: () => void;
  onShare: () => void;
  onCancel: () => void;
}

const StoryOverlay: React.FC<StoryOverlayProps> = ({
  visible,
  photoUri,
  overlayText,
  setOverlayText,
  showTextInput,
  setShowTextInput,
  overlaySticker,
  onAddText,
  onAddSticker,
  onShare,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {photoUri && (
        <View style={StyleSheet.absoluteFill}>
          <ImageBackground source={{ uri: photoUri }} style={StyleSheet.absoluteFill}>
            {/* Overlay Layers */}
            <View style={styles.layersContainer}>
              {overlaySticker && (
                <Text style={styles.stickerText}>{overlaySticker}</Text>
              )}
              {showTextInput ? (
                <TextInput
                  style={styles.textInputLayer}
                  value={overlayText}
                  onChangeText={setOverlayText}
                  placeholder="Escribe algo..."
                  placeholderTextColor="#FFFFFF80"
                  autoFocus
                  onBlur={() => setShowTextInput(false)}
                  returnKeyType="done"
                />
              ) : (
                <TouchableOpacity onPress={() => setShowTextInput(true)}>
                  <Text style={styles.overlayTextDisplay}>
                    {overlayText || "Toca aquí para escribir"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ImageBackground>
        </View>
      )}

      <View style={styles.overlayTop}>
        <TouchableOpacity style={styles.overlayButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.overlayBottom}>
        <View style={styles.editControls}>
          <TouchableOpacity style={styles.editButton} onPress={onAddText}>
            <Ionicons name="text" size={24} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Texto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={onAddSticker}>
            <Ionicons name="happy" size={24} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Stickers</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareButtonText}>Compartir en Historia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CameraScreen() {
  const router = useRouter();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraType, setCameraType] = useState<CameraFacing>('back');
  const [flashMode, setFlashMode] = useState<FlashModeType>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [showStoryOverlay, setShowStoryOverlay] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Overlay states
  const [overlayText, setOverlayText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [overlaySticker, setOverlaySticker] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      await requestCameraPermission();
      await requestMicPermission();
      await MediaLibrary.requestPermissionsAsync();
    } catch {
      // permissions denied
    }
  };

  const hasPermission = cameraPermission?.granted ?? null;

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      setCapturedPhoto(photo.uri);
      setShowStoryOverlay(true);

      // Save to device
      await MediaLibrary.saveToLibraryAsync(photo.uri);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
  };

  const toggleFlashMode = () => {
    setFlashMode(current => {
      switch (current) {
        case 'off': return 'auto';
        case 'auto': return 'on';
        case 'on': default: return 'off';
      }
    });
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // Story aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowStoryOverlay(true);
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleAddText = () => {
    setShowTextInput(true);
  };

  const stickersList = ['🔥', '🎉', '❤️', '💯', '✨'];
  const handleAddSticker = () => {
    const randomSticker = stickersList[Math.floor(Math.random() * stickersList.length)];
    setOverlaySticker(randomSticker);
    Alert.alert('MVP Sticker', `Se agregó un sticker: ${randomSticker}. Toca nuevamente para cambiarlo.`);
  };

  const handleShare = async () => {
    if (!capturedPhoto) return;

    try {
      const media = [{
        uri: capturedPhoto,
        type: 'image/jpeg',
        name: `story_photo_${Date.now()}.jpg`
      }];

      const combinedContent = `${overlaySticker || ''}\n${overlayText || ''}`.trim() || '📸';

      await storyService.createStory(media, combinedContent);

      Alert.alert(
        'Historia compartida',
        'Tu historia se ha publicado exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowStoryOverlay(false);
              setCapturedPhoto(null);
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sharing story:', error);
      Alert.alert('Error', 'No se pudo compartir la historia. Inténtalo de nuevo.');
    }
  };

  const handleCancelStory = () => {
    setShowStoryOverlay(false);
    setCapturedPhoto(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#C7C7CC" />
        <Text style={styles.permissionTitle}>Permisos de cámara requeridos</Text>
        <Text style={styles.permissionDescription}>
          EventConnect necesita acceso a tu cámara para tomar fotos y crear historias.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
          <Text style={styles.permissionButtonText}>Conceder permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
      >
        <SafeAreaView style={styles.cameraContainer}>
          <CameraControls
            onTakePicture={takePicture}
            onToggleCamera={toggleCameraType}
            onToggleFlash={toggleFlashMode}
            onPickFromGallery={pickFromGallery}
            onClose={handleClose}
            isRecording={isRecording}
            flashMode={flashMode}
            cameraType={cameraType}
          />
        </SafeAreaView>
      </CameraView>

      <StoryOverlay
        visible={showStoryOverlay}
        photoUri={capturedPhoto}
        overlayText={overlayText}
        setOverlayText={setOverlayText}
        showTextInput={showTextInput}
        setShowTextInput={setShowTextInput}
        overlaySticker={overlaySticker}
        onAddText={handleAddText}
        onAddSticker={handleAddSticker}
        onShare={handleShare}
        onCancel={handleCancelStory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonRecording: {
    backgroundColor: '#FF3B30',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  captureInnerRecording: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  layersContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerText: {
    fontSize: 100,
    position: 'absolute',
    top: '30%',
  },
  textInputLayer: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    width: '80%',
    zIndex: 10,
  },
  overlayTextDisplay: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    zIndex: 10,
  },
  overlayTop: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  overlayBottom: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  editControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 30,
  },
  editButton: {
    alignItems: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});