import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

/**
 * Icon-only button component
 */
export default function IconButton({ 
  icon, 
  onPress, 
  size = 24,
  color = COLORS.textDark,
  backgroundColor = COLORS.card,
  style,
  ...props 
}) {
  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
});

