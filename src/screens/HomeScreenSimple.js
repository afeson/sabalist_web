import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import LanguageModal from '../components/LanguageModal';
import LocationSelector from '../components/LocationSelector';
import { useAuth } from '../contexts/AuthContext';
import { getNavChips, getFlags } from '../config/runtimeConfig';
import { getCategoryByKey, getTranslatedCategoryLabel } from '../config/categories';
import { getActiveCountries } from '../config/cityRoutes';
import { getUserLocation } from '../services/locationService';
import { subscribeToFavorites, addToFavorites, removeFromFavorites } from '../services/favoritesService';
import logoAsset from '../../assets/branding/sabalist-logo-clean.png';
// Metro resolves this to listings.web.js in the browser preview and
// listings.js on device — both return real ranked data from discovery.js.
import { searchListings, searchBusinesses } from '../services/listings';

// ── Native home (premium — matches the approved web homepage) ──────────────
// Mirrors src/screens/HomeScreenSimple.web.js section-for-section (hero +
// location-aware search, proof band, "two ways", categories, real listings
// with favourites + load-more, featured businesses, browse-by-place, sell
// band, footer) using ONLY already-installed modules (RN core + Ionicons) so
// it ships OTA with no new binary. System font + solid brand colours (no
// expo-font / expo-linear-gradient, which would force a rebuild).

const C = {
  red: '#D81F26', red7: '#AE161C', redDeep: '#7E0F13',
  gold: '#F2B01E', gold6: '#E09A08', goldTxt: '#3b2a06',
  ink: '#171311', bg: '#FBF7F1', bg2: '#F4EDE3', surface: '#FFFFFF',
  line: '#ECE2D4', line2: '#E3D6C4', muted: '#6E635A', good: '#1E8E5A',
  mktTint: '#FBECEB', mktBorder: '#EEB9BB',
};
const FALLBACK = { listings: 27482, businesses: 3045190 };
const fmt = (n) => (n || 0).toLocaleString('en-US');
const millions = (n) => `${Math.round((n / 1e6) * 10) / 10}M`;

const CAT_EMOJI = {
  vehicles: '🚗', 'real-estate': '🏠', 'property-rentals': '🏠', property: '🏠',
  phones: '📱', electronics: '💻', computers: '🖥️', fashion: '👗', beauty: '💄',
  'home-garden': '🛋️', furniture: '🛋️', services: '🧰', jobs: '💼', food: '🍲',
  'baby-kids': '🧸', pets: '🐾', sports: '⚽', books: '📚', health: '➕',
  agriculture: '🌾', construction: '🧱', travel: '✈️', education: '🎓', community: '🫂',
};
const catEmoji = (k) => CAT_EMOJI[k] || '🏷️';

const imgOf = (it) =>
  it?.coverImage || (Array.isArray(it?.images) && it.images[0]) || it?.image || null;
const parseNum = (v) => {
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v === 'string') { const n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; }
  return null;
};
// Price rule: missing / zero / <= 0 → "Call for price" (never "USD 0", "$0").
// Real non-zero prices shown exactly as before. "Free" is preserved.
const priceText = (it) => {
  const d = it?.displayPriceText || '';
  if (/^\s*free\s*$/i.test(d)) return 'Free';
  const raw = it?.price != null ? it.price : it?.amount;
  const n = parseNum(raw);
  if (n != null) {
    if (n <= 0) return 'Call for price';
    if ((parseNum(d) || 0) > 0) return d;
    return `${it.currency || ''} ${raw}`.trim();
  }
  if (d) { const dn = parseNum(d); if (dn == null || dn > 0) return d; }
  return 'Call for price';
};
const cityOf = (it) => it?.city || it?.location || '';
const catOf = (it) => it?.category || it?.categoryId || '';

