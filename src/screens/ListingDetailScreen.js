import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import AppHeader from '../components/AppHeader';

// Platform-aware Firebase imports
let auth, getListing, deleteListing, markListingAsSold, reactivateListing, incrementListingViews;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  const listingsWeb = require('../services/listings.web');
  auth = firebaseWeb.auth;
  getListing = listingsWeb.getListingById;
  deleteListing = listingsWeb.deleteListing;
  markListingAsSold = listingsWeb.markListingAsSold;
  reactivateListing = listingsWeb.reactivateListing;
  incrementListingViews = listingsWeb.incrementListingViews;
} else {
  const firebaseNative = require('../lib/firebase');
  const listingsNative = require('../services/listings');
  auth = firebaseNative.auth;
  getListing = listingsNative.getListing;
  deleteListing = listingsNative.deleteListing;
  markListingAsSold = listingsNative.markListingAsSold;
  reactivateListing = listingsNative.reactivateListing;
  incrementListingViews = listingsNative.incrementListingViews;
}

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const currentUser = Platform.OS === 'web' ? auth.currentUser : auth().currentUser;
  const isOwner = listing && currentUser && listing.userId === currentUser.uid;

  useEffect(() => {
    loadListing();
  }, [listingId]);

  useEffect(() => {
    if (listing && !isOwner) {
      incrementListingViews(listingId);
    }
  }, [listing, isOwner]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const data = await getListing(listingId);
      setListing(data);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert(t('common.error'), t('errors.failedToLoadListing'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('alerts.deleteListing'),
      t('common.areYouSure'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(listingId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('alerts.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleMarkAsSold = async () => {
    try {
      if (listing.status === 'sold') {
        await reactivateListing(listingId);
      } else {
        await markListingAsSold(listingId);
      }
      loadListing();
    } catch (error) {
      Alert.alert(t('common.error'), t('alerts.failedToUpdate'));
    }
  };

  const handleContact = () => {
    if (listing.phoneNumber) {
      Alert.alert(t('contact.title'), listing.phoneNumber);
    } else {
      Alert.alert(t('alerts.info'), t('alerts.noContactInfo'));
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price || price === 0) return 'Price on call';
    return `${currency} ${Number(price).toLocaleString()}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.accent} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const images = listing.images || [];
  const hasImages = images.length > 0;

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} />

      {/* Action Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={PREMIUM_COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color={PREMIUM_COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {hasImages ? (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {images.map((uri, index) => {
                // Add cache-busting for mobile browsers
                let imageUri = uri;
                if (uri && uri.startsWith('http')) {
                  const timestamp = listing?.updatedAt || listing?.createdAt || Date.now();
                  const cacheKey = typeof timestamp === 'string' ? timestamp : timestamp.toMillis?.() || timestamp;
                  const separator = uri.includes('?') ? '&' : '?';
                  imageUri = `${uri}${separator}v=${cacheKey}`;
                }

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.9}
                    style={styles.imageContainer}
                    onPress={() => {
                      setViewerImageIndex(index);
                      setImageViewerVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: imageUri, cache: 'reload' }}
                      style={styles.image}
                      key={imageUri}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.pagination}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color={PREMIUM_COLORS.muted} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Main Card */}
          <View style={styles.mainCard}>
            <Text style={styles.price}>{formatPrice(listing.price, listing.currency)}</Text>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag" size={16} color={PREMIUM_COLORS.accent} />
                <Text style={styles.metaText}>{listing.category || 'General'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location" size={16} color={PREMIUM_COLORS.accent} />
                <Text style={styles.metaText}>{listing.location || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color={PREMIUM_COLORS.muted} />
                <Text style={styles.metaText}>{formatDate(listing.createdAt)}</Text>
              </View>
              {listing.views > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="eye" size={16} color={PREMIUM_COLORS.muted} />
                  <Text style={styles.metaText}>{listing.views} views</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.descCard}>
              <Text style={styles.cardTitle}>Description</Text>
              <Text style={styles.descText}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Contact Button */}
          {!isOwner && listing.status !== 'sold' && (
            <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Seller</Text>
            </TouchableOpacity>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <TouchableOpacity
              style={[
                styles.ownerButton,
                listing.status === 'sold' && styles.reactivateButton
              ]}
              onPress={handleMarkAsSold}
            >
              <Ionicons
                name={listing.status === 'sold' ? "refresh-outline" : "checkmark-circle-outline"}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.ownerButtonText}>
                {listing.status === 'sold' ? 'Reactivate' : 'Mark as Sold'}
              </Text>
            </TouchableOpacity>
          )}

          {listing.status === 'sold' && (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.soldBannerText}>SOLD</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Viewer */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: viewerImageIndex * width, y: 0 }}
          >
            {images.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.bg,
  },
  errorText: {
    fontSize: 16,
    color: PREMIUM_COLORS.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PREMIUM_SPACING.base,
    paddingVertical: PREMIUM_SPACING.md,
    backgroundColor: PREMIUM_COLORS.card,
    ...PREMIUM_SHADOWS.card,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: PREMIUM_SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    position: 'relative',
  },
  imageContainer: {
    width: width,
    height: 300,
  },
  image: {
    width: width,
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  pagination: {
    position: 'absolute',
    bottom: PREMIUM_SPACING.base,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  noImageContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: PREMIUM_SPACING.lg,
  },
  mainCard: {
    backgroundColor: PREMIUM_COLORS.card,
    borderRadius: PREMIUM_RADIUS.lg,
    padding: PREMIUM_SPACING.lg,
    marginBottom: PREMIUM_SPACING.base,
    ...PREMIUM_SHADOWS.card,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
    color: PREMIUM_COLORS.accent,
    marginBottom: PREMIUM_SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginBottom: PREMIUM_SPACING.base,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    gap: PREMIUM_SPACING.base,
    marginBottom: PREMIUM_SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: PREMIUM_COLORS.muted,
  },
  descCard: {
    backgroundColor: PREMIUM_COLORS.card,
    borderRadius: PREMIUM_RADIUS.lg,
    padding: PREMIUM_SPACING.lg,
    marginBottom: PREMIUM_SPACING.base,
    ...PREMIUM_SHADOWS.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginBottom: PREMIUM_SPACING.sm,
  },
  descText: {
    fontSize: 15,
    color: PREMIUM_COLORS.muted,
    lineHeight: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_COLORS.accent,
    paddingVertical: PREMIUM_SPACING.base,
    borderRadius: PREMIUM_RADIUS.lg,
    gap: PREMIUM_SPACING.sm,
    marginTop: PREMIUM_SPACING.base,
    ...PREMIUM_SHADOWS.button,
  },
  contactButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: PREMIUM_SPACING.base,
    borderRadius: PREMIUM_RADIUS.lg,
    gap: PREMIUM_SPACING.sm,
    marginTop: PREMIUM_SPACING.base,
  },
  reactivateButton: {
    backgroundColor: '#10B981',
  },
  ownerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: PREMIUM_SPACING.md,
    borderRadius: PREMIUM_RADIUS.lg,
    gap: PREMIUM_SPACING.sm,
    marginTop: PREMIUM_SPACING.base,
  },
  soldBannerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  imageViewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: width,
    height: '100%',
  },
});
