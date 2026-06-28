/**
 * BannerCarousel — renders backend-configured homepage banners (getBanners()).
 * Pure renderer: content (images/links) is data; renders nothing when empty.
 */
import React from 'react';
import { View, Image, FlatList, TouchableOpacity, Linking, StyleSheet, Dimensions, Platform } from 'react-native';
import { getBanners } from '../../config/runtimeConfig';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = Math.min(SCREEN_W - 32, 720);
const BANNER_H = Math.round(BANNER_W * 0.32);

export default function BannerCarousel() {
  const banners = getBanners().filter((b) => b.enabled !== false);
  if (!banners.length) return null;

  const open = (link) => {
    if (!link) return;
    if (/^https?:\/\//.test(link)) Linking.openURL(link).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        data={banners}
        keyExtractor={(b) => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.9} disabled={!item.link} onPress={() => open(item.link)} style={styles.slide}>
            <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8, paddingHorizontal: 16 },
  slide: { width: BANNER_W, marginRight: 12 },
  img: {
    width: BANNER_W,
    height: BANNER_H,
    borderRadius: 14,
    backgroundColor: '#EEE',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
});
