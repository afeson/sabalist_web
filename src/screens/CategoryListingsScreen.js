import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import { ListingCard } from '../components/ui';
import { getCategoryIcon } from '../config/categories';

// Platform-aware listings imports
let searchListings;
if (Platform.OS === 'web') {
  const listingsWeb = require('../services/listings.web');
  searchListings = listingsWeb.searchListings;
} else {
  const listingsNative = require('../services/listings');
  searchListings = listingsNative.searchListings;
}

export default function CategoryListingsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { category, subcategoryId, title } = route.params;

  // Store only the ID, not the full object
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryId || null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading listings for:', { category, subcategoryId: selectedSubcategory });

      // Call searchListings with category and optional subcategory
      const items = await searchListings(
        '', // no search text
        category, // main category
        null, // min price
        null, // max price
        selectedSubcategory // subcategory ID
      );

      console.log(`Found ${items?.length || 0} listings`);
      setListings(items || []);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, selectedSubcategory]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

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
        <Text style={styles.emptyText}>{t('home.beFirst') || 'Be the first to post in this category!'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PREMIUM_COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={getCategoryIcon(category)} size={24} color={PREMIUM_COLORS.accent} />
          <Text style={styles.headerTitle}>{title || category}</Text>
        </View>
        <View style={{ width: 24 }} />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PREMIUM_COLORS.accent]}
            tintColor={PREMIUM_COLORS.accent}
          />
        }
      />
    </View>
  );
}

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
    padding: PREMIUM_SPACING.xs,
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
    textAlign: 'center',
  },
});
