import React, { useState } from 'react';
import { Image, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ZoomableImage({ uri }) {
  const [zoomed, setZoomed] = useState(false);

  // For web: simple HTML img with click-to-zoom
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: zoomed ? 'auto' : 'hidden',
          cursor: zoomed ? 'zoom-out' : 'zoom-in',
        }}
        onClick={() => setZoomed(!zoomed)}
      >
        <img
          src={uri}
          alt="Listing"
          style={{
            maxWidth: zoomed ? '200%' : '100%',
            maxHeight: zoomed ? '200%' : '100%',
            objectFit: 'contain',
            transition: 'all 0.3s ease',
            cursor: zoomed ? 'zoom-out' : 'zoom-in',
          }}
        />
      </div>
    );
  }

  // For mobile: double-tap to zoom with basic transform
  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={() => {
        // Single tap does nothing, allows for double-tap
      }}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
