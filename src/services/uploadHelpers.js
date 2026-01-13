/**
 * uploadHelpers.js
 * VERSION: 14.0.0 - UNIVERSAL IMAGE TO BLOB
 * ONE function that works everywhere - web, mobile, tablet
 * NEVER uses .path
 * BUILD: Jan-13-2026-01:30
 */

import { Platform } from 'react-native';

console.log('🚀🚀🚀 uploadHelpers.js VERSION 14.0.0 BUILD Jan-13-2026-01:30 🚀🚀🚀');

/**
 * Universal image to blob converter
 * Works on: web (data: and blob: URIs), mobile, tablet
 * NEVER uses .path
 */
export async function imageToBlob(image) {
  console.log('📦 imageToBlob called:', typeof image, image?.uri?.substring(0, 50));

  if (!image?.uri) {
    throw new Error('Invalid image object: missing uri');
  }

  // WEB
  if (Platform.OS === 'web') {
    if (image.uri.startsWith('data:') || image.uri.startsWith('blob:')) {
      console.log('🌐 Web: Fetching', image.uri.substring(0, 30));
      const res = await fetch(image.uri);
      const blob = await res.blob();
      console.log('✅ Blob created:', (blob.size / 1024).toFixed(2), 'KB');
      return blob;
    }
    throw new Error('Unsupported web image URI: ' + image.uri.substring(0, 50));
  }

  // MOBILE / TABLET
  console.log('📱 Mobile/Tablet: Fetching', image.uri.substring(0, 50));
  const res = await fetch(image.uri);
  const blob = await res.blob();
  console.log('✅ Blob created:', (blob.size / 1024).toFixed(2), 'KB');
  return blob;
}
