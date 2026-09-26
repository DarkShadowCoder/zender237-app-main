import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  colors,
  typography,
  spacing,
  fontSizes,
  fontWeights,
  countries,
} from '../../theme/theme';
import PhoneNumberInput from '../../components/PhoneNumberInput';
import Button from '../../components/Button';
import InfoBanner from '../../components/InfoBanner';
import {
  checkAvailability,
  requestRegistrationOtp,
} from '../../services/authService';
import { isValidWhatsAppNumber } from '../../utils/validators';
import { OTP_RESEND_SECONDS } from '../../constants';

/**
 * Écran 04 — Créer un compte.
 * Uniquement pour les comptes utilisateurs simples.
 * Le numéro WhatsApp doit être disponible avant l'envoi de l'OTP.
 */
export default function SignUpScreen({ navigation }) {
  const [country, setCountry] = useState('cameroun');
  const [nationalNumber, setNationalNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getFullNumber = () =>
    `${countries[country].dialCode}${nationalNumber.replace(/\s/g, '')}`;

  const handleContinue = async () => {
    setError(null);

    const cleaned = getFullNumber();

    if (!isValidWhatsAppNumber(cleaned)) {
      setError('Numéro WhatsApp invalide.');
      return;
    }

    setLoading(true);

    try {
      const { available } = await checkAvailability({
        whatsappNumber: cleaned,
      });

      if (!available) {
        setError('Ce numéro est déjà associé à un compte.');
        return;
      }

      const otpResult = await requestRegistrationOtp({
        whatsappNumber: cleaned,
      });

      navigation.navigate('OtpVerification', {
        whatsappNumber: cleaned,
        purpose: 'registration',
        nextScreen: 'PersonalInfo',
        resetOnFail: 'SignUp',
        resendSeconds: OTP_RESEND_SECONDS,
        deliveryChannel:
          otpResult?.deliveryChannel || 'whatsapp',
      });
    } catch (e) {
      setError(
        e?.message || 'Impossible de poursuivre l’inscription.'
      );

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2:
          e?.message || 'Impossible de poursuivre l’inscription.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.wrapper}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={typography.h1}>Créer un compte</Text>

      <Text style={[typography.body, styles.subtitle]}>
        Entrez votre numéro WhatsApp pour commencer.
      </Text>

      <PhoneNumberInput
        label="Numéro WhatsApp"
        country={country}
        onChangeCountry={setCountry}
        value={nationalNumber}
        onChangeText={setNationalNumber}
        error={error}
      />

      <InfoBanner
        text="Nous utiliserons WhatsApp pour vous envoyer un code de vérification."
      />

      <View style={styles.actions}>
        <Button
          title="Continuer"
          onPress={handleContinue}
          loading={loading}
        />

        <View style={styles.secureNote}>
          <Ionicons
            name="lock-closed-outline"
            size={13}
            style={{
              color: colors.text.tertiary,
              fontWeight: fontWeights.bold,
            }}
          />

          <Text
            style={[
              typography.caption,
              styles.secureText,
            ]}
          >
            Vos données sont sécurisées
          </Text>
        </View>

        <Text
          style={[
            typography.caption,
            styles.footer,
          ]}
        >
          Déjà un compte ?{' '}
          <Text
            style={{
              color: colors.text.link,
            }}
            onPress={() => navigation.navigate('Login')}
          >
            Se connecter
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    backgroundColor: colors.background.default,
    padding: spacing.screenHorizontal,
    paddingTop: 60,
  },

  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    color: colors.text.secondary,
  },

  actions: {
    marginTop: spacing.huge,
  },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  secureText: {
    color: colors.text.tertiary,
    marginLeft: 4,
    top: 4,
  },

  footer: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.text.secondary,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
});