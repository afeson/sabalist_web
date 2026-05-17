/**
 * CategorySelector — full-screen modal with searchable icon grid.
 *
 * Drops into any form where a user must pick one of the (now 20+) top-level
 * categories. Returns the selected category's display key (e.g. 'Electronics')
 * via onSelect so the rest of the app continues to receive the same shape.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../config/categories';
import { getTranslatedCategoryLabel } from '../utils/categoryI18n';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

const NUM_COLUMNS = 3;

export default function CategorySelector({ visible, onClose, onSelect, selectedKey }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => {
      const label = getTranslatedCategoryLabel(c.key, t).toLowerCase();
      return label.includes(q) || c.key.toLowerCase().includes(q) || c.id.includes(q);
    });
  }, [query, t]);

  const handlePick = (cat) => {
    setQuery('');
    onSelect(cat.key);
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected = item.key === selectedKey;
    return (
      <TouchableOpacity
        style={[styles.tile, isSelected && styles.tileSelected]}
        onPress={() => handlePick(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
          <Ionicons
            name={item.icon}
            size={26}
            color={isSelected ? '#FFFFFF' : COLORS.primary}
          />
        </View>
        <Text
          style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}
          numberOfLines={2}
        >
          {getTranslatedCategoryLabel(item.key, t)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('categories.selectCategory') || 'Select a category'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted || '#6B7280'} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('categories.searchPlaceholder') || 'Search categories…'}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted || '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={42} color={COLORS.textMuted || '#9CA3AF'} />
              <Text style={styles.emptyText}>
                {t('categories.noMatches') || 'No categories match'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 4,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  gridContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl || 40,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    maxWidth: `${100 / NUM_COLUMNS - 2}%`,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 110,
    ...SHADOWS.small,
  },
  tileSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F4FF',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl || 48,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted || '#6B7280',
  },
});
