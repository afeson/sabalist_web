import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable 
      onPress={disabled ? null : onPress} 
      style={[
        styles.button,
        disabled && styles.buttonDisabled
      ]}
      disabled={disabled}
    >
      <Text style={[
        styles.text,
        disabled && styles.textDisabled
      ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  text: {
    color: 'white',
    fontWeight: '800',
  },
  textDisabled: {
    color: '#E5E7EB',
  },
});
