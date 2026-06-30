// Read-only data access for SEO pages. Reads the world-readable `listings`
// collection. Field shape mirrors src/services/listings.web.js:
//   title, description, category(key), categoryId, subcategory, location,
//   images[], coverImage, hasImage, status, priceType/amount/currency, updatedAt
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit as qlimit,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCategory } from './taxonomy';
import { getCity, type City, type Country } from './locations';

export type Listing = {
  id: string;
  title: string;
  description?: string;
  category?: string;       // display key, e.g. "Vehicles"
  categoryId?: string;     // slug, e.g. "vehicles"
  subcategory?: string;
  location?: string;
  images?: string[];
  coverImage?: string;
  hasImage?: boolean;
  status?: string;
  views?: number;
  priceType?: string; amount?: number; minAmount?: number; maxAmount?: number;
  currency?: string; price?: number; displayPriceText?: string; isNegotiable?: boolean;
  updatedAt?: any; createdAt?: any;
};

function toListing(id: string, d: any): Listing {
  return { id, ...d };
}
export function lastmodOf(l: Listing): string | undefined {
  const ts = l.updatedAt || l.createdAt;
  try { if (ts?.toDate) return ts.toDate().toISOString().slice(0, 10); } catch {}
  return undefined;
}
function isActive(l: Listing): boolean {
  return !l.status || l.status === 'active';
}

export async function getListing(id: string): Promise<Listing | null> {
  const snap = await getDoc(doc(db(), 'listings', id));
  return snap.exists() ? toListing(snap.id, snap.data()) : null;
}

// Category match tolerates both the display key and the slug being stored.
export async function getListingsByCategory(categoryId: string, max = 60): Promise<Listing[]> {
  const cat = getCategory(categoryId);
  const keys = [categoryId, cat?.key].filter(Boolean) as string[];
  const out: Listing[] = [];
  for (const k of keys) {
    try {
      const field = k === categoryId ? 'categoryId' : 'category';
      const q = query(collection(db(), 'listings'), where(field, '==', k), qlimit(max));
      const snap = await getDocs(q);
      snap.forEach((s) => out.push(toListing(s.id, s.data())));
    } catch { /* index may be missing; fall through */ }
    if (out.length) break;
  }
  return dedupe(out).filter(isActive).slice(0, max);
}

export async function getListingsBySubcategory(categoryId: string, subId: string, max = 60): Promise<Listing[]> {
  const base = await getListingsByCategory(categoryId, 300);
  return base.filter((l) => (l.subcategory || '') === subId).slice(0, max);
}

// Location pages: filter by free-text location against the city's matchTerms.
function matchesCity(l: Listing, city: City): boolean {
  const loc = (l.location || '').toLowerCase();
  return city.matchTerms.some((t) => loc.includes(t.toLowerCase()));
}
export async function getListingsByCity(country: Country, city: City, categoryId?: string, max = 60): Promise<Listing[]> {
  const pool = categoryId
    ? await getListingsByCategory(categoryId, 300)
    : await getRecentListings(400);
  return pool.filter((l) => matchesCity(l, city)).slice(0, max);
}
export async function countListingsByCity(country: Country, city: City, categoryId?: string): Promise<number> {
  return (await getListingsByCity(country, city, categoryId, 1000)).length;
}

export async function getRecentListings(max = 60): Promise<Listing[]> {
  try {
    const q = query(collection(db(), 'listings'), orderBy('createdAt', 'desc'), qlimit(max));
    const snap = await getDocs(q);
    const out: Listing[] = []; snap.forEach((s) => out.push(toListing(s.id, s.data())));
    return out.filter(isActive);
  } catch {
    const snap = await getDocs(query(collection(db(), 'listings'), qlimit(max)));
    const out: Listing[] = []; snap.forEach((s) => out.push(toListing(s.id, s.data())));
    return out.filter(isActive);
  }
}

export async function getRelatedListings(l: Listing, max = 8): Promise<Listing[]> {
  if (!l.categoryId && !l.category) return [];
  const pool = await getListingsByCategory((l.categoryId || l.category)!, 40);
  return pool.filter((x) => x.id !== l.id).slice(0, max);
}

// For the listings sitemap: every active listing id + lastmod, paginated.
export async function getAllActiveListingIds(): Promise<{ id: string; lastmod?: string }[]> {
  const snap = await getDocs(collection(db(), 'listings'));
  const out: { id: string; lastmod?: string }[] = [];
  snap.forEach((s) => {
    const l = toListing(s.id, s.data());
    if (isActive(l)) out.push({ id: l.id, lastmod: lastmodOf(l) });
  });
  return out;
}
export async function getAllActiveListingsForImages(): Promise<Listing[]> {
  const snap = await getDocs(collection(db(), 'listings'));
  const out: Listing[] = [];
  snap.forEach((s) => { const l = toListing(s.id, s.data()); if (isActive(l) && (l.coverImage || l.images?.length)) out.push(l); });
  return out;
}

function dedupe(arr: Listing[]): Listing[] {
  const seen = new Set<string>(); const out: Listing[] = [];
  for (const l of arr) { if (!seen.has(l.id)) { seen.add(l.id); out.push(l); } }
  return out;
}
