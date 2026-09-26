import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
} from '../theme/theme';

import {
  useAuthorization,
} from '../context/AuthorizationContext';

/* ============================================================
 * DASHBOARD
 * ============================================================ */

import PartnerDashboardScreen
  from '../screens/partner/PartnerDashboardScreen';

/* ============================================================
 * TRANSACTIONS
 * ============================================================ */

import PartnerTransactionsScreen
  from '../screens/partner/transactions/PartnerTransactionsScreen';

import PartnerTransactionDetailScreen
  from '../screens/partner/transactions/PartnerTransactionDetailScreen';

import PartnerTransactionReviewScreen
  from '../screens/partner/transactions/PartnerTransactionReviewScreen';

import PartnerTransactionProofScreen
  from '../screens/partner/transactions/PartnerTransactionProofScreen';

/* ============================================================
 * SETTLEMENTS
 * ============================================================ */

import PartnerSettlementsScreen
  from '../screens/partner/settlements/PartnerSettlementsScreen';

import PartnerSettlementDetailScreen
  from '../screens/partner/settlements/PartnerSettlementDetailScreen';

import PartnerExecuteSettlementScreen
  from '../screens/partner/settlements/PartnerExecuteSettlementScreen';

import PartnerSettlementProofScreen
  from '../screens/partner/settlements/PartnerSettlementProofScreen';

/* ============================================================
 * KMERDIASPORA
 * ============================================================ */

import PartnerKdDashboardScreen
  from '../screens/partner/kmerdiaspora/PartnerKdDashboardScreen';

import PartnerJobRequestsScreen
  from '../screens/partner/kmerdiaspora/PartnerJobRequestsScreen';

import PartnerDriverRequestsScreen
  from '../screens/partner/kmerdiaspora/PartnerDriverRequestsScreen';

import PartnerMatchingScreen
  from '../screens/partner/kmerdiaspora/PartnerMatchingScreen';

import PartnerQuestsScreen
  from '../screens/partner/kmerdiaspora/PartnerQuestsScreen';

import PartnerQuestDetailScreen
  from '../screens/partner/kmerdiaspora/PartnerQuestDetailScreen';

/* ============================================================
 * PROFILE
 * ============================================================ */

import PartnerProfileScreen
  from '../screens/partner/profile/PartnerProfileScreen';

/* ============================================================
 * NAVIGATORS
 * ============================================================ */

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ============================================================
 * TAB CONFIGURATION
 * Même logique visuelle que MainTabNavigator utilisateur.
 * ============================================================ */

const PARTNER_TABS = {
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

  KmerDiaspora: {
    label: 'Kmer',
    icon: 'people',
  },

  Profile: {
    label: 'Profil',
    icon: 'person',
  },
};

/* ============================================================
 * SAFE AUTHORIZATION HELPER
 * ============================================================ */

function checkAuthorization(authorization, methodName) {
  if (
    !authorization ||
    typeof authorization[methodName] !== 'function'
  ) {
    return false;
  }

  try {
    return Boolean(
      authorization[methodName]()
    );
  } catch (error) {
    console.warn(
      `[PartnerNavigator] Impossible de vérifier ${methodName}:`,
      error
    );

    return false;
  }
}

/* ============================================================
 * ANIMATED PARTNER TAB
 *
 * Même comportement que MainTabNavigator :
 *
 * - bounce au tap
 * - pill qui s'élargit lorsque l'onglet devient actif
 * - apparition progressive du label
 * - icône outline lorsqu'inactive
 * - icône pleine lorsqu'active
 * ============================================================ */

