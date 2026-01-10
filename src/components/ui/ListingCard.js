import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM_COLORS, PREMIUM_RADIUS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../../theme/premiumTheme';

export default function ListingCard({
  listing,
  onPress,
  onFavorite,
  style,
  ...props
}) {
  const { title, price, currency = 'USD', location, coverImage, images, updatedAt, createdAt } = listing;
  let imageUri = coverImage || (images && images[0]);

  // Add cache-busting for mobile browsers (Safari aggressive caching)
  if (imageUri && imageUri.startsWith('http')) {
    // Use listing timestamp for consistent cache-busting
    const timestamp = updatedAt || createdAt || Date.now();
    const cacheKey = typeof timestamp === 'string' ? timestamp : timestamp.toMillis?.() || timestamp;
    const separator = imageUri.includes('?') ? '&' : '?';
    imageUri = `${imageUri}${separator}v=${cacheKey}`;
  }

  const formatPrice = () => {
    if (!price || price === 0) return 'Price on call';
    return `${currency} ${Number(price).toLocaleString()}`;
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
          key={imageUri} // Force re-render when image URI changes
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
  },
  image: {
    width: '100%',
    height: '100%',
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
