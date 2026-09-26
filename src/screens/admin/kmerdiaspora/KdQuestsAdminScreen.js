import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { colors, typography, spacing } from '../../../theme/theme';
import Card from '../../../components/Card';
import { listQuests } from '../../../services/kmerDiasporaService';
import { Screen, Loading, ErrorBox, Divider, Empty, Pill, ProgressBar, SearchField, Segmented, statusLabel, statusTone, formatAmount, styles } from '../AdminUI';

export default function KdQuestsAdminScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setData((await listQuests({ limit: 100 })).data || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusOptions = useMemo(() => {
    const found = Array.from(new Set(data.map((q) => q.status).filter(Boolean)));
    return [{ key: 'all', label: 'Tous' }, ...found.map((s) => ({ key: s, label: statusLabel(s) }))];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      const matchesFilter = filter === 'all' || item.status === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return (item.title || '').toLowerCase().includes(q);
    });
  }, [data, search, filter]);

  if (loading) return <Screen title="Quêtes"><Loading /></Screen>;
  if (error) return <Screen title="Quêtes"><ErrorBox message={error} onRetry={load} /></Screen>;

  return (
    <Screen title="Quêtes">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <SearchField value={search} onChangeText={setSearch} placeholder="Titre de la quête…" />

        {statusOptions.length > 1 && (
          <View style={{ marginTop: 12 }}>
            <Segmented options={statusOptions} value={filter} onChange={setFilter} />
          </View>
        )}

        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={[typography.caption, styles.muted]}>
            {filtered.length} sur {data.length} quête{data.length > 1 ? 's' : ''}
          </Text>
        </View>

        <Card style={{ marginTop: 8 }}>
          {filtered.length ? (
            filtered.map((q, i) => {
              const target = Number(q.target_amount) || 0;
              const current = Number(q.current_amount) || 0;
              const pct = target > 0 ? current / target : 0;
              const isDone = q.status === 'completed';
              return (
                <View key={q.id} style={{ paddingVertical: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <Text style={[typography.bodyBold, { flex: 1, marginRight: spacing.sm }]} numberOfLines={1}>{q.title}</Text>
                    <Pill tone={statusTone(q.status)} label={statusLabel(q.status)} />
                  </View>
                  <ProgressBar value={pct} tone={isDone ? 'success' : 'brand'} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxs }}>
                    <Text style={[typography.caption, styles.muted]}>
                      {formatAmount(current)} / {formatAmount(target)} {q.currency}
                    </Text>
                    <Text style={[typography.caption, styles.muted]}>{Math.round(pct * 100)} %</Text>
                  </View>
                  {i < filtered.length - 1 && <View style={{ marginTop: spacing.sm }}><Divider /></View>}
                </View>
              );
            })
          ) : (
            <Empty icon="heart-outline" title="Aucune quête" subtitle={data.length ? 'Aucun résultat pour ce filtre ou cette recherche.' : 'Aucune quête publiée.'} />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}