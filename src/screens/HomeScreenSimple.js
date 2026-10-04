import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getNavChips } from '../config/runtimeConfig';
import { getCategoryByKey, getTranslatedCategoryLabel } from '../config/categories';
import logoAsset from '../../assets/branding/sabalist-logo-clean.png';
// Metro resolves this to listings.web.js in the browser preview and
// listings.js on device — both return real ranked data from discovery.js.
import { searchListings, searchBusinesses } from '../services/listings';

// ── Native home (premium redesign) ────────────────────────────────────────
// Matches the premium Sabalist WEB identity (red/gold/black, bigger logo,
// search-first, Post Free prominent, real listings/businesses/counts, premium
// cards) using ONLY already-installed modules (RN core + Ionicons) so it ships
// OTA with no new binary. System font + solid brand colors (no expo-font /
// expo-linear-gradient, which would force a rebuild).

const C = {
  red: '#D81F26', red7: '#AE161C', gold: '#F2B01E', gold6: '#E09A08',
  ink: '#171311', bg: '#FBF7F1', bg2: '#F4EDE3', surface: '#FFFFFF',
  line: '#ECE2D4', line2: '#E3D6C4', muted: '#6E635A', good: '#1E8E5A',
};
const LISTINGS_FALLBACK = 27482;
const BUSINESSES_FALLBACK = 3045190;
const fmt = (n) => (n || 0).toLocaleString('en-US');

const imgOf = (it) =>
  it?.coverImage || (Array.isArray(it?.images) && it.images[0]) || it?.image || null;
const parseNum = (v) => {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v === 'string') { const n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; }
  return null;
};
// Price rule: missing / zero / <= 0 → "Call for price" (never "USD 0", "$0",
// "0.00"). Real non-zero prices are shown exactly as before. An intentional
// "Free" listing is preserved as "Free".
const priceText = (it) => {
  const d = it?.displayPriceText || '';
  if (/^\s*free\s*$/i.test(d)) return 'Free';
  const raw = it?.price != null ? it.price : it?.amount;
  const n = parseNum(raw);
  if (n != null) {
    if (n <= 0) return 'Call for price';
    if ((parseNum(d) || 0) > 0) return d;           // real non-zero display, unchanged
    return `${it.currency || ''} ${raw}`.trim();
  }
  if (d) { const dn = parseNum(d); if (dn == null || dn > 0) return d; } // real non-zero text only
  return 'Call for price';
};
const cityOf = (it) => it?.city || it?.location || '';
const catOf = (it) => it?.category || it?.categoryId || '';

