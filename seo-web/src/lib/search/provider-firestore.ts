// $0 fallback SearchProvider on Firestore alone (no search server).
// Capabilities: exact-token keyword match (via the `searchKeywords` array
// stamped by ingestion), equality filters, prefix autocomplete (via `title_lc`),
// quality_score ranking. Known, accepted limits: no typo tolerance, no
// text-relevance, approximate `found`, geo params ignored. All queries are
// bounded (CANDIDATES docs max) so cost stays capped per request.
import {
  collection, getDocs, query, where, orderBy, startAt, endAt, limit as qlimit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { tokenize, prefixOf } from './normalize';
import type { SearchProvider, SearchRequest, SearchResponse, SearchHit } from './types';

const CANDIDATES = 150; // max docs fetched per keyword query (cost ceiling)

function toHit(id: string, d: any): SearchHit {
  return {
    id,
    title: d.title || '',
    category: d.categoryId || d.category,
    subcategory: d.subcategory,
    city: d.city,
    country: d.country,
    location: d.location,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    quality: d.quality_score ?? 0,
    thumbnail: d.coverImage || (Array.isArray(d.images) && d.images[0]) || null,
  };
}

function matchesFilters(d: any, req: SearchRequest): boolean {
  if (d.status && d.status !== 'active') return false;
  if (req.country && d.country !== req.country) return false;
  if (req.city && d.city !== req.city && !(d.location || '').startsWith(req.city)) return false;
  if (req.category && (d.categoryId || '').toLowerCase() !== req.category.toLowerCase()) return false;
  if (req.subcategory && (d.subcategory || '').toLowerCase() !== req.subcategory.toLowerCase()) return false;
  return true;
}

export const firestoreProvider: SearchProvider = {
  name: 'firestore-fallback',
  enabled() { return true; }, // always available — it IS the fallback

  async search(req: SearchRequest): Promise<SearchResponse | null> {
    const t0 = Date.now();
    const page = Math.max(1, req.page || 1);
    const perPage = Math.min(50, Math.max(1, req.perPage || 20));
    const col = collection(db(), 'listings');
    let ranked: SearchHit[] = [];

    if (req.mode === 'autocomplete' && req.q) {
      const p = prefixOf(req.q);
      if (p.length >= 2) {
        const snap = await getDocs(query(col, orderBy('title_lc'), startAt(p), endAt(p + ''), qlimit(12)));
        const seen: SearchHit[] = [];
        snap.forEach((s) => { const d = s.data(); if (matchesFilters(d, req)) seen.push(toHit(s.id, d)); });
        ranked = seen.slice(0, 8);
      }
    } else if (req.q && req.q.trim()) {
      const qTokens = tokenize(req.q, 10);
      if (!qTokens.length) return { hits: [], found: 0, page, perPage, provider: this.name, tookMs: Date.now() - t0, degraded: true };
      // Geo-scoped: array-contains on the first query token + country equality
      // (single-field index merge) keeps the bounded window full of on-topic,
      // in-country docs instead of letting a broad token flood it continent-wide.
      // Falls back to the un-scoped query if the merge needs a composite index.
      let snap;
      if (req.country) {
        try {
          snap = await getDocs(query(col,
            where('searchKeywords', 'array-contains', qTokens[0]),
            where('country', '==', req.country),
            qlimit(CANDIDATES)));
        } catch { snap = null; }
      }
      // City folded into ranking tokens (docs store city as a keyword), country
      // deliberately NOT (too broad — matches everything in the country).
      const tokens = tokenize([req.q, req.city].filter(Boolean).join(' '), 10);
      if (!snap || snap.empty) {
        snap = await getDocs(query(col, where('searchKeywords', 'array-contains-any', tokens), qlimit(CANDIDATES)));
      }
      const scored: Array<{ h: SearchHit; s: number }> = [];
      snap.forEach((s) => {
        const d = s.data();
        if (!matchesFilters(d, req)) return;
        const kw: string[] = Array.isArray(d.searchKeywords) ? d.searchKeywords : [];
        const overlap = tokens.reduce((n, t) => n + (kw.includes(t) ? 1 : 0), 0);
        scored.push({ h: toHit(s.id, d), s: overlap * 100 + (d.quality_score ?? 0) });
      });
      scored.sort((a, b) => b.s - a.s);
      ranked = scored.map((x) => x.h);
    } else {
      // Filters-only browse: equality wheres merge on single-field indexes.
      const wheres = [] as any[];
      if (req.country) wheres.push(where('country', '==', req.country));
      if (req.category) wheres.push(where('categoryId', '==', req.category));
      const snap = await getDocs(query(col, ...wheres, qlimit(Math.max(perPage * 3, 60))));
      const seen: SearchHit[] = [];
      snap.forEach((s) => { const d = s.data(); if (matchesFilters(d, req)) seen.push(toHit(s.id, d)); });
      seen.sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
      ranked = seen;
    }

    const start = (page - 1) * perPage;
    return {
      hits: ranked.slice(start, start + perPage),
      found: ranked.length, // approximate: bounded by the candidate window
      page, perPage,
      provider: this.name,
      tookMs: Date.now() - t0,
      degraded: true,
    };
  },
};
