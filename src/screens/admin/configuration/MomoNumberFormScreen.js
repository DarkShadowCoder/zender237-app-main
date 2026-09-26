import React, {
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  View,
  Text,
  StyleSheet,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Input, {
  digitsOnly,
} from '../../../components/Input';

import PhoneNumberInput from
  '../../../components/PhoneNumberInput';

import {
  buildInternationalPhone,
} from '../../../utils/phone';

import Button from
  '../../../components/Button';

import Card from
  '../../../components/Card';

import {
  createMomoDepositNumber,
} from '../../../services/adminService';

import {
  Screen,
  styles as adminStyles,
} from '../AdminUI';

export default function MomoNumberFormScreen({
  navigation,
}) {
  const [
    phone,
    setPhone,
  ] =
    useState('');

  const [
    phoneCountry,
    setPhoneCountry,
  ] =
    useState(
      'cameroun'
    );

  const [
    name,
    setName,
  ] =
    useState('');

  const [
    min,
    setMin,
  ] =
    useState('');

  const [
    max,
    setMax,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const submit =
    async () => {
      if (
        !phone.trim() ||
        !name.trim()
      ) {
        Alert.alert(
          'Champs requis',
          'Renseignez le numéro et le titulaire.'
        );

        return;
      }

      const minAmount =
        min
          ? Number(
              digitsOnly(min)
            )
          : null;

      const maxAmount =
        max
          ? Number(
              digitsOnly(max)
            )
          : null;

      if (
        minAmount !== null &&
        maxAmount !== null &&
        maxAmount < minAmount
      ) {
        Alert.alert(
          'Montants invalides',
          'Le montant maximal doit être supérieur ou égal au montant minimal.'
        );

        return;
      }

      try {
        setLoading(
          true
        );

        await createMomoDepositNumber(
          {
            phoneNumber:
              buildInternationalPhone(
                phone,
                phoneCountry
              ),

            holderName:
              name,

            minAmount,

            maxAmount,
          }
        );

        Alert.alert(
          'Enregistré',
          'Numéro ajouté.'
        );

        navigation.goBack();
      } catch (e) {
        Alert.alert(
          'Erreur',
          e.message
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <Screen
      title="Numéro Mobile Money"
    >
      <ScrollView
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text
          style={[
            typography.caption,
            styles.hint,
          ]}
        >
          Ce numéro sera proposé aux abonnés lors d'une recharge Mobile Money.
        </Text>

        <Card>
          <PhoneNumberInput
            label="Numéro"
            value={
              phone
            }
            country={
              phoneCountry
            }
            onChangeCountry={(
              value
            ) => {
              setPhoneCountry(
                value
              );

              setPhone(
                ''
              );
            }}
            onChangeText={
              setPhone
            }
          />

          <Input
            label="Titulaire"
            value={
              name
            }
            onChangeText={
              setName
            }
            placeholder="Nom du titulaire"
            autoCapitalize="words"
            format="name"
          />

          <View
            style={
              styles.row
            }
          >
            <View
              style={
                styles.half
              }
            >
              <Input
                label="Min. (U)"
                value={
                  min
                }
                onChangeText={
                  setMin
                }
                placeholder="0"
                format="price"
              />
            </View>

            <View
              style={
                styles.half
              }
            >
              <Input
                label="Max. (U)"
                value={
                  max
                }
                onChangeText={
                  setMax
                }
                placeholder="Illimité"
                format="price"
              />
            </View>
          </View>
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

const styles =
  StyleSheet.create({
    hint: {
      color:
        colors.text.secondary,

      marginBottom:
        spacing.md,
    },

    row: {
      flexDirection:
        'row',

      gap:
        spacing.sm,
    },

    half: {
      flex: 1,
    },
  });