function AnimatedPartnerTab({
  routeName,
  isFocused,
  onPress,
}) {
  const bounce = useRef(
    new Animated.Value(1)
  ).current;

  const pillGrow = useRef(
    new Animated.Value(
      isFocused ? 1 : 0
    )
  ).current;

  /* ----------------------------------------------------------
   * Animation d'ouverture / fermeture de la pill
   * ---------------------------------------------------------- */

  useEffect(() => {
    Animated.timing(
      pillGrow,
      {
        toValue: isFocused ? 1 : 0,
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

  const config =
    PARTNER_TABS[routeName];

  /*
   * Protection supplémentaire au cas où une route
   * non déclarée dans PARTNER_TABS serait ajoutée.
   */
  if (!config) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabItem}
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{
        selected: isFocused,
      }}
      accessibilityLabel={config.label}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: isFocused
              ? colors.brand.primaryLight
              : 'transparent',

            width: pillGrow.interpolate({
              inputRange: [0, 1],
              outputRange: [40, 112],
            }),
          },
        ]}
      >
        {/* ----------------------------------------------------
         * ICON
         * ---------------------------------------------------- */}

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
                ? colors.brand.primary
                : colors.text.tertiary
            }
          />
        </Animated.View>

        {/* ----------------------------------------------------
         * LABEL
         * ---------------------------------------------------- */}

        <Animated.Text
          style={[
            typography.caption,
            styles.label,
            {
              color:
                colors.brand.primary,

              opacity: pillGrow,
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
 * PARTNER TAB BAR
 * ============================================================ */

function PartnerTabBar({
  state,
  navigation,
}) {
  return (
    <View
      style={styles.floatingWrapper}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map(
          (route, index) => {
            const isFocused =
              state.index === index;

            const onPress = () => {
              const event =
                navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
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
              <AnimatedPartnerTab
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
              />
            );
          }
        )}
      </View>
    </View>
  );
}

/* ============================================================
 * PARTNER TABS
 * ============================================================ */

function PartnerTabs() {
  const authorization =
    useAuthorization();

  /*
   * Liste complète des onglets.
   *
   * La navigation reste dynamique en fonction
   * des permissions du rôle Partner.
   */

  const allTabs = [
    {
      name: 'Dashboard',
      component:
        PartnerDashboardScreen,
    },

    {
      name: 'Transactions',
      component:
        PartnerTransactionsScreen,
    },

    {
      name: 'Settlements',
      component:
        PartnerSettlementsScreen,
    },

    {
      name: 'KmerDiaspora',
      component:
        PartnerKdDashboardScreen,
    },

    {
      name: 'Profile',
      component:
        PartnerProfileScreen,
    },
  ];

  /* ----------------------------------------------------------
   * FILTRAGE DES ONGLETS SELON LES PERMISSIONS
   * ---------------------------------------------------------- */

  const visibleTabs =
    allTabs.filter((tab) => {
      switch (tab.name) {
        case 'Transactions':
          return checkAuthorization(
            authorization,
            'canViewTransactions'
          );

        case 'Settlements':
          return checkAuthorization(
            authorization,
            'canViewSettlements'
          );

        case 'KmerDiaspora':
          return checkAuthorization(
            authorization,
            'canViewKmerDiaspora'
          );

        default:
          return true;
      }
    });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <PartnerTabBar
          {...props}
        />
      )}
    >
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title:
              PARTNER_TABS[
                tab.name
              ]?.label,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

/* ============================================================
 * PARTNER NAVIGATOR
 * ============================================================ */

export default function PartnerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PartnerTabs"
      screenOptions={{
        headerShown: false,
        animation:
          'slide_from_right',
      }}
    >
      {/* ======================================================
       * MAIN PARTNER TABS
       * ====================================================== */}

      <Stack.Screen
        name="PartnerTabs"
        component={PartnerTabs}
      />

      {/* ======================================================
       * TRANSACTIONS
       * ====================================================== */}

      <Stack.Screen
        name="PartnerTransactions"
        component={
          PartnerTransactionsScreen
        }
      />

      <Stack.Screen
        name="PartnerTransactionDetail"
        component={
          PartnerTransactionDetailScreen
        }
      />

      <Stack.Screen
        name="PartnerTransactionReview"
        component={
          PartnerTransactionReviewScreen
        }
      />

      <Stack.Screen
        name="PartnerTransactionProof"
        component={
          PartnerTransactionProofScreen
        }
      />

      {/* ======================================================
       * SETTLEMENTS
       * ====================================================== */}

      <Stack.Screen
        name="PartnerSettlements"
        component={
          PartnerSettlementsScreen
        }
      />

      <Stack.Screen
        name="PartnerSettlementDetail"
        component={
          PartnerSettlementDetailScreen
        }
      />

      <Stack.Screen
        name="PartnerExecuteSettlement"
        component={
          PartnerExecuteSettlementScreen
        }
      />

      <Stack.Screen
        name="PartnerSettlementProof"
        component={
          PartnerSettlementProofScreen
        }
      />

      {/* ======================================================
       * KMERDIASPORA
       * ====================================================== */}

      <Stack.Screen
        name="PartnerKmerDiaspora"
        component={
          PartnerKdDashboardScreen
        }
      />

      <Stack.Screen
        name="PartnerJobRequests"
        component={
          PartnerJobRequestsScreen
        }
      />

      <Stack.Screen
        name="PartnerDriverRequests"
        component={
          PartnerDriverRequestsScreen
        }
      />

      <Stack.Screen
        name="PartnerMatching"
        component={
          PartnerMatchingScreen
        }
      />

      <Stack.Screen
        name="PartnerQuests"
        component={
          PartnerQuestsScreen
        }
      />

      <Stack.Screen
        name="PartnerQuestDetail"
        component={
          PartnerQuestDetailScreen
        }
      />

      {/* ======================================================
       * PROFILE
       * ====================================================== */}

      <Stack.Screen
        name="PartnerProfile"
        component={
          PartnerProfileScreen
        }
      />
    </Stack.Navigator>
  );
}

/* ============================================================
 * STYLES
 *
 * Reprend volontairement le style de MainTabNavigator
 * utilisateur.
 * ============================================================ */

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    alignItems: 'center',

    paddingBottom:
      Platform.select({
        ios: spacing.xl,
        android: spacing.lg,
      }),
  },

  bar: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      colors.background.surface,

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

    alignItems: 'center',

    justifyContent: 'center',
  },

  pill: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    height: 40,

    borderRadius:
      radii.pill,

    paddingHorizontal:
      spacing.sm,

    overflow: 'hidden',

    gap: spacing.xxs,
  },

  iconWrapper: {
    width: 24,
    height: 24,

    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 15,

    top: 2,
  },
});