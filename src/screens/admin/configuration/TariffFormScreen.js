// src/screens/admin/configuration/TariffFormScreen.js

import React, {
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../../theme/theme';

import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Card from '../../../components/Card';

import {
  createTransferTariff,
  updateTransferTariff,
} from '../../../services/tariffService';

import {
  Screen,
  SectionTitle,
  styles as adminStyles,
} from '../AdminUI';


const COUNTRIES = [
  {
    value: 'mali',
    label: 'Mali',
  },

  {
    value: 'guinee',
    label: 'Guinée',
  },

  {
    value: 'cameroun',
    label: 'Cameroun',
  },
];


function normalizeCountry(
  value
) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();
}


function normalizeInputAmount(
  value
) {
  return String(
    value ?? ''
  )
    .replace(
      /\s/g,
      ''
    )
    .replace(
      ',',
      '.'
    );
}


function isValidNumber(
  value
) {
  const number =
    Number(
      normalizeInputAmount(
        value
      )
    );

  return Number.isFinite(
    number
  );
}


function parseAmount(
  value
) {
  return Number(
    normalizeInputAmount(
      value
    )
  );
}


function CountryPicker({
  label,
  value,
  onChange,
}) {
  return (
    <View
      style={
        styles.pickerBlock
      }
    >
      <Text
        style={[
          typography.caption,
          styles.fieldLabel,
        ]}
      >
        {label}
      </Text>

      <View
        style={
          styles.chipRow
        }
      >
        {COUNTRIES.map(
          (
            country
          ) => {
            const active =
              value ===
              country.value;

            return (
              <Pressable
                key={
                  country.value
                }
                onPress={() =>
                  onChange(
                    country.value
                  )
                }
                style={[
                  styles.chip,
                  active &&
                    styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    active
                      ? styles.chipTextActive
                      : styles.chipText,
                  ]}
                >
                  {
                    country.label
                  }
                </Text>
              </Pressable>
            );
          }
        )}
      </View>
    </View>
  );
}


