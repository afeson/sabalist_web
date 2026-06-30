// Server-rendered JSON-LD generators (ported + extended from src/utils/seo.js).
import { SITE, canonical } from './site';
import { normalisePrice, PRICE_TYPES } from './pricing';
import type { Listing } from './listings';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: SITE.name, url: SITE.url, logo: `${SITE.url}/web-app-manifest-512x512.png`,
    description: SITE.description,
    // sameAs: ['https://facebook.com/sabalist', 'https://x.com/sabalist'],
  };
}
export function websiteSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: canonical(it.url),
    })),
  };
}
export function productSchema(l: Listing, path: string) {
  const p = normalisePrice(l);
  const offer: any = {
    '@type': 'Offer', url: canonical(path),
    availability: l.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/UsedCondition',
  };
  if (p.priceType === PRICE_TYPES.FREE) { offer.price = 0; offer.priceCurrency = p.currency; }
  else if (p.priceType === PRICE_TYPES.FIXED || p.priceType === PRICE_TYPES.NEGOTIABLE) {
    offer.price = p.amount ?? 0; offer.priceCurrency = p.currency;
  } else if (p.priceType === PRICE_TYPES.RANGE) {
    offer.priceSpecification = {
      '@type': 'PriceSpecification', minPrice: p.minAmount ?? undefined,
      maxPrice: p.maxAmount ?? undefined, priceCurrency: p.currency,
    };
  }
  const images = [l.coverImage, ...(l.images || [])].filter(Boolean);
  const schema: any = {
    '@context': 'https://schema.org', '@type': 'Product', name: l.title,
    description: l.description || l.title, sku: l.id, offers: offer,
  };
  if (images.length) schema.image = images;
  if (l.category) schema.category = l.category;
  if (l.location) offer.availableAtOrFrom = { '@type': 'Place', name: l.location };
  return schema;
}
export function collectionPageSchema(name: string, path: string, listings: Listing[]) {
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name, url: canonical(path),
    mainEntity: {
      '@type': 'ItemList', numberOfItems: listings.length,
      itemListElement: listings.slice(0, 20).map((l, i) => ({
        '@type': 'ListItem', position: i + 1, name: l.title, url: canonical(`/listing/${l.id}`),
      })),
    },
  };
}
export function cityPlaceSchema(cityName: string, countryName: string) {
  return {
    '@context': 'https://schema.org', '@type': 'City', name: cityName,
    address: { '@type': 'PostalAddress', addressLocality: cityName, addressCountry: countryName },
  };
}
export function faqSchema(faqs: { q: string; a: string }[]) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
