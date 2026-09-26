import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors, typography, spacing } from '../../theme/theme';
import CodeInput from '../../components/CodeInput';
import Button from '../../components/Button';
import { setNewSecretCode } from '../../services/authService';
import { isCompleteCode } from '../../utils/validators';
import { SECRET_CODE_LENGTH } from '../../constants';

/** Écran 11 — Nouveau code secret. */
export default function NewSecretCodeScreen({ route, navigation }) {
  const { whatsappNumber, otpId } = route.params;
  const [digits, setDigits] = useState(Array(SECRET_CODE_LENGTH).fill(''));
  const [confirmDigits, setConfirmDigits] = useState(Array(SECRET_CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!isCompleteCode(digits, SECRET_CODE_LENGTH) || !isCompleteCode(confirmDigits, SECRET_CODE_LENGTH)) {
      setError('Veuillez saisir les 6 chiffres dans les deux champs.');
      return;
    }
    if (digits.join('') !== confirmDigits.join('')) {
      setError('Les codes ne correspondent pas.');
      return;
    }
    if (!otpId) {
      setError(
        'Session de récupération introuvable. Veuillez recommencer la récupération du code secret.'
      );
      return;
    }

    setLoading(true);
    try {
      await setNewSecretCode({
        whatsappNumber,
        otpId,
        newSecretCode: digits.join(''),
      });
      Toast.show({ type: 'success', text1: 'Code secret mis à jour' });
      navigation.replace('Login');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={typography.h1}>Nouveau code secret</Text>
      <Text style={[typography.body, { marginTop: spacing.xs, marginBottom: spacing.xxl }]}>
        Définissez votre nouveau code secret.
      </Text>

      <Text style={{ marginBottom: spacing.sm }}>Nouveau code (6 chiffres)</Text>
      <CodeInput length={SECRET_CODE_LENGTH} value={digits} onChange={setDigits} secure />

      <Text style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>Confirmez le code</Text>
      <CodeInput length={SECRET_CODE_LENGTH} value={confirmDigits} onChange={setConfirmDigits} secure />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={[typography.caption, { marginTop: spacing.lg }]}>
        Facile à retenir, ne pas utiliser des suites simples.
      </Text>

      <View style={{ flex: 1 }} />
      <Button title="Continuer" onPress={handleSubmit} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default, padding: spacing.screenHorizontal, paddingTop: 60 },
  error: { marginTop: spacing.md, color: colors.error.default },
});
