import React, {
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  radii,
  spacing,
  typography,
  countries,
} from '../../theme/theme';

import Header from
  '../../components/Header';

import Input from
  '../../components/Input';

import Button from
  '../../components/Button';

import PhoneNumberInput from
  '../../components/PhoneNumberInput';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  buildInternationalPhone,
  digitsOnlyPhone,
} from '../../utils/phone';

const METHODS = [
  {
    key: 'mobile_money',
    label: 'Mobile Money',
    icon: 'phone-portrait-outline',
  },
  {
    key: 'bank_transfer',
    label: 'Compte bancaire',
    icon: 'business-outline',
  },
  {
    key: 'partner_agent',
    label: 'Retrait partenaire',
    icon: 'people-outline',
  },
];

export default function WithdrawalMethodScreen({
  route,
  navigation,
}) {
  const {
    amount,
    feeAmount,
  } = route.params;

  const {
    profile,
  } = useAuth();

  const defaultCountry =
    profile?.country &&
    countries[
      profile.country
    ]
      ? profile.country
      : 'cameroun';

  const [
    method,
    setMethod,
  ] =
    useState(
      'mobile_money'
    );

  const [
    recipientName,
    setRecipientName,
  ] =
    useState('');

  const [
    recipientMobileNumber,
    setRecipientMobileNumber,
  ] =
    useState('');

  const [
    recipientCountry,
    setRecipientCountry,
  ] =
    useState(
      defaultCountry
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const handleContinue =
    () => {
      const nextErrors =
        {};

      if (
        !recipientName.trim()
      ) {
        nextErrors.recipientName =
          'Nom du bénéficiaire requis.';
      }

      if (
        method ===
          'mobile_money' ||
        method ===
          'partner_agent'
      ) {
        if (
          digitsOnlyPhone(
            recipientMobileNumber
          ).length < 8
        ) {
          nextErrors.recipientMobileNumber =
            'Numéro de téléphone invalide.';
        }
      } else if (
        !recipientMobileNumber.trim()
      ) {
        nextErrors.recipientMobileNumber =
          'Numéro de compte requis.';
      }

      if (
        Object.keys(
          nextErrors
        ).length
      ) {
        setErrors(
          nextErrors
        );

        return;
      }

      navigation.navigate(
        'WithdrawalSummary',
        {
          amount,
          feeAmount,
          method,

          recipientName:
            recipientName.trim(),

          recipientCountry:
            method ===
            'bank_transfer'
              ? null
              : recipientCountry,

          recipientCountryCode:
            method ===
            'bank_transfer'
              ? null
              : countries[
                  recipientCountry
                ]?.dialCode,

          recipientMobileNumber:
            method ===
            'bank_transfer'
              ? recipientMobileNumber.trim()
              : buildInternationalPhone(
                  recipientMobileNumber,
                  recipientCountry
                ),
        }
      );
    };

  return (
    <ScrollView
      style={
        styles.wrapper
      }
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
      }}
    >
      <Header
        title="Méthode de retrait"
      />

      <Text
        style={[
          typography.body,
          {
            marginTop:
              spacing.lg,

            marginBottom:
              spacing.lg,
          },
        ]}
      >
        Choisissez votre
        méthode
      </Text>

      {METHODS.map(
        (item) => (
          <Pressable
            key={
              item.key
            }
            onPress={() =>
              setMethod(
                item.key
              )
            }
            style={[
              styles.row,
              method ===
                item.key &&
                styles.rowSelected,
            ]}
          >
            <Ionicons
              name={
                item.icon
              }
              size={20}
              color={
                colors.icon
                  .default
              }
            />

            <Text
              style={[
                typography.bodyBold,
                {
                  flex: 1,
                },
              ]}
            >
              {
                item.label
              }
            </Text>

            {method ===
            item.key ? (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={
                  colors.brand
                    .primary
                }
              />
            ) : null}
          </Pressable>
        )
      )}

      <View
        style={{
          marginTop:
            spacing.lg,
        }}
      >
        <Input
          label="Nom du bénéficiaire"
          value={
            recipientName
          }
          onChangeText={(value) => {
            setRecipientName(
              value
            );

            setErrors(
              (current) => ({
                ...current,
                recipientName:
                  null,
              })
            );
          }}
          placeholder="Nom complet"
          error={
            errors.recipientName
          }
        />

        {method ===
        'bank_transfer' ? (
          <Input
            label="Numéro de compte"
            value={
              recipientMobileNumber
            }
            onChangeText={(value) => {
              setRecipientMobileNumber(
                value
              );

              setErrors(
                (current) => ({
                  ...current,
                  recipientMobileNumber:
                    null,
                })
              );
            }}
            placeholder="Numéro de compte bancaire"
            error={
              errors.recipientMobileNumber
            }
          />
        ) : (
          <PhoneNumberInput
            label="Numéro Mobile Money"
            value={
              recipientMobileNumber
            }
            country={
              recipientCountry
            }
            onChangeCountry={(
              value
            ) => {
              setRecipientCountry(
                value
              );

              setRecipientMobileNumber(
                ''
              );

              setErrors(
                (current) => ({
                  ...current,
                  recipientMobileNumber:
                    null,
                })
              );
            }}
            onChangeText={(value) => {
              setRecipientMobileNumber(
                value
              );

              setErrors(
                (current) => ({
                  ...current,
                  recipientMobileNumber:
                    null,
                })
              );
            }}
            error={
              errors.recipientMobileNumber
            }
          />
        )}

        {method !==
        'bank_transfer' ? (
          <Text
            style={
              styles.helper
            }
          >
            L'indicatif{' '}
            {
              countries[
                recipientCountry
              ]?.dialCode
            }{' '}
            sera enregistré
            avec le retrait.
          </Text>
        ) : null}
      </View>

      <Button
        title="Continuer"
        onPress={
          handleContinue
        }
        style={{
          marginTop:
            spacing.lg,
        }}
      />
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,

      backgroundColor:
        colors.background
          .default,
    },

    row: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.md,

      backgroundColor:
        colors.background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors.border
          .default,

      borderRadius:
        radii.md,

      padding:
        spacing.lg,

      marginBottom:
        spacing.md,
    },

    rowSelected: {
      borderColor:
        colors.brand
          .primary,

      borderWidth:
        2,
    },

    helper: {
      ...typography.caption,

      color:
        colors.text.secondary,

      marginTop:
        spacing.xs,
    },
  });