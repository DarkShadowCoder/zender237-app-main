import React, {
  useState,
} from 'react';

import {
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
  countries,
  radii,
  spacing,
  typography,
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
  getCountryKeyFromPhone,
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


  /*
   * ==========================================================
   * COUNTRY CODE FIXE DU COMPTE
   * ==========================================================
   */

  const loginCountryKey =
    getCountryKeyFromPhone(
      profile?.whatsapp_number
    );


  const fixedRecipientCountry =
    loginCountryKey &&
    countries[
      loginCountryKey
    ]
      ? loginCountryKey
      : profile?.country &&
          countries[
            profile.country
          ]
        ? profile.country
        : 'cameroun';


  const fixedRecipientDialCode =
    countries[
      fixedRecipientCountry
    ]?.dialCode ||
    '+237';


  /*
   * ==========================================================
   * ÉTAT
   * ==========================================================
   */

  const [
    method,
    setMethod,
  ] = useState(
    'mobile_money'
  );


  const [
    recipientName,
    setRecipientName,
  ] = useState('');


  const [
    recipientMobileNumber,
    setRecipientMobileNumber,
  ] = useState('');


  const [
    errors,
    setErrors,
  ] = useState({});


  /*
   * ==========================================================
   * CONTINUER
   * ==========================================================
   */

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
              : fixedRecipientCountry,

          recipientCountryCode:
            method ===
            'bank_transfer'
              ? null
              : fixedRecipientDialCode,

          recipientMobileNumber:
            method ===
            'bank_transfer'
              ? recipientMobileNumber.trim()
              : buildInternationalPhone(
                  recipientMobileNumber,
                  fixedRecipientCountry
                ),
        }
      );
    };


  /*
   * ==========================================================
   * AFFICHAGE
   * ==========================================================
   */

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

          onChangeText={(
            value
          ) => {
            setRecipientName(
              value
            );

            setErrors(
              (
                current
              ) => ({
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

            onChangeText={(
              value
            ) => {
              setRecipientMobileNumber(
                value
              );

              setErrors(
                (
                  current
                ) => ({
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
              fixedRecipientCountry
            }

            /*
             * Pas de `onChangeCountry`.
             *
             * Le préfixe est donc fixe et correspond au
             * numéro utilisé pour la connexion.
             */

            onChangeText={(
              value
            ) => {
              setRecipientMobileNumber(
                value
              );

              setErrors(
                (
                  current
                ) => ({
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
            L'indicatif fixe du compte est{' '}
            {
              fixedRecipientDialCode
            }.
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


/*
 * ============================================================
 * STYLES
 * ============================================================
 */

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
        colors.text
          .secondary,

      marginTop:
        spacing.xs,
    },
  });