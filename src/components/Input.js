import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function Input({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType,
  showClear = true,
  editable = true,
  ...otherProps 
}) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      
      <View style={styles.inputWrapper}>
        <TextInput 
          value={value} 
          onChangeText={onChangeText} 
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          keyboardType={keyboardType}
          editable={editable}
          {...otherProps}
          style={[styles.input, !editable && styles.inputDisabled]} 
        />
        
        {/* Clear button */}
        {showClear && value && value.length > 0 && editable ? (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              console.log('🗑️ Clearing input');
              onChangeText('');
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingRight: 40, // Space for clear button
    fontSize: 16,
    color: COLORS.textDark,
    backgroundColor: COLORS.card,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundDark,
    color: COLORS.textMuted,
  },
  clearButton: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
});
