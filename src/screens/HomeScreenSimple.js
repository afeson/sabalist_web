import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToFavorites,
  addToFavorites,
  removeFromFavorites
} from '../services/favoritesService';
import { getCategoryId } from '../config/categoryMapping';
import { CATEGORIES, getCategoryByKey } from '../config/categories';
import { getTranslatedCategoryLabel } from '../utils/categoryI18n';
import CategorySelector from '../components/CategorySelector';
import LocationSelector from '../components/LocationSelector';
import { getUserLocation } from '../services/locationService';
import SEO from '../components/SEO';
import { generateWebsiteSchema, generateOrganizationSchema } from '../utils/seo';
import { getActiveCountries } from '../config/cityRoutes';
import { getNavChips, getFlags } from '../config/runtimeConfig';
import { useConfigVersion } from '../contexts/ConfigContext';
import HomeSections from '../components/home/HomeSections';

// Platform-aware listings imports
let searchListings;
if (Platform.OS === 'web') {
  const listingsWeb = require('../services/listings.web');
  searchListings = listingsWeb.searchListings;
} else {
  const listingsNative = require('../services/listings');
  searchListings = listingsNative.searchListings;
}
import { ListingCard } from '../components/ui';

// Android phone-specific responsive metrics. We deliberately gate on
// (Android && width < 600dp) so tablets and iOS keep their existing
// layout exactly. The bottom padding must clear the floating + button
// in MainTabNavigator (centerButton 60dp tall, lifted -20dp above the
// 70dp tab bar -> needs ~140dp of safe space at the end of the list).
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_ANDROID_PHONE = Platform.OS === 'android' && SCREEN_WIDTH < 600;
// Compact, listings-first hero (~60% smaller footprint): single-size title,
// tight padding, subtitle hidden on mobile so listings surface immediately.
const HERO_TITLE_SIZE = IS_ANDROID_PHONE ? 16 : 20;
const HERO_TITLE_LINE = IS_ANDROID_PHONE ? 20 : 25;
const HERO_SUBTITLE_SIZE = IS_ANDROID_PHONE ? 12 : 13;
const HERO_PAD = IS_ANDROID_PHONE ? PREMIUM_SPACING.base : PREMIUM_SPACING.base;
const SECTION_H_PAD = IS_ANDROID_PHONE ? PREMIUM_SPACING.base : PREMIUM_SPACING.xl;
const SEARCH_PAD = IS_ANDROID_PHONE ? PREMIUM_SPACING.sm : PREMIUM_SPACING.base;
const SEARCH_FONT = IS_ANDROID_PHONE ? 14 : 15;
const CATEGORY_ICON_SIZE = IS_ANDROID_PHONE ? 44 : 52;
const CATEGORY_PILL_WIDTH = IS_ANDROID_PHONE ? 66 : 78;
const CATEGORY_TEXT_SIZE = IS_ANDROID_PHONE ? 11 : 12;
const CATEGORY_GAP = IS_ANDROID_PHONE ? PREMIUM_SPACING.xs : PREMIUM_SPACING.sm;
const LIST_PAD = IS_ANDROID_PHONE ? PREMIUM_SPACING.sm : PREMIUM_SPACING.base;
// Floating + button + tab bar clearance.
const LIST_BOTTOM_PAD = IS_ANDROID_PHONE ? 140 : 100;

