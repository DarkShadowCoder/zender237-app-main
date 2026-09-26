import React, {
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  Text,
  View,
  Pressable,
  Switch,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Input, {
  digitsOnly,
} from '../../../components/Input';

import Button from '../../../components/Button';
import Card from '../../../components/Card';

import {
  Screen,
  styles as adminStyles,
} from '../AdminUI';

import {
  updateRankRule,
} from '../../../services/adminService';

export default function RankRuleFormScreen({
  route,
  navigation,
}) {
  const rule =
    route.params?.rule;

  const [
    label,
    setLabel,
  ] = useState(
    rule?.label || ''
  );

  const [
    minVolume,
    setMinVolume,
  ] = useState(
    rule?.min_transaction_volume !=
      null
      ? String(
          Number(
            rule.min_transaction_volume
          )
        ).replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ' '
        )
      : ''
  );

  const [
    maxVolume,
    setMaxVolume,
  ] = useState(
    rule?.max_transaction_volume !=
      null
      ? String(
          Number(
            rule.max_transaction_volume
          )
        ).replace(
          /\B(?=(\d{3})+(?!\d))/g,
          ' '
        )
      : ''
  );

  const [
    moneyMonths,
    setMoneyMonths,
  ] = useState(
    String(
      rule?.money_loan_repayment_months ??
        1
    )
  );

  const [
    flightMonths,
    setFlightMonths,
  ] = useState(
    String(
      rule?.flight_loan_repayment_months ??
        1
    )
  );

  const [
    accommodationMonths,
    setAccommodationMonths,
  ] = useState(
    String(
      rule?.flight_accommodation_months ??
        0
    )
  );

  const [
    maxMoneyLoan,
    setMaxMoneyLoan,
  ] = useState(
    rule?.max_money_loan_amount != null
      ? String(Number(rule.max_money_loan_amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      : ''
  );

  const [
    maxFlightLoan,
    setMaxFlightLoan,
  ] = useState(
    rule?.max_flight_loan_amount != null
      ? String(Number(rule.max_flight_loan_amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      : ''
  );

  const [
    moneyEnabled,
    setMoneyEnabled,
  ] = useState(
    rule?.money_loan_enabled !== false
  );

  const [
    flightEnabled,
    setFlightEnabled,
  ] = useState(
    rule?.flight_loan_enabled !== false
  );

  const maxMoney = maxMoneyLoan ? Number(digitsOnly(maxMoneyLoan)) : null;
  const maxFlight = maxFlightLoan ? Number(digitsOnly(maxFlightLoan)) : null;

  const [
    loading,
    setLoading,
  ] = useState(false);

  if (!rule) {
    return (
      <Screen title="Règle de rang">
        <Card>
          <Text
            style={
              typography.body
            }
          >
            Règle introuvable.
          </Text>
        </Card>
      </Screen>
    );
  }

  const submit =
    async () => {
      const min =
        Number(
          digitsOnly(
            minVolume
          )
        );

      const max =
        maxVolume
          ? Number(
              digitsOnly(
                maxVolume
              )
            )
          : null;

      const money =
        Number(
          digitsOnly(
            moneyMonths
          )
        );

      const flight =
        Number(
          digitsOnly(
            flightMonths
          )
        );

      const accommodation =
        Number(
          digitsOnly(
            accommodationMonths
          )
        );

      if (
        !label.trim()
      ) {
        Alert.alert(
          'Champ requis',
          'Le nom du rang est obligatoire.'
        );
        return;
      }

      if (
        !Number.isFinite(
          min
        ) ||
        min < 0
      ) {
        Alert.alert(
          'Seuil invalide',
          'Le seuil minimum est invalide.'
        );
        return;
      }

      if (
        max !== null &&
        (!Number.isFinite(
          max
        ) ||
          max < min)
      ) {
        Alert.alert(
          'Seuil invalide',
          'Le seuil maximum doit être supérieur ou égal au minimum.'
        );
        return;
      }

      if (
        money <= 0 ||
        flight <= 0 ||
        accommodation < 0 ||
        (maxMoney !== null && (!Number.isFinite(maxMoney) || maxMoney <= 0)) ||
        (maxFlight !== null && (!Number.isFinite(maxFlight) || maxFlight <= 0))
      ) {
        Alert.alert(
          'Conditions invalides',
          'Vérifiez les durées configurées.'
        );
        return;
      }

      try {
        setLoading(
          true
        );

        await updateRankRule({
          rankRuleId:
            rule.id,

          updates: {
            label:
              label.trim(),

            min_transaction_volume:
              min,

            max_transaction_volume:
              max,

            money_loan_repayment_months:
              money,

            flight_loan_repayment_months:
              flight,

            flight_accommodation_months:
              accommodation,

            max_money_loan_amount:
              maxMoney,

            max_flight_loan_amount:
              maxFlight,

            money_loan_enabled:
              moneyEnabled,

            flight_loan_enabled:
              flightEnabled,
          },
        });

        Alert.alert(
          'Enregistré',
          'La règle du rang a été mise à jour.'
        );

        navigation.goBack();
      } catch (error) {
        Alert.alert(
          'Erreur',
          error.message
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <Screen
      title={`Règle ${rule.label}`}
    >
      <ScrollView
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Card>
          <Text
            style={[
              typography.caption,
              {
                color:
                  colors.text.secondary,
                marginBottom:
                  spacing.md,
              },
            ]}
          >
            Modifiez ici les seuils de transactions et les avantages de ce rang.
          </Text>

          <Input
            label="Libellé"
            value={label}
            onChangeText={
              setLabel
            }
            format="name"
            placeholder="Standard"
          />

          <Input
            label="Seuil minimum (U)"
            value={minVolume}
            onChangeText={
              setMinVolume
            }
            format="price"
            placeholder="0"
          />

          <Input
            label="Seuil maximum (U)"
            value={maxVolume}
            onChangeText={
              setMaxVolume
            }
            format="price"
            placeholder="Illimité"
          />

          <Input
            label="Remboursement prêt d'argent (mois)"
            value={
              moneyMonths
            }
            onChangeText={
              setMoneyMonths
            }
            format="numeric"
            placeholder="1"
          />

          <Input
            label="Remboursement prêt billet (mois)"
            value={
              flightMonths
            }
            onChangeText={
              setFlightMonths
            }
            format="numeric"
            placeholder="1"
          />

          <Input
            label="Plafond prêt d'argent (U)"
            value={maxMoneyLoan}
            onChangeText={setMaxMoneyLoan}
            format="price"
            placeholder="Illimité"
          />

          <Input
            label="Plafond prêt billet (U)"
            value={maxFlightLoan}
            onChangeText={setMaxFlightLoan}
            format="price"
            placeholder="Illimité"
          />

          <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={typography.bodyBold}>Prêt d'argent disponible</Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>Autorise les nouvelles demandes pour ce rang.</Text>
              </View>
              <Switch value={moneyEnabled} onValueChange={setMoneyEnabled} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={typography.bodyBold}>Prêt billet disponible</Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>Autorise les demandes de billet pour ce rang.</Text>
              </View>
              <Switch value={flightEnabled} onValueChange={setFlightEnabled} />
            </View>
          </View>

          <Input
            label="Hébergement associé (mois)"
            value={
              accommodationMonths
            }
            onChangeText={
              setAccommodationMonths
            }
            format="numeric"
            placeholder="0"
          />
        </Card>

        <Button
          title="Enregistrer"
          loading={
            loading
          }
          onPress={
            submit
          }
          style={{
            marginTop:
              spacing.lg,
          }}
        />
      </ScrollView>
    </Screen>
  );
}