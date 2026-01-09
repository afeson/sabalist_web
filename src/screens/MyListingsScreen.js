import React, { useState, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Platform-aware Firebase imports
let auth, getUserListings, subscribeToUserListings;
if (Platform.OS === 'web') {
  const firebaseWeb = require('../lib/firebase.web');
  const listingsWeb = require('../services/listings.web');
  auth = firebaseWeb.auth;
  getUserListings = listingsWeb.getUserListings;
  subscribeToUserListings = listingsWeb.subscribeToUserListings;
} else {
  const firebaseNative = require('../lib/firebase');
  const listingsNative = require('../services/listings');
  auth = firebaseNative.auth;
  getUserListings = listingsNative.getUserListings;
  subscribeToUserListings = listingsNative.subscribeToUserListings;
}
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { ListingCard } from '../components/ui';
import AppHeader from '../components/AppHeader';

export default function MyListingsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyListings = useCallback(async () => {
    try {
      setLoading(true);
      // Platform-aware: web uses auth.currentUser, native uses auth().currentUser
      const userId = Platform.OS === 'web' ? auth.currentUser?.uid : auth().currentUser?.uid;
      if (!userId) {
        setListings([]);
        setLoading(false);
        return;
      }

      const items = await getUserListings(userId);
      setListings(items || []);
    } catch (err) {
      console.warn('Failed to load my listings', err);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time listener for user's listings
  React.useEffect(() => {
    // Platform-aware: web uses auth.currentUser, native uses auth().currentUser
    const userId = Platform.OS === 'web' ? auth.currentUser?.uid : auth().currentUser?.uid;

    if (!userId) {
      console.log('🔴 No user logged in, skipping listener setup');
      setListings([]);
      setLoading(false);
      return;
    }

    console.log('🔴 Setting up real-time listener for user listings:', userId);
    setLoading(true);

    const unsubscribe = subscribeToUserListings(userId, (newListings) => {
      console.log('🔴 Received real-time update:', newListings.length, 'user listings');
      setListings(newListings);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      console.log('🔴 Cleaning up user listings listener');
      unsubscribe();
    };
  }, []); // Empty deps - only set up once

  // Force refetch when screen receives focus with refresh parameter
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh) {
        console.log('🔄 Refresh param detected, forcing reload:', route.params.refresh);
        loadMyListings();
        // Clear the param so it doesn't refetch on every focus
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMyListings();
  };

  const renderListing = ({ item }) => (
    <View style={styles.listingCardWrapper}>
      <ListingCard
        listing={item}
        onPress={() => navigation?.navigate('ListingDetail', { listingId: item.id })}
      />
      {item.status === 'sold' && (
        <View style={styles.soldBadge}>
          <Text style={styles.soldBadgeText}>{t('listing.sold')}</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('myListings.loadingListings')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="list-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t('myListings.noListings')}</Text>
        <Text style={styles.emptyText}>
          {t('myListings.createFirst')}
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => Alert.alert(t('listing.createListing'), t('listing.postItem'))}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.card} />
          <Text style={styles.emptyButtonText}>{t('listing.createListing')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const activeListings = listings.filter(l => l.status === 'active' || !l.status);
  const soldListings = listings.filter(l => l.status === 'sold');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      <AppHeader navigation={navigation} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myListings.title')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeListings.length}</Text>
            <Text style={styles.statLabel}>{t('listing.active')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{soldListings.length}</Text>
            <Text style={styles.statLabel}>{t('listing.sold')}</Text>
          </View>
        </View>
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
    </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.cardBorder,
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
    position: 'relative',
  },
  soldBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  soldBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.card,
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
