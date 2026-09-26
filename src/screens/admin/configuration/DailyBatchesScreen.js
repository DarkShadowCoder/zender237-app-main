import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../../theme/theme';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import StatusBadge from '../../../components/StatusBadge';
import { listDailyBatches, processDailyBatch } from '../../../services/adminService';
import { Screen, Loading, ErrorBox, Empty, Row, Divider, styles as adminStyles } from '../AdminUI';

/**
 * Lots journaliers (2.3.1/2.3.2 étape 7-8 : virement à la banque
 * partenaire). Chaque ligne affiche soit le statut du lot (traité),
 * soit une action "Traiter" compacte à la place — jamais les deux,
 * pour éviter la redondance visuelle qu'avait la version précédente
 * (badge + gros bouton pleine largeur sous la ligne).
 */
export default function DailyBatchesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData((await listDailyBatches({ limit: 50 })).data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleProcess = async (batchId) => {
    try {
      setProcessingId(batchId);
      await processDailyBatch({ batchId });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Screen title="Logs journaliers">
        <Loading />
      </Screen>
    );
  }

  if (error && !data.length) {
    return (
      <Screen title="Logs journaliers">
        <ErrorBox message={error} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen title="Logs journaliers">
      <ScrollView contentContainerStyle={adminStyles.scroll} showsVerticalScrollIndicator={false}>
        {data.length > 0 && (
          <Text style={[typography.caption, styles.summary]}>
            {data.length} log{data.length > 1 ? 's' : ''} au total
          </Text>
        )}

        <Card>
          {data.length ? (
            data.map((b, i) => (
              <View key={b.id}>
                <Row
                  icon="calendar-outline"
                  title={new Date(b.batch_date).toLocaleDateString('fr-FR')}
                  subtitle={b.transfer_reference || 'Aucune référence'}
                  onPress={() => navigation.navigate('AdminSettlements', { batchId: b.id })}
                  right={
                    b.status === 'pending' ? (
                      <Button
                        title="Traiter"
                        size="sm"
                        fullWidth={false}
                        loading={processingId === b.id}
                        onPress={() => handleProcess(b.id)}
                      />
                    ) : (
                      <StatusBadge status={b.status === 'processed' ? 'confirmed' : 'under_review'} />
                    )
                  }
                />
                {i < data.length - 1 && <Divider />}
              </View>
            ))
          ) : (
            <Empty icon="calendar-outline" title="Aucun log" subtitle="Les logs journaliers apparaîtront ici." />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { color: colors.text.secondary, marginBottom: spacing.sm },
});