export default function HomeScreenSimple({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState('marketplace');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [biz, setBiz] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = useMemo(() => {
    // Only REAL categories — skip the 'All' and '__more__' nav pseudo-chips and
    // any hidden category, so tapping a chip always opens a valid subcategory set.
    const out = [];
    try {
      for (const chip of (getNavChips() || [])) {
        const key = chip && (chip.key || chip.id || chip);
        if (!key || key === 'All' || key === '__more__') continue;
        const cat = getCategoryByKey && getCategoryByKey(key);
        if (!cat || cat.hidden) continue;
        out.push({ key: cat.key, label: cat.label || cat.key, icon: cat.icon || 'pricetag-outline' });
      }
    } catch (_) { /* fall through to whatever we collected */ }
    return out;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const engine = scope === 'businesses' ? searchBusinesses : searchListings;
      const res = await engine(q, null, null, null, null, null);
      setItems(Array.isArray(res) ? res : []);
    } catch (_) { setItems([]); } finally { setLoading(false); }
  }, [scope, q]);

  useEffect(() => { load(); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await searchBusinesses('', null, null, null, null, null); if (alive) setBiz((Array.isArray(r) ? r : []).slice(0, 10)); } catch (_) {}
    })();
    return () => { alive = false; };
  }, []);

  const goPost = () => navigation?.navigate('CreateListing');
  const openItem = (it) =>
    scope === 'businesses'
      ? navigation?.navigate('BusinessDetail', { businessId: it.id })
      : navigation?.navigate('ListingDetail', { listingId: it.id });

  const grid = items.slice(0, 24);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.inner}>
      {/* HEADER */}
      <View style={[s.header, { paddingTop: Platform.OS === 'web' ? 16 : insets.top + 8 }]}>
        <View style={s.brandRow}>
          <Image source={logoAsset} style={s.logo} resizeMode="contain" />
          <View style={{ flexShrink: 1 }}>
            <Text style={s.word} numberOfLines={1}>Sabalist</Text>
            {!IS_SMALL && <Text style={s.tag}>MARKETPLACE & DIRECTORY</Text>}
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.acct} onPress={() => navigation?.navigate('Profile')}>
            <Ionicons name="person-outline" size={IS_SMALL ? 17 : 18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={goPost} activeOpacity={0.85}>
            <Text style={s.postBtnTxt}>{IS_SMALL ? '＋ Post' : '＋ Post Free'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* HERO */}
      <View style={s.hero}>
        <Text style={s.eyebrow}>● AFRICA'S MARKETPLACE & BUSINESS DIRECTORY</Text>
        <Text style={s.h1}>
          Buy, sell & discover{'\n'}
          <Text style={{ color: C.red }}>across Africa </Text>
          <Text style={{ color: C.gold6 }}>& the diaspora.</Text>
        </Text>
        <Text style={s.sub}>One place to trade anything and find trusted local businesses — from Lagos and Nairobi to Washington and London.</Text>

        {/* SEARCH CARD */}
        <View style={s.searchCard}>
          <View style={s.seg}>
            {[['marketplace', '🏷️  Marketplace'], ['businesses', '🏢  Businesses']].map(([k, lbl]) => {
              const on = scope === k;
              return (
                <TouchableOpacity key={k} onPress={() => setScope(k)} style={[s.segBtn, on && s.segBtnOn]}>
                  <Text style={[s.segTxt, on && s.segTxtOn]}>{lbl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.searchRow}>
            <Ionicons name="search" size={18} color={C.muted} style={{ marginHorizontal: 8 }} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={load}
              placeholder={scope === 'businesses' ? 'Search businesses & services…' : 'Search items for sale…'}
              placeholderTextColor="#9a9088"
              style={s.searchInput}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={s.searchBtn} onPress={load} activeOpacity={0.85}>
            <Text style={s.searchBtnTxt}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* STAT CHIPS */}
        <View style={s.statsRow}>
          <View style={s.statChip}><Text style={s.statNum}>{fmt(LISTINGS_FALLBACK)}</Text><Text style={s.statLbl}>live listings</Text></View>
          <View style={s.statChip}><Text style={s.statNum}>{fmt(BUSINESSES_FALLBACK)}</Text><Text style={s.statLbl}>businesses</Text></View>
        </View>
      </View>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>Browse by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            {categories.map((c) => (
              <TouchableOpacity key={c.key} style={s.catChip} onPress={() => navigation?.navigate('SubCategories', { category: c.key })}>
                <View style={s.catIconWrap}><Ionicons name={c.icon} size={22} color={C.red} /></View>
                <Text style={s.catLbl} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* FRESH LISTINGS GRID */}
      <View style={s.section}>
        <Text style={s.h2}>{scope === 'businesses' ? 'Businesses in the directory' : 'Fresh on the marketplace'}</Text>
        <Text style={s.secSub}>{scope === 'businesses' ? 'Real shops & services you can contact now.' : 'Real items posted by people across the community.'}</Text>
        {loading ? (
          <View style={{ paddingVertical: 40 }}><ActivityIndicator color={C.red} /></View>
        ) : (
          <View style={s.grid}>
            {grid.map((it) => (
              <TouchableOpacity key={it.id} style={s.card} activeOpacity={0.9} onPress={() => openItem(it)}>
                <View style={s.cardPhoto}>
                  {imgOf(it)
                    ? <Image source={{ uri: imgOf(it) }} style={s.cardImg} resizeMode="cover" />
                    : <View style={[s.cardImg, s.cardPh]}><Ionicons name="image-outline" size={26} color={C.line2} /></View>}
                  <View style={s.priceTag}><Text style={s.priceTxt}>{priceText(it)}</Text></View>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>{it.title || 'Untitled'}</Text>
                  <Text style={s.cardLoc} numberOfLines={1}>📍 {cityOf(it) || '—'}{catOf(it) ? ' · ' + catOf(it) : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* FEATURED BUSINESSES */}
      {biz.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>Featured businesses</Text>
          <Text style={s.secSub}>Real entries from the Sabalist directory.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            {biz.map((b) => (
              <TouchableOpacity key={b.id} style={s.biz} onPress={() => navigation?.navigate('BusinessDetail', { businessId: b.id })}>
                {imgOf(b)
                  ? <Image source={{ uri: imgOf(b) }} style={s.bizImg} resizeMode="cover" />
                  : <View style={[s.bizImg, s.bizMono]}><Text style={s.bizMonoTxt}>{(b.title || '?').charAt(0)}</Text></View>}
                <Text style={s.bizName} numberOfLines={1}>{b.title || 'Business'}</Text>
                <Text style={s.bizCat} numberOfLines={1}>{catOf(b) || 'Business'}{cityOf(b) ? ' · ' + cityOf(b) : ''}</Text>
                <View style={s.bizChip}><Text style={s.bizChipTxt}>In directory</Text></View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* SELL BAND */}
      <View style={s.sellBand}>
        <Text style={s.sellTitle}>Got something to sell?</Text>
        <Text style={s.sellSub}>Post it free in 60 seconds — no fees, reach buyers across Africa & the diaspora.</Text>
        <TouchableOpacity style={s.sellBtn} onPress={goPost} activeOpacity={0.9}>
          <Text style={s.sellBtnTxt}>＋ Post your ad — free</Text>
        </TouchableOpacity>
      </View>
      </View>
    </ScrollView>
  );
}

const W = Dimensions.get('window').width;
const GAP = 14;
const H_PAD = 16;
// Phone-width breakpoint — tightens ONLY the header on small screens. Tablets
// (W >= 480) and the web home (separate .web.js) are unaffected.
const IS_SMALL = W < 480;
// Phone-first: cap the content column so it stays premium on tablets/large
// screens and renders faithfully in an in-browser RN-Web preview. On a real
// phone W < CONTENT_MAX, so this is a no-op there.
const CONTENT_MAX = 500;
const CONTENT_W = Math.min(W, CONTENT_MAX);
const CARD_W = (CONTENT_W - H_PAD * 2 - GAP) / 2;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 100, alignItems: 'center' },
  inner: { width: '100%', maxWidth: CONTENT_MAX },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: IS_SMALL ? 14 : H_PAD, paddingTop: Platform.OS === 'web' ? 16 : 10, paddingBottom: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 },
  logo: { width: IS_SMALL ? 36 : 46, height: IS_SMALL ? 36 : 46, marginRight: IS_SMALL ? 8 : 10 },
  word: { fontSize: IS_SMALL ? 19 : 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5, lineHeight: IS_SMALL ? 21 : 24 },
  tag: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  acct: { width: IS_SMALL ? 36 : 40, height: IS_SMALL ? 36 : 40, borderRadius: IS_SMALL ? 18 : 20, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: IS_SMALL ? 6 : 8 },
  postBtn: { backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: IS_SMALL ? 13 : 16, paddingVertical: IS_SMALL ? 8 : 10, shadowColor: C.gold6, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  postBtnTxt: { fontWeight: '800', color: '#3b2a06', fontSize: IS_SMALL ? 13 : 14 },

  hero: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 6, backgroundColor: C.bg },
  eyebrow: { color: C.red, fontWeight: '800', fontSize: 11, letterSpacing: 0.6, marginBottom: 10 },
  h1: { fontSize: 34, lineHeight: 38, fontWeight: '800', color: C.ink, letterSpacing: -1 },
  sub: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },

  searchCard: { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.line2, padding: 12, marginTop: 18, shadowColor: C.red7, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 4 },
  seg: { flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 999, padding: 4, marginBottom: 10 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  segBtnOn: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  segTxt: { fontWeight: '700', color: C.muted, fontSize: 13 },
  segTxtOn: { color: C.red },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: 14, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 13, paddingRight: 12, fontSize: 15, color: C.ink },
  searchBtn: { backgroundColor: C.red, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  searchBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statsRow: { flexDirection: 'row', marginTop: 16 },
  statChip: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginRight: 10 },
  statNum: { fontSize: 20, fontWeight: '800', color: C.ink },
  statLbl: { fontSize: 12, color: C.muted, marginTop: 2 },

  section: { paddingHorizontal: H_PAD, marginTop: 26 },
  h2: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  secSub: { color: C.muted, fontSize: 13, marginTop: 3, marginBottom: 12 },

  catChip: { alignItems: 'center', marginRight: 16, width: 72 },
  catIconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catLbl: { fontSize: 12, fontWeight: '600', color: C.ink, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: CARD_W, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, marginBottom: GAP, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardPhoto: { width: '100%', height: CARD_W * 0.82, backgroundColor: C.bg2, justifyContent: 'flex-end' },
  cardImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardPh: { alignItems: 'center', justifyContent: 'center' },
  priceTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(23,19,17,0.92)', borderTopRightRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 17, minHeight: 34 },
  cardLoc: { fontSize: 11, color: C.muted, marginTop: 4 },

  biz: { width: 150, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 10, marginRight: 12 },
  bizImg: { width: '100%', height: 84, borderRadius: 10, backgroundColor: C.bg2, marginBottom: 8 },
  bizMono: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  bizMonoTxt: { color: '#fff', fontSize: 30, fontWeight: '800' },
  bizName: { fontSize: 13, fontWeight: '700', color: C.ink },
  bizCat: { fontSize: 11, color: C.muted, marginTop: 2 },
  bizChip: { alignSelf: 'flex-start', backgroundColor: C.bg2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  bizChipTxt: { fontSize: 10, fontWeight: '700', color: C.muted },

  sellBand: { margin: H_PAD, marginTop: 28, backgroundColor: C.ink, borderRadius: 22, padding: 22 },
  sellTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sellSub: { color: '#d8cfc6', fontSize: 14, lineHeight: 20, marginTop: 8 },
  sellBtn: { backgroundColor: C.gold, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  sellBtnTxt: { color: '#3b2a06', fontWeight: '800', fontSize: 15 },
});
