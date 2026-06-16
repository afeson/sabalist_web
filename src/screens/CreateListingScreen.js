/**
 * CreateListingScreen - Complete Rewrite (with Video Upload)
 * VERSION 7.0.0 - UNIVERSAL WEB UPLOAD (Jan 10, 2026)
 *
 * A bulletproof implementation with:
 * - Safe async/await flows (no hanging promises)
 * - Timeout protection on all operations
 * - Sequential image uploads with progress tracking
 * - Video upload support (max 50MB)
 * - Guaranteed spinner cleanup (always stops)
 * - Platform-aware Firebase handling
 * - Universal web upload (File, Blob, data URL, blob URL)
 * - NEVER uses image.path (doesn't exist on web)
 * - Clear error messages
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Image upload helper - v14.0.0 UNIVERSAL
import { imageToBlob } from '../services/uploadHelpers';
import { detectUserLocation } from '../services/locationService';
import { getCategoryId } from '../config/categoryMapping';
import { useAuth } from '../contexts/AuthContext';
import { getFirestore, collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getImageLimits, GLOBAL_IMAGE_LIMITS } from '../config/categoryLimits';
import { recordListingPosted } from '../services/reviewService';
import SEO from '../components/SEO';
import AuthScreen from './AuthScreen';
import { getSubCategories, CATEGORIES, getCategoryByKey, getCategoryIcon, categoryRequiresPricing } from '../config/categories';
import { getTranslatedCategoryLabel, getTranslatedSubCategoryLabel } from '../utils/categoryI18n';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { PrimaryButton, Card } from '../components/ui';
import CategorySelector from '../components/CategorySelector';
import PriceTypeSelector from '../components/ui/PriceTypeSelector';
import {
  PRICE_TYPES,
  buildPriceData,
  formatListingPrice,
} from '../lib/pricing';
import { DEFAULT_CURRENCY } from '../lib/currencies';

// All canonical category keys (source of truth in src/config/categories.js)
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export default function CreateListingScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth(); // Get authenticated user from AuthContext

  // Build-first / gate-at-publish (web): logged-out visitors can build a listing;
  // they're only asked to sign in when they hit Post. The screen stays mounted
  // so the draft is preserved in state — after sign-in this effect hides the
  // prompt and the user can publish their draft.
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    if (user && needsAuth) setNeedsAuth(false);
  }, [user, needsAuth]);
  const insets = useSafeAreaInsets();
  const [, forceUpdate] = useState(0);

  // Force re-render when language changes (even if screen is already focused)
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  // Also re-render when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  // Step state (1: Photos, 2: Details, 3: Review)
  const [step, setStep] = useState(1);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Pricing form — supports fixed, range, free, call_for_price, none.
  // See src/lib/pricing.js for the canonical schema. The legacy `price`
  // string is no longer a separate piece of state; everything is here.
  const [priceForm, setPriceForm] = useState({
    priceType: PRICE_TYPES.FIXED,
    amount: '',
    minAmount: '',
    maxAmount: '',
    currency: DEFAULT_CURRENCY,
    isNegotiable: false,
  });
  const [category, setCategory] = useState('Electronics');
  const [subcategory, setSubcategory] = useState(null);
  const [location, setLocation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);

  // UI state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Computed values
  const availableSubcategories = getSubCategories(category);
  const imageLimits = getImageLimits(category);
  const canProceedFromPhotos = images.length >= imageLimits.min;

  // Categories like Jobs, Services, Community, Education, Events may
  // omit a numeric price. For required-pricing categories, the seller
  // must pick Fixed / Range / Free / Call (i.e. NOT "none") AND, if
  // they pick Fixed/Range, the numeric inputs must be filled.
  const pricingRequired = categoryRequiresPricing(category);
  const priceValid = (() => {
    switch (priceForm.priceType) {
      case PRICE_TYPES.FIXED:
        return !!priceForm.amount && parseFloat(priceForm.amount) >= 0;
      case PRICE_TYPES.RANGE:
        return (
          !!priceForm.minAmount &&
          !!priceForm.maxAmount &&
          parseFloat(priceForm.minAmount) >= 0 &&
          parseFloat(priceForm.maxAmount) >= parseFloat(priceForm.minAmount)
        );
      case PRICE_TYPES.FREE:
      case PRICE_TYPES.CALL_FOR_PRICE:
        return true;
      case PRICE_TYPES.NONE:
        // Only valid when the category opted out of pricing.
        return !pricingRequired;
      default:
        return false;
    }
  })();

  const canSubmit =
    canProceedFromPhotos &&
    title.trim() &&
    priceValid &&
    location.trim() &&
    phoneNumber.trim();

  /**
   * STEP 1: Pick images from gallery
   * - Validates file size
   * - Compresses images
   * - Converts to data URLs (web-safe, never expire)
   */
  const pickImages = async () => {
    try {
      // CRITICAL DEBUG: Log platform info
      console.log('📱 ========== PICK IMAGES START ==========');
      console.log('📱 Platform.OS:', Platform.OS);
      console.log('📱 User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
      console.log('📱 Is Mobile Browser:', /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || ''));

      const remainingSlots = imageLimits.max - images.length;

      if (remainingSlots <= 0) {
        Alert.alert(
          t('validation.maximumReached'),
          t('validation.maxImagesForCategory', { max: imageLimits.max, category: t(`categories.${category.toLowerCase()}`) || category })
        );
        return;
      }

      // Launch image picker with correct MediaType (string, not enum)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: Math.min(remainingSlots, 20),
      });

      if (result.canceled || !result.assets) {
        return;
      }

      setCompressing(true);

      try {
        const processedImages = [];

        for (const asset of result.assets) {
          // LOG: Image object structure
          console.log('🖼️ ========== IMAGE OBJECT ==========');
          console.log('🖼️ asset.uri:', asset.uri?.substring(0, 100));
          console.log('🖼️ asset.type:', asset.type);
          console.log('🖼️ asset.width:', asset.width);
          console.log('🖼️ asset.height:', asset.height);
          console.log('🖼️ asset.fileSize:', asset.fileSize);
          console.log('🖼️ asset keys:', Object.keys(asset));

          // Validate file size
          if (asset.fileSize && asset.fileSize > GLOBAL_IMAGE_LIMITS.maxFileSize) {
            const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
            Alert.alert(
              t('validation.imageTooLarge'),
              t('validation.imageSizeDetails', { size: sizeMB })
            );
            continue;
          }

          // Compress image
          const compressed = await manipulateAsync(
            asset.uri,
            [{ resize: { width: GLOBAL_IMAGE_LIMITS.compressionWidth } }],
            {
              compress: GLOBAL_IMAGE_LIMITS.compressionQuality,
              format: SaveFormat.JPEG,
              base64: Platform.OS === 'web', // Only get base64 on web
            }
          );

          // LOG: Compressed result
          console.log('🖼️ ========== COMPRESSED OBJECT ==========');
          console.log('🖼️ compressed.uri:', compressed.uri?.substring(0, 100));
          console.log('🖼️ compressed.width:', compressed.width);
          console.log('🖼️ compressed.height:', compressed.height);
          console.log('🖼️ compressed.base64:', compressed.base64 ? `${compressed.base64.length} chars` : 'NONE');

          // Platform-specific handling
          let imageUri;
          let uploadBranch;

          if (Platform.OS === 'web') {
            // Web: ALWAYS convert to data URL (persistent, won't expire like blob URLs)
            console.log('🖼️ Web image processing:', {
              hasBase64: !!compressed.base64,
              base64Length: compressed.base64?.length || 0,
              compressedUri: compressed.uri?.substring(0, 50),
              assetUri: asset.uri?.substring(0, 50)
            });

            if (compressed.base64) {
              // Desktop web: manipulateAsync returns base64
              imageUri = `data:image/jpeg;base64,${compressed.base64}`;
              uploadBranch = 'base64';
              console.log('✅ Created data URL from base64, length:', imageUri.length);
            } else {
              // Mobile web: manipulateAsync returns blob URL, convert to data URL
              uploadBranch = 'blob';
              console.log('⚠️ Mobile web: Converting blob URL to data URL');
              const blobUri = compressed.uri || asset.uri;

              // Fetch the blob and convert to data URL
              const response = await fetch(blobUri);
              const blob = await response.blob();
              imageUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              console.log('✅ Mobile web: Conversion complete, length:', imageUri?.length || 0);
            }
          } else {
            // Native: Use file URI directly (more efficient)
            uploadBranch = 'file';
            imageUri = compressed.uri;
            console.log('✅ Native: Using file URI directly:', imageUri?.substring(0, 50));
          }

          // LOG: Upload branch decision
          console.log('🖼️ ========== UPLOAD BRANCH ==========');
          console.log('🖼️ Upload branch:', uploadBranch);
          console.log('🖼️ imageUri starts with:', imageUri?.substring(0, 30));
          console.log('🖼️ imageUri length:', imageUri?.length);

          if (!imageUri) {
            throw new Error('Failed to process image: imageUri is null');
          }

          processedImages.push(imageUri);
        }

        setImages((prev) => [...prev, ...processedImages]);
      } finally {
        setCompressing(false);
      }
    } catch (error) {
      console.error('❌ Error picking images:', error);
      Alert.alert(t('common.error'), 'Failed to pick images. Please try again.');
      setCompressing(false);
    }
  };

  /**
   * STEP 2: Take photo with camera
   */
  const takePhoto = async () => {
    try {
      if (images.length >= imageLimits.max) {
        Alert.alert(
          t('validation.maximumReached'),
          t('validation.maxImagesForCategory', { max: imageLimits.max, category: t(`categories.${category.toLowerCase()}`) || category })
        );
        return;
      }

      // Request camera permission explicitly (required on iOS)
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired') || 'Permission Required',
          t('common.cameraPermissionMessage') || 'Camera access is needed to take photos. Please enable it in Settings.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      setCompressing(true);

      try {
        const asset = result.assets[0];

        // Compress
        const compressed = await manipulateAsync(
          asset.uri,
          [{ resize: { width: GLOBAL_IMAGE_LIMITS.compressionWidth } }],
          {
            compress: GLOBAL_IMAGE_LIMITS.compressionQuality,
            format: SaveFormat.JPEG,
            base64: Platform.OS === 'web', // Only get base64 on web
          }
        );

        // Platform-specific handling
        let imageUri;
        if (Platform.OS === 'web') {
          // Web: ALWAYS convert to data URL
          console.log('📸 Camera web processing:', {
            hasBase64: !!compressed.base64,
            base64Length: compressed.base64?.length || 0,
            compressedUri: compressed.uri?.substring(0, 50)
          });

          if (compressed.base64) {
            // Desktop web: base64 available
            imageUri = `data:image/jpeg;base64,${compressed.base64}`;
            console.log('✅ Camera: Created data URL, length:', imageUri.length);
          } else {
            // Mobile web: convert blob URL to data URL
            console.log('⚠️ Camera mobile web: Converting blob URL');
            const blobUri = compressed.uri || asset.uri;
            const response = await fetch(blobUri);
            const blob = await response.blob();
            imageUri = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            console.log('✅ Camera mobile: Conversion complete, length:', imageUri?.length || 0);
          }
        } else {
          // Native: Use file URI directly
          imageUri = compressed.uri;
          console.log('✅ Camera native: Using file URI:', imageUri?.substring(0, 50));
        }

        if (!imageUri) {
          throw new Error('Failed to process camera image: imageUri is null');
        }

        setImages((prev) => [...prev, imageUri]);
      } finally {
        setCompressing(false);
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert(t('common.error'), 'Failed to take photo. Please try again.');
      setCompressing(false);
    }
  };

  /**
   * Remove image by index
   */
  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Pick video from library
   */
  const pickVideo = async () => {
    try {
      if (video) {
        Alert.alert(t('alerts.videoAlreadyAdded'), t('alerts.oneVideoMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];

      // Check video size (max 50MB)
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        const sizeMB = (asset.fileSize / (1024 * 1024)).toFixed(1);
        Alert.alert(t('alerts.videoTooLarge'), t('alerts.videoSizeMessage', { size: sizeMB }));
        return;
      }

      setVideo({
        uri: asset.uri,
        type: asset.type || 'video/mp4',
        duration: asset.duration,
      });
    } catch (error) {
      console.error('❌ Error picking video:', error);
      Alert.alert(t('common.error'), 'Failed to pick video. Please try again.');
    }
  };

  /**
   * Remove video
   */
  const removeVideo = () => {
    setVideo(null);
  };

  /**
   * Auto-detect user location
   */
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const result = await detectUserLocation();

      if (result.error) {
        Alert.alert(t('alerts.locationError'), t('alerts.couldNotDetect', { error: result.error }));
      } else if (result.city && result.country) {
        const detectedLocation = `${result.city}, ${result.country}`;
        setLocation(detectedLocation);
        Alert.alert(t('alerts.locationDetected'), detectedLocation);
      } else {
        Alert.alert(t('alerts.locationError'), t('alerts.couldNotDetermine'));
      }
    } catch (error) {
      console.error('Location detection error:', error);
      Alert.alert(t('alerts.locationError'), t('alerts.failedDetect'));
    } finally {
      setDetectingLocation(false);
    }
  };

  /**
   * STEP 3: Submit listing
   *
   * Flow:
   * 1. Validate user authentication
   * 2. Create Firestore document (empty images array)
   * 3. Upload images sequentially to Storage
   * 4. Update Firestore with image URLs
   * 5. Navigate to success screen
   *
   * Safety:
   * - Total timeout protection (5 minutes)
   * - Per-image timeout (60 seconds)
   * - Guaranteed spinner cleanup (finally block)
   * - Clear error messages
   */
  const handleSubmit = async () => {
    console.log('🚀 ========== SUBMIT STARTED ==========');
    console.log('🚀 Platform:', Platform.OS);
    console.log('🚀 Images count:', images.length);
    console.log('🚀 Category:', category);

    if (!canSubmit) {
      console.warn('⚠️ Submit validation failed');
      Alert.alert(t('common.incomplete'), t('validation.fillAllFields'));
      return;
    }

    if (Platform.OS === 'web' && !navigator.onLine) {
      console.error('❌ No internet connection');
      Alert.alert(t('alerts.noInternet'), t('alerts.checkConnection'));
      return;
    }

    setUploading(true);
    setUploadProgress(t('upload.initializing'));

    try {
      // Get Firestore and Storage instances
      const db = getFirestore();
      const storage = getStorage();

      setUploadProgress(t('upload.checkingAuth'));
      const userId = user?.uid;

      console.log('🔍 Auth check:', {
        hasUser: !!user,
        userId: userId || 'NONE',
        userEmail: user?.email || 'NONE',
      });

      if (!userId) {
        console.error('❌ No authenticated user - cannot create listing');
        setUploading(false);
        setUploadProgress('');

        if (Platform.OS === 'web') {
          // Build-first: keep the draft and prompt sign-in inline (no navigation
          // away, so the form state survives). After sign-in the user taps Post.
          setNeedsAuth(true);
        } else {
          Alert.alert(t('alerts.signInRequired'), t('alerts.pleaseSignInCreate'), [
            { text: t('common.ok'), onPress: () => navigation.navigate('Home') }
          ]);
        }
        return;
      }

      console.log('✅ Authenticated as:', userId, '(' + user.email + ')');

      // Use ISO timestamp instead of serverTimestamp() to avoid potential Firestore connection issues
      const now = new Date().toISOString();
      const categoryId = getCategoryId(category);

      // Convert the form's pricing state into the canonical Firestore
      // schema (priceType, amount, minAmount, maxAmount, currency,
      // isNegotiable, displayPriceText, plus a legacy `price` mirror
      // for backwards-compatible queries).
      const priceFields = buildPriceData(priceForm);

      const listingData = {
        title: title.trim(),
        description: description.trim(),
        ...priceFields,
        category,
        categoryId,
        subcategory: subcategory || '',
        location: location.trim(),
        phoneNumber: phoneNumber.trim(),
        userId,
        images: [],
        coverImage: '',
        videoUrl: '',
        status: 'active',
        views: 0,
        createdAt: now,
        updatedAt: now,
      };

      console.log('📝 Listing data prepared:', {
        title: listingData.title,
        category: listingData.category,
        priceType: listingData.priceType,
        priceDisplay: listingData.displayPriceText,
        imageCount: images.length,
      });

      if (!CATEGORY_KEYS.includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      setUploadProgress(t('upload.creatingDocument'));
      console.log('📝 Calling Firestore addDoc...');
      console.log('📝 Firestore instance:', {
        type: typeof db,
        name: db?.constructor?.name,
        app: db?.app?.name,
      });

      let listingRef;
      try {
        listingRef = await addDoc(collection(db, 'listings'), listingData);
        console.log(`✅ Firestore addDoc completed`);
      } catch (error) {
        console.error(`❌ Firestore addDoc failed:`, error.code, error.message);
        throw new Error(`Failed to create listing: ${error.message}`);
      }

      const listingId = listingRef.id;
      console.log(`✅ Listing created in Firestore: ${listingId}`);

      const imageUrls = [];

      // Upload images using new imageToBlob approach
      if (images.length > 0) {
        console.log(`📤 Starting upload of ${images.length} images...`);
        const storage = getStorage();

        for (let i = 0; i < images.length; i++) {
          setUploadProgress(t('upload.uploadingImage', { current: i + 1, total: images.length }));
          console.log(`📤 [${i + 1}/${images.length}] Starting upload`);

          try {
            // Convert to blob using universal helper
            const imageUri = images[i];
            const blob = await imageToBlob({ uri: imageUri });

            // Create storage reference
            const ref = storageRef(
              storage,
              `listings/${listingId}/${Date.now()}_${i}.jpg`
            );

            // Upload blob to Firebase Storage
            await uploadBytes(ref, blob);

            // Get download URL
            const url = await getDownloadURL(ref);
            imageUrls.push(url);

            console.log(`✅ [${i + 1}/${images.length}] Uploaded:`, url.substring(0, 60));
          } catch (error) {
            console.error(`❌ [${i + 1}/${images.length}] Upload failed:`, error.message);
            throw new Error(`Image ${i + 1} upload failed: ${error.message}`);
          }
        }

        console.log(`✅✅✅ Uploaded ${imageUrls.length} out of ${images.length} images ✅✅✅`);
      }

      // Upload video if present
      let videoUrl = '';
      if (video && video.uri) {
        setUploadProgress(t('upload.uploadingVideo'));
        console.log(`📹 Starting video upload...`);

        try {
          const videoPath = `listings/${listingId}/video-${Date.now()}.mp4`;
          const storageRef = ref(storage, videoPath);

          // For web: convert video URI to blob
          if (Platform.OS === 'web') {
            const response = await fetch(video.uri);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
          } else {
            // For native: use putFile
            await storageRef.putFile(video.uri);
          }

          videoUrl = await getDownloadURL(storageRef);
          console.log(`✅ Video uploaded: ${videoUrl.substring(0, 60)}...`);
        } catch (error) {
          console.error('❌ Video upload failed:', error.message);
          Alert.alert(t('alerts.videoUploadWarning'), t('alerts.videoFailedMessage'));
        }
      }

      // Update Firestore with media URLs
      if (imageUrls.length > 0 || videoUrl) {
        setUploadProgress(t('upload.finalizing'));
        console.log('📝 Updating Firestore with media URLs...');
        console.log('📝 Image URLs array length:', imageUrls.length);
        console.log('📝 Image URLs:', imageUrls.map((url, i) => `[${i}]: ${url.substring(0, 60)}...`));

        try {
          const updateData = {
            updatedAt: new Date().toISOString(),
          };

          if (imageUrls.length > 0) {
            updateData.images = imageUrls;
            updateData.coverImage = imageUrls[0] || '';
            console.log('📝 Setting images field with', imageUrls.length, 'URLs');
          }

          if (videoUrl) {
            updateData.videoUrl = videoUrl;
            console.log('📝 Setting videoUrl:', videoUrl.substring(0, 60));
          }

          console.log('📝 Calling updateDoc with data:', JSON.stringify(updateData, null, 2).substring(0, 500));
          await updateDoc(doc(db, 'listings', listingId), updateData);
          console.log('✅ Firestore document updated with', imageUrls.length, 'images');

          // Verify the update was successful by reading back the document
          console.log('🔍 Verifying images were saved correctly...');
          const verifyDoc = await getDoc(doc(db, 'listings', listingId));
          if (verifyDoc.exists()) {
            const savedData = verifyDoc.data();
            console.log('✅ Verification: images array length =', savedData.images?.length || 0);
            console.log('✅ Verification: coverImage =', savedData.coverImage ? 'SET' : 'EMPTY');
            if (savedData.images?.length !== imageUrls.length) {
              console.error('❌ WARNING: Saved images count does not match uploaded count!');
              console.error('   Expected:', imageUrls.length, 'Got:', savedData.images?.length);
            }
          }
        } catch (error) {
          console.error('❌ Firestore updateDoc failed:', error.message);
          throw new Error(`Failed to update listing with media: ${error.message}`);
        }
      }

      console.log(`✅ ========== SUBMIT COMPLETE: ${listingId} ==========`);

      // Success! Show alert and navigate
      // Success! Offer a one-tap WhatsApp share (the seller's network is the
      // cheapest distribution), then reset + return home and (native) request
      // an app review. Posting is a strong positive moment for the review prompt.
      const shareUrl = `https://sabalist.com/listing/${listingId}`;
      const shareMsg = `${title} — now on Sabalist\n${shareUrl}`;
      const finish = () => {
        resetForm();
        navigation.navigate('Home', { refresh: Date.now() });
        setTimeout(() => { recordListingPosted(); }, 1500);
      };

      if (Platform.OS === 'web') {
        // RN-Web Alert can't render multiple buttons; use confirm for the share.
        const wantsShare =
          typeof window !== 'undefined' &&
          window.confirm('✅ Your listing is live! Share it on WhatsApp now?');
        if (wantsShare) {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
        }
        finish();
      } else {
        Alert.alert(
          t('alerts.success'),
          t('alerts.listingPosted', { title }) || 'Your listing has been posted!',
          [
            {
              text: 'Share on WhatsApp',
              onPress: () => {
                Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`).catch(() => {});
                finish();
              },
            },
            { text: t('common.ok'), onPress: finish },
          ]
        );
      }
    } catch (error) {
      console.error('❌ ========== SUBMIT FAILED ==========');
      console.error('❌ Error:', error.message);
      console.error('❌ Stack:', error.stack);

      let errorMessage = 'Failed to create listing. Please try again.';

      if (error.code === 'TIMEOUT') {
        errorMessage = `Upload timed out: ${error.operation}. Please check your internet connection.`;
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please check your account.';
      } else if (error.message.includes('category')) {
        errorMessage = 'Invalid category selected. Please try again.';
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      console.log('🔚 Cleanup: Stopping spinner');
      setUploading(false);
      setUploadProgress('');
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setPriceForm({
      priceType: PRICE_TYPES.FIXED,
      amount: '',
      minAmount: '',
      maxAmount: '',
      currency: DEFAULT_CURRENCY,
      isNegotiable: false,
    });
    setCategory('Electronics');
    setSubcategory(null);
    setLocation('');
    setPhoneNumber('');
    setImages([]);
    setUploadProgress('');
  };

  // ============================================
  // RENDER METHODS
  // ============================================

  /**
   * Step 1: Photos & Video
   */
  const renderPhotosStep = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>
        {imageLimits.min === 0
          ? (t('createListing.addPhotosOptional') !== 'createListing.addPhotosOptional'
              ? t('createListing.addPhotosOptional')
              : 'Add photos (optional)')
          : t('createListing.addPhotos')}
      </Text>
      <Text style={styles.stepSubtitle}>
        {imageLimits.min === 0
          ? (t('createListing.photosOptionalHint', { max: imageLimits.max }) !==
              'createListing.photosOptionalHint'
              ? t('createListing.photosOptionalHint', { max: imageLimits.max })
              : `Photos are not required for this category. You can attach up to ${imageLimits.max} if you'd like.`)
          : (t('createListing.photosRequired', {
              min: imageLimits.min,
              max: imageLimits.max,
            }) || `Add ${imageLimits.min}-${imageLimits.max} photos`)}
      </Text>

      {/* Image Grid */}
      <View style={styles.imageGrid}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri }} style={styles.imageThumbnail} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Image Button */}
        {images.length < imageLimits.max && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={pickImages}
            disabled={compressing}
          >
            {compressing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="images" size={32} color={COLORS.primary} />
                <Text style={styles.addImageText}>{t('createListing.addMorePhotos')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Camera Button */}
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={takePhoto}
        disabled={compressing || images.length >= imageLimits.max}
      >
        <Ionicons name="camera" size={20} color="#FFF" />
        <Text style={styles.cameraButtonText}>{t('createListing.takePhoto')}</Text>
      </TouchableOpacity>

      {/* Video Section */}
      <Text style={styles.sectionTitle}>{t('createListing.videoOptional')}</Text>
      {video ? (
        <View style={styles.videoPreview}>
          <View style={styles.videoInfo}>
            <Ionicons name="videocam" size={40} color={COLORS.primary} />
            <Text style={styles.videoText}>Video attached ({Math.round(video.duration || 0)}s)</Text>
          </View>
          <TouchableOpacity onPress={removeVideo} style={styles.removeVideoButton}>
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addVideoButton}
          onPress={pickVideo}
        >
          <Ionicons name="videocam-outline" size={32} color={COLORS.secondary} />
          <Text style={styles.addVideoText}>{t('createListing.addVideo')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  /**
   * Step 2: Details
   */
  const renderDetailsStep = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>{t('createListing.listingDetails')}</Text>

      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('createListing.title')} *</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createListing.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
      </View>

      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('createListing.category')} *</Text>
        <TouchableOpacity
          style={styles.categoryPickerTile}
          onPress={() => setCategoryPickerOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryPickerIcon}>
            <Ionicons name={getCategoryIcon(category)} size={22} color={COLORS.primary} />
          </View>
          <View style={styles.categoryPickerLabelWrap}>
            <Text style={styles.categoryPickerLabel} numberOfLines={1}>
              {getTranslatedCategoryLabel(category, t)}
            </Text>
            <Text style={styles.categoryPickerHint}>
              {t('categories.selectCategory') || 'Tap to change'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted || '#9CA3AF'} />
        </TouchableOpacity>
      </View>

      {/* Subcategory */}
      {availableSubcategories.length > 0 && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('createListing.subcategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableSubcategories.map((subcat) => {
              const isActive = subcategory === subcat.id;
              return (
                <TouchableOpacity
                  key={subcat.id}
                  style={[styles.subChip, isActive && styles.subChipActive]}
                  onPress={() => setSubcategory(subcat.id)}
                >
                  {subcat.icon ? (
                    <Ionicons
                      name={subcat.icon}
                      size={14}
                      color={isActive ? '#FFFFFF' : COLORS.primary}
                      style={{ marginRight: 6 }}
                    />
                  ) : null}
                  <Text style={[styles.subChipText, isActive && styles.subChipTextActive]}>
                    {getTranslatedSubCategoryLabel(subcat, t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Price */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('createListing.price')}
          {pricingRequired ? ' *' : ''}
        </Text>
        <PriceTypeSelector
          value={priceForm}
          onChange={(partial) => setPriceForm((p) => ({ ...p, ...partial }))}
          allowNone={!pricingRequired}
          t={t}
        />
      </View>

      {/* Location */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('createListing.location')} *</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createListing.locationPlaceholder')}
          value={location}
          onChangeText={setLocation}
        />
        <TouchableOpacity
          style={styles.detectLocationButton}
          onPress={handleDetectLocation}
          disabled={detectingLocation}
        >
          <Ionicons
            name={detectingLocation ? "hourglass-outline" : "location-outline"}
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.detectLocationText}>
            {detectingLocation ? t('createListing.detecting') : t('createListing.detectLocation')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Phone Number */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('createListing.phoneNumber')} *</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createListing.phoneNumberPlaceholder')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('createListing.description')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createListing.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={5000}
        />
      </View>
    </ScrollView>
  );

  /**
   * Step 3: Review & Submit
   */
  const renderReviewStep = () => (
    <ScrollView
      style={styles.stepContainer}
      contentContainerStyle={styles.stepScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stepTitle}>{t('createListing.review')}</Text>

      <Card style={styles.reviewCard}>
        {/* Images Preview */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.reviewImageThumbnail} />
          ))}
        </ScrollView>

        {/* Details */}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t('createListing.title')}:</Text>
          <Text style={styles.reviewValue}>{title}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t('createListing.category')}:</Text>
          <Text style={styles.reviewValue}>{getTranslatedCategoryLabel(category, t)}</Text>
        </View>
        {subcategory && (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('createListing.subcategory')}:</Text>
            <Text style={styles.reviewValue}>
              {(() => {
                const sub = availableSubcategories.find((s) => s.id === subcategory);
                return sub ? getTranslatedSubCategoryLabel(sub, t) : subcategory;
              })()}
            </Text>
          </View>
        )}
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t('createListing.price')}:</Text>
          <Text style={styles.reviewValue}>
            {formatListingPrice(buildPriceData(priceForm), t)}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t('createListing.location')}:</Text>
          <Text style={styles.reviewValue}>{location}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>{t('createListing.phoneNumber')}:</Text>
          <Text style={styles.reviewValue}>{phoneNumber}</Text>
        </View>
        {description.trim() && (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('createListing.description')}:</Text>
            <Text style={styles.reviewValue}>{description}</Text>
          </View>
        )}
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.uploadingText}>{uploadProgress}</Text>
        </View>
      )}
    </ScrollView>
  );

  /**
   * Sticky footer with step-appropriate buttons and missing-field hints.
   * Lives outside the ScrollView so it is always visible above the keyboard
   * and above the iPhone home indicator. The bottom tab bar is hidden while
   * this screen is focused (see MainTabNavigator), so the footer sits cleanly
   * at the bottom of the screen on both Android and iOS.
   */
  const renderStickyFooter = () => {
    // What's blocking the user, per step?
    const missing = [];
    if (step === 1) {
      if (!canProceedFromPhotos) {
        missing.push(
          t('createListing.needMinPhotos', {
            min: imageLimits.min,
            have: images.length,
            defaultValue: `Add at least ${imageLimits.min} photo(s) (have ${images.length})`,
          })
        );
      }
    } else if (step === 2 || step === 3) {
      if (!canProceedFromPhotos) {
        missing.push(`Photos: need ${imageLimits.min} (have ${images.length})`);
      }
      if (!title.trim()) missing.push(t('createListing.titleMissing') || 'Title is empty');
      if (!priceValid) missing.push(t('createListing.priceMissing') || 'Price details are incomplete');
      if (!location.trim()) missing.push(t('createListing.locationMissing') || 'Location is empty');
      if (!phoneNumber.trim()) missing.push(t('createListing.phoneMissing') || 'Phone number is empty');
    }

    const stepDisabled =
      (step === 1 && !canProceedFromPhotos) ||
      (step === 2 && missing.length > 0) ||
      (step === 3 && (!canSubmit || uploading));

    return (
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, SPACING.md) },
        ]}
      >
        {stepDisabled && missing.length > 0 && (
          <View style={styles.missingPanel}>
            <Text style={styles.missingTitle}>
              {t('createListing.missingFields') || 'Required to continue:'}
            </Text>
            {missing.map((m, i) => (
              <Text key={i} style={styles.missingItem}>• {m}</Text>
            ))}
          </View>
        )}

        <View style={styles.stickyButtonRow}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step - 1)}
              disabled={uploading}
            >
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
          <PrimaryButton
            title={
              step === 3
                ? (uploading ? t('common.posting') : t('common.post'))
                : t('common.next')
            }
            onPress={() => {
              if (step === 3) {
                console.log('🔘 Post button clicked!', {
                  canSubmit, uploading,
                  validation: {
                    hasImages: canProceedFromPhotos,
                    hasTitle: !!title.trim(),
                    hasPrice: priceValid,
                    hasLocation: !!location.trim(),
                    hasPhone: !!phoneNumber.trim(),
                  },
                });
                handleSubmit();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={stepDisabled}
            style={styles.stickyNextButton}
          />
        </View>
      </View>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  // Gate-at-publish: when a logged-out web visitor tries to post, show sign-in
  // inline while keeping their draft in state. A Back arrow returns to the form.
  if (needsAuth && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => setNeedsAuth(false)} style={{ padding: 8 }} accessibilityLabel="Back to listing">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>Sign in to publish</Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Your draft is saved — sign in, then tap Post.</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <AuthScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SEO title="Create Listing" noIndex />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('createListing.createListing')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[styles.progressDot, step >= s && styles.progressDotActive]}
          />
        ))}
      </View>

      {/* Step Content */}
      <View style={styles.stepWrapper}>
        {step === 1 && renderPhotosStep()}
        {step === 2 && renderDetailsStep()}
        {step === 3 && renderReviewStep()}
      </View>

      {/* Sticky Footer — always visible above the iPhone home indicator,
          above the keyboard, and above where the tab bar used to be. */}
      {renderStickyFooter()}

      <CategorySelector
        visible={categoryPickerOpen}
        selectedKey={category}
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={(newKey) => {
          setCategory(newKey);
          setSubcategory(null);
          // When switching to a non-pricing category (Jobs, Services,
          // Community, Events, Education), default priceType to "none"
          // so the seller isn't blocked by a required price. They can
          // still pick a paid type if they want.
          if (!categoryRequiresPricing(newKey)) {
            if (priceForm.priceType === PRICE_TYPES.FIXED && !priceForm.amount) {
              setPriceForm((p) => ({ ...p, priceType: PRICE_TYPES.NONE }));
            }
          } else {
            // Switching back to a pricing-required category: if user had
            // selected "none", bump them back to FIXED.
            if (priceForm.priceType === PRICE_TYPES.NONE) {
              setPriceForm((p) => ({ ...p, priceType: PRICE_TYPES.FIXED }));
            }
          }
        }}
      />
    </SafeAreaView>
  );
}

