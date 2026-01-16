import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';

// v1.9.0 - HEART ICON ALWAYS VISIBLE
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onFavoriteToggle,
  style,
  ...props
}) {
  // DEBUG: Confirm heart will render
  console.log('💛 ListingCard render:', listing?.id, 'fav:', isFavorited);

  const { title, price, currency = 'USD', location, coverImage, images, updatedAt, createdAt } = listing;
  let imageUri = coverImage || (images && images[0]);

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
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, !isFavorited);
    }
  };

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Card pressable area */}
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
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
      </TouchableOpacity>

      {/* HEART ICON - ALWAYS RENDERED - Sibling to card */}
      <TouchableOpacity
        style={styles.favoriteIcon}
        onPress={handleHeartPress}
        activeOpacity={0.7}
        testID="heart-icon"
      >
        <View style={styles.heartBackground}>
          <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
            size={18}
            color={isFavorited ? "#FF3B30" : "#FFFFFF"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  card: {
    backgroundColor: PREMIUM_COLORS.card,
    borderRadius: PREMIUM_RADIUS.lg,
    overflow: 'hidden',
    ...PREMIUM_SHADOWS.card,
  },
  imageSection: {
    width: '100%',
    height: 130,
    backgroundColor: '#F3F4F6',
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
