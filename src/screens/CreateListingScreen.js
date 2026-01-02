import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';

// Platform-aware Firebase imports
let auth, createListing;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  const listingsWeb = require('../services/listings.web');
  auth = firebaseWeb.auth;
  createListing = listingsWeb.createListing;
} else {
  const firebaseNative = require('../lib/firebase');
  const listingsNative = require('../services/listings');
  auth = firebaseNative.auth;
  createListing = listingsNative.createListing;
}
import { 
  getImageLimits, 
  validateImageCount, 
  GLOBAL_IMAGE_LIMITS 
} from '../config/categoryLimits';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';

const CATEGORIES = ['Electronics', 'Vehicles', 'Real Estate', 'Fashion', 'Services'];

const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime']; // mp4, mov

export default function CreateListingScreen({ navigation }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: Photos, 2: Details, 3: Review
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null); // {uri, type, size}
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const imageLimits = getImageLimits(category);
  const canProceedFromPhotos = images.length >= imageLimits.min;
  const canSubmit = canProceedFromPhotos && title.trim() && price.trim() && location.trim() && phoneNumber.trim();

  const pickImages = async () => {
    try {
      const remainingSlots = imageLimits.max - images.length;
      
      if (remainingSlots <= 0) {
        Alert.alert(
          t('validation.maximumReached'),
          t('validation.maxImagesExceeded', { category, max: imageLimits.max })
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: Math.min(remainingSlots, 20),
      });

      if (!result.canceled && result.assets) {
        setCompressing(true);
        
        const validAssets = [];
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > GLOBAL_IMAGE_LIMITS.maxFileSize) {
            Alert.alert(t('validation.imageTooLarge'), t('validation.imageExceeds10MB'));
          } else {
            validAssets.push(asset);
          }
        }
        
        if (validAssets.length === 0) {
          setCompressing(false);
          return;
        }
        
        const compressedImages = await Promise.all(
          validAssets.map(async (asset) => {
            try {
              const manipResult = await manipulateAsync(
                asset.uri,
                [{ resize: { width: GLOBAL_IMAGE_LIMITS.compressionWidth } }],
                { 
                  compress: GLOBAL_IMAGE_LIMITS.compressionQuality,
                  format: SaveFormat.JPEG 
                }
              );
              return manipResult.uri;
            } catch (err) {
              console.warn('Image compression failed, using original:', err);
              return asset.uri;
            }
          })
        );
        
        setImages(prev => [...prev, ...compressedImages].slice(0, imageLimits.max));
        setCompressing(false);
      }
    } catch (error) {
      setCompressing(false);
      console.error('Error picking images:', error);
      Alert.alert(t('common.error'), t('errors.failedToPickImages'));
    }
  };

  const takePhoto = async () => {
    try {
      if (images.length >= imageLimits.max) {
        Alert.alert(t('validation.maximumReached'), t('validation.maxImagesExceeded', { category, max: imageLimits.max }));
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('errors.permissionRequired'), t('errors.cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCompressing(true);
        
        try {
          const manipResult = await manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: GLOBAL_IMAGE_LIMITS.compressionWidth } }],
            { 
              compress: GLOBAL_IMAGE_LIMITS.compressionQuality,
              format: SaveFormat.JPEG 
            }
          );
          setImages(prev => [...prev, manipResult.uri].slice(0, imageLimits.max));
        } catch (err) {
          console.warn('Compression failed, using original:', err);
          setImages(prev => [...prev, result.assets[0].uri].slice(0, imageLimits.max));
        }
        
        setCompressing(false);
      }
    } catch (error) {
      setCompressing(false);
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('errors.failedToTakePhoto'));
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setImages(newImages);
  };

  const pickVideo = async () => {
    try {
      if (video) {
        Alert.alert(t('validation.videoAlreadyAdded'), t('validation.oneVideoOnly'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file size
        if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
          const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
          Alert.alert(
            t('errors.videoTooLarge'),
            t('errors.videoSizeExceeded', { size: sizeMB })
          );
          return;
        }

        // Validate video format (if type is available)
        if (asset.type && !ALLOWED_VIDEO_FORMATS.includes(asset.type)) {
          Alert.alert(
            t('errors.invalidVideoFormat'),
            t('errors.videoFormatNotSupported')
          );
          return;
        }

        setVideo({
          uri: asset.uri,
          type: asset.type || 'video/mp4',
          size: asset.fileSize || 0,
          duration: asset.duration || 0,
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert(t('common.error'), t('errors.failedToPickVideo'));
    }
  };

  const removeVideo = () => {
    setVideo(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(t('common.incomplete'), t('validation.fillAllFields'));
      return;
    }

    setUploading(true);

    try {
      const userId = auth.currentUser?.uid;

      if (!userId) {
        setUploading(false);
        Alert.alert(t('auth.authRequired'), t('auth.pleaseSignInToCreate'));
        return;
      }
      
      const listingData = {
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        category,
        currency: 'USD',
        location: location.trim(),
        phoneNumber: phoneNumber.trim(),
        userId,
      };

      await createListing(listingData, images, video);

      setUploading(false);

      Alert.alert(
        t('alerts.success'),
        t('alerts.listingPosted', { title }),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              // Reset form
              setStep(1);
              setTitle('');
              setDescription('');
              setPrice('');
              setCategory('Electronics');
              setLocation('');
              setPhoneNumber('');
              setImages([]);
              setVideo(null);
              navigation.navigate('Home');
            }
          }
        ]
      );
    } catch (error) {
      setUploading(false);
      console.error('Error creating listing:', error);
      Alert.alert(t('common.error'), t('errors.failedToCreateListing') + '\n\n' + error.message);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>
              {s}
            </Text>
          </View>
          <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
            {s === 1 ? 'Photos' : s === 2 ? 'Details' : 'Review'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderPhotosStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Add Photos</Text>
      <Text style={styles.stepSubtitle}>
        Add at least {imageLimits.min} photos • First photo is cover
      </Text>

      {compressing && (
        <View style={styles.compressingBanner}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.compressingText}>Optimizing images...</Text>
        </View>
      )}

      {/* Image Grid */}
      <View style={styles.imageGrid}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageItem}>
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>COVER</Text>
              </View>
            )}
            <Image source={{ uri }} style={styles.imagePreview} />
            
            {/* Reorder buttons */}
            {images.length > 1 && (
              <View style={styles.reorderButtons}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveImage(index, index - 1)}
                  >
                    <Ionicons name="chevron-back" size={16} color={COLORS.card} />
                  </TouchableOpacity>
                )}
                {index < images.length - 1 && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={() => moveImage(index, index + 1)}
                  >
                    <Ionicons name="chevron-forward" size={16} color={COLORS.card} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={28} color={COLORS.error} />
            </TouchableOpacity>
            
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>
          </View>
        ))}
        
        {/* Add buttons */}
        {images.length < imageLimits.max && (
          <>
            <TouchableOpacity style={styles.addButton} onPress={pickImages}>
              <Ionicons name="images" size={40} color={COLORS.primary} />
              <Text style={styles.addButtonText}>Gallery</Text>
              <Text style={styles.addButtonHint}>{imageLimits.max - images.length} left</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={takePhoto}>
              <Ionicons name="camera" size={40} color={COLORS.secondary} />
              <Text style={styles.addButtonText}>Camera</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Video Section (Optional) */}
      <View style={styles.videoSection}>
        <Text style={styles.videoTitle}>Video (Optional)</Text>
        <Text style={styles.videoSubtitle}>Add one video • Max 30MB • MP4 or MOV</Text>

        {video ? (
          <View style={styles.videoPreviewContainer}>
            <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={60} color={COLORS.primary} />
              <Text style={styles.videoFileName}>Video Added</Text>
              <Text style={styles.videoFileSize}>
                {(video.size / (1024 * 1024)).toFixed(1)} MB
              </Text>
              {video.duration > 0 && (
                <Text style={styles.videoFileDuration}>
                  {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.removeVideoButton}
              onPress={removeVideo}
            >
              <Ionicons name="close-circle" size={28} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addVideoButton} onPress={pickVideo}>
            <Ionicons name="videocam" size={40} color={COLORS.secondary} />
            <Text style={styles.addVideoButtonText}>Add Video</Text>
            <Text style={styles.addVideoButtonHint}>Optional • 30MB max</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.stepActions}>
        <PrimaryButton
          title={`Next: Details (${images.length}/${imageLimits.min})`}
          onPress={() => setStep(2)}
          disabled={!canProceedFromPhotos}
          size="large"
        />
      </View>
    </ScrollView>
  );

  const renderDetailsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Listing Details</Text>
      <Text style={styles.stepSubtitle}>Tell us about your item</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          placeholder="e.g., iPhone 14 Pro 256GB"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Price (USD) *</Text>
        <TextInput
          placeholder="e.g., 1200"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Describe your item..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Location *</Text>
        <TextInput
          placeholder="e.g., Nairobi, Kenya"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Contact Phone *</Text>
        <TextInput
          placeholder="e.g., +254 712 345 678"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      <View style={styles.stepActions}>
        <PrimaryButton
          title="Back"
          onPress={() => setStep(1)}
          variant="outline"
          size="medium"
          style={{ flex: 1 }}
        />
        <View style={{ width: SPACING.md }} />
        <PrimaryButton
          title="Review"
          onPress={() => setStep(3)}
          disabled={!title.trim() || !price.trim() || !location.trim() || !phoneNumber.trim()}
          size="medium"
          style={{ flex: 2 }}
        />
      </View>
    </ScrollView>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review & Post</Text>
      <Text style={styles.stepSubtitle}>Check everything looks good</Text>

      <Card style={styles.previewCard}>
        {images[0] && (
          <Image source={{ uri: images[0] }} style={styles.previewImage} />
        )}
        <View style={styles.previewContent}>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewPrice}>USD {price}</Text>
          <View style={styles.previewRow}>
            <Ionicons name="location" size={16} color={COLORS.textMuted} />
            <Text style={styles.previewText}>{location}</Text>
          </View>
          <View style={styles.previewRow}>
            <Ionicons name="call" size={16} color={COLORS.textMuted} />
            <Text style={styles.previewText}>{phoneNumber}</Text>
          </View>
          <View style={styles.previewRow}>
            <Ionicons name="pricetag" size={16} color={COLORS.textMuted} />
            <Text style={styles.previewText}>{category}</Text>
          </View>
          <View style={styles.previewRow}>
            <Ionicons name="images" size={16} color={COLORS.textMuted} />
            <Text style={styles.previewText}>{images.length} photos</Text>
          </View>
          {description && (
            <Text style={styles.previewDescription}>{description}</Text>
          )}
        </View>
      </Card>

      <View style={styles.stepActions}>
        <PrimaryButton
          title="Back"
          onPress={() => setStep(2)}
          variant="outline"
          size="medium"
          style={{ flex: 1 }}
        />
        <View style={{ width: SPACING.md }} />
        <PrimaryButton
          title={uploading ? 'Posting...' : 'Post Listing'}
          onPress={handleSubmit}
          disabled={uploading || !canSubmit}
          loading={uploading}
          size="medium"
          style={{ flex: 2 }}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStepIndicator()}

      {step === 1 && renderPhotosStep()}
      {step === 2 && renderDetailsStep()}
      {step === 3 && renderReviewStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.card,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: COLORS.card,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  stepContent: {
    flex: 1,
    padding: SPACING.base,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  compressingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.primary}15`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.base,
  },
  compressingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  imageItem: {
    width: '47%',
    aspectRatio: 1,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundDark,
  },
  coverBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    zIndex: 10,
  },
  coverBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.card,
  },
  reorderButtons: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  reorderButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    ...SHADOWS.medium,
  },
  imageNumber: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.card,
  },
  addButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: SPACING.sm,
  },
  addButtonHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.textDark,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryList: {
    marginHorizontal: -SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  categoryChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.backgroundDark,
    marginRight: SPACING.sm,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  categoryChipTextActive: {
    color: COLORS.card,
  },
  stepActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxxl,
  },
  previewCard: {
    marginBottom: SPACING.lg,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.backgroundDark,
  },
  previewContent: {
    gap: SPACING.sm,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  previewPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  previewDescription: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  // Video Styles
  videoSection: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  videoSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  videoPreviewContainer: {
    position: 'relative',
  },
  videoPreview: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  videoFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: SPACING.md,
  },
  videoFileSize: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  videoFileDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  removeVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  addVideoButton: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  addVideoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: SPACING.sm,
  },
  addVideoButtonHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
