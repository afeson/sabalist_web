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
let fetchListings, searchListings;
if (Platform.OS === 'web') {
  const listingsWeb = require('../services/listings.web');
  fetchListings = listingsWeb.fetchListings;
  searchListings = listingsWeb.searchListings;
} else {
  const listingsNative = require('../services/listings');
  fetchListings = listingsNative.fetchListings;
  searchListings = listingsNative.searchListings;
}
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { SearchBar, CategoryPill, ListingCard, IconButton } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';

const CATEGORIES = ['All', 'Electronics', 'Vehicles', 'Real Estate', 'Fashion', 'Services'];

export default function HomeScreen() {
  console.log('🔥 HOMESCREEN.JS IS RENDERING 🔥');
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLanguage, setShowLanguage] = useState(false);

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

  useEffect(() => {
    loadListings();
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 HomeScreen focused - reloading listings');
      loadListings();
    }, [loadListings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const onSubmitSearch = () => loadListings();

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
