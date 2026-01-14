import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar,
  FlatList, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme';
import { ListingCard } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToFavorites,
  addToFavorites,
  removeFromFavorites
} from '../services/favoritesService';

// Platform-aware import for getListing
let getListing;
if (Platform.OS === 'web') {
  getListing = require('../services/listings.web').getListingById;
} else {
  getListing = require('../services/listings').getListing;
}

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to favorite IDs and fetch full listing data
  useEffect(() => {
    if (!user?.uid) {
      setFavorites([]);
      setFavoriteIds([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToFavorites(user.uid, async (ids) => {
      setFavoriteIds(ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Fetch full listing data
      setLoading(true);
      const listings = await Promise.all(
        ids.map(async (id) => {
          try {
            return await getListing(id);
          } catch {
            return null; // Handle deleted listings
          }
        })
      );

      setFavorites(listings.filter(Boolean));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleFavoriteToggle = async (listingId, newState) => {
    if (!user?.uid) return;
    try {
      if (newState) {
        await addToFavorites(user.uid, listingId);
      } else {
        await removeFromFavorites(user.uid, listingId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const renderListing = ({ item }) => (
    <View style={styles.listingCard}>
      <ListingCard
        listing={item}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
        isFavorited={favoriteIds.includes(item.id)}
        onFavoriteToggle={handleFavoriteToggle}
      />
    </View>
  );

  // Empty state
  if (!loading && favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
        <View style={styles.emptyState}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart-outline" size={80} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart icon on listings to save them here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
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
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: SPACING.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  listingCard: {
    width: '48%',
    marginBottom: SPACING.md,
  },
});
