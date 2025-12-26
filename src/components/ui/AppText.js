import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../theme';

/**
 * Consistent text component with theme typography
 */
export default function AppText({ 
  variant = 'body', 
  color = 'textDark', 
  style, 
  children,
  ...props 
}) {
  const textStyle = [
    styles.base,
    TYPOGRAPHY[variant],
    { color: COLORS[color] || color },
    style,
  ];

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: COLORS.textDark,
  },
});

