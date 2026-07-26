import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { storyService } from '@/services';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function CreateStoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const cameraRef = useRef<any>(null); // CameraView doesn't export a clear imperative handle type sometimes, standard is any or CameraView

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        setCapturedImage(photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const flipCamera = () => {
    setCameraType(current =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const handleShare = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'Please capture or select an image first');
      return;
    }

    setUploading(true);
    try {
      // Create form data with image
      const formData = new FormData() as any;
      formData.append('media', {
        uri: capturedImage,
        type: 'image/jpeg',
        name: 'story.jpg',
      });

      if (content.trim()) {
        formData.append('content', content.trim());
      }

      formData.append('type', 'image');
      formData.append('visibility', 'public');

      await storyService.createStory(formData);
      Alert.alert('Success', 'Story shared!');
      router.back();
    } catch (error: any) {
      console.error('Error creating story:', error);
      Alert.alert('Error', error.message || 'Failed to share story');
    } finally {
      setUploading(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setContent('');
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={{ uri: capturedImage }} style={styles.preview} />

        <View style={styles.overlay} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={resetCapture}>
            <Text style={styles.headerButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Story</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Content input */}
        <View style={styles.contentInputContainer}>
          <TextInput
            style={styles.contentInput}
            placeholder="Add text to your story..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={content}
            onChangeText={setContent}
            maxLength={200}
            multiline
          />
        </View>

        {/* Share button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.shareButton, uploading && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={uploading}
          >
            <Text style={styles.shareButtonText}>
              {uploading ? 'Sharing...' : 'Share to Story'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={styles.camera} facing={cameraType} ref={cameraRef}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Story</Text>
          <TouchableOpacity style={styles.headerButton} onPress={flipCamera}>
            <Text style={styles.headerButtonText}>⟲</Text>
          </TouchableOpacity>
        </View>

        {/* Camera controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
            <Text style={styles.galleryButtonText}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={styles.galleryButton} />
        </View>
      </CameraView>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
  },
  text: {
    color: theme.colors.background,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  preview: {
    width,
    height,
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: theme.colors.background,
    fontSize: 32,
    fontWeight: '300',
  },
  headerTitle: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 6,
    borderColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.background,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 28,
  },
  contentInputContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  contentInput: {
    color: theme.colors.background,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minHeight: 60,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
});