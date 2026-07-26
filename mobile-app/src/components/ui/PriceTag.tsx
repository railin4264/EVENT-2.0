import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export const PriceTag = ({ price }: { price: number }) => {
  const isFree = price === 0 || !price;
  return (
    <View style={[styles.tag, isFree ? styles.free : styles.paid]}>
      <Text style={[styles.tagText, isFree ? styles.freeText : styles.paidText]}>
        {isFree ? 'Gratis' : `Desde $${price}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  free: {
    backgroundColor: theme.colors.priceTagFree + '20',
    borderWidth: 1,
    borderColor: theme.colors.priceTagFree + '40',
  },
  paid: {
    backgroundColor: theme.colors.priceTagPaid + '20',
    borderWidth: 1,
    borderColor: theme.colors.priceTagPaid + '40',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  freeText: {
    color: theme.colors.priceTagFree,
  },
  paidText: {
    color: theme.colors.priceTagPaid,
  },
});
