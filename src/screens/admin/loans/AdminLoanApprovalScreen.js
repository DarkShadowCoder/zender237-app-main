import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing } from '../../../theme/theme';
import { Screen } from '../AdminUI';
import Card from '../../../components/Card';
import Input, { digitsOnly } from '../../../components/Input';
import Button from '../../../components/Button';
import { approveAdminLoanRequest } from '../../../services/loanService';
import { formatAmount } from '../../../utils/formatters';

export default function AdminLoanApprovalScreen({ route, navigation }) {
  const request = route.params?.request;
  const requestId = route.params?.requestId;
  const [approvedAmount, setApprovedAmount] = useState(String(Number(request?.amount || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
  const [serviceFee, setServiceFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amount = Number(digitsOnly(approvedAmount));
    const fee = Number(digitsOnly(serviceFee));
    if (!amount || amount <= 0) return Alert.alert('Montant invalide', 'Le montant approuvé doit être supérieur à zéro.');
    if (request?.amount && amount > Number(request.amount)) return Alert.alert('Montant invalide', 'Le montant approuvé ne peut pas dépasser le montant demandé.');
    setSaving(true);
    try {
      await approveAdminLoanRequest({ requestId, approvedAmount: amount, serviceFee: fee, notes });
      Alert.alert('Prêt approuvé', 'Le prêt a été créé avec son échéancier.', [{ text: 'Ouvrir le dossier', onPress: () => navigation.replace('AdminLoanDetail', { requestId }) }]);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Screen title="Approuver le prêt">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={typography.bodyBold}>Demande initiale</Text>
          <Text style={[typography.amountLg, { marginTop: spacing.sm }]}>{formatAmount(request?.amount || 0)}</Text>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>Montant demandé · {request?.repayment_months || 0} mois</Text>
        </Card>
        <Card style={{ marginTop: spacing.md }}>
          <Input label="Montant approuvé" value={approvedAmount} onChangeText={setApprovedAmount} format="price" placeholder="500 000" />
          <Input label="Frais de service" value={serviceFee} onChangeText={setServiceFee} format="price" placeholder="0" />
          <Input label="Notes internes" value={notes} onChangeText={setNotes} placeholder="Conditions particulières…" multiline style={{ height: 100, textAlignVertical: 'top' }} />
        </Card>
        <Button title="Créer le prêt" loading={saving} onPress={submit} style={{ marginTop: spacing.lg }} variant="success" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: spacing.huge } });
