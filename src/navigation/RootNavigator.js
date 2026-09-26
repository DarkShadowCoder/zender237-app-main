import React, {
  useMemo,
} from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../theme/theme';

import {
  useAuth,
} from '../context/AuthContext';

import AuthNavigator
  from './AuthNavigator';

import MainTabNavigator
  from './MainTabNavigator';

import AdminNavigator
  from './AdminNavigator';

import PartnerNavigator
  from './PartnerNavigator';

import KmerDiasporaAdminNavigator
  from './KmerDiasporaAdminNavigator';


/* ============================================================
 * ECRANS UTILISATEUR
 * ============================================================ */

import DepositAmountScreen
  from '../screens/deposit/DepositAmountScreen';

import DepositNumberScreen
  from '../screens/deposit/DepositNumberScreen';

import DepositProofScreen
  from '../screens/deposit/DepositProofScreen';

import DepositStatusScreen
  from '../screens/deposit/DepositStatusScreen';

import TransferDestinationScreen
  from '../screens/transfer/TransferDestinationScreen';

import TransferRecipientScreen
  from '../screens/transfer/TransferRecipientScreen';

import TransferSummaryScreen
  from '../screens/transfer/TransferSummaryScreen';

import TransferStatusScreen
  from '../screens/transfer/TransferStatusScreen';

import WithdrawalAmountScreen
  from '../screens/withdrawal/WithdrawalAmountScreen';

import WithdrawalMethodScreen
  from '../screens/withdrawal/WithdrawalMethodScreen';

import WithdrawalSummaryScreen
  from '../screens/withdrawal/WithdrawalSummaryScreen';

import WithdrawalStatusScreen
  from '../screens/withdrawal/WithdrawalStatusScreen';

import TransactionDetailScreen
  from '../screens/history/TransactionDetailScreen';

import MyDepositsScreen
  from '../screens/history/MyDepositsScreen';

import MyTransfersScreen
  from '../screens/history/MyTransfersScreen';

import MyWithdrawalsScreen
  from '../screens/history/MyWithdrawalsScreen';

import PersonalInfoEditScreen
  from '../screens/profile/PersonalInfoEditScreen';

import SecurityScreen
  from '../screens/profile/SecurityScreen';

import HelpScreen
  from '../screens/profile/HelpScreen';

import ContactSupportScreen
  from '../screens/profile/ContactSupportScreen';
import LanguageScreen from '../screens/onboarding/LanguageScreen';
import BiometricSettingsScreen from '../screens/profile/BiometricSettingsScreen';
import ConnectedDevicesScreen from '../screens/profile/ConnectedDevicesScreen';
import ForgotSecretCodeScreen from '../screens/auth/ForgotSecretCodeScreen';
import LoansScreen from '../screens/loans/LoansScreen';
import LoanRequestScreen from '../screens/loans/LoanRequestScreen';
import LoanDetailScreen from '../screens/loans/LoanDetailScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import KmerDiasporaNavigator from './KmerDiasporaNavigator';


/* ============================================================
 * STACK UTILISATEUR
 * ============================================================ */

const Stack =
  createNativeStackNavigator();


/* ============================================================
 * NORMALISATION DU ACCOUNT TYPE
 * ============================================================ */

function normalizeAccountType(value) {

  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[-\s]/g,
        '_'
      );

  switch (normalized) {

    case 'user':
    case 'users':
    case 'customer':
    case 'client':
      return 'user';

    case 'admin':
    case 'administrator':
    case 'super_admin':
      return 'admin';

    case 'partner':
    case 'partners':
    case 'operator':
      return 'partner';

    case 'kma':
    case 'kmerdiaspora':
    case 'kmer_diaspora':
    case 'kmerdiaspora_admin':
    case 'kmerdiasporaadmin':
    case 'kmer_diaspora_admin':
      return 'kmerdiaspora_admin';

    default:
      return null;
  }
}


/* ============================================================
 * STACK UTILISATEUR
 * ============================================================ */

