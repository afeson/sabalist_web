import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function Logo({ size = 'medium', showTagline = false }) {
  const logoStyles = {
    small: { width: 48, height: 48, fontSize: 16 },
    medium: { width: 100, height: 120, fontSize: 28 },
    large: { width: 120, height: 140, fontSize: 34 },
  };

  const currentSize = logoStyles[size] || logoStyles.medium;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/branding/sabalist-icon-safe.png')}
        style={[styles.logoImage, { width: currentSize.width, height: currentSize.height }]}
        resizeMode="contain"
      />
      {showTagline ? (
        <View style={styles.textContent}>
          <Text style={[styles.brandName, { fontSize: currentSize.fontSize }]}>Sabalist</Text>
          {size !== 'small' && <Text style={styles.tagline}>Buy & Sell across Africa</Text>}
        </View>
      ) : (
        <Text style={[styles.brandNameSolo, { fontSize: currentSize.fontSize }]}>Sabalist</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoImage: {
    // No border radius - preserve price tag shape with transparency
  },
  textContent: {
    justifyContent: 'center',
  },
  brandName: {
    fontWeight: '900',
    color: '#111827',
    lineHeight: 36,
  },
  brandNameSolo: {
    fontWeight: '900',
    color: '#111827',
  },
  tagline: {
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
    fontSize: 15,
  },
});

