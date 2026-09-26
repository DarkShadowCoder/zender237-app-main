import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, transactionTypeColors } from '../theme/theme';
import { formatAmount, formatDateTime } from '../utils/formatters';
import StatusBadge from './StatusBadge';

const ICONS = {
  deposit: 'arrow-down-circle',
  transfer: 'swap-horizontal',
  withdrawal: 'arrow-up-circle',
};

export default function TransactionListItem({ transaction, onPress }) {
  const typeTokens = transactionTypeColors[transaction.type];

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: typeTokens.background }]}>
        <Ionicons name={ICONS[transaction.type]} size={32} color={typeTokens.color} />
      </View>
      <View style={{ flex: 1,flexDirection: 'column', gap: 4 }}>
        <Text style={[typography.bodyBold, {}]}>{typeTokens.label}</Text>
        <Text style={[typography.caption, {lineHeight: spacing.md * 1.5 }]}>{formatDateTime(transaction.created_at)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[typography.caption, { color: typeTokens.color, lineHeight:spacing.md * 1.5 }]}>
          {typeTokens.sign}
          {formatAmount(transaction.amount)}
        </Text>
        <StatusBadge status={transaction.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
