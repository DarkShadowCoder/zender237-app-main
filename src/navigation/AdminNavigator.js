// src/navigation/AdminNavigator.js

import React, {
  useEffect,
  useRef,
} from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';

import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
} from '../theme/theme';


/* ============================================================
 * DASHBOARD
 * ============================================================ */

import AdminDashboardScreen
  from '../screens/admin/AdminDashboardScreen';

import WhatsappGroupRequestsScreen
  from '../screens/admin/WhatsappGroupRequestsScreen';


/* ============================================================
 * TRANSACTIONS
 * ============================================================ */

import AdminTransactionsScreen
  from '../screens/admin/transactions/AdminTransactionsScreen';

import AdminTransactionDetailScreen
  from '../screens/admin/transactions/AdminTransactionDetailScreen';

import TransactionReviewScreen
  from '../screens/admin/transactions/TransactionReviewScreen';

import TransactionAssignmentScreen
  from '../screens/admin/transactions/TransactionAssignmentScreen';

import TransactionProofScreen
  from '../screens/admin/transactions/TransactionProofScreen';


/* ============================================================
 * SETTLEMENTS
 * ============================================================ */

import SettlementsScreen
  from '../screens/admin/settlements/SettlementsScreen';

import SettlementDetailScreen
  from '../screens/admin/settlements/SettlementDetailScreen';

import CreateSettlementScreen
  from '../screens/admin/settlements/CreateSettlementScreen';

import SettlementExecutionScreen
  from '../screens/admin/settlements/SettlementExecutionScreen';

import SettlementProofScreen
  from '../screens/admin/settlements/SettlementProofScreen';


/* ============================================================
 * USERS
 * ============================================================ */

import UsersScreen
  from '../screens/admin/users/UsersScreen';

import UserDetailScreen
  from '../screens/admin/users/UserDetailScreen';

import UserWalletScreen
  from '../screens/admin/users/UserWalletScreen';

import WalletAdjustmentScreen
  from '../screens/admin/users/WalletAdjustmentScreen';


/* ============================================================
 * PARTNERS
 * ============================================================ */

import PartnersScreen
  from '../screens/admin/partners/PartnersScreen';

import PartnerDetailScreen
  from '../screens/admin/partners/PartnerDetailScreen';

import CreatePartnerScreen
  from '../screens/admin/partners/CreatePartnerScreen';

import EditPartnerScreen
  from '../screens/admin/partners/EditPartnerScreen';


/* ============================================================
 * CONFIGURATION
 * ============================================================ */

import MomoNumbersScreen
  from '../screens/admin/configuration/MomoNumbersScreen';

import MomoNumberFormScreen
  from '../screens/admin/configuration/MomoNumberFormScreen';

import TariffsScreen
  from '../screens/admin/configuration/TariffsScreen';

import TariffFormScreen
  from '../screens/admin/configuration/TariffFormScreen';

import DailyBatchesScreen
  from '../screens/admin/configuration/DailyBatchesScreen';


/* ============================================================
 * KMERDIASPORA
 * ============================================================ */

import AdminKdDashboardScreen
  from '../screens/admin/kmerdiaspora/AdminKdDashboardScreen';

import KdJobRequestsAdminScreen
  from '../screens/admin/kmerdiaspora/KdJobRequestsAdminScreen';

import KdDriverRequestsAdminScreen
  from '../screens/admin/kmerdiaspora/KdDriverRequestsAdminScreen';

import KdMatchingAdminScreen
  from '../screens/admin/kmerdiaspora/KdMatchingAdminScreen';

import KdQuestsAdminScreen
  from '../screens/admin/kmerdiaspora/KdQuestsAdminScreen';

import KdModerationScreen
  from '../screens/admin/kmerdiaspora/KdModerationScreen';

import KdReportsScreen
  from '../screens/admin/kmerdiaspora/KdReportsScreen';

import KmAdministratorsScreen
  from '../screens/admin/kmerdiaspora/KmAdministratorsScreen';

import CreateKmAdministratorScreen
  from '../screens/admin/kmerdiaspora/CreateKmAdministratorScreen';

import EditKmAdministratorScreen
  from '../screens/admin/kmerdiaspora/EditKmAdministratorScreen';


/* ============================================================
 * AUDIT
 * ============================================================ */

import AuditScreen
  from '../screens/admin/audit/AuditScreen';

import AuditTransactionDetailScreen
  from '../screens/admin/audit/AuditTransactionDetailScreen';


/* ============================================================
 * SETTINGS
 * ============================================================ */

import AdminSettingsScreen
  from '../screens/admin/settings/AdminSettingsScreen';


