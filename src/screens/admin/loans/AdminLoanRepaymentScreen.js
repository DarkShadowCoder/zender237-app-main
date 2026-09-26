import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../../theme/theme';
import { Screen } from '../AdminUI';
import Card from '../../../components/Card';
import Input, { digitsOnly } from '../../../components/Input';
import Button from '../../../components/Button';
import { recordAdminLoanRepayment, getAdminLoanRequest } from '../../../services/loanService';
import { formatAmount } from '../../../utils/formatters';
import { useEffect } from 'react';

const METHODS = [
  { key: 'manual', label: 'Manuel', icon: 'create-outline' },
  { key: 'bank', label: 'Banque', icon: 'business-outline' },
  { key: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait-outline' },
  { key: 'cash', label: 'Espèces', icon: 'cash-outline' },
];

export default function AdminLoanRepaymentScreen({ route, navigation }) {
  const { loanId, requestId } = route.params || {};
  const [loan, setLoan] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('manual');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAdminLoanRequest(requestId).then((d) => setLoan(d.loan)).catch(() => {}); }, [requestId]);

  const submit = async () => {
    const numericAmount = Number(digitsOnly(amount));
    if (!numericAmount) return Alert.alert('Montant invalide', 'Saisissez le montant réellement reçu.');
    if (loan && numericAmount > Number(loan.outstanding_amount)) return Alert.alert('Montant invalide', 'Le remboursement dépasse le solde restant.');
    setSaving(true);
    try {
      await recordAdminLoanRepayment({ loanId, amount: numericAmount, paymentMethod: method, externalReference: reference, note });
      Alert.alert('Remboursement enregistré', 'Le solde du prêt et l’échéancier ont été mis à jour.', [{ text: 'Retour au dossier', onPress: () => navigation.replace('AdminLoanDetail', { requestId }) }]);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Screen title="Remboursement">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={typography.caption}>Solde restant</Text>
          <Text style={[typography.amountLg, { marginTop: 4 }]}>{formatAmount(loan?.outstanding_amount || 0)}</Text>
        </Card>
        <Card style={{ marginTop: spacing.md }}>
          <Input label="Montant reçu" value={amount} onChangeText={setAmount} format="price" placeholder="100 000" />
          <Text style={[typography.bodyBold, { marginBottom: spacing.sm }]}>Mode de paiement</Text>
          <View style={styles.methods}>{METHODS.map((item) => <Pressable key={item.key} onPress={() => setMethod(item.key)} style={[styles.method, method === item.key && styles.methodActive]}><Ionicons name={item.icon} size={19} color={method === item.key ? colors.brand.primary : colors.text.secondary} /><Text style={[typography.caption, { color: method === item.key ? colors.brand.primary : colors.text.secondary }]}>{item.label}</Text></Pressable>)}</View>
          <Input label="Référence externe" value={reference} onChangeText={setReference} placeholder="Référence bancaire / reçu" />
          <Input label="Note" value={note} onChangeText={setNote} placeholder="Informations complémentaires" multiline style={{ height: 90, textAlignVertical: 'top' }} />
        </Card>
        <Button title="Enregistrer le remboursement" loading={saving} onPress={submit} style={{ marginTop: spacing.lg }} variant="success" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.huge },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  method: { width: '48%', minHeight: 52, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.surfaceAlt, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  methodActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryLight },
});
