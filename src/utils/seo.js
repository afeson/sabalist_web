// Canonical production domain. Must match the canonical/OG host used in
// src/components/SEO.js, robots.txt and sitemap.xml (all https://sabalist.com)
// so structured-data URLs reinforce ONE domain instead of advertising the
// Firebase mirror (sabalist.web.app) and fragmenting ranking signals.
const BASE_URL = 'https://sabalist.com';

export function buildCanonicalUrl(path) {
  return `${BASE_URL}${path}`;
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sabalist',
    url: BASE_URL,
    logo: `${BASE_URL}/web-app-manifest-512x512.png`,
    description:
      "Sabalist is Africa's marketplace for buying and selling electronics, vehicles, real estate, fashion and more.",
    // Add real profiles here as they go live to strengthen the brand entity:
    // sameAs: ['https://facebook.com/sabalist', 'https://x.com/sabalist'],
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sabalist',
    url: BASE_URL,
    description: "Africa's marketplace for buying and selling electronics, vehicles, real estate, fashion and more.",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateListingSchema(listing) {
  if (!listing) return null;

  // Build the Offer block from the normalised price. Only emit numeric
  // price/priceCurrency for fixed/negotiable/range — for free, call-for-
  // price, and "no price" listings, schema.org accepts a priceSpecification
  // with PriceSpecification (or just omit the price). Free items use 0.
  const { normalisePrice, PRICE_TYPES } = require('../lib/pricing');
  const p = normalisePrice(listing);
  const offer = {
    '@type': 'Offer',
    availability:
      listing.status === 'sold'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/UsedCondition',
  };
  if (p.priceType === PRICE_TYPES.FREE) {
    offer.price = 0;
    offer.priceCurrency = p.currency;
  } else if (p.priceType === PRICE_TYPES.FIXED || p.priceType === PRICE_TYPES.NEGOTIABLE) {
    offer.price = p.amount ?? 0;
    offer.priceCurrency = p.currency;
  } else if (p.priceType === PRICE_TYPES.RANGE) {
    offer.priceSpecification = {
      '@type': 'PriceSpecification',
      minPrice: p.minAmount ?? undefined,
      maxPrice: p.maxAmount ?? undefined,
      priceCurrency: p.currency,
    };
  }
  // For CALL_FOR_PRICE and NONE: leave price/priceCurrency unset so
  // schema.org doesn't advertise a wrong number.

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || listing.title,
    offers: offer,
  };

  if (listing.images && listing.images.length > 0) {
    schema.image = listing.images;
  } else if (listing.coverImage) {
    schema.image = [listing.coverImage];
  }

  if (listing.location) {
    schema.offers.availableAtOrFrom = {
      '@type': 'Place',
      name: listing.location,
    };
  }

  if (listing.category) {
    schema.category = listing.category;
  }

  return schema;
}

export function generateBreadcrumbSchema(items) {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

export function generateCategoryItemListSchema(listings, categoryName) {
  if (!listings || listings.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${categoryName} for Sale on Sabalist`,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 20).map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: listing.title,
      url: `${BASE_URL}/listing/${listing.id}`,
    })),
  };
}

export function generateFaqSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

export function generateCityItemListSchema(listings, categoryName, cityName, countryName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${categoryName} for Sale in ${cityName}, ${countryName}`,
    description: `Browse ${categoryName.toLowerCase()} listings in ${cityName}, ${countryName} on Sabalist.`,
    numberOfItems: listings ? listings.length : 0,
    areaServed: {
      '@type': 'Place',
      name: cityName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityName,
        addressCountry: countryName,
      },
    },
    itemListElement: (listings || []).slice(0, 20).map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: listing.title,
      url: `${BASE_URL}/listing/${listing.id}`,
    })),
  };
}
