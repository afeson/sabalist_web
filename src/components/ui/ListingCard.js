import { View, Image, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';

const isWeb = Platform.OS === 'web';

// v3.1.0 - CLICKABLE heart icon on web + mobile
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onFavoriteToggle,
  style,
  ...props
}) {
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
    // Stop all event propagation
    if (e) {
      e.stopPropagation && e.stopPropagation();
      e.preventDefault && e.preventDefault();
      e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
    }
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, !isFavorited);
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
          <div style={{ width: '100%', height: 130, backgroundColor: '#F3F4F6', position: 'relative' }}>
            <Image
              source={
                imageUri
                  ? { uri: imageUri, cache: 'reload' }
                  : require('../../../assets/sabalist_app_icon_1024.png')
              }
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              key={imageUri}
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
    height: 130,
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