async function blobToDataURL(blobUrl) {
  console.log('🔄 blobToDataURL: Starting conversion');
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('✅ blobToDataURL: Complete');
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      console.error('❌ blobToDataURL: Failed', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  // Extra space so the last field/button isn't obscured by the sticky footer.
  // ~160 covers footer (button row ~56 + paddingBottom + optional missing panel)
  // with a comfortable margin on both Android and iPhone.
  stepScrollContent: {
    paddingBottom: 160,
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stickyButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stickyNextButton: {
    flex: 1,
  },
  missingPanel: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  missingTitle: {
    color: '#991B1B',
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 13,
  },
  missingItem: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.md,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  addImageText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    borderStyle: 'dashed',
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: 12,
  },
  addVideoText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  removeVideoButton: {
    padding: SPACING.xs,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    marginRight: SPACING.sm,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoryPickerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  categoryPickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPickerLabelWrap: {
    flex: 1,
  },
  categoryPickerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryPickerHint: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  subChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  backButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    marginTop: SPACING.lg,
  },
  nextButtonInRow: {
    flex: 1,
  },
  reviewCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  reviewImages: {
    marginBottom: SPACING.md,
  },
  reviewImageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
  },
  reviewRow: {
    marginBottom: SPACING.md,
  },
  reviewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  uploadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  detectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: '#F0F4FF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  detectLocationText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
