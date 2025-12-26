import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

/**
 * Listing card for 2-column grid layout
 */
export default function ListingCard({ 
  listing, 
  onPress,
  onFavorite,
  style,
  ...props 
}) {
  const { title, price, currency = 'USD', location, coverImage, images } = listing;
  const imageUri = coverImage || (images && images[0]);

  const formatPrice = () => {
    if (!price || price === 0) return 'Price on call';
    return `${currency} ${Number(price).toLocaleString()}`;
  };

  return (
    <TouchableOpacity 
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={
            imageUri 
              ? { uri: imageUri }
              : require('../../../assets/sabalist_app_icon_1024.png')
          }
          style={styles.image}
          resizeMode="cover"
        />
        {/* Favorite button */}
        {onFavorite && (
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
          >
            <Ionicons name="heart-outline" size={20} color={COLORS.card} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.price}>{formatPrice()}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title || 'Listing'}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={COLORS.textMuted} />
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
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.medium,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.backgroundDark,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.md,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  location: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
});

