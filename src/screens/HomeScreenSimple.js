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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { searchListings } from '../services/listings';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { CategoryPill, ListingCard } from '../components/ui';
import MobileHeader from '../components/MobileHeader';

const CATEGORIES = [
  { id: 'All', labelKey: 'categories.all', icon: 'apps' },
  { id: 'Electronics', labelKey: 'categories.electronics', icon: 'phone-portrait' },
  { id: 'Vehicles', labelKey: 'categories.vehicles', icon: 'car' },
  { id: 'Real Estate', labelKey: 'categories.realEstate', icon: 'home' },
  { id: 'Fashion', labelKey: 'categories.fashion', icon: 'shirt' },
  { id: 'Services', labelKey: 'categories.services', icon: 'construct' },
];

export default function HomeScreenSimple({ navigation }) {
  const { t } = useTranslation();
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

  const handleSearch = (query) => {
    setSearchText(query);
    loadListings(query);
  };

  const handleProfilePress = () => {
    if (navigation) {
      navigation.navigate('Profile');
    }
  };

  const renderCategory = ({ item }) => (
    <CategoryPill
      category={t(item.labelKey)}
      active={selectedCategory === item.id}
      onPress={() => setSelectedCategory(item.id)}
      style={styles.categoryPill}
    />
  );

  const renderListing = ({ item }) => (
    <View style={styles.listingCardWrapper}>
      <ListingCard
        listing={item}
        onPress={() => Alert.alert(t('listing.listingDetails'), item.title)}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('marketplace.loadingMarketplace')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="basket-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t('marketplace.noListings')}</Text>
        <Text style={styles.emptyText}>
          {t('marketplace.beFirst')}
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation?.navigate('CreateListing')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.card} />
          <Text style={styles.emptyButtonText}>{t('listing.postItem')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      
      {/* Mobile Header */}
      <MobileHeader 
        onProfilePress={handleProfilePress}
        onSearch={handleSearch}
      />

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
  categorySection: {
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  categoryList: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
  },
  categoryPill: {
    marginRight: SPACING.sm,
  },
  listingContent: {
    padding: SPACING.base,
    paddingBottom: 100,
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
