import React from 'react';
import { View, Text } from 'react-native';
import { typography, spacing } from '../theme/theme';
import { formatAmount } from '../utils/formatters';

/** Ligne "Montant / Frais / Total" utilisée dans les résumés de transfert et retrait. */
export default function AmountDisplay({ label, value, emphasize = false }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={typography.body}>{label}</Text>
      <Text style={emphasize ? typography.bodyBold : typography.body}>{formatAmount(value)}</Text>
    </View>
  );
}