function AppNavigator() {

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >

      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />

      <Stack.Screen
        name="KmerDiaspora"
        component={KmerDiasporaNavigator}
      />

      <Stack.Screen
        name="DepositAmount"
        component={DepositAmountScreen}
      />

      <Stack.Screen
        name="DepositNumber"
        component={DepositNumberScreen}
      />

      <Stack.Screen
        name="DepositProof"
        component={DepositProofScreen}
      />

      <Stack.Screen
        name="DepositStatus"
        component={DepositStatusScreen}
      />

      <Stack.Screen
        name="TransferDestination"
        component={TransferDestinationScreen}
      />

      <Stack.Screen
        name="TransferRecipient"
        component={TransferRecipientScreen}
      />

      <Stack.Screen
        name="TransferSummary"
        component={TransferSummaryScreen}
      />

      <Stack.Screen
        name="TransferStatus"
        component={TransferStatusScreen}
      />

      <Stack.Screen
        name="WithdrawalAmount"
        component={WithdrawalAmountScreen}
      />

      <Stack.Screen
        name="WithdrawalMethod"
        component={WithdrawalMethodScreen}
      />

      <Stack.Screen
        name="WithdrawalSummary"
        component={WithdrawalSummaryScreen}
      />

      <Stack.Screen
        name="WithdrawalStatus"
        component={WithdrawalStatusScreen}
      />

      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
      />

      <Stack.Screen
        name="MyDeposits"
        component={MyDepositsScreen}
      />

      <Stack.Screen
        name="MyTransfers"
        component={MyTransfersScreen}
      />

      <Stack.Screen
        name="MyWithdrawals"
        component={MyWithdrawalsScreen}
      />

      <Stack.Screen
        name="PersonalInfoEdit"
        component={PersonalInfoEditScreen}
      />

      <Stack.Screen
        name="Security"
        component={SecurityScreen}
      />

      <Stack.Screen
        name="Help"
        component={HelpScreen}
      />

      <Stack.Screen
        name="ContactSupport"
        component={ContactSupportScreen}
      />

      <Stack.Screen
        name="ForgotSecretCode"
        component={ForgotSecretCodeScreen}
      />

      <Stack.Screen
        name="Language"
        component={
          LanguageScreen
        }
      />

      <Stack.Screen
        name="BiometricSettings"
        component={
          BiometricSettingsScreen
        }
      />

      <Stack.Screen
        name="Loans"
        component={LoansScreen}
      />

      <Stack.Screen
        name="LoanRequest"
        component={LoanRequestScreen}
      />

      <Stack.Screen
        name="LoanDetail"
        component={LoanDetailScreen}
      />

      <Stack.Screen
        name="ConnectedDevices"
        component={
          ConnectedDevicesScreen
        }
      />

    </Stack.Navigator>
  );
}


/* ============================================================
 * LOADING
 * ============================================================ */

function RoleLoadingScreen() {

  return (
    <View style={styles.center}>

      <ActivityIndicator
        size="large"
        color={colors.brand.primary}
      />

      <Text
        style={[
          typography.caption,
          styles.loadingText,
        ]}
      >
        Préparation de votre espace…
      </Text>

    </View>
  );
}


/* ============================================================
 * COMPTE INCONNU
 * ============================================================ */

function UnknownAccountScreen({
  onLogout,
}) {

  return (
    <View style={styles.center}>

      <View style={styles.iconCircle}>

        <Text style={styles.questionMark}>
          ?
        </Text>

      </View>

      <Text
        style={[
          typography.h2,
          styles.title,
        ]}
      >
        Compte non reconnu
      </Text>

      <Text
        style={[
          typography.body,
          styles.description,
        ]}
      >
        Votre connexion a réussi, mais
        votre type de compte n'a pas pu
        être déterminé.
      </Text>

      <Pressable
        onPress={onLogout}
        style={styles.primaryButton}
      >

        <Text
          style={styles.primaryButtonText}
        >
          Se déconnecter
        </Text>

      </Pressable>

    </View>
  );
}


/* ============================================================
 * COMPTE DESACTIVE
 * ============================================================ */

