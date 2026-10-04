import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';

// Platform-aware business fetch. Reads the `businesses` collection ONLY — this
// screen is completely separate from the Marketplace ListingDetail screen.
let getBusinessById;
if (Platform.OS === 'web') {
  getBusinessById = require('../services/listings.web').getBusinessById;
} else {
  getBusinessById = require('../services/listings').getBusinessById;
}

const tr = (t, key, fallback) => {
  const v = t(key);
  return v && v !== key ? v : fallback;
};

// Normalize a phone into digits for wa.me / tel:. Returns '' if unusable.
const phoneDigits = (b) => {
  const raw = b?.phoneE164 || b?.phoneNumber || b?.phone || '';
  const d = String(raw).replace(/[^\d+]/g, '').replace(/^\+/, '');
  return d.length >= 6 ? d : '';
};
const websiteUrl = (b) => {
  let w = (b?.website || b?.domain || b?.sourceUrl || '').trim();
  if (!w) return '';
  if (!/^https?:\/\//i.test(w)) w = 'https://' + w;
  return w;
};

export default function BusinessDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { businessId } = route.params || {};
  const [biz, setBiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getBusinessById(businessId);
        if (alive) setBiz(data);
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load business');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [businessId]);

  const name = biz?.title || biz?.sellerName || tr(t, 'business.untitled', 'Business');

  // Set the web document title for SEO/sharing without pulling in a heavy SEO dep.
  useEffect(() => {
    if (Platform.OS === 'web' && biz && typeof document !== 'undefined') {
      document.title = `${name} · Sabalist Business Directory`;
    }
  }, [biz, name]);

  const openMaps = useCallback(() => {
    if (biz?.latitude == null || biz?.longitude == null) return;
    const q = `${biz.latitude},${biz.longitude}`;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }, [biz]);

  const onShare = useCallback(async () => {
    const url = websiteUrl(biz);
    const loc = biz?.location || [biz?.city, biz?.country].filter(Boolean).join(', ');
    const message = `${name}${loc ? ' — ' + loc : ''}${url ? '\n' + url : ''}`;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: name, text: message, url: url || undefined });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(message);
        }
      } else {
        await Share.share({ message });
      }
    } catch (_) { /* user cancelled — ignore */ }
  }, [biz, name]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.accent} />
      </View>
    );
  }
  if (error || !biz) {
    return (
      <View style={styles.center}>
        <Ionicons name="business-outline" size={56} color={PREMIUM_COLORS.muted} />
        <Text style={styles.errorTitle}>{tr(t, 'business.notFound', 'Business not found')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtnText}>{tr(t, 'navigation.back', 'Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const phone = phoneDigits(biz);
  const email = (biz.email || '').trim();
  const website = websiteUrl(biz);
  const hasCoords = biz.latitude != null && biz.longitude != null;
  const photo = biz.coverImage || (Array.isArray(biz.images) && biz.images[0]) || '';
  const category = biz.category || biz.categoryId || '';
  const subcategory = biz.subcategory || '';
  const address = biz.address || biz.location || '';
  const social = biz.socialMedia || biz.social || null; // usually absent → hidden

  // A row that renders nothing when its value is empty (graceful hide).
  const Row = ({ icon, label, value }) => {
    if (value == null || value === '') return null;
    return (
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={PREMIUM_COLORS.muted} style={styles.rowIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{String(value)}</Text>
        </View>
      </View>
    );
  };

  const ActionBtn = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top bar — pad for the status bar / notch so the back button is tappable */}
      <View style={[styles.topbar, { paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 8) }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={PREMIUM_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>{tr(t, 'business.title', 'Business')}</Text>
        <TouchableOpacity onPress={onShare} style={styles.iconBtn}>
          <Ionicons name="share-social-outline" size={22} color={PREMIUM_COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}>
        {/* Photo / logo, or a graceful placeholder */}
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="business" size={56} color={PREMIUM_COLORS.accent} />
          </View>
        )}

        <View style={styles.body}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {biz.businessVerified ? (
              <Ionicons name="checkmark-circle" size={20} color="#188038" style={{ marginLeft: 6 }} />
            ) : null}
          </View>

          {/* Category chips */}
          {(category || subcategory) ? (
            <View style={styles.chipRow}>
              {category ? <View style={styles.chip}><Text style={styles.chipText}>{category}</Text></View> : null}
              {subcategory ? <View style={styles.chip}><Text style={styles.chipText}>{subcategory}</Text></View> : null}
            </View>
          ) : null}

          {/* Actions — each hidden if the data is missing */}
          <View style={styles.actionsRow}>
            {phone ? <ActionBtn icon="call" label={tr(t, 'business.call', 'Call')} color="#188038" onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
            {phone ? <ActionBtn icon="logo-whatsapp" label="WhatsApp" color="#25D366" onPress={() => Linking.openURL(`https://wa.me/${phone}`)} /> : null}
            {email ? <ActionBtn icon="mail" label={tr(t, 'business.email', 'Email')} color="#1A73E8" onPress={() => Linking.openURL(`mailto:${email}`)} /> : null}
            {website ? <ActionBtn icon="globe-outline" label={tr(t, 'business.website', 'Website')} color="#5F6368" onPress={() => Linking.openURL(website)} /> : null}
            {hasCoords ? <ActionBtn icon="navigate" label={tr(t, 'business.directions', 'Map')} color="#E8710A" onPress={openMaps} /> : null}
          </View>

          {/* Description */}
          {biz.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr(t, 'business.about', 'About')}</Text>
              <Text style={styles.description}>{biz.description}</Text>
            </View>
          ) : null}

          {/* Details — every row self-hides when empty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr(t, 'business.details', 'Details')}</Text>
            <Row icon="pricetag-outline" label={tr(t, 'business.category', 'Category')} value={category} />
            <Row icon="location-outline" label={tr(t, 'business.address', 'Address')} value={address} />
            <Row icon="business-outline" label={tr(t, 'business.city', 'City')} value={biz.city} />
            <Row icon="map-outline" label={tr(t, 'business.region', 'Region/State')} value={biz.region} />
            <Row icon="flag-outline" label={tr(t, 'business.country', 'Country')} value={biz.country} />
            <Row icon="call-outline" label={tr(t, 'business.phone', 'Phone')} value={biz.phoneE164 || biz.phoneNumber} />
            <Row icon="mail-outline" label={tr(t, 'business.email', 'Email')} value={email} />
            <Row icon="globe-outline" label={tr(t, 'business.website', 'Website')} value={website} />
            {hasCoords ? <Row icon="pin-outline" label={tr(t, 'business.coordinates', 'Coordinates')} value={`${biz.latitude}, ${biz.longitude}`} /> : null}
          </View>

          {/* Opening hours — only if the data exists (imported profiles usually lack it) */}
          {biz.openingHours || biz.hours ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr(t, 'business.hours', 'Opening hours')}</Text>
              <Text style={styles.description}>{typeof (biz.openingHours || biz.hours) === 'string' ? (biz.openingHours || biz.hours) : JSON.stringify(biz.openingHours || biz.hours)}</Text>
            </View>
          ) : null}

          {/* Social links — only if present */}
          {social && typeof social === 'object' && Object.values(social).some(Boolean) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr(t, 'business.social', 'Social media')}</Text>
              {Object.entries(social).filter(([, v]) => v).map(([k, v]) => (
                <TouchableOpacity key={k} onPress={() => Linking.openURL(String(v))}>
                  <Text style={styles.link}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Claim CTA — only for claimable, unverified businesses */}
          {biz.claimable && !biz.businessVerified ? (
            <View style={styles.claimBox}>
              <Ionicons name="ribbon-outline" size={20} color={PREMIUM_COLORS.accent} />
              <Text style={styles.claimText}>{tr(t, 'business.claimPrompt', 'Is this your business? Claim it to manage your profile.')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PREMIUM_COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: PREMIUM_COLORS.bg },
  errorTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: PREMIUM_COLORS.text },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: PREMIUM_COLORS.accent },
  backBtnText: { color: '#fff', fontWeight: '700' },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: PREMIUM_SPACING.base, paddingVertical: PREMIUM_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.card, borderBottomWidth: 1, borderBottomColor: PREMIUM_COLORS.border,
  },
  iconBtn: { padding: 6 },
  topbarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: PREMIUM_COLORS.text },
  scroll: { paddingBottom: 40 },
  photo: { width: '100%', height: 200, backgroundColor: '#EEE' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF3F6' },
  body: { padding: PREMIUM_SPACING.base },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 22, fontWeight: '800', color: PREMIUM_COLORS.text },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#E8F0FE', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  chipText: { color: '#1A73E8', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18, marginBottom: 4 },
  actionBtn: { alignItems: 'center', width: 64 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actionLabel: { fontSize: 11, color: PREMIUM_COLORS.text, fontWeight: '600' },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PREMIUM_COLORS.text, marginBottom: 10 },
  description: { fontSize: 14, lineHeight: 21, color: PREMIUM_COLORS.muted },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  rowIcon: { marginRight: 12, marginTop: 2 },
  rowLabel: { fontSize: 11, color: PREMIUM_COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 14, color: PREMIUM_COLORS.text, marginTop: 1 },
  link: { fontSize: 14, color: '#1A73E8', paddingVertical: 4 },
  claimBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24,
    backgroundColor: '#FDF3F6', borderRadius: PREMIUM_RADIUS.lg, padding: PREMIUM_SPACING.base,
    borderWidth: 1, borderColor: PREMIUM_COLORS.accent,
  },
  claimText: { flex: 1, fontSize: 13, color: PREMIUM_COLORS.text },
});
