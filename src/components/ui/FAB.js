import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme';

/**
 * Floating Action Button (FAB)
 * Positioned at bottom-right with safe area padding
 */
export default function FAB({ icon = 'add', onPress, style, ...props }) {
  return (
    <TouchableOpacity 
      style={[styles.fab, style]}
      onPress={onPress}
      activeOpacity={0.8}
      {...props}
    >
      <Ionicons name={icon} size={28} color={COLORS.card} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 90 : 80, // Account for tab bar
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.fab,
  },
});

