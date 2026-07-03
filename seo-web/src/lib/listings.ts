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
import { searchListingIds, tsValue } from './search-client';

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
  // Contact + provenance (present in Firestore; surfaced for CTAs + schema).
  phoneNumber?: string; whatsapp?: string; email?: string; website?: string;
  sourceUrl?: string; url?: string;
  sellerName?: string; condition?: string; country?: string; city?: string;
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

// Hydrate full listing docs from Firestore for a list of IDs, preserving order.
async function getByIds(ids: string[]): Promise<Listing[]> {
  if (!ids.length) return [];
  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db(), 'listings', id)).catch(() => null)));
  const map = new Map<string, Listing>();
  snaps.forEach((s, i) => { if (s && s.exists()) map.set(ids[i], toListing(s.id, s.data())); });
  return ids.map((id) => map.get(id)).filter(Boolean) as Listing[];
}

// Category match tolerates both the display key and the slug being stored.
function catFilter(categoryId: string): string {
  const cat = getCategory(categoryId);
  return cat?.key
    ? `(categoryId:=${tsValue(categoryId)} || category:=${tsValue(cat.key)})`
    : `categoryId:=${tsValue(categoryId)}`;
}

export async function getListingsByCategory(categoryId: string, max = 60): Promise<Listing[]> {
  const cat = getCategory(categoryId);
  // Search-first: ordered by quality_score, then hydrate full docs from Firestore.
  const sr = await searchListingIds({
    q: '*', query_by: 'title',
    filter_by: `status:=active && ${catFilter(categoryId)}`,
    sort_by: 'quality_score:desc', per_page: String(max),
  });
  if (sr && sr.ids.length) { const l = await getByIds(sr.ids); if (l.length) return l; }
  // Firestore fallback.
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

// Location pages: match the city against BOTH the free-text `location` string
// and the structured `city`/`region` fields the ingestion pipeline sets
// (ingestion/lib/geo.js). Many listings have a detected structured city but a
// location string that doesn't name it — matching location alone starved the
// city pages (they fell below the index threshold and were noindex'd).
function matchesCity(l: Listing, city: City): boolean {
  const hay = `${l.location || ''} ${l.city || ''} ${(l as any).region || ''}`.toLowerCase();
  return city.matchTerms.some((t) => hay.includes(t.toLowerCase()));
}
function cityFilter(country: Country, categoryId?: string): string {
  return `status:=active && country:=${tsValue(country.name)}` +
    (categoryId ? ` && ${catFilter(categoryId)}` : '');
}

export async function getListingsByCity(country: Country, city: City, categoryId?: string, max = 60): Promise<Listing[]> {
  // Search-first: match the city by name over location/city, ranked by quality.
  const sr = await searchListingIds({
    q: city.name, query_by: 'location,city',
    filter_by: cityFilter(country, categoryId),
    sort_by: 'quality_score:desc', per_page: String(max),
  });
  if (sr && sr.ids.length) { const l = await getByIds(sr.ids); if (l.length) return l; }
  // Firestore fallback: query the country's inventory directly (equality on
  // `country` uses Firestore's automatic single-field index — no composite index
  // needed) instead of filtering a small "recent" sample.
  const pool: Listing[] = [];
  try {
    const snap = await getDocs(query(collection(db(), 'listings'), where('country', '==', country.name), qlimit(1000)));
    snap.forEach((s) => pool.push(toListing(s.id, s.data())));
  } catch { /* fall back to the sample below */ }
  // Supplement when the structured country field is sparse for this country.
  if (pool.length < 50) {
    const sample = categoryId ? await getListingsByCategory(categoryId, 300) : await getRecentListings(400);
    pool.push(...sample);
  }
  const catKey = categoryId ? getCategory(categoryId)?.key : undefined;
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const l of pool) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    if (!isActive(l) || !matchesCity(l, city)) continue;
    if (categoryId && l.categoryId !== categoryId && l.category !== catKey && l.category !== categoryId) continue;
    out.push(l);
  }
  return out.slice(0, max);
}
export async function countListingsByCity(country: Country, city: City, categoryId?: string): Promise<number> {
  // Accurate total from the search index (0 Firestore reads); fall back to a
  // capped Firestore count only if search is unavailable.
  const sr = await searchListingIds({
    q: city.name, query_by: 'location,city', filter_by: cityFilter(country, categoryId), per_page: '1',
  });
  if (sr) return sr.found;
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

// One read of the whole active collection — used by the sitemap routes so they
// tally counts in memory instead of firing hundreds of per-bucket queries.
export async function getAllActiveListings(): Promise<Listing[]> {
  const snap = await getDocs(collection(db(), 'listings'));
  const out: Listing[] = [];
  snap.forEach((s) => { const l = toListing(s.id, s.data()); if (isActive(l)) out.push(l); });
  return out;
}
