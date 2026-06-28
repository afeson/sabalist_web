/**
 * HomeSections — renders the backend-driven homepage layout (getHomeSections()).
 *
 * Each section has a `type`; this renderer maps known types to UI:
 *   - banner   -> <BannerCarousel/>
 *   - featured -> a category rail from getFeaturedCategories()
 *   - trending -> a category rail from getTrendingCategories() (flag-gated)
 *   - feed     -> null (the main listings list renders the feed itself)
 * Unknown types are skipped (forward-compatible). Renders nothing by default
 * (the bundled config has only a `feed` section).
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getHomeSections, getFeaturedCategories, getTrendingCategories, getFlags } from '../../config/runtimeConfig';
import { getCategoryById } from '../../config/categories';
import { getTranslatedCategoryLabel } from '../../utils/categoryI18n';
import { COLORS } from '../../theme';
import BannerCarousel from './BannerCarousel';

function CategoryRail({ title, categoryIds, t, navigation }) {
  const cats = (categoryIds || []).map((id) => getCategoryById(id)).filter((c) => c && !c.hidden);
  if (!cats.length) return null;
  return (
    <View style={styles.section}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {cats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('SubCategories', { category: c.key })}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={c.icon || 'apps'} size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.cardLabel} numberOfLines={1}>{getTranslatedCategoryLabel(c.key, t, c.label)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// configVersion is accepted only to force a re-render when config refreshes.
export default function HomeSections({ navigation, configVersion }) {
  const { t } = useTranslation();
  const flags = getFlags();

  return (
    <View>
      {getHomeSections().map((section) => {
        if (section.enabled === false) return null;
        switch (section.type) {
          case 'banner':
            return flags.showBanners === false ? null : <BannerCarousel key={section.id} />;
          case 'featured':
            return (
              <CategoryRail key={section.id} title={section.title || t('home.featured') || 'Featured'}
                categoryIds={getFeaturedCategories()} t={t} navigation={navigation} />
            );
          case 'trending':
            if (flags.enableTrending === false) return null;
            return (
              <CategoryRail key={section.id} title={section.title || t('home.trending') || 'Trending'}
                categoryIds={getTrendingCategories()} t={t} navigation={navigation} />
            );
          case 'feed':
          default:
            return null; // the main listings list renders the feed
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text || '#111', paddingHorizontal: 16, marginBottom: 8 },
  rail: { paddingHorizontal: 12 },
  card: { width: 88, alignItems: 'center', marginHorizontal: 4 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: (COLORS.primary || '#E50914') + '14',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  cardLabel: { fontSize: 12, color: COLORS.textMuted || '#555', textAlign: 'center' },
});
