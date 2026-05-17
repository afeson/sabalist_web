const BASE_URL = 'https://sabalist.web.app';

export function buildCanonicalUrl(path) {
  return `${BASE_URL}${path}`;
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

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || listing.title,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency || 'ETB',
      availability: listing.status === 'sold'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
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
