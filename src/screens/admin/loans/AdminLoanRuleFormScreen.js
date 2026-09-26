import React, { useState } from 'react';
import { ScrollView, Alert, Text, View, Switch } from 'react-native';
import { colors, typography, spacing } from '../../../theme/theme';
import Input, { digitsOnly } from '../../../components/Input';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { Screen, styles as adminStyles } from '../AdminUI';
import { updateLoanRule } from '../../../services/adminService';

const formatAmount = (value) => value == null ? '' : String(Number(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function AdminLoanRuleFormScreen({ route, navigation }) {
  const rule = route.params?.rule;
  const [moneyMonths, setMoneyMonths] = useState(String(rule?.money_loan_repayment_months ?? 1));
  const [flightMonths, setFlightMonths] = useState(String(rule?.flight_loan_repayment_months ?? 1));
  const [accommodationMonths, setAccommodationMonths] = useState(String(rule?.flight_accommodation_months ?? 0));
  const [maxMoneyLoan, setMaxMoneyLoan] = useState(formatAmount(rule?.max_money_loan_amount));
  const [maxFlightLoan, setMaxFlightLoan] = useState(formatAmount(rule?.max_flight_loan_amount));
  const [moneyEnabled, setMoneyEnabled] = useState(rule?.money_loan_enabled !== false);
  const [flightEnabled, setFlightEnabled] = useState(rule?.flight_loan_enabled !== false);
  const [loading, setLoading] = useState(false);

  if (!rule) {
    return (
      <Screen title="Règle de prêt">
        <Card><Text style={typography.body}>Règle introuvable.</Text></Card>
      </Screen>
    );
  }

  const submit = async () => {
    const money = Number(digitsOnly(moneyMonths));
    const flight = Number(digitsOnly(flightMonths));
    const accommodation = Number(digitsOnly(accommodationMonths));
    const maxMoney = maxMoneyLoan ? Number(digitsOnly(maxMoneyLoan)) : null;
    const maxFlight = maxFlightLoan ? Number(digitsOnly(maxFlightLoan)) : null;

    if (!Number.isInteger(money) || money <= 0 || !Number.isInteger(flight) || flight <= 0 || !Number.isInteger(accommodation) || accommodation < 0) {
      Alert.alert('Conditions invalides', 'Les durées configurées sont invalides.');
      return;
    }

    if ((maxMoney !== null && (!Number.isFinite(maxMoney) || maxMoney <= 0)) || (maxFlight !== null && (!Number.isFinite(maxFlight) || maxFlight <= 0))) {
      Alert.alert('Plafond invalide', 'Les plafonds doivent être supérieurs à zéro ou laissés vides pour être illimités.');
      return;
    }

    if (accommodation > flight) {
      Alert.alert('Hébergement invalide', 'La durée d’hébergement ne peut pas dépasser la durée de remboursement du prêt billet.');
      return;
    }

    try {
      setLoading(true);
      await updateLoanRule({
        rankRuleId: rule.id,
        updates: {
          money_loan_repayment_months: money,
          flight_loan_repayment_months: flight,
          flight_accommodation_months: accommodation,
          max_money_loan_amount: maxMoney,
          max_flight_loan_amount: maxFlight,
          money_loan_enabled: moneyEnabled,
          flight_loan_enabled: flightEnabled,
        },
      });
      Alert.alert('Enregistré', `Les règles de prêt du rang ${rule.label} ont été mises à jour.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour la règle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title={`Prêts · ${rule.label}`}>
      <ScrollView contentContainerStyle={adminStyles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.md }]}>
          Ces paramètres contrôlent les conditions d'éligibilité des utilisateurs de ce rang.
        </Text>

        <Card>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={typography.bodyBold}>Prêt d'argent</Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>Autoriser les nouvelles demandes pour ce rang.</Text>
              </View>
              <Switch value={moneyEnabled} onValueChange={setMoneyEnabled} />
            </View>

            <Input label="Plafond prêt d'argent (U)" value={maxMoneyLoan} onChangeText={setMaxMoneyLoan} format="price" placeholder="Illimité" />
            <Input label="Remboursement prêt d'argent (mois)" value={moneyMonths} onChangeText={setMoneyMonths} format="numeric" placeholder="1" />

            <View style={{ height: 1, backgroundColor: colors.border.default, marginVertical: spacing.xs }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={typography.bodyBold}>Prêt billet</Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>Autoriser les demandes de billet pour ce rang.</Text>
              </View>
              <Switch value={flightEnabled} onValueChange={setFlightEnabled} />
            </View>

            <Input label="Plafond prêt billet (U)" value={maxFlightLoan} onChangeText={setMaxFlightLoan} format="price" placeholder="Illimité" />
            <Input label="Remboursement prêt billet (mois)" value={flightMonths} onChangeText={setFlightMonths} format="numeric" placeholder="1" />
            <Input label="Hébergement associé (mois)" value={accommodationMonths} onChangeText={setAccommodationMonths} format="numeric" placeholder="0" />
          </View>
        </Card>

        <Button title="Enregistrer les règles" loading={loading} onPress={submit} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </Screen>
  );
}
