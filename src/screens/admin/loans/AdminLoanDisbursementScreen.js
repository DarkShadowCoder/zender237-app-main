import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing } from '../../../theme/theme';
import { Screen, Loading } from '../AdminUI';
import Card from '../../../components/Card';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { disburseAdminLoan, getAdminLoanRequest } from '../../../services/loanService';
import { formatAmount } from '../../../utils/formatters';

export default function AdminLoanDisbursementScreen({ route, navigation }) {
  const { loanId, requestId } = route.params || {};
  const [loan, setLoan] = useState(null);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminLoanRequest(requestId).then((data) => setLoan(data.loan)).catch((e) => Alert.alert('Erreur', e.message)).finally(() => setLoading(false));
  }, [requestId]);

  const submit = async () => {
    if (!loan) return;
    if (loan.loan_type === 'flight' && !reference.trim()) {
      Alert.alert('Référence requise', 'Ajoutez la référence externe de la réservation ou du règlement.');
      return;
    }
    setSaving(true);
    try {
      await disburseAdminLoan({ loanId, externalReference: reference });
      Alert.alert('Décaissement enregistré', loan.loan_type === 'money' ? 'Le montant a été crédité sur le wallet utilisateur.' : 'Le décaissement externe a été enregistré.', [{ text: 'Retour au dossier', onPress: () => navigation.replace('AdminLoanDetail', { requestId }) }]);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Screen title="Décaissement"><Loading /></Screen>;

  return (
    <Screen title="Décaissement">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={typography.caption}>Montant à décaisser</Text>
          <Text style={[typography.amountLg, { marginTop: 4 }]}>{formatAmount(loan?.approved_amount || 0)}</Text>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>{loan?.loan_type === 'money' ? 'Le montant sera crédité sur le wallet.' : 'Le décaissement est externe et doit être référencé.'}</Text>
        </Card>
        {loan?.loan_type === 'flight' ? <Card style={{ marginTop: spacing.md }}><Input label="Référence externe" value={reference} onChangeText={setReference} placeholder="Référence réservation / règlement" /></Card> : null}
        <Button title="Confirmer le décaissement" loading={saving} onPress={submit} variant="success" style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: spacing.huge } });