export default function TariffFormScreen({
  route,
  navigation,
}) {
  const tariff =
    route.params?.tariff ||
    null;

  const [
    countryA,
    setCountryA,
  ] = useState(
    normalizeCountry(
      tariff?.country_a
    )
  );

  const [
    countryB,
    setCountryB,
  ] = useState(
    normalizeCountry(
      tariff?.country_b
    )
  );

  const [
    min,
    setMin,
  ] = useState(
    tariff?.min_amount !==
      undefined &&
    tariff?.min_amount !==
      null
      ? String(
          tariff.min_amount
        )
      : ''
  );

  const [
    max,
    setMax,
  ] = useState(
    tariff?.max_amount !==
      undefined &&
    tariff?.max_amount !==
      null
      ? String(
          tariff.max_amount
        )
      : ''
  );

  const [
    fee,
    setFee,
  ] = useState(
    tariff?.fee_amount !==
      undefined &&
    tariff?.fee_amount !==
      null
      ? String(
          tariff.fee_amount
        )
      : ''
  );

  const [
    loading,
    setLoading,
  ] = useState(
    false
  );


  const submit =
    async () => {
      if (loading) {
        return;
      }

      const normalizedCountryA =
        normalizeCountry(
          countryA
        );

      const normalizedCountryB =
        normalizeCountry(
          countryB
        );

      if (
        !normalizedCountryA ||
        !normalizedCountryB
      ) {
        Alert.alert(
          'Trajet incomplet',
          'Sélectionnez les deux pays du Frais.'
        );

        return;
      }

      if (
        normalizedCountryA ===
        normalizedCountryB
      ) {
        Alert.alert(
          'Trajet invalide',
          'Les deux pays du Frais doivent être différents.'
        );

        return;
      }

      if (
        !min.trim() ||
        !isValidNumber(
          min
        )
      ) {
        Alert.alert(
          'Montant minimum invalide',
          'Saisissez un montant minimum valide.'
        );

        return;
      }

      if (
        !max.trim() ||
        !isValidNumber(
          max
        )
      ) {
        Alert.alert(
          'Montant maximum invalide',
          'Saisissez un montant maximum valide.'
        );

        return;
      }

      if (
        !fee.trim() ||
        !isValidNumber(
          fee
        )
      ) {
        Alert.alert(
          'Frais invalides',
          'Saisissez un montant de frais valide.'
        );

        return;
      }

      const minAmount =
        parseAmount(
          min
        );

      const maxAmount =
        parseAmount(
          max
        );

      const feeAmount =
        parseAmount(
          fee
        );

      if (
        minAmount < 0
      ) {
        Alert.alert(
          'Montant minimum invalide',
          'Le montant minimum ne peut pas être négatif.'
        );

        return;
      }

      if (
        maxAmount <=
        minAmount
      ) {
        Alert.alert(
          'Tranche invalide',
          'Le montant maximum doit être supérieur au montant minimum.'
        );

        return;
      }

      if (
        feeAmount < 0
      ) {
        Alert.alert(
          'Frais invalides',
          'Le montant des frais ne peut pas être négatif.'
        );

        return;
      }

      try {
        setLoading(
          true
        );

        if (tariff) {
          await updateTransferTariff({
            tariffId:
              tariff.id,

            updates: {
              country_a:
                normalizedCountryA,

              country_b:
                normalizedCountryB,

              min_amount:
                minAmount,

              max_amount:
                maxAmount,

              fee_amount:
                feeAmount,
            },
          });
        } else {
          await createTransferTariff({
            countryA:
              normalizedCountryA,

            countryB:
              normalizedCountryB,

            minAmount,

            maxAmount,

            feeAmount,
          });
        }

        Alert.alert(
          'Tarif enregistré',
          tariff
            ? 'Le tarif a été modifié avec succès.'
            : 'Le tarif a été créé avec succès.',
          [
            {
              text: 'OK',

              onPress:
                () =>
                  navigation.goBack(),
            },
          ]
        );
      } catch (
        error
      ) {
        console.error(
          '[TariffFormScreen] Erreur lors de la sauvegarde :',
          error
        );

        if (
          error?.code ===
          'TARIFF_ALREADY_EXISTS'
        ) {
          Alert.alert(
            'Tarif déjà existant',
            error.message ||
              'Un tarif existe déjà pour ce Frais et cette tranche de montant.'
          );

          return;
        }

        const message =
          String(
            error?.message ??
              ''
          ).toLowerCase();

        if (
          error?.code ===
            '23505' ||
          message.includes(
            'uq_transfer_fee_tariff_range'
          )
        ) {
          Alert.alert(
            'Tarif déjà existant',
            'Un autre tarif possède déjà ce même Frais et cette même tranche de montant.'
          );

          return;
        }

        Alert.alert(
          'Erreur',
          error?.message ||
            'Impossible d’enregistrer le tarif.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  return (
    <Screen
      title={
        tariff
          ? 'Modifier le tarif'
          : 'Ajouter un tarif'
      }
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
             Tarif reversible: Pays A ↔ Pays B.
          </Text>

          <CountryPicker
            label="Pays A"
            value={
              countryA
            }
            onChange={
              setCountryA
            }
          />

          <CountryPicker
            label="Pays B"
            value={
              countryB
            }
            onChange={
              setCountryB
            }
          />

          {countryA &&
            countryB &&
            countryA ===
              countryB && (
              <Text
                style={[
                  typography.caption,
                  styles.validationText,
                ]}
              >
                Les deux pays du Frais doivent être différents.
              </Text>
            )}
        </Card>

        <SectionTitle
          title="Tranche et frais"
        />

        <Card>
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
                value={min}
                onChangeText={
                  setMin
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View
              style={
                styles.half
              }
            >
              <Input
                label="Max. (U)"
                value={max}
                onChangeText={
                  setMax
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input
            label="Frais (U)"
            value={fee}
            onChangeText={
              setFee
            }
            placeholder="0"
            keyboardType="numeric"
          />
        </Card>

        <Button
          title={
            tariff
              ? 'Modifier le tarif'
              : 'Enregistrer'
          }
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
    pickerBlock: {
      marginBottom:
        spacing.md,
    },

    fieldLabel: {
      color:
        colors.text.secondary,

      marginBottom:
        spacing.xs,
    },

    chipRow: {
      flexDirection:
        'row',

      gap:
        spacing.xs,

      flexWrap:
        'wrap',
    },

    chip: {
      paddingHorizontal:
        spacing.md,

      paddingVertical:
        spacing.xs,

      borderRadius:
        radii.pill,

      borderWidth:
        1,

      borderColor:
        colors.border.default,

      backgroundColor:
        colors
          .background
          .surface,
    },

    chipActive: {
      backgroundColor:
        colors
          .brand
          .primaryLight,

      borderColor:
        colors.brand.primary,
    },

    chipText: {
      color:
        colors.text.secondary,
    },

    chipTextActive: {
      color:
        colors
          .brand
          .primaryDark,

      fontWeight:
        '600',
    },

    validationText: {
      color:
        colors.status?.error ||
        colors.text.error ||
        '#D32F2F',

      marginTop:
        spacing.xs,
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