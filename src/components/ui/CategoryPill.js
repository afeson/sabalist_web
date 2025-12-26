import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

// Category icon mapping
const CATEGORY_ICONS = {
  'All': 'apps',
  'Electronics': 'phone-portrait',
  'Vehicles': 'car',
  'Real Estate': 'home',
  'Fashion': 'shirt',
  'Services': 'construct',
};

// Category color mapping
const CATEGORY_COLORS = {
  'All': COLORS.textMuted,
  'Electronics': COLORS.categoryElectronics,
  'Vehicles': COLORS.categoryVehicles,
  'Real Estate': COLORS.categoryRealEstate,
  'Fashion': COLORS.categoryFashion,
  'Services': COLORS.categoryServices,
};

/**
 * Category pill with icon
 */
export default function CategoryPill({ 
  category, 
  active = false, 
  onPress,
  style,
  ...props 
}) {
  const icon = CATEGORY_ICONS[category] || 'pricetag';
  const color = CATEGORY_COLORS[category] || COLORS.categoryOther;
  
  const containerStyle = [
    styles.pill,
    active && styles.pillActive,
    active && { backgroundColor: color, borderColor: color },
    !active && { backgroundColor: `${color}15` }, // 15% opacity
    style,
  ];
  
  const textStyle = [
    styles.text,
    active ? styles.textActive : { color },
  ];

  return (
    <TouchableOpacity 
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={active ? COLORS.card : color}
        style={styles.icon}
      />
      <Text style={textStyle}>{category}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  pillActive: {
    ...SHADOWS.medium,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textActive: {
    color: COLORS.card,
  },
});

