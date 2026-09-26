import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/onboarding/SplashScreen';
import LanguageScreen from '../screens/onboarding/LanguageScreen';

import SignUpScreen from '../screens/auth/SignUpScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import PersonalInfoScreen from '../screens/auth/PersonalInfoScreen';
import AccountCreatedScreen from '../screens/auth/AccountCreatedScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotSecretCodeScreen from '../screens/auth/ForgotSecretCodeScreen';
import RecoveryOtpScreen from '../screens/auth/RecoveryOtpScreen';
import NewSecretCodeScreen from '../screens/auth/NewSecretCodeScreen';

const Stack =
  createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
      />

      <Stack.Screen
        name="Language"
        component={LanguageScreen}
      />

      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
      />

      <Stack.Screen
        name="OtpVerification"
        component={
          OtpVerificationScreen
        }
      />

      <Stack.Screen
        name="PersonalInfo"
        component={
          PersonalInfoScreen
        }
      />

      <Stack.Screen
        name="AccountCreated"
        component={
          AccountCreatedScreen
        }
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="ForgotSecretCode"
        component={
          ForgotSecretCodeScreen
        }
      />

      <Stack.Screen
        name="RecoveryOtp"
        component={
          RecoveryOtpScreen
        }
      />

      <Stack.Screen
        name="NewSecretCode"
        component={
          NewSecretCodeScreen
        }
      />
    </Stack.Navigator>
  );
}