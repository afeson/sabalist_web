/**
 * HomeScreenSimple.web.js — WEB-ONLY redesigned Sabalist homepage.
 *
 * Metro resolves `.web.js` over `.js` on web, so this replaces the home ONLY on
 * the website. Native (iOS/Android) keeps src/screens/HomeScreenSimple.js
 * unchanged. Renders as real DOM (this app already mixes DOM <a> in RN-Web) for
 * full design fidelity, wired to the SAME real data + navigation the app uses:
 *   - searchListings / searchBusinesses (services/listings.web) — real inventory
 *   - navigation: SubCategories / ListingDetail / BusinessDetail / CreateListing
 *   - live counts via Firestore getCountFromServer
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { addToFavorites, removeFromFavorites, subscribeToFavorites } from '../services/favoritesService';
import { getCategoryByKey } from '../config/categories';
import { getTranslatedCategoryLabel } from '../utils/categoryI18n';
import { getNavChips, getFlags } from '../config/runtimeConfig';
import { getActiveCountries } from '../config/cityRoutes';
import { getUserLocation } from '../services/locationService';
import LocationSelector from '../components/LocationSelector';
import SEO from '../components/SEO';
import { generateWebsiteSchema, generateOrganizationSchema } from '../utils/seo';
import { searchListings, searchBusinesses } from '../services/listings.web';
import { track } from '../utils/analytics';
import { firestore } from '../lib/firebase.web';
import { collection, getCountFromServer } from 'firebase/firestore';
import logoAsset from '../../assets/branding/sabalist-logo-clean.png';

const LOGO =
  typeof logoAsset === 'string'
    ? logoAsset
    : (logoAsset && logoAsset.uri) ||
      (Image.resolveAssetSource ? Image.resolveAssetSource(logoAsset).uri : logoAsset);

const CAT_EMOJI = {
  vehicles: '🚗', 'real-estate': '🏠', 'property-rentals': '🏠', property: '🏠',
  phones: '📱', electronics: '💻', computers: '🖥️', fashion: '👗', beauty: '💄',
  'home-garden': '🛋️', furniture: '🛋️', services: '🧰', jobs: '💼', food: '🍲',
  'baby-kids': '🧸', pets: '🐾', sports: '⚽', books: '📚', health: '➕',
  agriculture: '🌾', construction: '🧱', travel: '✈️', education: '🎓', community: '🫂',
};
const catEmoji = (k) => CAT_EMOJI[k] || '🏷️';

const FALLBACK_COUNTS = { listings: 27482, businesses: 3045190 };

function priceText(it) {
  if (it.displayPriceText) return it.displayPriceText;
  const amt = it.amount ?? it.price;
  if (amt && Number(amt) > 0) {
    const cur = it.currency || 'USD';
    return `${cur} ${Number(amt).toLocaleString()}`;
  }
  return 'Call for price';
}
const imgOf = (it) => it.coverImage || (Array.isArray(it.images) && it.images[0]) || '';
const cityOf = (it) => it.city || it.location || '';
const catOf = (it) => it.categoryId || it.category || '';

export default function HomeScreenSimple({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const flags = getFlags();

  const [scope, setScope] = useState('marketplace'); // 'marketplace' | 'businesses'
  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState([]);
  const [counts, setCounts] = useState(FALLBACK_COUNTS);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(48);
  const qRef = useRef('');

  // Category strip from backend-driven nav chips (same source as the app).
  const categories = useMemo(() => {
    const out = [];
    for (const chip of getNavChips()) {
      if (chip === 'All' || chip === '__more__') continue;
      const cat = getCategoryByKey(chip);
      if (!cat || cat.hidden) continue;
      if (cat.id === 'jobs' && flags.showJobs === false) continue;
      out.push({ key: cat.key, label: getTranslatedCategoryLabel(cat.key, t, cat.label), icon: cat.icon });
    }
    return out;
  }, [t, flags.showJobs]);

  const loadFeed = useCallback(async (q) => {
    const query = typeof q === 'string' ? q : qRef.current;
    setLoading(true);
    try {
      const engine = scope === 'businesses' ? searchBusinesses : searchListings;
      const res = await engine(query, null, null, null, null, userLocation);
      setItems(Array.isArray(res) ? res : []);
      setVisible(48); // reset the initial page size whenever the feed reloads
    } catch (e) {
      console.warn('home.loadFeed failed', e && e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, userLocation]);

  useEffect(() => { loadFeed(); }, [scope, userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Featured businesses row (independent of the main scope) — real directory data.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await searchBusinesses('', null, null, null, null, null);
        if (alive) setBiz((Array.isArray(res) ? res : []).slice(0, 12));
      } catch (e) { /* non-fatal */ }
    })();
    return () => { alive = false; };
  }, []);

  // Live counts (fallback to known values on any failure).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [l, b] = await Promise.all([
          getCountFromServer(collection(firestore, 'listings')),
          getCountFromServer(collection(firestore, 'businesses')),
        ]);
        if (alive) setCounts({
          listings: l.data().count || FALLBACK_COUNTS.listings,
          businesses: b.data().count || FALLBACK_COUNTS.businesses,
        });
      } catch (e) { /* keep fallback */ }
    })();
    return () => { alive = false; };
  }, []);

  // Favorites + location (same services as the app).
  useEffect(() => {
    if (!user?.uid) { setFavoriteIds([]); return; }
    const unsub = subscribeToFavorites(user.uid, setFavoriteIds);
    return () => unsub && unsub();
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) { setUserLocation(null); return; }
    (async () => { try { setUserLocation(await getUserLocation(user.uid)); } catch (e) {} })();
  }, [user?.uid]);

  // Load the premium fonts once.
  useEffect(() => {
    try {
      if (typeof document !== 'undefined' && !document.getElementById('sb-fonts')) {
        const link = document.createElement('link');
        link.id = 'sb-fonts'; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }
    } catch (e) {}
  }, []);

  // Every Post CTA (header, hero, sell-band, footer) funnels through goPost, so
  // emitting the GA4 `post_ad_click` here fires exactly once per intentional Post
  // click — the top of the funnel Sabalist Watch reads. track() is web-only and a
  // no-op if gtag is blocked, and never throws, so navigation is unaffected.
  const goPost = () => {
    try { track('post_ad_click', { source: 'homepage' }); } catch (_) {}
    navigation?.navigate('CreateListing');
  };
  const nav = (route) => { setMenuOpen(false); navigation?.navigate(route); };
  const goCategory = (key) => navigation?.navigate('SubCategories', { category: key });
  const openItem = (it) => (scope === 'businesses' || it.type === 'business')
    ? navigation?.navigate('BusinessDetail', { businessId: it.id })
    : navigation?.navigate('ListingDetail', { listingId: it.id });
  const onSearch = () => loadFeed(searchText);
  const toggleFav = async (e, it) => {
    e.preventDefault(); e.stopPropagation();
    if (!user?.uid) { try { window.alert('Please sign in to save favorites.'); } catch (_) {} return; }
    const on = favoriteIds.includes(it.id);
    try { on ? await removeFromFavorites(user.uid, it.id) : await addToFavorites(user.uid, it.id); } catch (_) {}
  };

  const n = (v) => (v == null ? '—' : Number(v).toLocaleString());
  const hero1 = items[0], hero2 = items[1];

  return (
    <>
      <SEO
        title="Africa's Marketplace & Business Directory"
        description="Sabalist is the community marketplace and business directory for Africa and the African diaspora — buy and sell anything, and find trusted local businesses."
        canonicalUrl="/"
        jsonLd={[generateWebsiteSchema(), generateOrganizationSchema()]}
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sbhome">
        {/* HEADER */}
        <header className="sb-top">
          <div className="sb-wrap sb-topbar">
            <a className="sb-brand" href="#" onClick={(e) => e.preventDefault()} aria-label="Sabalist home">
              <img className="sb-mark" src={LOGO} alt="Sabalist logo" />
              <span><span className="sb-word">Sabalist</span><span className="sb-tag">Marketplace &amp; Directory</span></span>
            </a>
            <nav className="sb-nav">
              <a href="#sb-market" onClick={(e)=>{e.preventDefault();setScope('marketplace');}}>Marketplace</a>
              <a href="#sb-dir" onClick={(e)=>{e.preventDefault();setScope('businesses');}}>Directory</a>
              <a href="#sb-cats" onClick={(e)=>e.preventDefault()}>Categories</a>
            </nav>
            <div className="sb-top-actions">
              <div className="sb-acct-wrap">
                <button
                  className="sb-acct"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={user ? 'Your account' : 'Account & sign in'}
                >
                  <Ionicons name="person-outline" size={19} color="#1C1714" />
                  <Ionicons name="chevron-down" size={13} color="#6E635A" />
                </button>
                {menuOpen && (
                  <>
                    <div className="sb-acct-backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="sb-menu" role="menu">
                      {user ? (
                        <>
                          <div className="sb-menu-hd">{user.displayName || user.email || 'Your account'}</div>
                          <button role="menuitem" onClick={() => nav('Favorites')}><Ionicons name="heart-outline" size={18} color="#6E635A" /><span>Favorites</span></button>
                          <button role="menuitem" onClick={() => nav('MyListings')}><Ionicons name="list-outline" size={18} color="#6E635A" /><span>My Listings</span></button>
                          <button role="menuitem" onClick={() => nav('Profile')}><Ionicons name="person-outline" size={18} color="#6E635A" /><span>Profile &amp; account</span></button>
                        </>
                      ) : (
                        <>
                          <button role="menuitem" className="sb-menu-primary" onClick={() => nav('Profile')}><Ionicons name="log-in-outline" size={18} color="#D81F26" /><span>Sign in</span></button>
                          <div className="sb-menu-sep" />
                          <button role="menuitem" onClick={() => nav('Favorites')}><Ionicons name="heart-outline" size={18} color="#6E635A" /><span>Favorites</span></button>
                          <button role="menuitem" onClick={() => nav('MyListings')}><Ionicons name="list-outline" size={18} color="#6E635A" /><span>My Listings</span></button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button className="sb-gold" onClick={goPost}>＋ Post Free</button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="sb-hero">
          <div className="sb-wrap sb-hero-grid">
            <div>
              <span className="sb-eyebrow"><span className="sb-dot" /> Africa&rsquo;s Marketplace &amp; Business Directory</span>
              <h1 className="sb-h1">Buy, sell &amp; discover <span className="sb-u">across Africa</span> <span className="sb-g">&amp; the diaspora.</span></h1>
              <p className="sb-lede">One place to trade anything and find trusted local businesses — from Lagos and Nairobi to Washington and London.</p>

              <div className="sb-searchcard" role="search">
                <div className="sb-seg">
                  <button className={scope==='marketplace'?'on':''} onClick={()=>{setScope('marketplace');}}>🏷️ Marketplace</button>
                  <button className={scope==='businesses'?'on':''} onClick={()=>{setScope('businesses');}}>🏢 Businesses</button>
                </div>
                <div className="sb-search-row">
                  <label className="sb-field">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
                    <input value={searchText} onChange={(e)=>setSearchText(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter')onSearch();}}
                      placeholder={scope==='businesses'?'Search businesses & services…':'Search items for sale…'} />
                  </label>
                  <button className="sb-field sb-loc" onClick={()=> user ? setLocOpen(true) : window.alert('Sign in to set your location.')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>
                    <span className="sb-loc-txt">{userLocation ? `${userLocation.city||''}${userLocation.state?', '+userLocation.state:''}` : 'All locations'}</span>
                  </button>
                  <button className="sb-red" onClick={onSearch}>Search</button>
                </div>
                <p className="sb-seg-note">{scope==='businesses' ? `Searching ${n(counts.businesses)} businesses across Africa & the diaspora.` : `Browsing ${n(counts.listings)} live listings — free, no sign-up needed.`}</p>
              </div>

              <div className="sb-cta-row">
                <button className="sb-gold sb-lg" onClick={goPost}>＋ Post your ad — free</button>
                <a className="sb-ghost sb-lg" href="#sb-market" onClick={(e)=>{e.preventDefault();setScope('marketplace');}}>Browse marketplace</a>
              </div>

              <div className="sb-chips">
                <div className="sb-chipstat"><div><div className="sb-cn">{n(counts.listings)}</div><div className="sb-cl">live listings</div></div></div>
                <div className="sb-chipstat"><div><div className="sb-cn">{n(counts.businesses)}</div><div className="sb-cl">businesses listed</div></div></div>
                <div className="sb-chipstat"><span className="sb-dot" /><div><div className="sb-cn">Free</div><div className="sb-cl">to post &amp; browse</div></div></div>
              </div>
            </div>

            <div className="sb-hero-visual" aria-hidden="true">
              <div className="sb-showcase">
                <img className="sb-biglogo" src={LOGO} alt="" />
                {hero1 && (
                  <div className="sb-float sb-f1" onClick={()=>openItem(hero1)}>
                    <div className="sb-ph">{imgOf(hero1) ? <img src={imgOf(hero1)} alt="" /> : <span className="sb-ph-g">{catEmoji(catOf(hero1))}</span>}<span className="sb-pricepill">{priceText(hero1)}</span></div>
                    <div className="sb-t">{hero1.title}</div><div className="sb-c">{cityOf(hero1)}</div>
                  </div>
                )}
                {hero2 && (
                  <div className="sb-float sb-f2" onClick={()=>openItem(hero2)}>
                    <div className="sb-ph">{imgOf(hero2) ? <img src={imgOf(hero2)} alt="" /> : <span className="sb-ph-g">{catEmoji(catOf(hero2))}</span>}<span className="sb-pricepill">{priceText(hero2)}</span></div>
                    <div className="sb-t">{hero2.title}</div><div className="sb-c">{cityOf(hero2)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="sb-proof">
          <div className="sb-wrap">
            <div className="sb-proof-grid">
              <div className="sb-pcell"><span className="sb-big">{n(counts.listings)}</span><span className="sb-lab">items for sale right now</span></div>
              <div className="sb-pcell"><span className="sb-big">{Math.round(counts.businesses/1e6*10)/10}M<span className="sb-sfx">+</span></span><span className="sb-lab">businesses in the directory</span></div>
              <div className="sb-pcell"><span className="sb-big">Africa<span className="sb-sfx"> +</span></span><span className="sb-lab">&amp; the global diaspora</span></div>
              <div className="sb-pcell"><span className="sb-big">60<span className="sb-sfx">s</span></span><span className="sb-lab">to post an ad, free</span></div>
            </div>
            <div className="sb-badges">
              <span className="sb-pill">✓ No sign-up to browse</span>
              <span className="sb-pill">✓ Contact sellers by Call &amp; WhatsApp</span>
              <span className="sb-pill">✓ Free organic listings</span>
              <span className="sb-pill">✓ Verified business profiles</span>
            </div>
          </div>
        </section>

        {/* TWO PATHS */}
        <section className="sb-wrap" id="sb-market">
          <div className="sb-sec-head"><div><h2 className="sb-h2">Two ways to use Sabalist</h2><p className="sb-sub">Trade with people nearby, or find a business to hire.</p></div></div>
          <div className="sb-paths">
            <a className="sb-path sb-mkt" href="#sb-market" onClick={(e)=>{e.preventDefault();setScope('marketplace');}}>
              <div className="sb-ic sb-ic-r">🏷️</div>
              <h3 className="sb-h3">Marketplace</h3>
              <p className="sb-sub">Buy &amp; sell cars, phones, furniture, fashion, property and more — directly with people near you.</p>
              <span className="sb-count">{n(counts.listings)} live listings →</span>
            </a>
            <a className="sb-path sb-dir" href="#sb-dir" onClick={(e)=>{e.preventDefault();setScope('businesses');}}>
              <div className="sb-ic sb-ic-g">🏢</div>
              <h3 className="sb-h3">Business Directory</h3>
              <p className="sb-sub">Find and contact trusted salons, restaurants, tradespeople, shops and services across the continent.</p>
              <span className="sb-count">{n(counts.businesses)} businesses →</span>
            </a>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="sb-wrap" id="sb-cats">
          <div className="sb-sec-head"><div><h2 className="sb-h2">Browse by category</h2></div></div>
          <div className="sb-cats">
            {categories.map((c) => (
              <a className="sb-cat" key={c.key} href="#" onClick={(e)=>{e.preventDefault();goCategory(c.key);}}>
                <span className="sb-ci"><Ionicons name={c.icon || 'pricetag-outline'} size={26} color="#D81F26" /></span><span>{c.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* FRESH LISTINGS / BUSINESSES (real) */}
        <section className="sb-wrap" id="sb-dir">
          <div className="sb-sec-head">
            <div><h2 className="sb-h2">{scope==='businesses' ? 'Businesses in the directory' : 'Fresh on the marketplace'}</h2>
              <p className="sb-sub">{scope==='businesses' ? 'Real shops & services you can contact now.' : 'Real items posted by people across the community.'}</p></div>
          </div>
          {loading ? (
            <div className="sb-loading">Loading real listings…</div>
          ) : items.length === 0 ? (
            <div className="sb-loading">No results yet — try another category or search.</div>
          ) : (
            <>
            <div className="sb-grid">
              {items.slice(0, visible).map((it) => (
                <a className="sb-card" key={it.id} href="#" onClick={(e)=>{e.preventDefault();openItem(it);}}>
                  <div className="sb-cph">
                    {imgOf(it) ? <img src={imgOf(it)} alt={it.title} loading="lazy" /> : <span className="sb-ph-g">{catEmoji(catOf(it))}</span>}
                    <span className="sb-scrim" />
                    <span className="sb-price">{priceText(it)}</span>
                    <span className="sb-fav" onClick={(e)=>toggleFav(e,it)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={favoriteIds.includes(it.id)?'currentColor':'none'} stroke="currentColor" strokeWidth="2.2"><path d="M12 20s-7-4.6-9.2-9A4.8 4.8 0 0 1 12 6.3 4.8 4.8 0 0 1 21.2 11c-2.2 4.4-9.2 9-9.2 9Z"/></svg>
                    </span>
                  </div>
                  <div className="sb-cbody">
                    <div className="sb-ctitle">{it.title || 'Untitled'}</div>
                    <div className="sb-cloc">📍 {cityOf(it) || '—'}{catOf(it) ? ' · ' + catOf(it) : ''}</div>
                  </div>
                </a>
              ))}
            </div>
            {items.length > visible && (
              <div className="sb-more">
                <button className="sb-ghost sb-lg" onClick={() => setVisible((v) => v + 48)}>
                  Load more{scope === 'businesses' ? ' businesses' : ' listings'}
                  <span className="sb-more-ct">+{Math.min(48, items.length - visible)}</span>
                </button>
              </div>
            )}
            </>
          )}
        </section>

        {/* FEATURED BUSINESSES (real names) */}
        {biz.length > 0 && (
          <section className="sb-wrap">
            <div className="sb-sec-head"><div><h2 className="sb-h2">Featured businesses</h2><p className="sb-sub">Real entries from the Sabalist directory.</p></div></div>
            <div className="sb-bizrow">
              {biz.map((b) => (
                <a className="sb-biz" key={b.id} href="#" onClick={(e)=>{e.preventDefault();navigation?.navigate('BusinessDetail',{businessId:b.id});}}>
                  {imgOf(b) ? <img className="sb-bimg" src={imgOf(b)} alt="" /> : <span className="sb-mono">{(b.title||'?').charAt(0)}</span>}
                  <span><span className="sb-bn">{b.title || 'Business'}</span><span className="sb-bc">{(catOf(b)||'Business')}{cityOf(b)?' · '+cityOf(b):''}</span>
                    <span className="sb-claim">In directory</span></span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* LOCATIONS (real routes) */}
        <section className="sb-wrap">
          <div className="sb-sec-head"><div><h2 className="sb-h2">Browse by place</h2><p className="sb-sub">Popular across Africa and the diaspora.</p></div></div>
          <div className="sb-locs">
            {Object.entries(getActiveCountries()).slice(0, 4).map(([cslug, country]) =>
              Object.entries(country.cities || {}).slice(0, 3).map(([citySlug, city]) => (
                <a className="sb-loc-pill" key={cslug+citySlug} href={`/${cslug}/${citySlug}/electronics`}>📍 {city.name} <span className="sb-cc">{(country.name||'').slice(0,2).toUpperCase()}</span></a>
              ))
            )}
          </div>
        </section>

        {/* SELL BAND */}
        <section className="sb-wrap" id="sb-sell">
          <div className="sb-sell">
            <h2 className="sb-h2 sb-white">Got something to sell? Post it free in 60 seconds.</h2>
            <p className="sb-sell-p">Reach buyers across Africa and the diaspora. No fees, no commission — add photos, set your price, and get contacted directly.</p>
            <div className="sb-cta-row"><button className="sb-gold sb-lg" onClick={goPost}>＋ Post your ad — free</button></div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="sb-foot">
          <div className="sb-wrap sb-foot-grid">
            <div>
              <div className="sb-foot-brand"><img className="sb-fmark" src={LOGO} alt="" /><span className="sb-word sb-white">Sabalist</span></div>
              <p className="sb-foot-note">Africa&rsquo;s marketplace and business directory. Buy, sell, and get discovered — across the continent and the diaspora.</p>
            </div>
            <div className="sb-fcol"><h4>Marketplace</h4><a href="#" onClick={(e)=>{e.preventDefault();setScope('marketplace');}}>All listings</a><a href="#" onClick={(e)=>{e.preventDefault();goPost();}}>Post an ad</a></div>
            <div className="sb-fcol"><h4>Directory</h4><a href="#" onClick={(e)=>{e.preventDefault();setScope('businesses');}}>Find a business</a></div>
          </div>
        </footer>
      </div>

      <LocationSelector
        visible={locOpen}
        onClose={() => setLocOpen(false)}
        onLocationSelected={(loc) => { setUserLocation(loc); setLocOpen(false); }}
        userId={user?.uid}
      />
    </>
  );
}

const CSS = `
.sbhome{height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#FBF7F1;color:#1C1714;
  font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.5;
  --red:#D81F26;--red7:#AE161C;--gold:#F2B01E;--gold6:#E09A08;--ink:#171311;--bg2:#F4EDE3;--surface:#fff;--line:#ECE2D4;--line2:#E3D6C4;--muted:#6E635A;--good:#1E8E5A}
.sbhome *{box-sizing:border-box}
.sbhome a{color:inherit;text-decoration:none}
.sbhome img{max-width:100%;display:block}
.sbhome h1,.sbhome h2,.sbhome h3{font-family:"Bricolage Grotesque","Plus Jakarta Sans",Georgia,serif;font-weight:800;line-height:1.05;letter-spacing:-.015em;margin:0}
.sbhome .sb-wrap{max-width:1160px;margin:0 auto;padding-inline:16px;width:100%}
.sbhome .sb-eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--red);display:inline-flex;align-items:center;gap:8px}
.sbhome .sb-dot{width:8px;height:8px;border-radius:50%;background:var(--good);box-shadow:0 0 0 4px rgba(30,142,90,.16);display:inline-block}
.sbhome button{font:inherit;cursor:pointer}
.sbhome .sb-gold,.sbhome .sb-red,.sbhome .sb-ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:15px;border-radius:999px;padding:12px 20px;border:1px solid transparent;white-space:nowrap}
.sbhome .sb-gold{background:linear-gradient(180deg,#F8C23A,var(--gold));color:#3b2a06;box-shadow:0 6px 18px -6px rgba(224,154,8,.6)}
.sbhome .sb-red{background:linear-gradient(180deg,#E8343B,var(--red));color:#fff;box-shadow:0 8px 22px -8px rgba(174,22,28,.65)}
.sbhome .sb-ghost{background:var(--surface);color:var(--ink);border-color:var(--line2)}
.sbhome .sb-lg{padding:15px 26px;font-size:16px}
.sbhome .sb-top{position:sticky;top:0;z-index:40;background:rgba(251,247,241,.88);backdrop-filter:saturate(1.3) blur(12px);border-bottom:1px solid var(--line)}
.sbhome .sb-topbar{display:flex;align-items:center;gap:16px;padding-block:16px}
.sbhome .sb-brand{display:flex;align-items:center;gap:14px;margin-right:auto}
.sbhome .sb-mark{height:50px;width:auto;filter:drop-shadow(0 2px 5px rgba(23,19,17,.16))}
.sbhome .sb-word{font-family:"Bricolage Grotesque";font-weight:800;font-size:27px;letter-spacing:-.02em;line-height:1;display:block}
.sbhome .sb-tag{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:3px;display:block}
.sbhome .sb-nav{display:none;gap:22px}
.sbhome .sb-nav a{font-weight:600;font-size:14px;color:var(--muted)}
.sbhome .sb-top-actions{display:flex;align-items:center;gap:10px}
.sbhome .sb-acct-wrap{position:relative}
.sbhome .sb-acct{display:inline-flex;align-items:center;gap:3px;height:44px;padding:0 12px;border-radius:999px;background:var(--surface);border:1px solid var(--line2);cursor:pointer}
.sbhome .sb-acct:hover{border-color:var(--red)}
.sbhome .sb-acct-backdrop{position:fixed;inset:0;z-index:50}
.sbhome .sb-menu{position:absolute;right:0;top:52px;z-index:51;min-width:224px;background:var(--surface);border:1px solid var(--line2);border-radius:16px;box-shadow:0 2px 4px rgba(23,19,17,.06),0 28px 60px -22px rgba(126,15,19,.3);padding:6px}
.sbhome .sb-menu-hd{font-size:12px;font-weight:700;color:var(--muted);padding:8px 12px 7px;margin-bottom:4px;border-bottom:1px solid var(--line);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbhome .sb-menu-sep{height:1px;background:var(--line);margin:4px 6px}
.sbhome .sb-menu button{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:11px 12px;border:none;background:none;border-radius:11px;font-weight:600;font-size:14px;color:var(--ink);cursor:pointer}
.sbhome .sb-menu button:hover{background:var(--bg2)}
.sbhome .sb-menu button.sb-menu-primary{color:var(--red)}
.sbhome .sb-hero{position:relative;padding-block:30px 18px;overflow:hidden}
.sbhome .sb-hero::before{content:"";position:absolute;inset:0;z-index:0;background:radial-gradient(70% 60% at 86% 8%,rgba(242,176,30,.20),transparent 60%),radial-gradient(90% 70% at 6% 0%,rgba(216,31,38,.14),transparent 55%)}
.sbhome .sb-hero-grid{position:relative;z-index:1;display:grid;grid-template-columns:1fr;gap:26px;align-items:center}
.sbhome .sb-h1{font-size:clamp(32px,8vw,56px);margin-top:14px}
.sbhome .sb-u{color:var(--red);white-space:nowrap}.sbhome .sb-g{color:var(--gold6)}
.sbhome .sb-lede{color:var(--muted);font-size:clamp(15px,3.6vw,18px);margin-top:14px;max-width:36ch}
.sbhome .sb-searchcard{margin-top:22px;background:var(--surface);border:1px solid var(--line2);border-radius:26px;box-shadow:0 2px 4px rgba(23,19,17,.06),0 28px 60px -22px rgba(126,15,19,.26);padding:12px;max-width:620px}
.sbhome .sb-seg{display:inline-flex;background:var(--bg2);border-radius:999px;padding:4px;gap:2px;margin-bottom:10px}
.sbhome .sb-seg button{border:0;background:transparent;font-weight:700;font-size:13.5px;color:var(--muted);padding:8px 16px;border-radius:999px}
.sbhome .sb-seg button.on{background:var(--surface);color:var(--red);box-shadow:0 1px 2px rgba(23,19,17,.05)}
.sbhome .sb-search-row{display:flex;gap:8px;flex-wrap:wrap}
.sbhome .sb-field{flex:1 1 220px;display:flex;align-items:center;gap:10px;background:#FBF6EF;border:1px solid var(--line);border-radius:14px;padding:12px 14px;min-width:0;color:var(--muted)}
.sbhome .sb-field input{border:0;background:transparent;font:inherit;color:var(--ink);width:100%;outline:none;min-width:0}
.sbhome .sb-loc{flex:0 1 190px;color:var(--ink);font-weight:600}.sbhome .sb-loc-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sbhome .sb-search-row .sb-red{flex:0 0 auto}
.sbhome .sb-seg-note{font-size:12.5px;color:#9A8E82;margin:10px 2px 2px}
.sbhome .sb-cta-row{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}
.sbhome .sb-chips{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.sbhome .sb-chipstat{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 14px;box-shadow:0 1px 2px rgba(23,19,17,.05),0 10px 30px -12px rgba(23,19,17,.14)}
.sbhome .sb-cn{font-family:"Bricolage Grotesque";font-weight:800;font-size:18px;line-height:1}
.sbhome .sb-cl{font-size:11.5px;color:var(--muted);font-weight:600}
.sbhome .sb-hero-visual{display:none}
.sbhome .sb-showcase{position:relative;min-height:380px}
.sbhome .sb-biglogo{height:220px;width:auto;position:absolute;right:7%;top:-6px;filter:drop-shadow(0 22px 40px rgba(174,22,28,.30))}
.sbhome .sb-float{position:absolute;background:var(--surface);border:1px solid var(--line2);border-radius:18px;box-shadow:0 2px 4px rgba(23,19,17,.06),0 28px 60px -22px rgba(126,15,19,.26);padding:12px;width:240px;cursor:pointer}
.sbhome .sb-float .sb-ph{height:120px;border-radius:12px;margin-bottom:10px;position:relative;overflow:hidden;background:var(--bg2);display:grid;place-items:center;font-size:40px}
.sbhome .sb-float .sb-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sbhome .sb-t{font-weight:700;font-size:14px}.sbhome .sb-c{font-size:12px;color:var(--muted)}
.sbhome .sb-pricepill{position:absolute;left:10px;bottom:10px;background:var(--ink);color:#fff;font-weight:800;font-size:12.5px;padding:4px 9px;border-radius:999px;z-index:2}
.sbhome .sb-f1{right:0;top:150px;z-index:3}.sbhome .sb-f2{right:150px;top:312px;z-index:2}
.sbhome section{padding-block:26px}
.sbhome .sb-sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px}
.sbhome .sb-h2{font-size:clamp(22px,5vw,30px)}
.sbhome .sb-h3{font-size:22px;margin-bottom:6px}
.sbhome .sb-sub{color:var(--muted);font-size:14px;margin:6px 0 0}
.sbhome .sb-proof{background:linear-gradient(180deg,var(--bg2),#FBF7F1);border-block:1px solid var(--line)}
.sbhome .sb-proof-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.sbhome .sb-pcell{display:flex;flex-direction:column;gap:3px}
.sbhome .sb-big{font-family:"Bricolage Grotesque";font-weight:800;font-size:clamp(26px,7vw,40px);line-height:1}
.sbhome .sb-sfx{color:var(--red)}
.sbhome .sb-lab{font-size:13px;color:var(--muted);font-weight:600}
.sbhome .sb-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
.sbhome .sb-pill{display:inline-flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--line2);border-radius:999px;padding:8px 13px;font-weight:600;font-size:13px}
.sbhome .sb-paths{display:grid;grid-template-columns:1fr;gap:14px}
.sbhome .sb-path{position:relative;border-radius:26px;padding:22px;border:1px solid var(--line2);background:var(--surface);box-shadow:0 1px 2px rgba(23,19,17,.05),0 10px 30px -12px rgba(23,19,17,.14);overflow:hidden}
.sbhome .sb-path.sb-mkt{background:linear-gradient(180deg,#fbeceb,var(--surface));border-color:#eeb9bb}
.sbhome .sb-ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;margin-bottom:14px;font-size:24px}
.sbhome .sb-ic-r{background:linear-gradient(180deg,#E8343B,var(--red))}
.sbhome .sb-ic-g{background:linear-gradient(180deg,#F8C23A,var(--gold))}
.sbhome .sb-count{font-weight:700;font-size:13px}
.sbhome .sb-cats{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.sbhome .sb-cat{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:9px;width:84px}
.sbhome .sb-ci{width:62px;height:62px;border-radius:20px;display:grid;place-items:center;font-size:26px;background:var(--surface);border:1px solid var(--line);box-shadow:0 1px 2px rgba(23,19,17,.05),0 10px 30px -12px rgba(23,19,17,.14)}
.sbhome .sb-cat span:last-child{font-size:12.5px;font-weight:600;text-align:center}
.sbhome .sb-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.sbhome .sb-more{display:flex;justify-content:center;margin-top:22px}
.sbhome .sb-more .sb-ghost{cursor:pointer}
.sbhome .sb-more-ct{margin-left:8px;font-size:13px;font-weight:700;color:var(--muted);background:var(--bg2);border-radius:999px;padding:2px 10px}
.sbhome .sb-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(23,19,17,.05),0 10px 30px -12px rgba(23,19,17,.14);display:block}
.sbhome .sb-cph{aspect-ratio:4/3;position:relative;display:grid;place-items:center;font-size:40px;background:var(--bg2)}
.sbhome .sb-cph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sbhome .sb-scrim{position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,rgba(0,0,0,.34));z-index:1}
.sbhome .sb-price{position:absolute;left:10px;bottom:10px;background:var(--ink);color:#fff;font-weight:800;font-size:13px;padding:5px 10px;border-radius:999px;z-index:2}
.sbhome .sb-fav{position:absolute;right:10px;top:10px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;color:var(--red);z-index:2}
.sbhome .sb-cbody{padding:11px 12px 13px}
.sbhome .sb-ctitle{font-weight:700;font-size:14.5px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.5em}
.sbhome .sb-cloc{font-size:12.5px;color:var(--muted);margin-top:5px}
.sbhome .sb-loading{padding:40px 0;text-align:center;color:var(--muted);font-weight:600}
.sbhome .sb-bizrow{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px}
.sbhome .sb-biz{flex:0 0 250px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 1px 2px rgba(23,19,17,.05),0 10px 30px -12px rgba(23,19,17,.14);display:flex;gap:12px;align-items:flex-start}
.sbhome .sb-mono{width:46px;height:46px;border-radius:13px;flex:none;display:grid;place-items:center;color:#fff;font-weight:800;font-family:"Bricolage Grotesque";font-size:18px;background:linear-gradient(140deg,#E8343B,#AE161C)}
.sbhome .sb-bimg{width:46px;height:46px;border-radius:13px;flex:none;object-fit:cover}
.sbhome .sb-bn{font-weight:700;font-size:15px;line-height:1.2;display:block}
.sbhome .sb-bc{font-size:12.5px;color:var(--muted);margin-top:3px;display:block}
.sbhome .sb-claim{font-size:11px;font-weight:700;color:var(--muted);background:var(--bg2);padding:3px 8px;border-radius:999px;margin-top:8px;display:inline-block}
.sbhome .sb-locs{display:flex;gap:10px;flex-wrap:wrap}
.sbhome .sb-loc-pill{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:14px;padding:11px 15px;font-weight:600;font-size:14px}
.sbhome .sb-cc{color:var(--muted);font-weight:700;font-size:12px}
.sbhome .sb-sell{position:relative;border-radius:26px;padding:28px 22px;overflow:hidden;color:#fff;background:radial-gradient(120% 140% at 85% 0%,#E8343B,var(--red7) 60%,#7E0F13);box-shadow:0 2px 4px rgba(23,19,17,.06),0 28px 60px -22px rgba(126,15,19,.26)}
.sbhome .sb-white{color:#fff}
.sbhome .sb-sell-p{color:#ffe9e9;margin:10px 0 18px;max-width:46ch}
.sbhome .sb-foot{background:var(--ink);color:#E9DFD4;margin-top:10px;padding-block:34px}
.sbhome .sb-foot-grid{display:grid;grid-template-columns:1fr;gap:22px}
.sbhome .sb-foot-brand{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.sbhome .sb-fmark{height:46px;width:auto;filter:drop-shadow(0 0 8px rgba(242,176,30,.30))}
.sbhome .sb-foot-note{color:#B6A899;font-size:13.5px;max-width:34ch;margin:0}
.sbhome .sb-fcol h4{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
.sbhome .sb-fcol a{display:block;color:#CDBFB0;font-size:14px;padding:5px 0}
@media(min-width:720px){
  .sbhome .sb-proof-grid{grid-template-columns:repeat(4,1fr)}
  .sbhome .sb-paths{grid-template-columns:1fr 1fr}
  .sbhome .sb-grid{grid-template-columns:repeat(3,1fr)}
  .sbhome .sb-foot-grid{grid-template-columns:2fr 1fr 1fr}
}
@media(min-width:960px){
  .sbhome{font-size:16px}
  .sbhome .sb-nav{display:flex}
  .sbhome .sb-hero{padding-block:46px 30px}
  .sbhome .sb-hero-grid{grid-template-columns:1.08fr .92fr;gap:40px}
  .sbhome .sb-hero-visual{display:block}
  .sbhome .sb-grid{grid-template-columns:repeat(4,1fr)}
  .sbhome .sb-mark{height:60px}
  .sbhome .sb-word{font-size:32px}
}
`;
