/**
 * ResendCountdown — disables a "resend" action for `seconds` after the
 * previous send, then re-enables it. Used after sending a magic link or
 * phone OTP so users don't hammer the send button (and burn email/SMS
 * quotas).
 *
 * Usage:
 *   <ResendCountdown seconds={60} onResend={handleResend} />
 *
 * The countdown starts on mount AND restarts whenever `resetKey` changes.
 * Pass a new resetKey (e.g. Date.now()) each time you successfully send
 * to restart the timer.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS } from '../../theme';

export default function ResendCountdown({ seconds = 60, resetKey, onResend, disabled }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds, resetKey]);

  const ready = remaining === 0;

  const handlePress = () => {
    if (!ready || disabled) return;
    onResend?.();
  };

  return (
    <TouchableOpacity
      style={[styles.btn, !ready && styles.btnDisabled]}
      onPress={handlePress}
      disabled={!ready || disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, !ready && styles.textDisabled]}>
        {ready
          ? t('auth.resendNow') || 'Resend now'
          : (t('auth.resendIn', { seconds: remaining }) !== 'auth.resendIn'
              ? t('auth.resendIn', { seconds: remaining })
              : `Resend in ${remaining}s`)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
});
