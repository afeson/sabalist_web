import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { PRICE_TYPES } from '../../lib/pricing';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrency } from '../../lib/currencies';

/**
 * Price type selector + amount/currency inputs for create/edit listing.
 *
 * Props:
 *   value: {
 *     priceType: string (PRICE_TYPES.*),
 *     amount: string,         // user-typed
 *     minAmount: string,
 *     maxAmount: string,
 *     currency: string,       // ISO code
 *     isNegotiable: boolean,
 *   }
 *   onChange(partial)          // shallow-merged into value
 *   allowNone: boolean         // show the "No price" option (jobs/services)
 *   t: i18n translator         // optional; falls back to English strings
 */
export default function PriceTypeSelector({ value, onChange, allowNone, t }) {
  const tr = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  const types = useMemo(() => {
    const all = [
      { key: PRICE_TYPES.FIXED,          label: tr('pricing.types.fixed',         'Fixed price'),  icon: 'pricetag' },
      { key: PRICE_TYPES.RANGE,          label: tr('pricing.types.range',         'Price range'),  icon: 'options' },
      { key: PRICE_TYPES.FREE,           label: tr('pricing.types.free',          'Free'),         icon: 'gift' },
      { key: PRICE_TYPES.CALL_FOR_PRICE, label: tr('pricing.types.callForPrice',  'Call for price'), icon: 'call' },
    ];
    if (allowNone) {
      all.push({ key: PRICE_TYPES.NONE, label: tr('pricing.types.none', 'No price'), icon: 'remove-circle-outline' });
    }
    return all;
  }, [allowNone, t]);

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const currency = getCurrency(value.currency || DEFAULT_CURRENCY);

  const showAmountFields = value.priceType === PRICE_TYPES.FIXED;
  const showRangeFields = value.priceType === PRICE_TYPES.RANGE;
  const showNegotiableToggle = showAmountFields || showRangeFields;
  const showCurrencyPicker = showAmountFields || showRangeFields;

  return (
    <View style={styles.container}>
      {/* Type chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {types.map((t2) => {
          const selected = value.priceType === t2.key;
          return (
            <TouchableOpacity
              key={t2.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange({ priceType: t2.key })}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t2.icon}
                size={14}
                color={selected ? COLORS.card : COLORS.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {t2.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fixed: amount + currency */}
      {showAmountFields && (
        <View style={styles.row}>
          <CurrencyButton
            currency={currency}
            onPress={() => setCurrencyModalOpen(true)}
          />
          <TextInput
            style={styles.amountInput}
            placeholder={tr('pricing.amountPlaceholder', '0')}
            placeholderTextColor={COLORS.textMuted}
            value={value.amount}
            onChangeText={(v) => onChange({ amount: v.replace(/[^\d.]/g, '') })}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>
      )}

      {/* Range: min, max + currency */}
      {showRangeFields && (
        <>
          <CurrencyButton
            currency={currency}
            onPress={() => setCurrencyModalOpen(true)}
            style={{ marginBottom: SPACING.sm }}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.amountInput, { marginLeft: 0, flex: 1 }]}
              placeholder={tr('pricing.minPlaceholder', 'Min')}
              placeholderTextColor={COLORS.textMuted}
              value={value.minAmount}
              onChangeText={(v) =>
                onChange({ minAmount: v.replace(/[^\d.]/g, '') })
              }
              keyboardType="numeric"
            />
            <Text style={styles.rangeDash}>–</Text>
            <TextInput
              style={[styles.amountInput, { marginLeft: 0, flex: 1 }]}
              placeholder={tr('pricing.maxPlaceholder', 'Max')}
              placeholderTextColor={COLORS.textMuted}
              value={value.maxAmount}
              onChangeText={(v) =>
                onChange({ maxAmount: v.replace(/[^\d.]/g, '') })
              }
              keyboardType="numeric"
            />
          </View>
        </>
      )}

      {/* Negotiable toggle (for Fixed and Range) */}
      {showNegotiableToggle && (
        <TouchableOpacity
          style={styles.negotiableRow}
          onPress={() => onChange({ isNegotiable: !value.isNegotiable })}
          activeOpacity={0.7}
        >
          <Ionicons
            name={value.isNegotiable ? 'checkbox' : 'square-outline'}
            size={20}
            color={value.isNegotiable ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={styles.negotiableText}>
            {tr('pricing.markNegotiable', 'Mark as negotiable')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Free / call / none — explanatory text */}
      {value.priceType === PRICE_TYPES.FREE && (
        <Text style={styles.hint}>
          {tr('pricing.freeHint', 'This item is offered for free. The listing will show “Free” instead of a price.')}
        </Text>
      )}
      {value.priceType === PRICE_TYPES.CALL_FOR_PRICE && (
        <Text style={styles.hint}>
          {tr('pricing.callHint', 'No numeric price will be shown. Buyers will see a “Contact seller” call-to-action.')}
        </Text>
      )}
      {value.priceType === PRICE_TYPES.NONE && (
        <Text style={styles.hint}>
          {tr('pricing.noneHint', 'No price displayed — useful for job posts, services, or announcements.')}
        </Text>
      )}

      {/* Currency picker modal */}
      <Modal
        visible={currencyModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCurrencyModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation && e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {tr('pricing.chooseCurrency', 'Choose currency')}
            </Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => {
                const selected = item.code === value.currency;
                return (
                  <TouchableOpacity
                    style={[styles.currencyRow, selected && styles.currencyRowSelected]}
                    onPress={() => {
                      onChange({ currency: item.code });
                      setCurrencyModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.currencyCodeWrap}>
                      <Text style={styles.currencyCode}>{item.code}</Text>
                      <Text style={styles.currencySymbol}>{item.symbol}</Text>
                    </View>
                    <Text style={styles.currencyName}>{item.name}</Text>
                    {selected && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CurrencyButton({ currency, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.currencyButton, style]} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.currencyButtonCode}>{currency.code}</Text>
      <Ionicons name="chevron-down" size={14} color={COLORS.textDark} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xs,
  },
  chipRow: {
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 6,
  },
  currencyButtonCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginLeft: SPACING.sm,
  },
  rangeDash: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  negotiableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  negotiableText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  hint: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.md,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  currencyRowSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  currencyCodeWrap: {
    minWidth: 56,
    alignItems: 'flex-start',
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  currencySymbol: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  currencyName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
});
