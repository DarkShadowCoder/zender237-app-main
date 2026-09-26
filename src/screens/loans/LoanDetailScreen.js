import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { colors, typography, spacing, radii } from '../../theme/theme';
import { getMyLoanRequest, loanStatusLabel, loanTypeLabel, cancelMyLoanRequest } from '../../services/loanService';
import { formatAmount, formatDateTime } from '../../utils/formatters';

export default function LoanDetailScreen({ route }) {
  const { requestId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getMyLoanRequest(requestId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><Text style={typography.body}>Chargement…</Text></View>;
  if (error || !data) return <View style={styles.center}><Text style={typography.h3}>Dossier introuvable</Text><Text style={[typography.caption, { color: colors.text.secondary, marginTop: 6 }]}>{error}</Text></View>;

  const loan = data.loan;
  const displayStatus = loan?.status || data.status;
  const statusToken = ['approved', 'paid', 'completed'].includes(displayStatus) ? 'confirmed' : ['rejected', 'cancelled', 'defaulted', 'written_off'].includes(displayStatus) ? 'rejected' : displayStatus === 'active' ? 'pending' : 'pending';

  const cancelRequest = async () => {
    Alert.alert('Annuler la demande', 'Cette demande sera définitivement annulée.', [
      { text: 'Retour', style: 'cancel' },
      { text: 'Annuler la demande', style: 'destructive', onPress: async () => {
        try { await cancelMyLoanRequest(requestId); await load(); }
        catch (e) { Alert.alert('Erreur', e.message); }
      } },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />} showsVerticalScrollIndicator={false}>
        <Header title="Détail du prêt" />

        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Ionicons name={data.loan_type === 'flight' ? 'airplane-outline' : 'cash-outline'} size={26} color={colors.brand.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{loanTypeLabel(data.loan_type)}</Text>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 3 }]}>{formatDateTime(data.created_at)}</Text>
            </View>
            <StatusBadge status={statusToken} label={loanStatusLabel(displayStatus)} />
          </View>
          <Text style={[typography.amountLg, { marginTop: spacing.lg }]}>{formatAmount(data.amount)}</Text>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>Montant demandé</Text>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Conditions enregistrées</Text>
          <InfoRow icon="trophy-outline" label="Rang à la demande" value={data.rank_at_request} />
          <InfoRow icon="calendar-outline" label="Remboursement" value={`${data.repayment_months} mois`} />
          {data.accommodation_months > 0 ? <InfoRow icon="bed-outline" label="Hébergement" value={`${data.accommodation_months} mois`} /> : null}
          <InfoRow icon="logo-whatsapp" label="WhatsApp" value={data.whatsapp_number} />
          {data.loan_type === 'flight' ? (
            <>
              <InfoRow icon="navigate-outline" label="Trajet" value={`${data.travel_origin || '—'} → ${data.travel_destination || '—'}`} />
              <InfoRow icon="calendar-outline" label="Voyage" value={data.travel_date || '—'} />
              <InfoRow icon="person-outline" label="Passager" value={data.passenger_name || '—'} />
            </>
          ) : null}
        </Card>

        {!loan && ['submitted', 'contacted', 'processing'].includes(data.status) ? (
          <View style={{ marginTop: spacing.md }}><ButtonlessCancel onPress={cancelRequest} /></View>
        ) : null}

        {loan ? (
          <>
            <Card style={{ marginTop: spacing.md }}>
              <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Prêt accordé</Text>
              <InfoRow icon="checkmark-circle-outline" label="Montant accordé" value={formatAmount(loan.approved_amount)} />
              <InfoRow icon="receipt-outline" label="Frais" value={formatAmount(loan.service_fee)} />
              <InfoRow icon="cash-outline" label="Total à rembourser" value={formatAmount(loan.total_due)} />
              <InfoRow icon="arrow-down-circle-outline" label="Déjà remboursé" value={formatAmount(loan.amount_repaid)} />
              <InfoRow icon="alert-circle-outline" label="Reste à payer" value={formatAmount(loan.outstanding_amount)} />
              <InfoRow icon="calendar-outline" label="Échéance finale" value={loan.maturity_date || '—'} />
              <InfoRow icon="business-outline" label="Décaissement" value={loan.disbursement_status} />
            </Card>

            <Text style={[typography.h3, styles.sectionTitle]}>Échéancier</Text>
            <Card>
              {data.installments.length ? data.installments.map((item, index) => (
                <View key={item.id} style={[styles.installment, index < data.installments.length - 1 && styles.borderBottom]}>
                  <View style={styles.number}><Text style={[typography.caption, { color: colors.brand.primary, fontWeight: '700' }]}>{item.installment_number}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.bodyBold}>{formatAmount(item.amount_due)}</Text>
                    <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>Échéance · {item.due_date}</Text>
                  </View>
                  <Text style={[typography.caption, { color: item.status === 'paid' ? colors.success.default : colors.text.secondary }]}>{item.status === 'paid' ? 'Payée' : item.status === 'partial' ? 'Partielle' : 'À payer'}</Text>
                </View>
              )) : <Text style={[typography.caption, { color: colors.text.secondary }]}>Aucun échéancier disponible.</Text>}
            </Card>

            {data.repayments.length ? (
              <>
                <Text style={[typography.h3, styles.sectionTitle]}>Remboursements</Text>
                <Card>
                  {data.repayments.map((payment) => (
                    <View key={payment.id} style={styles.installment}>
                      <View style={styles.paymentIcon}><Ionicons name="checkmark-outline" size={17} color={colors.success.default} /></View>
                      <View style={{ flex: 1 }}><Text style={typography.bodyBold}>{formatAmount(payment.amount)}</Text><Text style={[typography.caption, { color: colors.text.secondary }]}>{formatDateTime(payment.paid_at)} · {payment.payment_method}</Text></View>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        ) : (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.contactBanner}><Ionicons name="logo-whatsapp" size={21} color={colors.success.default} /><View style={{ flex: 1 }}><Text style={typography.bodyBold}>La demande est en cours de traitement</Text><Text style={[typography.caption, { color: colors.text.secondary, marginTop: 3 }]}>L’équipe Zender237 poursuivra les échanges avec vous sur WhatsApp.</Text></View></View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function ButtonlessCancel({ onPress }) { return <Pressable onPress={onPress} style={styles.cancelButton}><Text style={[typography.caption, { color: colors.error.default, fontWeight: '700' }]}>Annuler la demande</Text></Pressable>; }

function InfoRow({ icon, label, value }) {
  return <View style={styles.infoRow}><Ionicons name={icon} size={18} color={colors.brand.primary} /><View style={{ flex: 1 }}><Text style={[typography.caption, { color: colors.text.secondary }]}>{label}</Text><Text style={typography.bodyBold} numberOfLines={2}>{value || '—'}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.huge },
  center: { flex: 1, backgroundColor: colors.background.default, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  hero: { marginTop: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  installment: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border.default },
  number: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  paymentIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.success.light, alignItems: 'center', justifyContent: 'center' },
  contactBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelButton: { height: 46, borderRadius: radii.md, borderWidth: 1, borderColor: colors.error.border, backgroundColor: colors.error.light, alignItems: 'center', justifyContent: 'center' },
});