export default function HomeScreenSimple({ navigation }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  let flags = {};
  try { flags = getFlags() || {}; } catch (_) { flags = {}; }

  const [langOpen, setLangOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [scope, setScope] = useState('marketplace');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [biz, setBiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(24);
  const [userLocation, setUserLocation] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);

  const counts = FALLBACK; // displayed scale claims (same values the web shows)

  const categories = useMemo(() => {
    const out = [];
    try {
      for (const chip of (getNavChips() || [])) {
        const key = chip && (chip.key || chip.id || chip);
        if (!key || key === 'All' || key === '__more__') continue;
        const cat = getCategoryByKey && getCategoryByKey(key);
        if (!cat || cat.hidden) continue;
        if (cat.id === 'jobs' && flags.showJobs === false) continue;
        out.push({
          key: cat.key,
          label: getTranslatedCategoryLabel ? getTranslatedCategoryLabel(cat.key, t, cat.label) : (cat.label || cat.key),
          icon: cat.icon || 'pricetag-outline',
        });
      }
    } catch (_) { /* keep whatever we collected */ }
    return out;
  }, [t, flags.showJobs]);

  const places = useMemo(() => {
    const out = [];
    try {
      const countries = getActiveCountries ? getActiveCountries() : {};
      for (const [cslug, country] of Object.entries(countries).slice(0, 4)) {
        for (const [citySlug, city] of Object.entries(country.cities || {}).slice(0, 3)) {
          out.push({ cslug, citySlug, name: city.name, cc: (country.name || '').slice(0, 2).toUpperCase() });
        }
      }
    } catch (_) { /* optional section */ }
    return out;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const engine = scope === 'businesses' ? searchBusinesses : searchListings;
      const res = await engine(q, null, null, null, null, userLocation);
      setItems(Array.isArray(res) ? res : []);
      setVisible(24);
    } catch (_) { setItems([]); } finally { setLoading(false); }
  }, [scope, q, userLocation]);

  useEffect(() => { load(); }, [scope, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    (async () => {
      try { const r = await searchBusinesses('', null, null, null, null, null); if (alive) setBiz((Array.isArray(r) ? r : []).slice(0, 12)); } catch (_) {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!user?.uid) { setFavoriteIds([]); return; }
    let unsub;
    try { unsub = subscribeToFavorites(user.uid, setFavoriteIds); } catch (_) {}
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) { setUserLocation(null); return; }
    (async () => { try { setUserLocation(await getUserLocation(user.uid)); } catch (_) {} })();
  }, [user?.uid]);

  const goPost = () => navigation?.navigate('CreateListing');
  const goCategory = (key) => navigation?.navigate('SubCategories', { category: key });
  const goPlace = (p) => navigation?.navigate('CityListings', { country: p.cslug, city: p.citySlug, category: 'electronics' });
  const openItem = (it) =>
    (scope === 'businesses' || it.type === 'business')
      ? navigation?.navigate('BusinessDetail', { businessId: it.id })
      : navigation?.navigate('ListingDetail', { listingId: it.id });
  const openLocation = () => {
    if (user?.uid) { setLocOpen(true); }
    else { Alert.alert('Sign in', 'Sign in to set your location.'); }
  };
  const toggleFav = async (it) => {
    if (!user?.uid) { Alert.alert('Sign in', 'Please sign in to save favorites.'); return; }
    const on = favoriteIds.includes(it.id);
    try { on ? await removeFromFavorites(user.uid, it.id) : await addToFavorites(user.uid, it.id); } catch (_) {}
  };

  const grid = items.slice(0, visible);
  const locLabel = userLocation
    ? `${userLocation.city || ''}${userLocation.state ? ', ' + userLocation.state : ''}` || 'All locations'
    : 'All locations';

  return (
    <>
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
          <TouchableOpacity style={s.lang} onPress={() => setLangOpen(true)} activeOpacity={0.7} accessibilityLabel="Change language">
            <Ionicons name="globe-outline" size={IS_SMALL ? 15 : 17} color={C.red} />
            <Text style={s.langCode}>{(i18n.language || 'en').toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acct} onPress={() => navigation?.navigate('Profile')} accessibilityLabel="Account">
            <Ionicons name="person-outline" size={IS_SMALL ? 17 : 18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={goPost} activeOpacity={0.85}>
            <Text style={s.postBtnTxt}>{IS_SMALL ? '＋ Post' : '＋ Post Free'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* HERO */}
      <View style={s.hero}>
        <View style={s.eyebrowRow}>
          <View style={s.eyeDot} />
          <Text style={s.eyebrow}>AFRICA'S MARKETPLACE & BUSINESS DIRECTORY</Text>
        </View>
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
                <TouchableOpacity key={k} onPress={() => setScope(k)} style={[s.segBtn, on && s.segBtnOn]} activeOpacity={0.8}>
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
          <TouchableOpacity style={s.locRow} onPress={openLocation} activeOpacity={0.8}>
            <Ionicons name="location-outline" size={18} color={C.red} style={{ marginHorizontal: 8 }} />
            <Text style={s.locTxt} numberOfLines={1}>{locLabel}</Text>
            <Ionicons name="chevron-down" size={15} color={C.muted} style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBtn} onPress={load} activeOpacity={0.85}>
            <Text style={s.searchBtnTxt}>Search</Text>
          </TouchableOpacity>
          <Text style={s.segNote}>
            {scope === 'businesses'
              ? `Searching ${fmt(counts.businesses)} businesses across Africa & the diaspora.`
              : `Browsing ${fmt(counts.listings)} live listings — free, no sign-up needed.`}
          </Text>
        </View>

        {/* HERO CTA ROW */}
        <View style={s.ctaRow}>
          <TouchableOpacity style={[s.btnGold, s.btnLg]} onPress={goPost} activeOpacity={0.85}>
            <Text style={s.btnGoldTxt}>＋ Post your ad — free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnGhost, s.btnLg]} onPress={() => setScope('marketplace')} activeOpacity={0.85}>
            <Text style={s.btnGhostTxt}>Browse marketplace</Text>
          </TouchableOpacity>
        </View>

        {/* STAT CHIPS */}
        <View style={s.statsRow}>
          <View style={s.statChip}><Text style={s.statNum}>{fmt(counts.listings)}</Text><Text style={s.statLbl}>live listings</Text></View>
          <View style={s.statChip}><Text style={s.statNum}>{fmt(counts.businesses)}</Text><Text style={s.statLbl}>businesses listed</Text></View>
          <View style={s.statChip}><View style={s.goodDot} /><View><Text style={s.statNum}>Free</Text><Text style={s.statLbl}>to post & browse</Text></View></View>
        </View>
      </View>

      {/* PROOF */}
      <View style={s.proof}>
        <View style={s.proofGrid}>
          <View style={s.pcell}><Text style={s.big}>{fmt(counts.listings)}</Text><Text style={s.lab}>items for sale right now</Text></View>
          <View style={s.pcell}><Text style={s.big}>{millions(counts.businesses)}<Text style={s.sfx}>+</Text></Text><Text style={s.lab}>businesses in the directory</Text></View>
          <View style={s.pcell}><Text style={s.big}>Africa<Text style={s.sfx}> +</Text></Text><Text style={s.lab}>& the global diaspora</Text></View>
          <View style={s.pcell}><Text style={s.big}>60<Text style={s.sfx}>s</Text></Text><Text style={s.lab}>to post an ad, free</Text></View>
        </View>
        <View style={s.badges}>
          {['No sign-up to browse', 'Contact sellers by Call & WhatsApp', 'Free organic listings', 'Verified business profiles'].map((b) => (
            <View key={b} style={s.pill}><Ionicons name="checkmark" size={13} color={C.good} /><Text style={s.pillTxt}>{b}</Text></View>
          ))}
        </View>
      </View>

      {/* TWO PATHS */}
      <View style={s.section}>
        <Text style={s.h2}>Two ways to use Sabalist</Text>
        <Text style={s.secSub}>Trade with people nearby, or find a business to hire.</Text>
        <View style={s.paths}>
          <TouchableOpacity style={[s.path, s.pathMkt]} activeOpacity={0.9} onPress={() => setScope('marketplace')}>
            <View style={[s.pathIc, { backgroundColor: C.red }]}><Text style={s.pathIcTxt}>🏷️</Text></View>
            <Text style={s.h3}>Marketplace</Text>
            <Text style={s.secSub}>Buy & sell cars, phones, furniture, fashion, property and more — directly with people near you.</Text>
            <Text style={s.pathCount}>{fmt(counts.listings)} live listings →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.path, s.pathDir]} activeOpacity={0.9} onPress={() => setScope('businesses')}>
            <View style={[s.pathIc, { backgroundColor: C.gold }]}><Text style={s.pathIcTxt}>🏢</Text></View>
            <Text style={s.h3}>Business Directory</Text>
            <Text style={s.secSub}>Find and contact trusted salons, restaurants, tradespeople, shops and services across the continent.</Text>
            <Text style={s.pathCount}>{fmt(counts.businesses)} businesses →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>Browse by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
            {categories.map((c) => (
              <TouchableOpacity key={c.key} style={s.catChip} onPress={() => goCategory(c.key)} activeOpacity={0.8}>
                <View style={s.catIconWrap}><Ionicons name={c.icon} size={24} color={C.red} /></View>
                <Text style={s.catLbl} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* FRESH LISTINGS / BUSINESSES */}
      <View style={s.section}>
        <Text style={s.h2}>{scope === 'businesses' ? 'Businesses in the directory' : 'Fresh on the marketplace'}</Text>
        <Text style={s.secSub}>{scope === 'businesses' ? 'Real shops & services you can contact now.' : 'Real items posted by people across the community.'}</Text>
        {loading ? (
          <View style={{ paddingVertical: 40 }}><ActivityIndicator color={C.red} /></View>
        ) : grid.length === 0 ? (
          <Text style={s.empty}>No results yet — try another category or search.</Text>
        ) : (
          <>
          <View style={s.grid}>
            {grid.map((it) => {
              const fav = favoriteIds.includes(it.id);
              return (
                <TouchableOpacity key={it.id} style={s.card} activeOpacity={0.9} onPress={() => openItem(it)}>
                  <View style={s.cardPhoto}>
                    {imgOf(it)
                      ? <Image source={{ uri: imgOf(it) }} style={s.cardImg} resizeMode="cover" />
                      : <View style={[s.cardImg, s.cardPh]}><Text style={{ fontSize: 34 }}>{catEmoji(catOf(it))}</Text></View>}
                    <View style={s.priceTag}><Text style={s.priceTxt}>{priceText(it)}</Text></View>
                    <TouchableOpacity style={s.favBtn} onPress={() => toggleFav(it)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={C.red} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={s.cardTitle} numberOfLines={2}>{it.title || 'Untitled'}</Text>
                    <Text style={s.cardLoc} numberOfLines={1}>📍 {cityOf(it) || '—'}{catOf(it) ? ' · ' + catOf(it) : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {items.length > visible && (
            <View style={s.moreWrap}>
              <TouchableOpacity style={[s.btnGhost, s.btnLg]} onPress={() => setVisible((v) => v + 24)} activeOpacity={0.85}>
                <Text style={s.btnGhostTxt}>Load more{scope === 'businesses' ? ' businesses' : ' listings'}  +{Math.min(24, items.length - visible)}</Text>
              </TouchableOpacity>
            </View>
          )}
          </>
        )}
      </View>

      {/* FEATURED BUSINESSES */}
      {biz.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>Featured businesses</Text>
          <Text style={s.secSub}>Real entries from the Sabalist directory.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
            {biz.map((b) => (
              <TouchableOpacity key={b.id} style={s.biz} onPress={() => navigation?.navigate('BusinessDetail', { businessId: b.id })} activeOpacity={0.9}>
                {imgOf(b)
                  ? <Image source={{ uri: imgOf(b) }} style={s.bizImg} resizeMode="cover" />
                  : <View style={[s.bizImg, s.bizMono]}><Text style={s.bizMonoTxt}>{(b.title || '?').charAt(0)}</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.bizName} numberOfLines={1}>{b.title || 'Business'}</Text>
                  <Text style={s.bizCat} numberOfLines={1}>{catOf(b) || 'Business'}{cityOf(b) ? ' · ' + cityOf(b) : ''}</Text>
                  <View style={s.bizChip}><Text style={s.bizChipTxt}>In directory</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* BROWSE BY PLACE */}
      {places.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>Browse by place</Text>
          <Text style={s.secSub}>Popular across Africa and the diaspora.</Text>
          <View style={s.locs}>
            {places.map((p) => (
              <TouchableOpacity key={p.cslug + p.citySlug} style={s.locPill} onPress={() => goPlace(p)} activeOpacity={0.85}>
                <Text style={s.locPillTxt}>📍 {p.name}</Text>
                <Text style={s.locPillCc}>{p.cc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* SELL BAND */}
      <View style={s.sellBand}>
        <Text style={s.sellTitle}>Got something to sell? Post it free in 60 seconds.</Text>
        <Text style={s.sellSub}>Reach buyers across Africa and the diaspora. No fees, no commission — add photos, set your price, and get contacted directly.</Text>
        <TouchableOpacity style={[s.btnGold, s.btnLg, { alignSelf: 'flex-start' }]} onPress={goPost} activeOpacity={0.9}>
          <Text style={s.btnGoldTxt}>＋ Post your ad — free</Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER */}
      <View style={s.footer}>
        <View style={s.footBrand}>
          <Image source={logoAsset} style={s.footLogo} resizeMode="contain" />
          <Text style={s.footWord}>Sabalist</Text>
        </View>
        <Text style={s.footNote}>Africa's marketplace and business directory. Buy, sell, and get discovered — across the continent and the diaspora.</Text>
        <View style={s.footRow}>
          <View style={s.footCol}>
            <Text style={s.footH}>MARKETPLACE</Text>
            <TouchableOpacity onPress={() => setScope('marketplace')}><Text style={s.footLink}>All listings</Text></TouchableOpacity>
            <TouchableOpacity onPress={goPost}><Text style={s.footLink}>Post an ad</Text></TouchableOpacity>
          </View>
          <View style={s.footCol}>
            <Text style={s.footH}>DIRECTORY</Text>
            <TouchableOpacity onPress={() => setScope('businesses')}><Text style={s.footLink}>Find a business</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      </View>
    </ScrollView>

    <LocationSelector
      visible={locOpen}
      onClose={() => setLocOpen(false)}
      onLocationSelected={(loc) => { setUserLocation(loc); setLocOpen(false); }}
      userId={user?.uid}
    />
    <LanguageModal isVisible={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

const W = Dimensions.get('window').width;
const GAP = 14;
const H_PAD = 16;
const IS_SMALL = W < 480;
const CONTENT_MAX = 500;
const CONTENT_W = Math.min(W, CONTENT_MAX);
const CARD_W = (CONTENT_W - H_PAD * 2 - GAP) / 2;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 100, alignItems: 'center' },
  inner: { width: '100%', maxWidth: CONTENT_MAX },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: IS_SMALL ? 14 : H_PAD, paddingBottom: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 },
  logo: { width: IS_SMALL ? 36 : 46, height: IS_SMALL ? 36 : 46, marginRight: IS_SMALL ? 8 : 10 },
  word: { fontSize: IS_SMALL ? 19 : 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5, lineHeight: IS_SMALL ? 21 : 24 },
  tag: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  acct: { width: IS_SMALL ? 36 : 40, height: IS_SMALL ? 36 : 40, borderRadius: IS_SMALL ? 18 : 20, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: IS_SMALL ? 6 : 8 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 3, height: IS_SMALL ? 36 : 40, paddingHorizontal: IS_SMALL ? 9 : 11, borderRadius: 999, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, marginRight: IS_SMALL ? 6 : 8 },
  langCode: { fontWeight: '800', fontSize: IS_SMALL ? 12 : 13, color: C.ink, letterSpacing: 0.3 },
  postBtn: { backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: IS_SMALL ? 13 : 16, paddingVertical: IS_SMALL ? 8 : 10, shadowColor: C.gold6, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  postBtnTxt: { fontWeight: '800', color: C.goldTxt, fontSize: IS_SMALL ? 13 : 14 },

  hero: { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 6 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  eyeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.good, marginRight: 8 },
  eyebrow: { color: C.red, fontWeight: '800', fontSize: 11, letterSpacing: 0.6 },
  h1: { fontSize: 34, lineHeight: 38, fontWeight: '800', color: C.ink, letterSpacing: -1 },
  sub: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },

  searchCard: { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.line2, padding: 12, marginTop: 18, shadowColor: C.red7, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 4 },
  seg: { flexDirection: 'row', backgroundColor: C.bg2, borderRadius: 999, padding: 4, marginBottom: 10 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  segBtnOn: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  segTxt: { fontWeight: '700', color: C.muted, fontSize: 13 },
  segTxtOn: { color: C.red },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: 14, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 13, paddingRight: 12, fontSize: 15, color: C.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: 14, marginBottom: 10, paddingVertical: 2 },
  locTxt: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '600' },
  searchBtn: { backgroundColor: C.red, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  searchBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  segNote: { fontSize: 12, color: '#9A8E82', marginTop: 10, marginHorizontal: 2 },

  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  btnGold: { backgroundColor: C.gold, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold6, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  btnGoldTxt: { fontWeight: '800', color: C.goldTxt, fontSize: 15 },
  btnGhost: { backgroundColor: C.surface, borderRadius: 999, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  btnGhostTxt: { fontWeight: '800', color: C.ink, fontSize: 15 },
  btnLg: { paddingHorizontal: 22, paddingVertical: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  statChip: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  goodDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.good, marginRight: 8 },
  statNum: { fontSize: 18, fontWeight: '800', color: C.ink },
  statLbl: { fontSize: 11.5, color: C.muted, fontWeight: '600', marginTop: 1 },

  proof: { marginTop: 26, paddingVertical: 22, paddingHorizontal: H_PAD, backgroundColor: C.bg2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  proofGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  pcell: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  big: { fontWeight: '800', fontSize: 30, color: C.ink, lineHeight: 34 },
  sfx: { color: C.red },
  lab: { fontSize: 13, color: C.muted, fontWeight: '600', marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillTxt: { fontWeight: '600', fontSize: 12.5, color: C.ink },

  section: { paddingHorizontal: H_PAD, marginTop: 26 },
  h2: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 6 },
  secSub: { color: C.muted, fontSize: 13.5, marginTop: 6, marginBottom: 12, lineHeight: 19 },

  paths: { gap: 14 },
  path: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  pathMkt: { backgroundColor: C.mktTint, borderColor: C.mktBorder },
  pathDir: {},
  pathIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pathIcTxt: { fontSize: 24 },
  pathCount: { fontWeight: '800', fontSize: 13, color: C.ink, marginTop: 8 },

  catChip: { alignItems: 'center', marginRight: 16, width: 76 },
  catIconWrap: { width: 60, height: 60, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 7, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  catLbl: { fontSize: 12, fontWeight: '600', color: C.ink, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: CARD_W, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, marginBottom: GAP, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardPhoto: { width: '100%', height: CARD_W * 0.82, backgroundColor: C.bg2, justifyContent: 'flex-end' },
  cardImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardPh: { alignItems: 'center', justifyContent: 'center' },
  priceTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(23,19,17,0.92)', borderTopRightRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  favBtn: { position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 17, minHeight: 34 },
  cardLoc: { fontSize: 11, color: C.muted, marginTop: 4 },
  empty: { paddingVertical: 36, textAlign: 'center', color: C.muted, fontWeight: '600' },
  moreWrap: { alignItems: 'center', marginTop: 20 },

  biz: { width: 240, flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, marginRight: 12, alignItems: 'flex-start' },
  bizImg: { width: 46, height: 46, borderRadius: 13 },
  bizMono: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.red },
  bizMonoTxt: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bizName: { fontSize: 14, fontWeight: '700', color: C.ink },
  bizCat: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  bizChip: { alignSelf: 'flex-start', backgroundColor: C.bg2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  bizChipTxt: { fontSize: 10, fontWeight: '700', color: C.muted },

  locs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  locPillTxt: { fontWeight: '600', fontSize: 14, color: C.ink },
  locPillCc: { color: C.muted, fontWeight: '700', fontSize: 12 },

  sellBand: { margin: H_PAD, marginTop: 28, backgroundColor: C.red7, borderRadius: 24, padding: 24 },
  sellTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 27 },
  sellSub: { color: '#ffe9e9', fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 18 },

  footer: { backgroundColor: C.ink, paddingHorizontal: H_PAD, paddingTop: 28, paddingBottom: 34, marginTop: 10 },
  footBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  footLogo: { width: 42, height: 42 },
  footWord: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  footNote: { color: '#B6A899', fontSize: 13.5, lineHeight: 20, marginBottom: 20 },
  footRow: { flexDirection: 'row', gap: 40 },
  footCol: {},
  footH: { color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  footLink: { color: '#CDBFB0', fontSize: 14, paddingVertical: 5 },
});
