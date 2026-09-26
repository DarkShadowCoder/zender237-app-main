import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../../theme/theme';
import Card from '../../../components/Card';
import { listMatches } from '../../../services/kmerDiasporaService';
import { Screen, Loading, ErrorBox, Divider, Empty, Pill, ProgressBar, Segmented, statusLabel, statusTone, styles } from '../AdminUI';

const scoreTone = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'neutral';
  if (n >= 75) return 'success';
  if (n >= 40) return 'warning';
  return 'error';
};

export default function KdMatchingAdminScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setData((await listMatches({ limit: 100 })).data || []);
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
    const found = Array.from(new Set(data.map((m) => m.status).filter(Boolean)));
    return [{ key: 'all', label: 'Tous' }, ...found.map((s) => ({ key: s, label: statusLabel(s) }))];
  }, [data]);

  const filtered = useMemo(() => {
    const base = filter === 'all' ? data : data.filter((m) => m.status === filter);
    return [...base].sort((a, b) => (Number(b.match_score) || 0) - (Number(a.match_score) || 0));
  }, [data, filter]);

  if (loading) return <Screen title="Matching"><Loading /></Screen>;
  if (error) return <Screen title="Matching"><ErrorBox message={error} onRetry={load} /></Screen>;

  return (
    <Screen title="Matching">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {statusOptions.length > 1 && <Segmented options={statusOptions} value={filter} onChange={setFilter} />}

        <View style={{ marginTop: 12, marginBottom: 4 }}>
          <Text style={[typography.caption, styles.muted]}>
            {filtered.length} sur {data.length} correspondance{data.length > 1 ? 's' : ''}, triées par score
          </Text>
        </View>

        <Card style={{ marginTop: 8 }}>
          {filtered.length ? (
            filtered.map((m, i) => {
              const score = Number(m.match_score);
              const tone = scoreTone(m.match_score);
              return (
                <View key={m.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm }}>
                    <View style={{ width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.info.light }}>
                      <Ionicons name="git-network-outline" size={20} color={colors.info.default} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={typography.bodyBold} numberOfLines={1}>
                          Score: {Number.isFinite(score) ? score : '—'}
                        </Text>
                        <Pill tone={statusTone(m.status)} label={statusLabel(m.status)} />
                      </View>
                      <Text style={[typography.caption, styles.muted]} numberOfLines={1}>
                        Conducteur #{String(m.driver_request_id).slice(0, 8)} → Poste #{String(m.job_request_id).slice(0, 8)}
                      </Text>
                      {Number.isFinite(score) && (
                        <View style={{ marginTop: spacing.xs }}>
                          <ProgressBar value={score / 100} tone={tone} />
                        </View>
                      )}
                    </View>
                  </View>
                  {i < filtered.length - 1 && <Divider />}
                </View>
              );
            })
          ) : (
            <Empty icon="git-network-outline" title="Aucun matching" subtitle="Aucune correspondance pour ce filtre." />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}