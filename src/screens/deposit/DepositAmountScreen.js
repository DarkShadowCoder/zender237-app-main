import React, {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  countries,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';

import Input from '../../components/Input';

import Button from '../../components/Button';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  isValidAmount,
} from '../../utils/validators';

import {
  detectCurrentCountry,
} from '../../services/locationService';


const MIN_DEPOSIT_AMOUNT =
  10000;


async function detectDepositCountry() {
  const detected =
    await detectCurrentCountry();

  const country =
    detected?.country;

  const countryConfig =
    countries[country];

  if (
    !detected?.supported ||
    !countryConfig?.dialCode
  ) {
    return null;
  }

  return {
    country,
    countryCode:
      countryConfig.dialCode,
  };
}


export default function DepositAmountScreen({
  navigation,
}) {
  const {
    profile,
  } =
    useAuth();


  const [
    amount,
    setAmount,
  ] =
    useState('');


  const [
    error,
    setError,
  ] =
    useState(null);


  const [
    detectedCountry,
    setDetectedCountry,
  ] =
    useState(null);


  const [
    locationLoading,
    setLocationLoading,
  ] =
    useState(true);


  const [
    locationError,
    setLocationError,
  ] =
    useState(null);


  useEffect(
    () => {
      let active = true;

      detectDepositCountry()
        .then((country) => {
          if (active) {
            setDetectedCountry(country);
            setLocationError(
              country
                ? null
                : 'Pays non pris en charge ; les numéros MoMo ne seront pas filtrés par pays.'
            );
          }
        })
        .catch((locationFailure) => {
          if (active) {
            setLocationError(
              `${locationFailure?.message || 'Impossible de détecter votre pays.'} Les numéros MoMo ne seront pas filtrés par pays.`
            );
          }
        })
        .finally(() => {
          if (active) {
            setLocationLoading(false);
          }
        });

      return () => {
        active = false;
      };
    },
    []
  );


  const continueToPayment =
    async () => {
      if (
        !profile?.whatsapp_number
      ) {
        setError(
          'Votre numéro WhatsApp est introuvable.'
        );

        return;
      }


      if (
        !isValidAmount(
          amount
        )
      ) {
        setError(
          'Entrez un montant valide.'
        );

        return;
      }


      const numericAmount =
        Number(
          String(
            amount
          ).replace(
            /\D/g,
            ''
          )
        );


      if (
        numericAmount <
        MIN_DEPOSIT_AMOUNT
      ) {
        Alert.alert(
          'Le montant de recharge doit être supérieur ou égal à 10 000 U.'
        );

        return;
      }


      navigation.navigate(
        'DepositProof',
        {
          amount:
            numericAmount,

          country:
            detectedCountry?.country || null,

          countryCode:
            detectedCountry?.countryCode || null,
        }
      );
    };


  return (
    <ScrollView
      style={
        styles.wrapper
      }

      contentContainerStyle={
        styles.content
      }

      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="Déposer"
      />


      <View
        style={
          styles.stepRow
        }
      >
        <View
          style={
            styles.stepActive
          }
        >
          <Text
            style={
              styles.stepNumber
            }
          >
            1
          </Text>
        </View>


        <Text
          style={
            typography.caption
          }
        >
          Montant
        </Text>
      </View>


      <Text
        style={[
          typography.h2,
          styles.title,
        ]}
      >
        Combien ?
      </Text>


      <Text
        style={[
          typography.caption,
          styles.caption,
        ]}
      >
        Entrez le montant à ajouter.
      </Text>


      <Input
        label="Montant"

        value={
          amount
        }

        onChangeText={
          (value) => {
            setAmount(
              value
            );

            setError(
              null
            );
          }
        }

        format="price"

        keyboardType="number-pad"

        placeholder="50 000"

        rightAdornment={
          <Text
            style={
              typography.caption
            }
          >
            U
          </Text>
        }

        error={
          error
        }

        autoFocus
      />


      <Text
        style={[
          typography.caption,
          styles.locationStatus,
          locationError &&
            styles.locationError,
        ]}
      >
        {locationLoading
          ? 'Détection de votre pays…'
          : locationError
            ? locationError
            : `Pays détecté : ${
                countries[
                  detectedCountry?.country
                ]?.label || ''
              }`}
      </Text>


      <View
        style={
          styles.infoCard
        }
      >
        <Text
          style={
            styles.infoIcon
          }
        >
          ✓
        </Text>


        <View
          style={
            styles.infoText
          }
        >
          <Text
            style={
              typography.bodyBold
            }
          >
            Votre numéro
          </Text>


          <Text
            style={
              typography.caption
            }
          >
            {
              profile?.whatsapp_number
            }
          </Text>
        </View>
      </View>


      <Button
        title="Continuer"
        onPress={
          continueToPayment
        }
        style={
          styles.button
        }
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


    content: {
      padding:
        spacing.screenHorizontal,

      paddingBottom:
        spacing.xxxl,
    },


    stepRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      marginTop:
        spacing.lg,
    },


    stepActive: {
      width: 28,

      height: 28,

      borderRadius:
        14,

      backgroundColor:
        colors.brand
          .primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    stepNumber: {
      color:
        colors.text
          .inverse,

      fontWeight:
        '800',
    },


    title: {
      marginTop:
        spacing.xl,
    },


    caption: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.xl,
    },


    infoCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      marginTop:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        16,

      backgroundColor:
        colors.background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors.border
          .light,
    },


    locationStatus: {
      marginTop:
        spacing.sm,
    },


    locationError: {
      color:
        colors.error.default,
    },


    infoIcon: {
      width: 34,

      height: 34,

      borderRadius:
        17,

      textAlign:
        'center',

      textAlignVertical:
        'center',

      color:
        colors.brand
          .primary,

      backgroundColor:
        colors.brand
          .primaryLight,

      fontSize:
        18,

      fontWeight:
        '800',
    },


    infoText: {
      flex: 1,
    },


    button: {
      marginTop:
        spacing.xl,
    },
  });