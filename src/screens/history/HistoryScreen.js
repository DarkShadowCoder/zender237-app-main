import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../../theme/theme';
import { useTransactions } from '../../hooks/useTransactions';
import SegmentedControl from '../../components/SegmentedControl';
import TransactionListItem from '../../components/TransactionListItem';
import EmptyState from '../../components/EmptyState';
import { Text } from 'react-native';

const TABS = [
  { value: undefined, label: 'Toutes' },
  { value: 'deposit', label: 'Recharges' },
  { value: 'transfer', label: 'Transferts' },
  { value: 'withdrawal', label: 'Retraits' },
];

/** Écran 31 — Historique / Transactions (onglet principal). */
export default function HistoryScreen({ navigation }) {
  const [type, setType] = useState(undefined);
  const { items, loading, refreshing, refresh } = useTransactions({ type });

  return (
    <View style={styles.wrapper}>
      <Text style={[typography.h2, { marginBottom: spacing.lg }]}>Mes transactions</Text>
      <SegmentedControl options={TABS} value={type} onChange={setType} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading && <EmptyState title="Aucune transaction" subtitle="Vos transactions apparaîtront ici." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default, padding: spacing.screenHorizontal, paddingTop: 60 },
});
