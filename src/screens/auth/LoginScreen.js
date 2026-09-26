import React, {
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
  fontSizes,
  countries,
} from '../../theme/theme';

import {
  useAuth,
} from '../../context/AuthContext';

import PhoneNumberInput
  from '../../components/PhoneNumberInput';

import SecretCodeInput
  from '../../components/SecretCodeInput';

import Button
  from '../../components/Button';

import InfoBanner
  from '../../components/InfoBanner';

import {
  isValidWhatsAppNumber,
} from '../../utils/validators';


export default function LoginScreen({
  navigation,
}) {

  const {
    signIn,
    signingIn,
  } =
    useAuth();


  const [
    country,
    setCountry,
  ] =
    useState('cameroun');


  const [
    nationalNumber,
    setNationalNumber,
  ] =
    useState('');


  const [
    secretCode,
    setSecretCode,
  ] =
    useState('');


  const [
    error,
    setError,
  ] =
    useState(null);


  const [
    attemptsRemaining,
    setAttemptsRemaining,
  ] =
    useState(null);


  const fullNumber =
    `${
      countries[
        country
      ]?.dialCode ||
      ''
    }${
      nationalNumber
        .replace(/\s/g, '')
    }`;


  const handleLogin =
    async () => {

      setError(null);


      if (
        !isValidWhatsAppNumber(
          fullNumber
        )
      ) {

        setError(
          'Veuillez entrer un numéro WhatsApp valide.'
        );

        return;
      }


      if (
        !/^\d{6}$/.test(
          secretCode
        )
      ) {

        setError(
          'Le code secret doit contenir 6 chiffres.'
        );

        return;
      }


      try {

        /*
         * IMPORTANT :
         *
         * LoginScreen ne connaît pas
         * ADMIN / PARTNER / KMA.
         *
         * AuthContext reçoit accountType
         * depuis l'Edge Function.
         */

        await signIn({
          whatsappNumber:
            fullNumber,

          secretCode,
        });


        /*
         * Ne pas faire :
         *
         * navigation.navigate(...)
         *
         * RootNavigator s'en charge.
         */

      } catch (loginError) {

        const remaining =
          loginError?.attemptsRemaining;


        setAttemptsRemaining(
          typeof remaining ===
            'number'
            ? remaining
            : null
        );


        if (
          loginError?.redirectToRecovery
        ) {

          setError(
            'Trop de tentatives incorrectes.'
          );


          navigation.navigate(
            'ForgotSecretCode',
            {
              whatsappNumber:
                fullNumber,
            }
          );

          return;
        }


        setError(
          loginError?.message ||
          'Numero ou code secret incorrect.'
        );

      }

    };


  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
      keyboardShouldPersistTaps="handled"
    >

      <Text
        style={
          typography.h1
        }
      >
        Connexion
      </Text>


      <Text
        style={[
          typography.body,
          styles.subtitle,
        ]}
      >
        Connectez-vous avec votre numéro
        WhatsApp et votre code secret.
      </Text>


      <PhoneNumberInput
        label="Numéro WhatsApp"
        country={
          country
        }
        onChangeCountry={
          setCountry
        }
        value={
          nationalNumber
        }
        onChangeText={
          setNationalNumber
        }
      />


      <SecretCodeInput
        label="Code secret"
        value={
          secretCode
        }
        onChangeText={
          setSecretCode
        }
        maxLength={6}
      />


      {error ? (
        <Text
          style={
            styles.error
          }
        >
          {error}
        </Text>
      ) : null}


      {typeof attemptsRemaining ===
        'number' && (
        <Text
          style={[
            typography.caption,
            styles.attempts,
          ]}
        >
          Tentatives restantes :{' '}
          {attemptsRemaining}
        </Text>
      )}


      <Button
        title="Se connecter"
        onPress={
          handleLogin
        }
        loading={
          signingIn
        }
        style={
          styles.loginButton
        }
      />


      <Pressable
        onPress={() =>
          navigation.navigate(
            'ForgotSecretCode'
          )
        }
        style={
          styles.forgot
        }
      >
        <Text
          style={[
            typography.body,
            styles.forgotText,
          ]}
        >
          Code secret oublié ?
        </Text>
      </Pressable>


      <InfoBanner
        icon="shield-checkmark-outline"
        text="Connectez-vous en toute securité a votre compte Zender237"
      />


      <Text
        style={[
          typography.caption,
          styles.signup,
        ]}
      >
        Vous n'avez pas encore de compte ?{' '}

        <Text
          style={
            styles.signupLink
          }
          onPress={() =>
            navigation.navigate(
              'SignUp'
            )
          }
        >
          Créer un compte
        </Text>
      </Text>

    </ScrollView>
  );
}


const styles =
  StyleSheet.create({

    container: {
      flexGrow: 1,

      backgroundColor:
        colors.background.default,

      paddingHorizontal:
        spacing.screenHorizontal,

      paddingTop:
        60,

      paddingBottom:
        spacing.huge,
    },

    subtitle: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.xxl,

      color:
        colors.text.secondary,
    },

    error: {
      marginTop:
        spacing.sm,

      color:
        colors.error.default,

      fontSize:
        fontSizes.sm,
    },

    attempts: {
      marginTop:
        spacing.xs,

      color:
        colors.warning.default,
    },

    loginButton: {
      marginTop:
        spacing.xl,
    },

    forgot: {
      alignItems:
        'center',

      marginTop:
        spacing.md,
    },

    forgotText: {
      color:
        colors.text.link,
    },

    signup: {
      textAlign:
        'center',

      marginTop:
        spacing.xl,

      color:
        colors.text.secondary,
    },

    signupLink: {
      color:
        colors.text.link,

      fontFamily:
        'Baloo2_700Bold',
    },

  });