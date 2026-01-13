import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';

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

  const handleFavoritePress = (e) => {
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, !isFavorited);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      {...props}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
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

        {/* Favorite Heart Button */}
        {onFavoriteToggle && (
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={24}
              color={isFavorited ? "#E50914" : "#FFF"}
              style={styles.favoriteIcon}
            />
          </TouchableOpacity>
        )}
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PREMIUM_COLORS.card,
    borderRadius: PREMIUM_RADIUS.lg,
    overflow: 'hidden',
    ...PREMIUM_SHADOWS.card,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
