import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSubCategories, getCategoryIcon } from '../config/categories';
import { getTranslatedCategoryLabel, getTranslatedSubCategoryLabel } from '../utils/categoryI18n';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import SEO from '../components/SEO';
import { generateBreadcrumbSchema } from '../utils/seo';
import { getCategoryId } from '../config/categoryMapping';

export default function SubCategoriesScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { category } = route.params;
  const subCategories = getSubCategories(category);
  const [refreshing, setRefreshing] = useState(false);
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
      title: getTranslatedSubCategoryLabel(subCategory, t)
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
      <Text style={styles.subCategoryLabel}>{getTranslatedSubCategoryLabel(item, t)}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SEO
        title={`${category} - Subcategories`}
        description={`Browse subcategories in ${category} on Sabalist. Find electronics, vehicles, furniture and more.`}
        canonicalUrl={`/category/${getCategoryId(category)}`}
        jsonLd={[generateBreadcrumbSchema([
          { name: 'Home', url: '/' },
          { name: category, url: `/category/${getCategoryId(category)}` },
        ])]}
      />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top + SPACING.xs : SPACING.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          <Text style={styles.backLabel}>{t('common.back') || 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={getCategoryIcon(category)} size={24} color={COLORS.primary} />
          <Text style={styles.headerTitle}>{getTranslatedCategoryLabel(category, t)}</Text>
        </View>
        <View style={{ width: 60 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 2,
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
