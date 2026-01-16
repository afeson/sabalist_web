import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Platform-aware listings imports
let fetchListings, searchListings, subscribeToListings;
if (Platform.OS === 'web') {
  const listingsWeb = require('../services/listings.web');
  fetchListings = listingsWeb.fetchListings;
  searchListings = listingsWeb.searchListings;
  subscribeToListings = listingsWeb.subscribeToListings;
} else {
  const listingsNative = require('../services/listings');
  fetchListings = listingsNative.fetchListings;
  searchListings = listingsNative.searchListings;
  subscribeToListings = listingsNative.subscribeToListings;
}
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { SearchBar, CategoryPill, ListingCard, IconButton } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LocationSelector from '../components/LocationSelector';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToFavorites, addToFavorites, removeFromFavorites } from '../services/favoritesService';
import { getUserLocation } from '../services/locationService';

const CATEGORIES = ['All', 'Electronics', 'Vehicles', 'Real Estate', 'Fashion', 'Services'];

export default function HomeScreen({ route }) {
  console.log('🔥 HOMESCREEN.JS IS RENDERING 🔥');
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLanguage, setShowLanguage] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const items = await searchListings(
        searchText,
        selectedCategory === 'All' ? null : selectedCategory
      );
      setListings(items || []);
    } catch (err) {
      console.warn('Failed to load listings', err);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, selectedCategory]);

  // Real-time listener for listings when no search text
  useEffect(() => {
    // If user is searching, use search instead of listener
    if (searchText.trim()) {
      return;
    }

    // Set up real-time listener
    console.log('🔴 Setting up real-time listener for category:', selectedCategory);
    setLoading(true);

    const unsubscribe = subscribeToListings(
      (newListings) => {
        console.log('🔴 Received real-time update:', newListings.length, 'listings');
        setListings(newListings);
        setLoading(false);
        setRefreshing(false);
      },
      selectedCategory === 'All' ? null : selectedCategory,
      20
    );

    return () => {
      console.log('🔴 Cleaning up listener');
      unsubscribe();
    };
  }, [selectedCategory, searchText]);

  // When user searches, use search function instead
  useEffect(() => {
    if (searchText.trim()) {
      loadListings();
    }
  }, [searchText]);

  // Load user location
  useEffect(() => {
    if (!user?.uid) {
      setUserLocation(null);
      return;
    }

    const loadLocation = async () => {
      const location = await getUserLocation(user.uid);
      console.log('📍 User location:', location);
      setUserLocation(location);

      // Show location selector if no location set
      if (!location) {
        setShowLocationSelector(true);
      }
    };

    loadLocation();
  }, [user?.uid]);

  // Subscribe to user favorites
  useEffect(() => {
    if (!user?.uid) {
      setFavoriteIds([]);
      return;
    }

    console.log('🔴 Setting up favorites listener for user:', user.uid);
    const unsubscribe = subscribeToFavorites(user.uid, (ids) => {
      console.log('🔴 Favorites updated:', ids.length, 'items');
      setFavoriteIds(ids);
    });

    return () => {
      console.log('🔴 Cleaning up favorites listener');
      unsubscribe();
    };
  }, [user?.uid]);

  // Force refetch when screen receives focus with refresh parameter
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.refresh) {
        console.log('🔄 Home: Refresh param detected, forcing reload:', route.params.refresh);
        // Force a manual refetch to ensure new listing appears immediately
        setRefreshing(true);
        loadListings();
        // Clear the param so it doesn't refetch on every focus
        navigation.setParams({ refresh: undefined });
      }
    }, [route?.params?.refresh, loadListings, navigation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const onSubmitSearch = () => loadListings();

  const handleFavoriteToggle = async (listingId, newFavoritedState) => {
    if (!user?.uid) {
      // Navigate to login if not authenticated
      navigation.navigate('Auth');
      return;
    }

    try {
      if (newFavoritedState) {
        console.log('➕ Adding to favorites:', listingId);
        await addToFavorites(user.uid, listingId);
      } else {
        console.log('➖ Removing from favorites:', listingId);
        await removeFromFavorites(user.uid, listingId);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const renderCategory = (cat) => (
    <CategoryPill
      key={cat}
      category={cat}
      active={selectedCategory === cat}
      onPress={() => setSelectedCategory(cat)}
    />
  );

  const renderListing = ({ item }) => (
    <View style={styles.listingCardWrapper}>
      <ListingCard
        listing={item}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
        isFavorited={favoriteIds.includes(item.id)}
        onFavoriteToggle={handleFavoriteToggle}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="basket-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>No listings yet</Text>
        <Text style={styles.emptyText}>
          Be the first to post an item on Sabalist!
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.card} />
          <Text style={styles.emptyButtonText}>Post First Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>Sabalist</Text>
              <Text style={styles.tagline}>Pan-African Marketplace</Text>
            </View>
          </View>
          <IconButton
            icon="language"
            onPress={() => setShowLanguage(!showLanguage)}
            size={24}
            color={COLORS.primary}
          />
        </View>

        {/* Language Switcher Modal */}
        {showLanguage && (
          <View style={styles.languageContainer}>
            <LanguageSwitcher />
          </View>
        )}

        {/* Location Button */}
        {user && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowLocationSelector(true)}
          >
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>
              {userLocation ? `${userLocation.city}, ${userLocation.state}` : 'Set Location'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}

        {/* Search Bar */}
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSubmit={onSubmitSearch}
          placeholder={t('marketplace.searchPlaceholder') || 'Search phones, cars, apartments...'}
          style={styles.searchBar}
        />

        {/* Category Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map(renderCategory)}
        </ScrollView>
      </View>

      {/* Listings Grid */}
      <FlatList
        data={listings}
        keyExtractor={(item, index) => item.id || `listing-${index}`}
        renderItem={renderListing}
        numColumns={2}
        columnWrapperStyle={styles.listingRow}
        contentContainerStyle={styles.listingContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Location Selector Modal */}
      <LocationSelector
        visible={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onLocationSelected={(location) => {
          console.log('📍 Location selected:', location);
          setUserLocation(location);
          setShowLocationSelector(false);
        }}
        userId={user?.uid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  languageContainer: {
    marginBottom: SPACING.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },
  searchBar: {
    marginBottom: SPACING.md,
  },
  categoryScroll: {
    marginHorizontal: -SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  categoryScrollContent: {
    paddingRight: SPACING.base,
  },
  listingContent: {
    padding: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  listingRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.base,
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
    paddingVertical: SPACING.huge,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.huge,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.full,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOWS.medium,
  },
  emptyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.card,
  },
});
