import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { getSubCategories, getCategoryIcon } from '../config/categories';
import { getTranslatedCategoryLabel } from '../utils/categoryI18n';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

export default function SubCategoriesScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { category } = route.params;
  const subCategories = getSubCategories(category);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const handleSubCategoryPress = (subCategory) => {
    console.log('Selected sub-category:', subCategory.id);
    // Navigate to listings for this sub-category with only the ID
    navigation.navigate('CategoryListings', {
      category,
      subcategoryId: subCategory.id,
      title: t(subCategory.labelKey)
    });
  };

  const renderSubCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.subCategoryCard}
      onPress={() => handleSubCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.subCategoryLabel}>{t(item.labelKey)}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={getCategoryIcon(category)} size={24} color={COLORS.primary} />
          <Text style={styles.headerTitle}>{getTranslatedCategoryLabel(category, t)}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Sub-Categories List */}
      <FlatList
        data={subCategories}
        renderItem={renderSubCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>{t('subCategories.selectCategory')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('subCategories.browseBy', { category: getTranslatedCategoryLabel(category, t) })}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No sub-categories available</Text>
          </View>
        }
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    ...SHADOWS.small,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  listContainer: {
    padding: SPACING.base,
  },
  headerSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  subCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.base,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.base,
  },
  subCategoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: SPACING.base,
  },
});
