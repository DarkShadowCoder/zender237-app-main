import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import StatusBadge from '../../../components/StatusBadge';
import { colors, typography, spacing } from '../../../theme/theme';
import Input from '../../../components/Input';
import { Screen, Loading, ErrorBox, SectionTitle, Row, Divider } from '../AdminUI';
import { getAdminLoanRequest, updateAdminLoanRequestStatus, rejectAdminLoanRequest, loanStatusLabel, loanTypeLabel, getLoanIdentitySignedUrl, refreshLoanOverdues, markLoanDefaulted } from '../../../services/loanService';
import { formatAmount, formatDateTime } from '../../../utils/formatters';

export default function AdminLoanDetailScreen({ route, navigation }) {
  const requestId = route.params?.requestId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [identityUrls, setIdentityUrls] = useState({ front: null, back: null });

  const load = useCallback(async () => {
    try {
      await refreshLoanOverdues();
      const next = await getAdminLoanRequest(requestId);
      setData(next);
      if (next?.id_front_path || next?.id_back_path) {
        const [front, back] = await Promise.all([
          next.id_front_path ? getLoanIdentitySignedUrl(next.id_front_path) : null,
          next.id_back_path ? getLoanIdentitySignedUrl(next.id_back_path) : null,
        ]);
        setIdentityUrls({ front, back });
      }
    }
    catch (e) { setData({ error: e.message }); }
    finally { setLoading(false); }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  const transition = async (status) => {
    setAction(true);
    try { await updateAdminLoanRequestStatus({ requestId, status }); await load(); }
    catch (e) { Alert.alert('Erreur', e.message); }
    finally { setAction(false); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Motif requis', 'Saisissez le motif du rejet.');
      return;
    }
    setAction(true);
    try {
      await rejectAdminLoanRequest({ requestId, reason: rejectReason.trim() });
      setRejectMode(false);
      setRejectReason('');
      await load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setAction(false);
    }
  };

  if (loading) return <Screen title="Détail prêt"><Loading /></Screen>;
  if (!data || data.error) return <Screen title="Détail prêt"><ErrorBox message={data?.error || 'Dossier introuvable.'} onRetry={load} /></Screen>;

  const loan = data.loan;
  const displayStatus = loan?.status || data.status;
  const statusToken = ['approved', 'paid', 'completed'].includes(displayStatus) ? 'confirmed' : ['rejected', 'cancelled', 'defaulted', 'written_off'].includes(displayStatus) ? 'rejected' : displayStatus === 'active' ? 'pending' : 'pending';

  return (
    <Screen title="Détail du dossier">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name={data.loan_type === 'flight' ? 'airplane-outline' : 'cash-outline'} size={25} color={colors.brand.primary} /></View><View style={{ flex: 1 }}><Text style={typography.bodyBold}>{loanTypeLabel(data.loan_type)}</Text><Text style={[typography.caption, { color: colors.text.secondary }]}>{formatDateTime(data.created_at)}</Text></View><StatusBadge status={statusToken} label={loanStatusLabel(displayStatus)} /></View>
          <Text style={[typography.amountLg, { marginTop: spacing.md }]}>{formatAmount(data.amount)}</Text>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>Montant demandé</Text>
        </Card>

        <SectionTitle title="Demandeur" />
        <Card>
          <Row icon="person-outline" title={data.full_name} subtitle={data.phone_number || 'Téléphone non renseigné'} />
          <Divider />
          <Row icon="logo-whatsapp" title="WhatsApp" subtitle={data.whatsapp_number} />
          <Divider />
          <Row icon="trophy-outline" title="Rang au moment de la demande" subtitle={data.rank_at_request} />
        </Card>

        <SectionTitle title="Conditions" />
        <Card>
          <Info label="Remboursement" value={`${data.repayment_months} mois`} />
          <Info label="Hébergement" value={data.accommodation_months ? `${data.accommodation_months} mois` : 'Non inclus'} />
          <Info label="Pièce recto" value={data.id_front_path ? 'Disponible' : 'Manquante'} />
          <Info label="Pièce verso" value={data.id_back_path ? 'Disponible' : 'Manquante'} />
          {data.loan_type === 'flight' ? <><Info label="Trajet" value={`${data.travel_origin || '—'} → ${data.travel_destination || '—'}`} /><Info label="Date" value={data.travel_date || '—'} /><Info label="Passager" value={data.passenger_name || '—'} /></> : null}
        </Card>

        <SectionTitle title="Pièce d’identité" />
        <Card>
          <View style={styles.identityRow}>
            <IdentityPreview title="Recto" url={identityUrls.front} />
            <IdentityPreview title="Verso" url={identityUrls.back} />
          </View>
        </Card>

        {loan ? (
          <>
            <SectionTitle title="Prêt accordé" />
            <Card>
              <Info label="Montant approuvé" value={formatAmount(loan.approved_amount)} />
              <Info label="Frais" value={formatAmount(loan.service_fee)} />
              <Info label="Total à rembourser" value={formatAmount(loan.total_due)} />
              <Info label="Reste à payer" value={formatAmount(loan.outstanding_amount)} />
              <Info label="Décaissement" value={loan.disbursement_status} />
            </Card>
            <SectionTitle title="Actions financières" />
            <Card>
              {loan.disbursement_status !== 'completed' ? <Button title="Traiter le décaissement" onPress={() => navigation.navigate('AdminLoanDisbursement', { loanId: loan.id, requestId })} variant="success" disabled={!loan} /> : null}
              {loan.disbursement_status === 'completed' && loan.status === 'active' ? <Button title="Enregistrer un remboursement" onPress={() => navigation.navigate('AdminLoanRepayment', { loanId: loan.id, requestId })} variant="outline" /> : null}
              {loan.status === 'active' && data.installments.some((item) => item.status === 'late') ? <Button title="Marquer le prêt en défaut" onPress={async () => { setAction(true); try { await markLoanDefaulted(loan.id); await load(); } catch (e) { Alert.alert('Erreur', e.message); } finally { setAction(false); } }} loading={action} variant="danger" style={{ marginTop: spacing.sm }} /> : null}
            </Card>
          </>
        ) : (
          <>
            <SectionTitle title="Décision" />
            <Card>
              {data.status === 'submitted' ? <Button title="Marquer comme contacté" onPress={() => transition('contacted')} loading={action} /> : null}
              {['submitted', 'contacted'].includes(data.status) ? <Button title="Mettre en traitement" onPress={() => transition('processing')} loading={action} variant="outline" style={{ marginTop: spacing.sm }} /> : null}
              {data.status === 'processing' || data.status === 'contacted' ? <Button title="Approuver la demande" onPress={() => navigation.navigate('AdminLoanApproval', { requestId, request: data })} loading={action} variant="success" style={{ marginTop: spacing.sm }} /> : null}
              {!['approved', 'rejected', 'cancelled', 'completed'].includes(data.status) ? (rejectMode ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Input label="Motif du rejet" value={rejectReason} onChangeText={setRejectReason} placeholder="Motif obligatoire…" multiline />
                  <Button title="Confirmer le rejet" onPress={reject} loading={action} variant="danger" />
                  <Button title="Annuler" onPress={() => { setRejectMode(false); setRejectReason(''); }} variant="ghost" style={{ marginTop: spacing.xs }} />
                </View>
              ) : <Button title="Rejeter" onPress={() => setRejectMode(true)} loading={action} variant="danger" style={{ marginTop: spacing.sm }} />) : null}
            </Card>
          </>
        )}

        <SectionTitle title="Suivi" />
        <Card>
          <Info label="Soumise" value={formatDateTime(data.submitted_at)} />
          <Info label="Contactée" value={formatDateTime(data.contacted_at) || '—'} />
          <Info label="Traitée" value={formatDateTime(data.processed_at) || '—'} />
          {data.rejection_reason ? <Info label="Motif du rejet" value={data.rejection_reason} /> : null}
          {data.admin_notes ? <Info label="Notes Admin" value={data.admin_notes} /> : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function IdentityPreview({ title, url }) { return <View style={styles.identityBox}>{url ? <Image source={{ uri: url }} style={styles.identityImage} /> : <View style={styles.identityPlaceholder}><Ionicons name="image-outline" size={20} color={colors.text.tertiary} /><Text style={[typography.caption, { color: colors.text.secondary }]}>{url === null ? `${title} non disponible` : title}</Text></View>}<Text style={styles.identityTitle}>{title}</Text></View>; }

function Info({ label, value }) { return <View style={styles.info}><Text style={[typography.caption, { color: colors.text.secondary }]}>{label}</Text><Text style={typography.bodyBold}>{value || '—'}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.huge },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  info: { marginBottom: spacing.md },
  identityRow: { flexDirection: 'row', gap: spacing.sm },
  identityBox: { flex: 1, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.background.surfaceAlt, borderWidth: 1, borderColor: colors.border.default, position: 'relative' },
  identityImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  identityPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, padding: spacing.sm },
  identityTitle: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', color: colors.text.inverse, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, fontSize: 11 },
});