function DisabledAccountScreen({
  onLogout,
}) {

  return (
    <View style={styles.center}>

      <View
        style={[
          styles.iconCircle,
          styles.disabledCircle,
        ]}
      >

        <Text
          style={[
            styles.questionMark,
            {
              color:
                colors.error.default,
            },
          ]}
        >
          !
        </Text>

      </View>

      <Text
        style={[
          typography.h2,
          styles.title,
        ]}
      >
        Compte désactivé
      </Text>

      <Text
        style={[
          typography.body,
          styles.description,
        ]}
      >
        Votre compte est actuellement
        désactivé. Contactez
        l'administration pour obtenir
        de l'aide.
      </Text>

      <Pressable
        onPress={onLogout}
        style={styles.primaryButton}
      >

        <Text
          style={styles.primaryButtonText}
        >
          Se déconnecter
        </Text>

      </Pressable>

    </View>
  );
}


/* ============================================================
 * ROOT NAVIGATOR
 * ============================================================ */

export default function RootNavigator() {

  const {
    isAuthenticated,
    initializing,
    accountType,
    accountActive,
    logout,
  } = useAuth();


  /*
   * AccountType vient directement de AuthContext.
   *
   * Il ne faut PAS appeler refreshAccount()
   * car cette fonction n'existe pas dans AuthContext.
   */

  const resolvedAccountType =
    useMemo(
      () =>
        normalizeAccountType(
          accountType
        ),
      [accountType]
    );


  /* ==========================================================
   * INITIALISATION
   * ========================================================== */

  if (initializing) {

    return (
      <NavigationContainer>
        <RoleLoadingScreen />
      </NavigationContainer>
    );
  }


  /* ==========================================================
   * NON CONNECTE
   * ========================================================== */

  if (!isAuthenticated) {

    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }


  /* ==========================================================
   * SESSION PRESENTE MAIS ACCOUNT TYPE INCONNU
   * ========================================================== */

  if (!resolvedAccountType) {

    return (
      <NavigationContainer>
        <UnknownAccountScreen
          onLogout={logout}
        />
      </NavigationContainer>
    );
  }


  /* ==========================================================
   * COMPTE DESACTIVE
   * ========================================================== */

  if (accountActive === false) {

    return (
      <NavigationContainer>
        <DisabledAccountScreen
          onLogout={logout}
        />
      </NavigationContainer>
    );
  }


  /* ==========================================================
   * NAVIGATION PAR TYPE DE COMPTE
   * ========================================================== */

  switch (resolvedAccountType) {

    case 'admin':

      return (
        <NavigationContainer>
          <AdminNavigator />
        </NavigationContainer>
      );


    case 'partner':

      return (
        <NavigationContainer>
          <PartnerNavigator />
        </NavigationContainer>
      );


    case 'kmerdiaspora_admin':

      return (
        <NavigationContainer>
          <KmerDiasporaAdminNavigator />
        </NavigationContainer>
      );


    case 'user':

      return (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      );


    default:

      return (
        <NavigationContainer>
          <UnknownAccountScreen
            onLogout={logout}
          />
        </NavigationContainer>
      );
  }
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    center: {
      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      paddingHorizontal:
        spacing.screenHorizontal,

      backgroundColor:
        colors.background.default,
    },

    loadingText: {
      marginTop:
        spacing.md,

      color:
        colors.text.secondary,
    },

    iconCircle: {
      width: 72,
      height: 72,

      borderRadius:
        radii.circle,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.lg,
    },

    disabledCircle: {
      backgroundColor:
        colors.error.light,
    },

    questionMark: {
      fontFamily:
        'Baloo2_700Bold',

      fontSize: 34,

      color:
        colors.brand.primary,
    },

    title: {
      textAlign: 'center',
    },

    description: {
      textAlign: 'center',

      color:
        colors.text.secondary,

      marginTop:
        spacing.sm,

      maxWidth: 320,
    },

    primaryButton: {
      marginTop:
        spacing.xl,

      minWidth: 180,

      height: 50,

      paddingHorizontal:
        spacing.xl,

      borderRadius:
        radii.lg,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        colors.brand.primary,
    },

    primaryButtonText: {
      color:
        colors.text.inverse,

      fontFamily:
        'Baloo2_700Bold',

      fontSize: 15,
    },

  });