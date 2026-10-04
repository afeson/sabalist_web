import React, { useState, useCallback, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

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
import { subscribeToFavorites, addToFavorites, removeFromFavorites } from '../services/favoritesService';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { ListingCard } from '../components/ui';
import AppHeader from '../components/AppHeader';
import { track } from '../utils/analytics';

const RENEW_ENDPOINT = 'https://www.sabalist.com/api/listings/renew';

// Owner-facing lifecycle chip for ORGANIC listings only. Imported/directory
// records carry no `sourceType`, so they show nothing here — their lifecycle is
// not owned by the user. Returns null when there's nothing to show.
function lifecycleBadge(item) {
  if (!item || item.sourceType !== 'organic') return null;
  const st = item.status;
  if (st === 'archived') return { label: 'Archived', color: COLORS.textMuted, canRenew: true };
  if (st === 'expired') return { label: 'Expired', color: '#DC2626', canRenew: true };
  if (st === 'sold') return null; // sold already has its own badge
  const exp = Date.parse(item.expiresAt);
  if (!exp) return null;
  const days = Math.ceil((exp - Date.now()) / 864e5);
  if (days <= 0) return { label: 'Expired', color: '#DC2626', canRenew: true };
  if (days <= 7) return { label: `Expires in ${days}d`, color: '#D97706', canRenew: true };
  return null; // healthy active listing — keep the card clean
}

export default function MyListingsScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [renewingId, setRenewingId] = useState(null);
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
      const safe = Array.isArray(newListings) ? newListings : [];
      console.log('🔴 Received real-time update:', safe.length, 'user listings');
      setListings(safe);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      console.log('🔴 Cleaning up user listings listener');
      unsubscribe();
    };
  }, []); // Empty deps - only set up once

  // Subscribe to user favorites
  React.useEffect(() => {
    const userId = Platform.OS === 'web' ? auth.currentUser?.uid : auth().currentUser?.uid;

    if (!userId) {
      setFavoriteIds([]);
      return;
    }

    console.log('❤️ Setting up favorites listener for user:', userId);
    const unsubscribe = subscribeToFavorites(userId, (ids) => {
      const safeIds = Array.isArray(ids) ? ids : [];
      console.log('❤️ Favorites updated:', safeIds.length, 'items');
      setFavoriteIds(safeIds);
    });

    return () => {
      console.log('❤️ Cleaning up favorites listener');
      unsubscribe();
    };
  }, []);

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

  const handleFavoriteToggle = async (listingId, newFavoritedState) => {
    const userId = Platform.OS === 'web' ? auth.currentUser?.uid : auth().currentUser?.uid;

    if (!userId) {
      // Navigate to login if not authenticated
      navigation.navigate('Auth');
      return;
    }

    try {
      if (newFavoritedState) {
        console.log('➕ Adding to favorites:', listingId);
        await addToFavorites(userId, listingId);
      } else {
        console.log('➖ Removing from favorites:', listingId);
        await removeFromFavorites(userId, listingId);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  // One-tap renewal. Ownership + the new expiry window are decided server-side
  // (the client can't write expiresAt/renewalCount — Firestore rules block it),
  // so we just send the owner's ID token and the listing id. The doc is updated
  // in place (no duplicate); on success we refresh the list.
  const handleRenew = async (item) => {
    if (!item?.id || renewingId) return;
    track('organic_listing_renew_clicked', { item_id: item.id, category: item.categoryId || item.category || '' });
    try {
      setRenewingId(item.id);
      const cur = Platform.OS === 'web' ? auth.currentUser : auth().currentUser;
      if (!cur) { navigation.navigate('Auth'); return; }
      const token = await cur.getIdToken();
      const res = await fetch(RENEW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `renew failed (${res.status})`);
      track('organic_listing_renewed', { item_id: item.id, renewal_count: data.renewalCount });
      await loadMyListings();
    } catch (err) {
      console.warn('Renew failed', err);
    } finally {
      setRenewingId(null);
    }
  };

  const renderListing = ({ item }) => {
    if (!item) return null;
    const life = lifecycleBadge(item);
    return (
      <View style={styles.listingCardWrapper}>
        <ListingCard
          listing={item}
          onPress={() => navigation?.navigate('ListingDetail', { listingId: item.id })}
          isFavorited={favoriteIds.includes(item.id)}
          onFavoriteToggle={handleFavoriteToggle}
        />
        {item.status === 'sold' && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>{t('listing.sold')}</Text>
          </View>
        )}
        {life && (
          <View style={[styles.lifeBadge, { backgroundColor: life.color }]}>
            <Text style={styles.lifeBadgeText}>{life.label}</Text>
          </View>
        )}
        {life?.canRenew && (
          <TouchableOpacity
            style={styles.renewButton}
            onPress={() => handleRenew(item)}
            disabled={renewingId === item.id}
            activeOpacity={0.8}
          >
            {renewingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.card} />
            ) : (
              <>
                <Ionicons name="refresh" size={15} color={COLORS.card} />
                <Text style={styles.renewButtonText}>Renew</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.card} />
          <Text style={styles.emptyButtonText}>{t('listing.createListing')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const safeListings = Array.isArray(listings) ? listings : [];
  const activeListings = safeListings.filter(l => l && (l.status === 'active' || !l.status));
  const soldListings = safeListings.filter(l => l && l.status === 'sold');

  return (
    <View style={styles.container}>
      <SEO title="My Listings" noIndex />
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
        data={safeListings}
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
    overflow: 'visible',
    zIndex: 1,
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
  lifeBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  lifeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.card,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    minHeight: 34,
  },
  renewButtonText: {
    fontSize: 13,
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
