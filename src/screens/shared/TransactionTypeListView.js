import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../theme/theme';
import { useTransactions } from '../../hooks/useTransactions';
import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import TransactionListItem from '../../components/TransactionListItem';
import EmptyState from '../../components/EmptyState';

const STATUS_TABS = [
  { value: 'under_review', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmés' },
  { value: 'rejected', label: 'Rejetés' },
];

/** Vue partagée pour "Mes dépôts" (33) / "Mes transferts" (34) / "Mes retraits" (35). */
export default function TransactionTypeListView({ title, type }) {
  const navigation = useNavigation();
  const [status, setStatus] = useState('under_review');
  const { items, loading, refreshing, refresh } = useTransactions({ type, status });

  return (
    <View style={styles.wrapper}>
      <Header title={title} />
      <View style={{ marginTop: spacing.lg }}>
        <SegmentedControl options={STATUS_TABS} value={status} onChange={setStatus} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollb
        
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
          />
        )}
        ListEmptyComponent={!loading && <EmptyState title="Aucune transaction" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default, padding: spacing.screenHorizontal },
});
