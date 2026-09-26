import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  colors,
  typography,
  spacing,
} from '../../theme/theme';
import CodeInput from '../../components/CodeInput';
import NumericKeypad from '../../components/NumericKeypad';
import {
  OTP_LENGTH,
  OTP_RESEND_SECONDS,
  MAX_OTP_ATTEMPTS,
} from '../../constants';
import { useCountdown } from '../../hooks/useCountdown';
import {
  verifyOtp,
  requestRegistrationOtp,
  requestSecretCodeRecovery,
} from '../../services/authService';

export default function OtpVerificationScreen({
  route,
  navigation,
}) {
  const {
    whatsappNumber,
    purpose,
    nextScreen,
    resetOnFail = 'SignUp',
    resendSeconds = OTP_RESEND_SECONDS,
    deliveryChannel = 'whatsapp',
    otpId: initialOtpId = null,
  } = route.params;

  const [digits, setDigits] = useState(
    Array(OTP_LENGTH).fill('')
  );

  const [attempts, setAttempts] = useState(0);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(null);

  const [
    currentDeliveryChannel,
    setCurrentDeliveryChannel,
  ] = useState(deliveryChannel);

  const {
    secondsLeft,
    isExpired,
    restart,
  } = useCountdown(resendSeconds);

  const submittedRef = useRef(false);

  const code = digits.join('');

  useEffect(() => {
    if (
      code.length === OTP_LENGTH &&
      !submittedRef.current &&
      !loading
    ) {
      submittedRef.current = true;
      handleVerify(code);
    }

    if (code.length < OTP_LENGTH) {
      submittedRef.current = false;
    }
  }, [code, loading]);

  const handleKeyPress = (digit) => {
    if (loading) return;

    setError(null);

    const nextIndex = digits.findIndex(
      (d) => !d
    );

    if (nextIndex === -1) return;

    const next = [...digits];
    next[nextIndex] = digit;

    setDigits(next);
  };

  const handleBackspace = () => {
    if (loading) return;

    setError(null);

    const lastFilledIndex = [...digits]
      .reverse()
      .findIndex((d) => d);

    if (lastFilledIndex === -1) {
      return;
    }

    const index =
      OTP_LENGTH -
      1 -
      lastFilledIndex;

    const next = [...digits];
    next[index] = '';

    setDigits(next);
  };

  const handleVerify = async (enteredCode) => {
    setLoading(true);
    setError(null);

    try {
      const result = await verifyOtp({
        whatsappNumber,
        code: enteredCode,
        purpose,
      });

      if (!result?.verified) {
        const nextAttempts =
          result?.attemptsUsed ??
          (attempts + 1);

        const remaining =
          result?.attemptsRemaining ??
          Math.max(
            0,
            MAX_OTP_ATTEMPTS - nextAttempts
          );

        setAttempts(nextAttempts);

        if (
          result?.reason === 'too_many_attempts' ||
          result?.code === 'OTP_TOO_MANY_ATTEMPTS' ||
          remaining <= 0
        ) {
          Toast.show({
            type: 'error',
            text1: 'Trop de tentatives',
            text2:
              purpose === 'secret_code_recovery'
                ? 'Veuillez recommencer la récupération du code secret.'
                : 'Veuillez recommencer l’inscription.',
          });

          navigation.replace(resetOnFail);
          return;
        }

        if (result?.reason === 'expired') {
          setError(
            'Le code a expiré. Demandez un nouveau code.'
          );

          setDigits(
            Array(OTP_LENGTH).fill('')
          );

          return;
        }

        setError(
          `Code invalide. Il vous reste ${remaining} tentative(s).`
        );

        setDigits(
          Array(OTP_LENGTH).fill('')
        );

        return;
      }

      navigation.navigate(
        nextScreen,
        {
          whatsappNumber,
          otpId: result?.otpId || initialOtpId || null,
        }
      );
    } catch (e) {
      if (
        e?.code === 'OTP_TOO_MANY_ATTEMPTS' ||
        e?.reason === 'too_many_attempts'
      ) {
        Toast.show({
          type: 'error',
          text1: 'Trop de tentatives',
          text2:
            'Veuillez recommencer l’inscription.',
        });

        navigation.replace(resetOnFail);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2:
            e?.message ||
            'Impossible de vérifier le code.',
        });

        setDigits(
          Array(OTP_LENGTH).fill('')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isExpired || loading) {
      return;
    }

    try {
      let resendResult;

      if (
        purpose ===
        'secret_code_recovery'
      ) {
        resendResult =
          await requestSecretCodeRecovery({
            whatsappNumber,
          });
      } else {
        resendResult =
          await requestRegistrationOtp({
            whatsappNumber,
          });
      }

      const resendChannel =
        resendResult?.deliveryChannel ||
        currentDeliveryChannel;

      setCurrentDeliveryChannel(
        resendChannel
      );

      setAttempts(0);
      setError(null);

      submittedRef.current = false;

      setDigits(
        Array(OTP_LENGTH).fill('')
      );

      restart(resendSeconds);

      Toast.show({
        type: 'success',
        text1: 'Code renvoyé',
        text2:
          resendChannel === 'email'
            ? 'Le nouveau code a été envoyé à l’adresse e-mail configurée.'
            : resendChannel === 'manual_whatsapp'
              ? 'Le nouveau code a été envoyé par e-mail pour transmission manuelle sur WhatsApp.'
              : 'Vérifiez vos messages WhatsApp.',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2:
          e?.message ||
          'Impossible de renvoyer le code.',
      });
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={typography.h1}>
        Vérification OTP
      </Text>

      <Text
        style={[
          typography.body,
          styles.subtitle,
        ]}
      >
        {currentDeliveryChannel === 'email'
          ? 'Entrez le code à 6 chiffres envoyé par e-mail.'
          : currentDeliveryChannel === 'manual_whatsapp'
            ? 'Le code à 6 chiffres est transmis manuellement sur WhatsApp.'
            : 'Entrez le code à 6 chiffres envoyé sur WhatsApp.'}
      </Text>

      <CodeInput
        length={OTP_LENGTH}
        value={digits}
        interactive={false}
      />

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        disabled={!isExpired || loading}
        onPress={handleResend}
        style={styles.resend}
      >
        <Text
          style={[
            typography.body,
            !isExpired &&
              styles.resendDisabled,
          ]}
        >
          {isExpired
            ? 'Renvoyer le code'
            : `Renvoyer le code dans 00:${String(
                secondsLeft
              ).padStart(2, '0')}`}
        </Text>
      </Pressable>

      <View
        style={{
          flex: 1,
        }}
      />

      <NumericKeypad
        onKeyPress={handleKeyPress}
        onBackspace={handleBackspace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor:
      colors.background.default,
    padding:
      spacing.screenHorizontal,
    paddingTop: 60,
  },

  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },

  resend: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },

  resendDisabled: {
    color: colors.text.tertiary,
  },

  error: {
    marginTop: spacing.md,
    color: colors.error.default,
  },
});