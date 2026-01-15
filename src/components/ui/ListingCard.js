import { View, Image, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';

// v1.6.0 - HEART ICON FIX - View wrapper for proper positioning context
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onFavoriteToggle,
  style,
  ...props
}) {
  // DEBUG: Log every render
  console.log('🔴 ListingCard RENDER:', listing?.id, 'isFavorited:', isFavorited, 'hasToggle:', !!onFavoriteToggle);

  const { title, price, currency = 'USD', location, coverImage, images, updatedAt, createdAt } = listing;
  let imageUri = coverImage || (images && images[0]);

  // Add cache-busting for mobile browsers
  if (imageUri && imageUri.startsWith('http')) {
    const timestamp = updatedAt || createdAt || Date.now();
    const cacheKey = typeof timestamp === 'string' ? timestamp : timestamp.toMillis?.() || timestamp;
    const separator = imageUri.includes('?') ? '&' : '?';
    imageUri = `${imageUri}${separator}v=${cacheKey}`;
  }

  const formatPrice = () => {
    if (!price || price === 0) return 'Price on call';
    return `${currency} ${Number(price).toLocaleString()}`;
  };

  const handleHeartPress = (e) => {
    if (Platform.OS === 'web') {
      e?.stopPropagation?.();
      e?.preventDefault?.();
    }
    console.log('❤️ Heart PRESSED:', listing?.id, 'newState:', !isFavorited);
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, !isFavorited);
    }
  };

  // DEBUG: Log that heart JSX is being rendered
  console.log('🔴 ListingCard rendering heart icon for:', listing?.id);

  return (
    <View style={[styles.cardWrapper, style]} {...props}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Image container */}
        <View style={styles.imageWrapper}>
          <Image
            source={
              imageUri
                ? { uri: imageUri, cache: 'reload' }
                : require('../../../assets/sabalist_app_icon_1024.png')
            }
            style={styles.image}
            resizeMode="cover"
            key={imageUri}
          />
        </View>

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
      </TouchableOpacity>

      {/* HEART ICON - Outside TouchableOpacity, inside View wrapper for proper absolute positioning */}
      <TouchableOpacity
        style={styles.favoriteIcon}
        onPress={handleHeartPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorited ? "heart" : "heart-outline"}
          size={22}
          color={isFavorited ? "#FF3B30" : "#FFFFFF"}
        />
      </TouchableOpacity>
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
    ...PREMIUM_SHADOWS.card,
  },
  imageWrapper: {
    width: '100%',
    height: 130,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: PREMIUM_RADIUS.lg,
    borderTopRightRadius: PREMIUM_RADIUS.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  content: {
    padding: PREMIUM_SPACING.md,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: PREMIUM_COLORS.accent,
    marginBottom: PREMIUM_SPACING.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginBottom: PREMIUM_SPACING.sm,
    lineHeight: 19,
    minHeight: 38,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: PREMIUM_COLORS.muted,
    flex: 1,
  },
});
