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
import { BUILD_VERSION } from '../config/buildVersion';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import AppHeader from '../components/AppHeader';

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
  console.log('BUILD_VERSION', BUILD_VERSION);

  const { t } = useTranslation();

  const CATEGORIES = [
    { id: 'All', label: t('categories.all'), icon: 'apps' },
    { id: 'Electronics', label: t('categories.electronics'), icon: 'phone-portrait' },
    { id: 'Vehicles', label: t('categories.vehicles'), icon: 'car' },
    { id: 'Furniture', label: t('categories.furniture'), icon: 'bed' },
    { id: 'Home Appliances', label: t('categories.homeAppliances'), icon: 'snow' },
    { id: 'Construction Equipment', label: t('categories.constructionEquipment'), icon: 'hammer' },
    { id: 'Art & Collectibles', label: t('categories.artCollectibles'), icon: 'color-palette' },
    { id: 'Fashion', label: t('categories.fashion'), icon: 'shirt' },
    { id: 'Services', label: t('categories.services'), icon: 'construct' },
    { id: 'Jobs', label: t('categories.jobs'), icon: 'briefcase' },
    { id: 'Real Estate', label: t('categories.realEstate'), icon: 'home' },
  ];
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadListings = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const items = await searchListings(
        searchQuery || searchText,
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

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const handleSearch = () => {
    loadListings(searchText);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === item.id && styles.categoryPillActive
      ]}
      onPress={() => {
        if (item.id === 'All') {
          setSelectedCategory(item.id);
        } else {
          navigation.navigate('SubCategories', { category: item.id });
        }
      }}
    >
      <Ionicons
        name={item.icon}
        size={16}
        color={selectedCategory === item.id ? '#FFFFFF' : PREMIUM_COLORS.text}
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.categoryTextActive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderListing = ({ item }) => (
    <View style={styles.listingCardWrapper}>
      <ListingCard
        listing={item}
        onPress={() => navigation?.navigate('ListingDetail', { listingId: item.id })}
      />
    </View>
  );

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

      {/* Category Pills */}
      <View style={styles.categorySection}>
        <FlatList
          data={CATEGORIES}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PREMIUM_COLORS.accent]} />
        }
      />

      {/* Build Version Watermark */}
      <View style={styles.buildVersion}>
        <Text style={styles.buildVersionText}>{BUILD_VERSION}</Text>
      </View>
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
    gap: PREMIUM_SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PREMIUM_SPACING.xs,
    backgroundColor: PREMIUM_COLORS.card,
    paddingHorizontal: PREMIUM_SPACING.base,
    paddingVertical: PREMIUM_SPACING.sm,
    borderRadius: PREMIUM_RADIUS.full,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: PREMIUM_COLORS.accent,
    borderColor: PREMIUM_COLORS.accent,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.text,
  },
  categoryTextActive: {
    color: '#FFFFFF',
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
  buildVersion: {
    position: 'absolute',
    bottom: 80,
    right: 10,
    opacity: 0.4,
  },
  buildVersionText: {
    fontSize: 10,
    color: PREMIUM_COLORS.muted,
  },
});
