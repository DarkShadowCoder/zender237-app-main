import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors, typography, spacing, countries } from '../../theme/theme';
import PhoneNumberInput from '../../components/PhoneNumberInput';
import Button from '../../components/Button';
import { requestSecretCodeRecovery } from '../../services/authService';
import { isValidWhatsAppNumber } from '../../utils/validators';

/** Écran 09 — Récupération du code secret : envoi d'un OTP de récupération. */
export default function ForgotSecretCodeScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('cameroun');
  const [nationalNumber, setNationalNumber] = useState('');
  const [error, setError] = useState(null);

  const getFullNumber = () => `${countries[country].dialCode}${nationalNumber.replace(/\s/g, '')}`;
  

  const handleSend = async () => {
    const cleaned = getFullNumber();
    if (!isValidWhatsAppNumber(cleaned)) {
      setError('Numéro WhatsApp invalide.');
      return;
    }
    setLoading(true);
    try {
      const otpResult = await requestSecretCodeRecovery({
        whatsappNumber: cleaned,
      });

      navigation.navigate('RecoveryOtp', {
        whatsappNumber: cleaned,
        otpId: otpResult?.otpId || null,
        deliveryChannel: otpResult?.deliveryChannel || 'email',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={typography.h1}>Récupérer le code secret</Text>
      <Text style={[typography.body, { marginTop: spacing.xs, marginBottom: spacing.xl }]}>
        Entrez votre numéro WhatsApp pour recevoir un code de récupération.
      </Text>

      <PhoneNumberInput
        label="Numéro WhatsApp"
        country={country}
        onChangeCountry={setCountry}
        value={nationalNumber}
        onChangeText={setNationalNumber}
      />

      <View style={{ flex: 1 }} />
      <Button title="Envoyer le code" onPress={handleSend} loading={loading} />
      <Text
        style={{ textAlign: 'center', marginTop: spacing.lg, color: colors.text.link }}
        onPress={() => navigation.goBack()}
      >
        Retour à la connexion
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default, padding: spacing.screenHorizontal, paddingTop: 60 },
});
