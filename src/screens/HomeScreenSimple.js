import React, { useCallback, useEffect, useState } from 'react';
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
import { CATEGORIES } from '../config/categories';
import { getTranslatedCategoryLabel } from '../utils/categoryI18n';
import CategorySelector from '../components/CategorySelector';
import LocationSelector from '../components/LocationSelector';
import { getUserLocation } from '../services/locationService';
import SEO from '../components/SEO';
import { generateWebsiteSchema } from '../utils/seo';
import { SEO_COUNTRIES, SEO_CATEGORY_SLUGS } from '../config/cityRoutes';

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

  // Build the horizontal category strip from the source of truth.
  // The pill at position 0 is a virtual 'All' filter; the rest mirror
  // src/config/categories.js order. An 'All Categories' trailing pill opens
  // the searchable modal for the long tail.
  const CATEGORY_STRIP = [
    { id: 'All', key: 'All', label: t('categories.all') || 'All', icon: 'apps' },
    ...CATEGORIES.map((c) => ({
      id: c.key,
      key: c.key,
      label: getTranslatedCategoryLabel(c.key, t),
      icon: c.icon,
    })),
    { id: '__more__', key: '__more__', label: t('categories.allCategories') || 'All Categories', icon: 'grid' },
  ];
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
      <View style={styles.listingCardWrapper}>
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

  return (
    <View style={styles.container}>
      <SEO
        title="Buy & Sell across Africa"
        description="Sabalist is Africa's marketplace. Buy and sell electronics, vehicles, real estate, fashion and more."
        canonicalUrl="/"
        jsonLd={[generateWebsiteSchema()]}
      />
      <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.bg} />

      <AppHeader navigation={navigation} />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>{t('home.heroTitle') || 'Discover Something\nExtraordinary'}</Text>
        <Text style={styles.heroSubtitle}>
          {t('home.heroSubtitle') || 'Browse thousands of listings from sellers across Africa'}
        </Text>
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

      {/* Listings Grid */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        numColumns={2}
        contentContainerStyle={styles.listingContent}
        columnWrapperStyle={styles.listingRow}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={Platform.OS === 'web' ? (
          <View style={styles.seoCityLinks}>
            <Text style={styles.seoCityLinksTitle}>Browse by City</Text>
            {Object.entries(SEO_COUNTRIES).map(([countrySlug, country]) => (
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
  },
  heroSection: {
    padding: PREMIUM_SPACING.xl,
    paddingBottom: PREMIUM_SPACING.base,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: PREMIUM_COLORS.text,
    lineHeight: 38,
    marginBottom: PREMIUM_SPACING.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: PREMIUM_COLORS.muted,
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: PREMIUM_COLORS.card,
    marginHorizontal: PREMIUM_SPACING.xl,
    marginBottom: PREMIUM_SPACING.base,
    borderRadius: PREMIUM_RADIUS.lg,
    padding: PREMIUM_SPACING.base,
    ...PREMIUM_SHADOWS.card,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PREMIUM_COLORS.text,
    padding: 0,
  },
  categorySection: {
    marginBottom: PREMIUM_SPACING.base,
  },
  categoryList: {
    paddingHorizontal: PREMIUM_SPACING.xl,
    paddingVertical: PREMIUM_SPACING.xs,
    gap: PREMIUM_SPACING.sm,
  },
  categoryPill: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 78,
    paddingHorizontal: 4,
    paddingVertical: PREMIUM_SPACING.xs,
  },
  categoryPillActive: {},
  categoryPillMore: {},
  categoryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 12,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: PREMIUM_COLORS.accent,
    fontWeight: '700',
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
    marginHorizontal: PREMIUM_SPACING.xl,
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
