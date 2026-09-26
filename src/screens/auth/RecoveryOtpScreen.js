import React from 'react';
import OtpVerificationScreen from './OtpVerificationScreen';

/** Écran 10 — OTP de récupération. Réutilise l'écran OTP générique. */
export default function RecoveryOtpScreen({ route, navigation }) {
  return (
    <OtpVerificationScreen
      navigation={navigation}
      route={{
        params: {
          whatsappNumber: route.params.whatsappNumber,
          purpose: 'secret_code_recovery',
          otpId: route.params.otpId || null,
          deliveryChannel: route.params.deliveryChannel || 'email',
          nextScreen: 'NewSecretCode',
          resetOnFail: 'ForgotSecretCode',
        },
      }}
    />
  );
}
