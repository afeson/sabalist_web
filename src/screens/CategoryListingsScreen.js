import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { PREMIUM_COLORS, PREMIUM_SPACING, PREMIUM_RADIUS, PREMIUM_SHADOWS } from '../theme/premiumTheme';
import { ListingCard } from '../components/ui';
import { getCategoryIcon } from '../config/categories';
import { getCategoryId } from '../config/categoryMapping';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToFavorites, addToFavorites, removeFromFavorites } from '../services/favoritesService';

export default function CategoryListingsScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { category, subcategoryId, title } = route.params;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);
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

  // Subscribe to listings
  useEffect(() => {
    const db = getFirestore();
    const categoryId = getCategoryId(category);

    console.log('🔴 Setting up realtime listener for:', { category, categoryId, subcategoryId });

    // Build query with categoryId
    let q = query(
      collection(db, 'listings'),
      where('categoryId', '==', categoryId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    // Subscribe to realtime updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('🔴 Realtime update received:', snapshot.docs.length, 'listings');

      let items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter by subcategory if specified
      if (subcategoryId) {
        items = items.filter(item => item.subcategory === subcategoryId);
        console.log('📍 Filtered by subcategory:', subcategoryId, '→', items.length, 'listings');
      }

      setListings(items);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error in listings listener:', error);
      setListings([]);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      console.log('🔴 Cleaning up listener for:', category);
      unsubscribe();
    };
  }, [category, subcategoryId]);

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
        columnWrapperStyle={listings.length > 0 ? styles.listingRow : null}
        ListEmptyComponent={renderEmpty}
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
    textAlign: 'center',
  },
});
