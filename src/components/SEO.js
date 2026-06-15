import React from 'react';
import { Platform } from 'react-native';

// Canonical domain is the primary production host (sabalist.com, served by
// Vercel). The app is also reachable at sabalist.web.app / firebaseapp.com, so
// pointing canonical + OG URLs at sabalist.com consolidates ranking signals
// onto one domain instead of fragmenting them across mirrors.
const BASE_URL = 'https://sabalist.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/web-app-manifest-512x512.png`;

function SEO({ title, description, canonicalUrl, ogImage, ogType = 'website', jsonLd, noIndex = false }) {
  if (Platform.OS !== 'web') {
    return null;
  }

  // Dynamically require react-helmet-async only on web
  const { Helmet } = require('react-helmet-async');

  const fullTitle = title ? `${title} | Sabalist` : 'Sabalist - Buy & Sell across Africa';
  const fullDescription = description || 'Sabalist is Africa\'s marketplace. Buy and sell electronics, vehicles, real estate, fashion and more.';
  const fullCanonical = canonicalUrl ? `${BASE_URL}${canonicalUrl}` : BASE_URL;
  const fullOgImage = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <link rel="canonical" href={fullCanonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content="Sabalist" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}

export default SEO;
