import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import { ListingCard } from '../components/ui';
import { getCategoryIcon } from '../config/categories';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToFavorites, addToFavorites, removeFromFavorites } from '../services/favoritesService';
import SEO from '../components/SEO';
import { generateCityItemListSchema, generateBreadcrumbSchema, generateFaqSchema } from '../utils/seo';
import {
  getCountryBySlug,
  getCityBySlug,
  getCategoryForSeoSlug,
  generateSeoContent,
  SEO_COUNTRIES,
  SEO_CATEGORY_SLUGS,
} from '../config/cityRoutes';

export default function CityListingsScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { country: countrySlug, city: citySlug, category: categorySlug } = route.params;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [, forceUpdate] = useState(0);

  // Resolve slugs to data
  const countryData = getCountryBySlug(countrySlug);
  const cityData = getCityBySlug(countrySlug, citySlug);
  const categoryData = getCategoryForSeoSlug(categorySlug);

  const isValid = countryData && cityData && categoryData;
  const seoContent = isValid
    ? generateSeoContent(countryData.name, cityData.name, categoryData.name)
    : null;

  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  // Subscribe to listings filtered by category, then client-side filter by city
  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const q = query(
      collection(db, 'listings'),
      where('categoryId', '==', categorySlug),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side filter by city location
      items = items.filter(item => {
        if (!item.location) return false;
        const loc = item.location.toLowerCase();
        return cityData.matchTerms.some(term => loc.includes(term.toLowerCase()));
      });

      setListings(items);
      setLoading(false);
    }, (error) => {
      console.error('CityListings error:', error);
      setListings([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [countrySlug, citySlug, categorySlug, isValid]);

  // Subscribe to favorites
  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }
    const unsubscribe = subscribeToFavorites(user.uid, (ids) => {
      setFavoriteIds(ids);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const handleFavoriteToggle = async (listingId, newFavoritedState) => {
    if (!user?.uid) {
      navigation.navigate('Auth');
      return;
    }
    try {
      if (newFavoritedState) {
        await addToFavorites(user.uid, listingId);
      } else {
        await removeFromFavorites(user.uid, listingId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Invalid route
  if (!isValid) {
    return (
      <View style={styles.container}>
        <SEO title="Page Not Found" noIndex />
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + PREMIUM_SPACING.xs : PREMIUM_SPACING.md }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PREMIUM_COLORS.accent} />
            <Text style={styles.backLabel}>{t('common.back') || 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={PREMIUM_COLORS.muted} />
          <Text style={styles.emptyTitle}>Page not found</Text>
        </View>
      </View>
    );
  }

  const renderListing = ({ item }) => (
    <View style={styles.listingCardWrapper}>
      <ListingCard
        listing={item}
        onPress={() => navigation?.navigate('ListingDetail', { listingId: item.id })}
        isFavorited={favoriteIds.includes(item.id)}
        onFavoriteToggle={handleFavoriteToggle}
      />
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* SEO content block (visible on web for crawlers) */}
      {Platform.OS === 'web' && seoContent && (
        <View style={styles.seoBlock}>
          <Text style={styles.seoH1}>{seoContent.h1}</Text>
          <Text style={styles.seoParagraph}>{seoContent.introText}</Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (Platform.OS !== 'web' || !seoContent) return null;

    // All categories except current
    const otherCategories = Object.entries(SEO_CATEGORY_SLUGS)
      .filter(([slug]) => slug !== categorySlug);

    // Same category in all cities across all countries
    const crossCountryCities = [];
    for (const [cSlug, cData] of Object.entries(SEO_COUNTRIES)) {
      for (const [ciSlug, ciData] of Object.entries(cData.cities)) {
        if (cSlug === countrySlug && ciSlug === citySlug) continue;
        crossCountryCities.push({ countrySlug: cSlug, citySlug: ciSlug, cityName: ciData.name, countryName: cData.name });
      }
    }

    return (
      <View style={styles.footerContent}>
        {/* Body paragraphs - SEO long-form content */}
        <View style={styles.seoBodySection}>
          {seoContent.bodyParagraphs.map((p, i) => (
            <Text key={i} style={styles.seoBodyText}>{p}</Text>
          ))}
        </View>

        {/* FAQ Section */}
        {seoContent.faqs && seoContent.faqs.length > 0 && (
          <View style={styles.faqSection}>
            <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
            {seoContent.faqs.map((faq, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>
            Have {categoryData.name.toLowerCase()} to sell in {cityData.name}?
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('CreateListing')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Post a Free Listing</Text>
          </TouchableOpacity>
        </View>

        {/* Internal links - All categories in this city */}
        <View style={styles.internalLinks}>
          <Text style={styles.linksHeading}>
            Browse more in {cityData.name}
          </Text>
          <View style={styles.linksRow}>
            {otherCategories.map(([slug, name]) => (
              <a key={slug} href={`/${countrySlug}/${citySlug}/${slug}`} style={linkStyle}>
                {name}
              </a>
            ))}
          </View>

          {/* Same category across all countries/cities */}
          <Text style={styles.linksHeading}>
            {categoryData.name} in other cities
          </Text>
          <View style={styles.linksRow}>
            {crossCountryCities.map(({ countrySlug: cs, citySlug: cis, cityName: cn, countryName: con }) => (
              <a key={`${cs}-${cis}`} href={`/${cs}/${cis}/${categorySlug}`} style={linkStyle}>
                {cn}, {con}
              </a>
            ))}
          </View>

          {/* Breadcrumb text links */}
          <View style={styles.breadcrumbRow}>
            <a href="/" style={linkStyle}>Home</a>
            <Text style={styles.breadcrumbSep}>&gt;</Text>
            <a href={`/${countrySlug}/${citySlug}/electronics`} style={linkStyle}>{countryData.name}</a>
            <Text style={styles.breadcrumbSep}>&gt;</Text>
            <a href={`/${countrySlug}/${citySlug}/electronics`} style={linkStyle}>{cityData.name}</a>
            <Text style={styles.breadcrumbSep}>&gt;</Text>
            <Text style={styles.breadcrumbCurrent}>{categoryData.name}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={PREMIUM_COLORS.accent} />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basket-outline" size={48} color={PREMIUM_COLORS.muted} />
        <Text style={styles.emptyTitle}>
          No {categoryData.name.toLowerCase()} listings in {cityData.name} yet
        </Text>
        <Text style={styles.emptyText}>
          Be the first to post in this area!
        </Text>
        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={styles.emptyCtaButton}
            onPress={() => navigation.navigate('CreateListing')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Post the First Listing</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SEO
        title={seoContent.title}
        description={seoContent.description}
        canonicalUrl={`/${countrySlug}/${citySlug}/${categorySlug}`}
        jsonLd={[
          generateCityItemListSchema(listings, categoryData.name, cityData.name, countryData.name),
          generateBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: countryData.name, url: `/${countrySlug}/${Object.keys(countryData.cities)[0]}/electronics` },
            { name: cityData.name, url: `/${countrySlug}/${citySlug}/electronics` },
            { name: categoryData.name, url: `/${countrySlug}/${citySlug}/${categorySlug}` },
          ]),
          generateFaqSchema(seoContent.faqs),
        ]}
      />
      <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.card} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + PREMIUM_SPACING.xs : PREMIUM_SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={PREMIUM_COLORS.accent} />
          <Text style={styles.backLabel}>{t('common.back') || 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={getCategoryIcon(categoryData.name)} size={24} color={PREMIUM_COLORS.accent} />
          <Text style={styles.headerTitle}>{categoryData.name}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Listings Grid */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        numColumns={2}
        contentContainerStyle={styles.listingContent}
        columnWrapperStyle={listings.length > 0 ? styles.listingRow : null}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const linkStyle = {
  color: '#6B7280',
  fontSize: 13,
  textDecoration: 'none',
  marginRight: 12,
  marginBottom: 6,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PREMIUM_COLORS.card,
    paddingHorizontal: PREMIUM_SPACING.base,
    paddingVertical: PREMIUM_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
    ...PREMIUM_SHADOWS.card,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PREMIUM_SPACING.xs,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: PREMIUM_COLORS.accent,
    marginLeft: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
  },
  seoBlock: {
    paddingHorizontal: PREMIUM_SPACING.base,
    paddingTop: PREMIUM_SPACING.base,
    paddingBottom: PREMIUM_SPACING.sm,
  },
  seoH1: {
    fontSize: 22,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginBottom: 6,
  },
  seoParagraph: {
    fontSize: 14,
    color: PREMIUM_COLORS.muted,
    lineHeight: 20,
  },
  listingContent: {
    padding: PREMIUM_SPACING.base,
    paddingBottom: 100,
  },
  listingRow: {
    justifyContent: 'space-between',
    marginBottom: PREMIUM_SPACING.base,
  },
  listingCardWrapper: {
    width: '48%',
    overflow: 'visible',
    zIndex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PREMIUM_SPACING.xxxl,
  },
  loadingText: {
    marginTop: PREMIUM_SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: PREMIUM_COLORS.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PREMIUM_SPACING.xxxl,
    paddingHorizontal: PREMIUM_SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginTop: PREMIUM_SPACING.base,
    marginBottom: PREMIUM_SPACING.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: PREMIUM_COLORS.muted,
    textAlign: 'center',
  },
  footerContent: {
    marginTop: PREMIUM_SPACING.base,
  },
  seoBodySection: {
    paddingBottom: PREMIUM_SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
  },
  seoBodyText: {
    fontSize: 14,
    color: PREMIUM_COLORS.muted,
    lineHeight: 22,
    marginBottom: 12,
  },
  faqSection: {
    paddingTop: PREMIUM_SPACING.base,
    paddingBottom: PREMIUM_SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.text,
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: PREMIUM_COLORS.muted,
    lineHeight: 21,
  },
  ctaSection: {
    paddingVertical: PREMIUM_SPACING.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 16,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  internalLinks: {
    paddingTop: PREMIUM_SPACING.xl,
    paddingBottom: PREMIUM_SPACING.base,
  },
  linksHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.muted,
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border,
    marginTop: 8,
  },
  breadcrumbSep: {
    fontSize: 12,
    color: PREMIUM_COLORS.muted,
    marginHorizontal: 6,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: PREMIUM_COLORS.text,
    fontWeight: '600',
  },
});
