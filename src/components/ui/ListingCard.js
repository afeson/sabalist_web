import { View, Image, Text, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';
import { formatListingPrice } from '../../lib/pricing';
import { normalizeListingImages, withCacheBuster } from '../../lib/listingImages';

const isWeb = Platform.OS === 'web';

// Android phones (< 600dp wide) need compact card metrics so the 2-up
// grid doesn't overflow horizontally. Tablets and iOS keep the previous
// numbers — phone-only tightening, no cross-platform redesign.
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_ANDROID_PHONE = Platform.OS === 'android' && SCREEN_WIDTH < 600;
// Compact marketplace card (Facebook Marketplace / Mercari style): ~25% shorter
// than before — smaller image, tighter padding, 2-line title. All functionality
// (price, title, location, favorite, badges) preserved.
const CARD_IMAGE_HEIGHT = IS_ANDROID_PHONE ? 92 : 104;
const CARD_PRICE_SIZE = IS_ANDROID_PHONE ? 15 : 16;
const CARD_TITLE_SIZE = IS_ANDROID_PHONE ? 12.5 : 13;
const CARD_TITLE_LINE = IS_ANDROID_PHONE ? 16 : 17;
const CARD_TITLE_MIN_H = IS_ANDROID_PHONE ? 30 : 32;
const CARD_LOCATION_SIZE = IS_ANDROID_PHONE ? 11 : 11.5;
const CARD_CONTENT_PAD = PREMIUM_SPACING.sm;

// v3.1.0 - CLICKABLE heart icon on web + mobile
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onFavoriteToggle,
  style,
  ...props
}) {
  const { t } = useTranslation();
  const { title, location, updatedAt, createdAt } = listing;
  // Normalize across legacy image field names (coverImage, image,
  // imageUrl, images[], photos[], media[], thumbnail, photo). If a
  // valid URL exists we render it; the bundled placeholder is only used
  // when nothing valid is found.
  const { uri: primaryImage } = normalizeListingImages(listing);
  const imageUri = withCacheBuster(
    primaryImage,
    updatedAt || createdAt || Date.now()
  );

  // formatListingPrice handles all price types (fixed, range, free,
  // call-for-price, negotiable, none) plus legacy listings that only
  // have {price, currency}. See src/lib/pricing.js.
  const formatPrice = () => formatListingPrice(listing, t);

  const handleHeartPress = (e) => {
    // Stop all event propagation
    if (e) {
      e.stopPropagation && e.stopPropagation();
      e.preventDefault && e.preventDefault();
      e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
    }
    console.log('❤️ Heart pressed for listing:', listing.id, '| isFavorited:', isFavorited, '| has onFavoriteToggle:', !!onFavoriteToggle);
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, !isFavorited);
    } else {
      console.warn('❤️ No onFavoriteToggle handler passed to ListingCard');
    }
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Web: Use native button element for guaranteed clickability
  if (isWeb) {
    return (
      <div style={{ position: 'relative' }} {...props}>
        {/* Card - clickable */}
        <div
          onClick={handleCardPress}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}
        >
          {/* Image */}
          <div style={{ width: '100%', height: CARD_IMAGE_HEIGHT, backgroundColor: '#F3F4F6', position: 'relative' }}>
            <img
              src={imageUri || require('../../../assets/sabalist_app_icon_1024.png')}
              alt={title || 'Listing image'}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.price}>{formatPrice()}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title || 'Listing'}
            </Text>
            <View style={styles.meta}>
              <Ionicons name="location-sharp" size={12} color={PREMIUM_COLORS.muted} />
              <Text style={styles.location} numberOfLines={1}>
                {location || 'Location'}
              </Text>
            </View>
          </View>
        </div>

        {/* Heart button - native HTML button */}
        <button
          type="button"
          onClick={handleHeartPress}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 99999,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            outline: 'none',
          }}
        >
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={18}
            color={isFavorited ? "#FF3B30" : "#FFFFFF"}
          />
        </button>
      </div>
    );
  }

  // Mobile: React Native components
  return (
    <View style={[styles.cardWrapper, style]} {...props}>
      <Pressable
        style={styles.card}
        onPress={handleCardPress}
      >
        <View style={styles.imageSection}>
          <Image
            source={
              imageUri
                ? { uri: imageUri, cache: 'reload' }
                : require('../../../assets/sabalist_app_icon_1024.png')
            }
            style={styles.image}
            resizeMode="cover"
            key={imageUri}
            accessibilityLabel={title || 'Listing image'}
            onError={(e) => {
              console.warn(
                '🖼️ ListingCard image failed to load:',
                listing?.id,
                imageUri,
                e?.nativeEvent?.error
              );
            }}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.price}>{formatPrice()}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title || 'Listing'}
          </Text>
          <View style={styles.meta}>
            <Ionicons name="location-sharp" size={12} color={PREMIUM_COLORS.muted} />
            <Text style={styles.location} numberOfLines={1}>
              {location || 'Location'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Heart button - Pressable for mobile */}
      <Pressable
        style={styles.favoriteButton}
        onPress={handleHeartPress}
        hitSlop={10}
      >
        <View style={styles.heartCircle}>
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={18}
            color={isFavorited ? "#FF3B30" : "#FFFFFF"}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
  },
  card: {
    backgroundColor: PREMIUM_COLORS.card,
    borderRadius: PREMIUM_RADIUS.lg,
    overflow: 'hidden',
    ...PREMIUM_SHADOWS.card,
  },
  imageSection: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 9999,
    elevation: 10,
  },
  heartCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: CARD_CONTENT_PAD,
  },
  price: {
    fontSize: CARD_PRICE_SIZE,
    fontWeight: '800',
    color: PREMIUM_COLORS.accent,
    marginBottom: 2,
  },
  title: {
    fontSize: CARD_TITLE_SIZE,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginBottom: PREMIUM_SPACING.xs,
    lineHeight: CARD_TITLE_LINE,
    minHeight: CARD_TITLE_MIN_H,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: CARD_LOCATION_SIZE,
    color: PREMIUM_COLORS.muted,
    flex: 1,
  },
});
