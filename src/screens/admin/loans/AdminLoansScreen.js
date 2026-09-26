import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../../components/Card';
import StatusBadge from '../../../components/StatusBadge';
import EmptyState from '../../../components/EmptyState';
import { colors, typography, spacing, radii } from '../../../theme/theme';
import { Screen, Loading, ErrorBox, SearchField, Segmented } from '../AdminUI';
import { listAdminLoanRequests, loanStatusLabel, loanTypeLabel, refreshLoanOverdues } from '../../../services/loanService';
import { formatAmount, formatDateTime } from '../../../utils/formatters';

const STATUS_OPTIONS = [
  { key: 'all', label: 'Toutes' },
  { key: 'submitted', label: 'Nouvelles' },
  { key: 'contacted', label: 'Contactées' },
  { key: 'processing', label: 'En traitement' },
  { key: 'approved', label: 'Approuvées' },
  { key: 'completed', label: 'Terminées' },
  { key: 'rejected', label: 'Rejetées' },
  { key: 'cancelled', label: 'Annulées' },
];

export default function AdminLoansScreen({ navigation }) {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await refreshLoanOverdues();
      setItems(await listAdminLoanRequests({ status, search }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((x) => ['submitted', 'contacted', 'processing'].includes(x.status)).length,
    approved: items.filter((x) => x.status === 'approved').length,
  }), [items]);

  if (loading) return <Screen title="Prêts"><Loading /></Screen>;
  if (error) return <Screen title="Prêts"><ErrorBox message={error} onRetry={load} /></Screen>;

  return (
    <Screen title="Prêts">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.statsRow}>
          <Stat label="Dossiers" value={stats.total} icon="documents-outline" />
          <Stat label="À traiter" value={stats.pending} icon="time-outline" />
          <Stat label="Approuvés" value={stats.approved} icon="checkmark-circle-outline" />
        </View>

        <SearchField value={search} onChangeText={setSearch} placeholder="Nom, WhatsApp, ID…" />
        <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />

        <View style={styles.sectionHeader}><Text style={typography.h3}>Demandes</Text><Text style={[typography.caption, { color: colors.text.secondary }]}>{items.length}</Text></View>

        {items.length ? items.map((item) => (
          <Pressable key={item.id} onPress={() => navigation.navigate('AdminLoanDetail', { requestId: item.id })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}>
            <View style={styles.icon}><Ionicons name={item.loan_type === 'flight' ? 'airplane-outline' : 'cash-outline'} size={21} color={colors.brand.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold} numberOfLines={1}>{item.full_name}</Text>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 3 }]}>{loanTypeLabel(item.loan_type)} · {formatAmount(item.amount)}</Text>
              <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>{formatDateTime(item.created_at)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <StatusBadge status={item.status === 'approved' ? 'confirmed' : item.status === 'rejected' || item.status === 'cancelled' ? 'rejected' : 'pending'} label={loanStatusLabel(item.status)} />
              <Ionicons name="chevron-forward" size={17} color={colors.text.tertiary} />
            </View>
          </Pressable>
        )) : <EmptyState icon="cash-outline" title="Aucun dossier" subtitle="Les nouvelles demandes de prêt apparaîtront ici." />}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, icon }) {
  return <Card style={styles.stat}><View style={styles.statIcon}><Ionicons name={icon} size={18} color={colors.brand.primary} /></View><Text style={[typography.h2, { marginTop: 5 }]}>{value}</Text><Text style={[typography.caption, { color: colors.text.secondary }]}>{label}</Text></Card>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.huge },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, padding: spacing.sm },
  statIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background.surface, borderColor: colors.border.default, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