/* ============================================================
 * USERS RANK
 * ============================================================ */

import RankRulesScreen
  from '../screens/admin/ranks/RankRulesScreen';

import RankRuleFormScreen
  from '../screens/admin/ranks/RankRuleFormScreen';


/* ============================================================
 * LOANS
 * ============================================================ */

import AdminLoansScreen
  from '../screens/admin/loans/AdminLoansScreen';

import AdminLoanDetailScreen
  from '../screens/admin/loans/AdminLoanDetailScreen';

import AdminLoanApprovalScreen
  from '../screens/admin/loans/AdminLoanApprovalScreen';

import AdminLoanRepaymentScreen
  from '../screens/admin/loans/AdminLoanRepaymentScreen';

import AdminLoanDisbursementScreen
  from '../screens/admin/loans/AdminLoanDisbursementScreen';

import AdminLoanRulesScreen
  from '../screens/admin/loans/AdminLoanRulesScreen';

import AdminLoanRuleFormScreen
  from '../screens/admin/loans/AdminLoanRuleFormScreen';


/* ============================================================
 * NAVIGATORS
 * ============================================================ */

const Stack =
  createNativeStackNavigator();

const Tab =
  createBottomTabNavigator();


/* ============================================================
 * TAB CONFIGURATION
 *
 * Cette configuration correspond à la tabbar administrateur
 * d'origine du projet :
 *
 * - Accueil
 * - Transactions
 * - Règlements
 * - Utilisateurs
 *
 * Le bouton WhatsApp n'est volontairement PAS ajouté à cette
 * tabbar. Il se trouve sur le Dashboard sous forme de bouton
 * flottant et ouvre la page AdminWhatsappGroupRequests.
 * ============================================================ */

const ADMIN_TABS = {
  Dashboard: {
    label: 'Accueil',
    icon: 'grid',
  },

  Transactions: {
    label: 'Transactions',
    icon: 'swap-horizontal',
  },

  Settlements: {
    label: 'Règlements',
    icon: 'business',
  },

  Users: {
    label: 'Utilisateurs',
    icon: 'people',
  },

  More: {
    label: 'Plus',
    icon: 'menu',
  },
};


/* ============================================================
 * ONGLET ADMIN ANIMÉ
 * ============================================================ */

function AnimatedAdminTabIcon({
  routeName,
  isFocused,
  onPress,
}) {
  const bounce =
    useRef(
      new Animated.Value(1)
    ).current;

  const pillGrow =
    useRef(
      new Animated.Value(
        isFocused ? 1 : 0
      )
    ).current;

  const config =
    ADMIN_TABS[routeName] ?? {
      label: routeName,
      icon: 'ellipse',
    };


  /* ----------------------------------------------------------
   * Animation focus / unfocus
   * ---------------------------------------------------------- */

  useEffect(() => {
    Animated.timing(
      pillGrow,
      {
        toValue:
          isFocused ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }
    ).start();
  }, [
    isFocused,
    pillGrow,
  ]);


  /* ----------------------------------------------------------
   * Animation au tap
   * ---------------------------------------------------------- */

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(
        bounce,
        {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        bounce,
        {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }
      ),
    ]).start();

    onPress();
  };


  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItem}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor:
              isFocused
                ? colors.brand
                    .primaryLight
                : 'transparent',

            width:
              pillGrow.interpolate({
                inputRange: [
                  0,
                  1,
                ],
                outputRange: [
                  40,
                  112,
                ],
              }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [
                {
                  scale: bounce,
                },
              ],
            },
          ]}
        >
          <Ionicons
            name={
              isFocused
                ? config.icon
                : `${config.icon}-outline`
            }
            size={24}
            color={
              isFocused
                ? colors.brand
                    .primary
                : colors.text
                    .tertiary
            }
          />
        </Animated.View>

        <Animated.Text
          style={[
            typography.caption,
            styles.label,
            {
              color:
                colors.brand
                  .primary,

              opacity:
                pillGrow,
            },
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}


/* ============================================================
 * ADMIN TAB BAR
 *
 * Tabbar originale :
 * - flottante
 * - centrée
 * - pill animée pour l'onglet actif
 * - rebond de l'icône
 * - icône outline lorsqu'inactive
 * - icône pleine lorsqu'active
 * ============================================================ */

function AdminTabBar({
  state,
  navigation,
}) {
  return (
    <View
      style={
        styles.floatingWrapper
      }
      pointerEvents="box-none"
    >
      <View
        style={
          styles.bar
        }
      >
        {state.routes.map(
          (
            route,
            index
          ) => {
            const isFocused =
              state.index ===
              index;

            const onPress =
              () => {
                const event =
                  navigation.emit({
                    type:
                      'tabPress',

                    target:
                      route.key,

                    canPreventDefault:
                      true,
                  });

                if (
                  !isFocused &&
                  !event.defaultPrevented
                ) {
                  navigation.navigate(
                    route.name
                  );
                }
              };

            return (
              <AnimatedAdminTabIcon
                key={
                  route.key
                }
                routeName={
                  route.name
                }
                isFocused={
                  isFocused
                }
                onPress={
                  onPress
                }
              />
            );
          }
        )}
      </View>
    </View>
  );
}


/* ============================================================
 * ADMIN MAIN TABS
 * ============================================================ */

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={
        (props) => (
          <AdminTabBar
            {...props}
          />
        )
      }
    >
      <Tab.Screen
        name="Dashboard"
        component={
          AdminDashboardScreen
        }
        options={{
          title: 'Accueil',
        }}
      />

      <Tab.Screen
        name="Transactions"
        component={
          AdminTransactionsScreen
        }
        options={{
          title: 'Transactions',
        }}
      />

      <Tab.Screen
        name="Settlements"
        component={
          SettlementsScreen
        }
        options={{
          title: 'Règlements',
        }}
      />

      <Tab.Screen
        name="Users"
        component={
          UsersScreen
        }
        options={{
          title: 'Utilisateurs',
        }}
      />
    </Tab.Navigator>
  );
}