export default function HomeScreenSimple({ navigation }) {
  const { t, i18n } = useTranslation();
  const [, forceUpdate] = useState(0);

  // Force re-render when language changes (even if screen is already focused)
  useEffect(() => {
    forceUpdate(n => n + 1);
  }, [i18n.language]);

  // Also re-render when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, [i18n.language])
  );

  // Re-render when backend config refreshes (nav chips, sections, flags, …).
  const configVersion = useConfigVersion();
  const flags = getFlags();

  // Responsive grid: web shows more columns on wider screens (mobile stays 2-up).
  // Combined with the compact card, this fills the first viewport with listings.
  const { width: winW } = useWindowDimensions();
  const numCols = Platform.OS !== 'web' ? 2 : winW < 640 ? 2 : winW < 980 ? 3 : winW < 1340 ? 4 : 5;
  const cardWidthPct = numCols === 2 ? '48%' : numCols === 3 ? '32%' : numCols === 4 ? '24%' : '19%';

  // Build the horizontal category strip from backend-driven nav chips. Each
  // chip is a category key (resolved to its live icon/label, hidden ones
  // dropped), plus the virtual 'All' and trailing 'All Categories' pills. The
  // jobs chip is gated by the showJobs feature flag.
  const CATEGORY_STRIP = useMemo(() => {
    const out = [];
    for (const chip of getNavChips()) {
      if (chip === 'All') {
        out.push({ id: 'All', key: 'All', label: t('categories.all') || 'All', icon: 'apps' });
      } else if (chip === '__more__') {
        out.push({ id: '__more__', key: '__more__', label: t('categories.allCategories') || 'All Categories', icon: 'grid' });
      } else {
        const cat = getCategoryByKey(chip);
        if (!cat || cat.hidden) continue;
        if (cat.id === 'jobs' && flags.showJobs === false) continue;
        out.push({ id: cat.key, key: cat.key, label: getTranslatedCategoryLabel(cat.key, t, cat.label), icon: cat.icon });
      }
    }
    return out;
  }, [t, configVersion, flags.showJobs]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  const loadListings = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      // Convert display name to normalized ID
      const categoryId = selectedCategory === 'All'
        ? null
        : getCategoryId(selectedCategory);

      const items = await searchListings(
        searchQuery || searchText,
        categoryId,
        null,         // minPrice
        null,         // maxPrice
        null,         // subcategoryId
        userLocation  // NEW: pass user location
      );
      setListings(items || []);
    } catch (err) {
      console.warn('Failed to load listings', err);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, selectedCategory, userLocation]);

  useEffect(() => {
    loadListings();
  }, [selectedCategory]);

  // Subscribe to favorites
  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }
    const unsubscribe = subscribeToFavorites(user.uid, setFavoriteIds);
    return () => unsubscribe();
  }, [user?.uid]);

  // Load user location
  useEffect(() => {
    if (!user?.uid) {
      setUserLocation(null);
      return;
    }
    const loadLocation = async () => {
      const location = await getUserLocation(user.uid);
      setUserLocation(location);
      // Auto-show selector if no location set
      if (!location) {
        setShowLocationSelector(true);
      }
    };
    loadLocation();
  }, [user?.uid]);

  // Reload listings when location changes
  useEffect(() => {
    if (userLocation) {
      loadListings();
    }
  }, [userLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleSearch = () => {
    loadListings(searchText);
  };

  const handleFavoriteToggle = async (listingId, newFavoritedState) => {
    console.log('🟢 handleFavoriteToggle called:', { listingId, newFavoritedState, userId: user?.uid });
    if (!user?.uid) {
      console.warn('⚠️ No signed-in user; favorites require sign in.');
      // 'Auth' is not a registered route in MainTabNavigator; signed-out
      // users never reach this screen anyway (App.js shows AuthScreen).
      // Surface the issue so it's not a silent fail.
      if (Platform.OS === 'web') {
        window.alert('Please sign in to save favorites.');
      }
      return;
    }
    try {
      if (newFavoritedState) {
        await addToFavorites(user.uid, listingId);
      } else {
        await removeFromFavorites(user.uid, listingId);
      }
      console.log('✅ Favorite toggle succeeded');
    } catch (error) {
      console.error('❌ Error toggling favorite:', error.code, error.message);
      // Show the user the failure reason instead of swallowing it.
      const detail = error.code === 'permission-denied'
        ? 'Permission denied. Check Firestore rules.'
        : error.message || 'Unknown error';
      if (Platform.OS === 'web') {
        window.alert(`Could not update favorite: ${detail}`);
      }
    }
  };

  const renderCategory = ({ item }) => {
    const isMore = item.id === '__more__';
    const isActive = !isMore && selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryPill,
          isActive && styles.categoryPillActive,
          isMore && styles.categoryPillMore,
        ]}
        onPress={() => {
          if (isMore) {
            setCategoryPickerOpen(true);
            return;
          }
          if (item.id === 'All') {
            setSelectedCategory(item.id);
          } else {
            navigation.navigate('SubCategories', { category: item.id });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.categoryIconWrap,
          isActive && styles.categoryIconWrapActive,
          isMore && styles.categoryIconWrapMore,
        ]}>
          <Ionicons
            name={item.icon}
            size={18}
            color={isActive || isMore ? '#FFFFFF' : PREMIUM_COLORS.accent}
          />
        </View>
        <Text
          style={[
            styles.categoryText,
            isActive && styles.categoryTextActive,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderListing = ({ item }) => {
    // DEBUG: Confirm this code is running
    console.log('🏠 HOME renderListing using ListingCard for:', item?.id);
    return (
      <View style={[styles.listingCardWrapper, Platform.OS === 'web' && { width: cardWidthPct }]}>
        <ListingCard
          listing={item}
          onPress={() => navigation?.navigate('ListingDetail', { listingId: item.id })}
          isFavorited={favoriteIds.includes(item.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
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
        <Ionicons name="basket-outline" size={64} color={PREMIUM_COLORS.muted} />
        <Text style={styles.emptyTitle}>{t('home.noListings') || 'No listings yet'}</Text>
        <Text style={styles.emptyText}>{t('home.beFirst') || 'Be the first to post!'}</Text>
      </View>
    );
  };

  const isWeb = Platform.OS === 'web';

  // Hero + search + location + category strip. On web this becomes the
  // FlatList's ListHeaderComponent so the entire screen scrolls together
  // (fixes "page won't scroll" — wheel over the header now scrolls). On native
  // it renders fixed above the list (unchanged behavior).
  const topSections = (
    <View>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle} numberOfLines={1}>{t('home.heroTitle') || 'Discover Something Extraordinary'}</Text>
        {isWeb && (
          <Text style={styles.heroSubtitle} numberOfLines={1}>
            {t('home.heroSubtitle') || 'Browse thousands of listings from sellers across Africa'}
          </Text>
        )}
      </View>

      {/* Search Card */}
      <View style={styles.searchCard}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={PREMIUM_COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search') || 'Search for anything...'}
            placeholderTextColor={PREMIUM_COLORS.muted}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color={PREMIUM_COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location Selector Button */}
      {user && (
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocationSelector(true)}
        >
          <Ionicons name="location" size={16} color={PREMIUM_COLORS.accent} />
          <Text style={styles.locationText}>
            {userLocation
              ? `${userLocation.city}, ${userLocation.state}`
              : 'Set Location'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={PREMIUM_COLORS.muted} />
        </TouchableOpacity>
      )}

      {/* Category Pills */}
      <View style={styles.categorySection}>
        <FlatList
          data={CATEGORY_STRIP}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Backend-driven homepage sections (banners, featured, trending). Renders
          nothing by default — opt-in via marketplace_config home.sections. */}
      <HomeSections navigation={navigation} configVersion={configVersion} onSeeAll={() => setCategoryPickerOpen(true)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <SEO
        title="Buy & Sell across Africa"
        description="Sabalist is Africa's marketplace. Buy and sell electronics, vehicles, real estate, fashion and more."
        canonicalUrl="/"
        jsonLd={[generateWebsiteSchema(), generateOrganizationSchema()]}
      />
      <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.bg} />

      <AppHeader navigation={navigation} />

      {/* Hero/search/categories/featured/trending render INSIDE the list header
          on BOTH web and native, so the whole page is one scroll surface — the
          Featured/Trending carousels scroll up and out of the way to reveal
          listings, instead of sitting in a fixed header that covers them. */}

      {/* Listings Grid */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        numColumns={numCols}
        key={`grid-${numCols}`}
        style={isWeb ? styles.listWeb : undefined}
        ListHeaderComponent={topSections}
        contentContainerStyle={styles.listingContent}
        columnWrapperStyle={styles.listingRow}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={Platform.OS === 'web' && flags.showRegionsNav !== false ? (
          <View style={styles.seoCityLinks}>
            <Text style={styles.seoCityLinksTitle}>Browse by City</Text>
            {Object.entries(getActiveCountries()).map(([countrySlug, country]) => (
              <View key={countrySlug} style={styles.seoCityCountryBlock}>
                <Text style={styles.seoCityCountryName}>{country.name}</Text>
                <View style={styles.seoCityRow}>
                  {Object.entries(country.cities).map(([citySlug, city]) => (
                    <a
                      key={citySlug}
                      href={`/${countrySlug}/${citySlug}/electronics`}
                      style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none', marginRight: 14, marginBottom: 4 }}
                    >
                      {city.name}
                    </a>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PREMIUM_COLORS.accent]} />
        }
      />

      {/* Location Selector Modal */}
      <LocationSelector
        visible={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onLocationSelected={(location) => {
          setUserLocation(location);
          setShowLocationSelector(false);
        }}
        userId={user?.uid}
      />

      {/* Searchable category picker (long-tail navigation) */}
      <CategorySelector
        visible={categoryPickerOpen}
        selectedKey={selectedCategory}
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={(key) => {
          setCategoryPickerOpen(false);
          navigation.navigate('SubCategories', { category: key });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.bg,
    overflow: 'hidden', // prevent horizontal overflow on narrow Android phones
    // Web: allow the flex children (the listings FlatList) to shrink below
    // their content size so the list's own scroll area gets a bounded height
    // instead of collapsing. Native uses default min-height (auto).
    ...(Platform.OS === 'web' ? { minHeight: 0 } : null),
  },
  // Web-only: the listings FlatList must take the remaining column height so its
  // internal scroll area resolves to a non-zero height. Without this it renders
  // at clientHeight 0 on web and the page cannot scroll up/down. No native change.
  listWeb: {
    flex: 1,
    minHeight: 0,
  },
  heroSection: {
    paddingHorizontal: HERO_PAD,
    paddingTop: PREMIUM_SPACING.sm,
    paddingBottom: PREMIUM_SPACING.sm,
  },
  heroTitle: {
    fontSize: HERO_TITLE_SIZE,
    fontWeight: '800',
    color: PREMIUM_COLORS.text,
    lineHeight: HERO_TITLE_LINE,
    marginBottom: PREMIUM_SPACING.sm,
  },
  heroSubtitle: {
    fontSize: HERO_SUBTITLE_SIZE,
    color: PREMIUM_COLORS.muted,
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: PREMIUM_COLORS.card,
    marginHorizontal: SECTION_H_PAD,
    marginBottom: PREMIUM_SPACING.sm,
    borderRadius: PREMIUM_RADIUS.lg,
    padding: SEARCH_PAD,
    ...PREMIUM_SHADOWS.card,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: SEARCH_FONT,
    color: PREMIUM_COLORS.text,
    padding: 0,
  },
  categorySection: {
    marginBottom: PREMIUM_SPACING.xs,
  },
  categoryList: {
    paddingHorizontal: SECTION_H_PAD,
    paddingVertical: PREMIUM_SPACING.xs,
    gap: CATEGORY_GAP,
  },
  categoryPill: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: CATEGORY_PILL_WIDTH,
    paddingHorizontal: 4,
    paddingVertical: PREMIUM_SPACING.xs,
  },
  categoryPillActive: {},
  categoryPillMore: {},
  categoryIconWrap: {
    width: CATEGORY_ICON_SIZE,
    height: CATEGORY_ICON_SIZE,
    borderRadius: CATEGORY_ICON_SIZE / 2,
    backgroundColor: PREMIUM_COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border,
    marginBottom: 6,
    ...PREMIUM_SHADOWS.card,
  },
  categoryIconWrapActive: {
    backgroundColor: PREMIUM_COLORS.accent,
    borderColor: PREMIUM_COLORS.accent,
  },
  categoryIconWrapMore: {
    backgroundColor: PREMIUM_COLORS.text,
    borderColor: PREMIUM_COLORS.text,
  },
  categoryText: {
    fontSize: CATEGORY_TEXT_SIZE,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: PREMIUM_COLORS.accent,
    fontWeight: '700',
  },
  listingContent: {
    padding: LIST_PAD,
    paddingBottom: LIST_BOTTOM_PAD,
  },
  listingRow: {
    justifyContent: 'space-between',
    marginBottom: PREMIUM_SPACING.sm,
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
  },
  emptyText: {
    fontSize: 15,
    color: PREMIUM_COLORS.muted,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.card,
    paddingHorizontal: PREMIUM_SPACING.md,
    paddingVertical: PREMIUM_SPACING.sm,
    borderRadius: PREMIUM_RADIUS.md,
    marginHorizontal: SECTION_H_PAD,
    marginBottom: PREMIUM_SPACING.md,
    ...PREMIUM_SHADOWS.card,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginLeft: PREMIUM_SPACING.xs,
    marginRight: PREMIUM_SPACING.xs,
    flex: 1,
  },
  seoCityLinks: {
    paddingTop: PREMIUM_SPACING.xl,
    paddingBottom: PREMIUM_SPACING.base,
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border,
    marginTop: PREMIUM_SPACING.base,
  },
  seoCityLinksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PREMIUM_COLORS.muted,
    marginBottom: 12,
  },
  seoCityCountryBlock: {
    marginBottom: 10,
  },
  seoCityCountryName: {
    fontSize: 13,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    marginBottom: 4,
  },
  seoCityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
