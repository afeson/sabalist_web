import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../theme';

/**
 * Primary action button with theme colors
 */
export default function PrimaryButton({ 
  title, 
  onPress, 
  disabled,
  loading,
  variant = 'primary', // primary, secondary, accent, outline
  size = 'large', // small, medium, large
  style,
  ...props 
}) {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity 
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.card} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.small,
  },
  
  // Variants
  button_primary: {
    backgroundColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.secondary,
  },
  button_accent: {
    backgroundColor: COLORS.accent,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  
  // Sizes
  button_small: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  button_medium: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  button_large: {
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
  },
  
  buttonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
  },
  
  // Text
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: COLORS.card,
  },
  text_secondary: {
    color: COLORS.card,
  },
  text_accent: {
    color: COLORS.textDark,
  },
  text_outline: {
    color: COLORS.primary,
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
  textDisabled: {
    color: COLORS.card,
  },
});