/* ============================================================
 * ADMIN NAVIGATOR
 * ============================================================ */

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminTabs"
      screenOptions={{
        headerShown: false,
        animation:
          'slide_from_right',
      }}
    >

      {/* ======================================================
       * HOME
       * ====================================================== */}

      <Stack.Screen
        name="AdminTabs"
        component={
          AdminTabs
        }
      />


      {/* ======================================================
       * WHATSAPP
       *
       * Le bouton flottant du Dashboard admin utilise cette
       * route pour ouvrir directement la liste des demandes.
       * ====================================================== */}

      <Stack.Screen
        name="AdminWhatsappGroupRequests"
        component={
          WhatsappGroupRequestsScreen
        }
      />


      {/* ======================================================
       * TRANSACTIONS
       * ====================================================== */}

      <Stack.Screen
        name="AdminTransactions"
        component={
          AdminTransactionsScreen
        }
      />

      <Stack.Screen
        name="AdminTransactionDetail"
        component={
          AdminTransactionDetailScreen
        }
      />

      <Stack.Screen
        name="AdminTransactionReview"
        component={
          TransactionReviewScreen
        }
      />

      <Stack.Screen
        name="AdminTransactionAssignment"
        component={
          TransactionAssignmentScreen
        }
      />

      <Stack.Screen
        name="AdminTransactionProof"
        component={
          TransactionProofScreen
        }
      />


      {/* ======================================================
       * SETTLEMENTS
       * ====================================================== */}

      <Stack.Screen
        name="AdminSettlements"
        component={
          SettlementsScreen
        }
      />

      <Stack.Screen
        name="AdminSettlementDetail"
        component={
          SettlementDetailScreen
        }
      />

      <Stack.Screen
        name="AdminCreateSettlement"
        component={
          CreateSettlementScreen
        }
      />

      <Stack.Screen
        name="AdminSettlementExecution"
        component={
          SettlementExecutionScreen
        }
      />

      <Stack.Screen
        name="AdminSettlementProof"
        component={
          SettlementProofScreen
        }
      />


      {/* ======================================================
       * USERS
       * ====================================================== */}

      <Stack.Screen
        name="AdminUsers"
        component={
          UsersScreen
        }
      />

      <Stack.Screen
        name="AdminUserDetail"
        component={
          UserDetailScreen
        }
      />

      <Stack.Screen
        name="AdminUserWallet"
        component={
          UserWalletScreen
        }
      />

      <Stack.Screen
        name="AdminWalletAdjustment"
        component={
          WalletAdjustmentScreen
        }
      />


      {/* ======================================================
       * PARTNERS
       * ====================================================== */}

      <Stack.Screen
        name="AdminPartners"
        component={
          PartnersScreen
        }
      />

      <Stack.Screen
        name="AdminPartnerDetail"
        component={
          PartnerDetailScreen
        }
      />

      <Stack.Screen
        name="AdminCreatePartner"
        component={
          CreatePartnerScreen
        }
      />

      <Stack.Screen
        name="AdminEditPartner"
        component={
          EditPartnerScreen
        }
      />


      {/* ======================================================
       * CONFIGURATION
       * ====================================================== */}

      <Stack.Screen
        name="AdminMomoNumbers"
        component={
          MomoNumbersScreen
        }
      />

      <Stack.Screen
        name="AdminMomoNumberForm"
        component={
          MomoNumberFormScreen
        }
      />

      <Stack.Screen
        name="AdminTariffs"
        component={
          TariffsScreen
        }
      />

      <Stack.Screen
        name="AdminTariffForm"
        component={
          TariffFormScreen
        }
      />

      <Stack.Screen
        name="AdminDailyBatches"
        component={
          DailyBatchesScreen
        }
      />


      {/* ======================================================
       * KMERDIASPORA
       * ====================================================== */}

      <Stack.Screen
        name="AdminKmerDiaspora"
        component={
          AdminKdDashboardScreen
        }
      />

      <Stack.Screen
        name="AdminKdJobRequests"
        component={
          KdJobRequestsAdminScreen
        }
      />

      <Stack.Screen
        name="AdminKdDriverRequests"
        component={
          KdDriverRequestsAdminScreen
        }
      />

      <Stack.Screen
        name="AdminKdMatching"
        component={
          KdMatchingAdminScreen
        }
      />

      <Stack.Screen
        name="AdminKdQuests"
        component={
          KdQuestsAdminScreen
        }
      />

      <Stack.Screen
        name="AdminKdModeration"
        component={
          KdModerationScreen
        }
      />

      <Stack.Screen
        name="AdminKdReports"
        component={
          KdReportsScreen
        }
      />

      <Stack.Screen
        name="AdminKmAdministrators"
        component={
          KmAdministratorsScreen
        }
      />

      <Stack.Screen
        name="AdminCreateKmAdministrator"
        component={
          CreateKmAdministratorScreen
        }
      />

      <Stack.Screen
        name="AdminEditKmAdministrator"
        component={
          EditKmAdministratorScreen
        }
      />


      {/* ======================================================
       * AUDIT
       * ====================================================== */}

      <Stack.Screen
        name="AdminAudit"
        component={
          AuditScreen
        }
      />

      <Stack.Screen
        name="AdminAuditTransactionDetail"
        component={
          AuditTransactionDetailScreen
        }
      />


      {/* ======================================================
       * SETTINGS
       * ====================================================== */}

      <Stack.Screen
        name="AdminSettings"
        component={
          AdminSettingsScreen
        }
      />

      <Stack.Screen
        name="AdminRankRules"
        component={
          RankRulesScreen
        }
      />

      <Stack.Screen
        name="AdminRankRuleForm"
        component={
          RankRuleFormScreen
        }
      />


      {/* ======================================================
       * LOANS
       * ====================================================== */}

      <Stack.Screen
        name="AdminLoans"
        component={
          AdminLoansScreen
        }
      />

      <Stack.Screen
        name="AdminLoanRules"
        component={
          AdminLoanRulesScreen
        }
      />

      <Stack.Screen
        name="AdminLoanRuleForm"
        component={
          AdminLoanRuleFormScreen
        }
      />

      <Stack.Screen
        name="AdminLoanDetail"
        component={
          AdminLoanDetailScreen
        }
      />

      <Stack.Screen
        name="AdminLoanApproval"
        component={
          AdminLoanApprovalScreen
        }
      />

      <Stack.Screen
        name="AdminLoanRepayment"
        component={
          AdminLoanRepaymentScreen
        }
      />

      <Stack.Screen
        name="AdminLoanDisbursement"
        component={
          AdminLoanDisbursementScreen
        }
      />

    </Stack.Navigator>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({

  floatingWrapper: {
    position:
      'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    alignItems:
      'center',

    paddingBottom:
      Platform.select({
        ios: spacing.xl,
        android: spacing.lg,
      }),
  },


  bar: {
    flexDirection:
      'row',

    alignItems:
      'center',

    backgroundColor:
      colors.background
        .surface,

    borderRadius:
      radii.pill,

    paddingHorizontal:
      spacing.xs,

    paddingVertical:
      spacing.xs,

    ...shadows.modal,
  },


  tabItem: {
    flex: 1,

    alignItems:
      'center',

    justifyContent:
      'center',
  },


  pill: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'center',

    height: 40,

    borderRadius:
      radii.pill,

    paddingHorizontal:
      spacing.sm,

    overflow:
      'hidden',

    gap:
      spacing.xxs,
  },


  iconWrapper: {
    width: 24,
    height: 24,

    alignItems:
      'center',

    justifyContent:
      'center',
  },


  label: {
    fontSize: 15,
    top: 2,
  },

});