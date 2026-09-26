
/**
 * ============================================================
 * ZENDER237 - KMERDIASPORA ADMIN NAVIGATOR
 * ============================================================
 *
 * ESPACE SPECIALISE KMERDIASPORA
 *
 * Autorisé :
 *   - Besoin de position
 *   - Besoin de conducteur
 *   - Matching
 *   - Quêtes
 *   - Modération
 *   - Rapports communautaires
 *
 * Interdit :
 *   - Transactions financières
 *   - Wallets
 *   - Règlements bancaires
 *   - Tarifs
 *   - Mobile Money
 *
 * ============================================================
 */

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
  Animated,
  Platform,
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

import KmaDashboardScreen
  from '../screens/kma/KmaDashboardScreen';


/* ============================================================
 * MODERATION
 * ============================================================ */

import KmaModerationScreen
  from '../screens/kma/moderation/KmaModerationScreen';

import KmaContentDetailScreen
  from '../screens/kma/moderation/KmaContentDetailScreen';

import KmaModerationActionScreen
  from '../screens/kma/moderation/KmaModerationActionScreen';


/* ============================================================
 * MATCHING
 * ============================================================ */

import KmaMatchingScreen
  from '../screens/kma/KmaMatchingScreen.js';

import KmaMatchDetailScreen
  from '../screens/kma/matching/KmaMatchDetailScreen';


/* ============================================================
 * RAPPORTS
 * ============================================================ */

import KmaReportsScreen
  from '../screens/kma/reports/KmaReportsScreen';

import KmaCreateReportScreen
  from '../screens/kma/reports/KmaCreateReportScreen';

import KmaReportDetailScreen
  from '../screens/kma/reports/KmaReportDetailScreen';


/* ============================================================
 * KMERDIASPORA OPERATIONNEL
 * ============================================================ */

import KmaJobRequestsScreen
  from '../screens/kma/KmaJobRequestsScreen';

import KmaDriverRequestsScreen
  from '../screens/kma/KmaDriverRequestsScreen';

import KmaQuestsScreen
  from '../screens/kma/KmaQuestsScreen';


/* ============================================================
 * NAVIGATORS
 * ============================================================ */

const Stack =
  createNativeStackNavigator();

const Tab =
  createBottomTabNavigator();


/* ============================================================
 * TABS KMA
 * ============================================================ */

const KMA_TABS = {
  Dashboard: {
    label: 'Accueil',
    icon: 'home',
  },

  Jobs: {
    label: 'Emplois',
    icon: 'briefcase',
  },

  Drivers: {
    label: 'Chauffeurs',
    icon: 'people',
  },

  Matching: {
    label: 'Matching',
    icon: 'git-network',
  },

  Quests: {
    label: 'Quêtes',
    icon: 'heart',
  },
};


/* ============================================================
 * ONGLET ANIMÉ
 *
 * Même principe que MainTabNavigator :
 * - rebond immédiat au tap
 * - pill animé
 * - libellé visible sur l'onglet actif
 * - icône pleine actif / outline inactif
 * ============================================================ */

function AnimatedKmaTabIcon({
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
    KMA_TABS[routeName];

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
      onPress={
        handlePress
      }
      style={
        styles.tabItem
      }
      hitSlop={8}
      accessibilityRole="tab"
      accessibilityState={{
        selected: isFocused,
      }}
      accessibilityLabel={
        config?.label
      }
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
          style={{
            transform: [
              {
                scale:
                  bounce,
              },
            ],

            width: 24,

            height: 24,
          }}
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
          {
            config.label
          }
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}


/* ============================================================
 * TAB BAR FLOTTANTE
 * ============================================================ */

function KmaTabBar({
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
              <AnimatedKmaTabIcon
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
 * KMA TABS
 * ============================================================ */

function KmaTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <KmaTabBar
          {...props}
        />
      )}
    >
      <Tab.Screen
        name="Dashboard"
        component={
          KmaDashboardScreen
        }
        options={{
          title:
            'Accueil',
        }}
      />

      <Tab.Screen
        name="Jobs"
        component={
          KmaJobRequestsScreen
        }
        options={{
          title:
            'Emplois',
        }}
      />

      <Tab.Screen
        name="Drivers"
        component={
          KmaDriverRequestsScreen
        }
        options={{
          title:
            'Chauffeurs',
        }}
      />

      <Tab.Screen
        name="Matching"
        component={
          KmaMatchingScreen
        }
        options={{
          title:
            'Matching',
        }}
      />

      <Tab.Screen
        name="Quests"
        component={
          KmaQuestsScreen
        }
        options={{
          title:
            'Quêtes',
        }}
      />
    </Tab.Navigator>
  );
}


/* ============================================================
 * KMA NAVIGATOR
 * ============================================================ */

export default function KmerDiasporaAdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="KmaTabs"
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
        name="KmaTabs"
        component={
          KmaTabs
        }
      />


      {/* ======================================================
       * BESOIN DE POSITION
       * ====================================================== */}

      <Stack.Screen
        name="KmaJobRequests"
        component={
          KmaJobRequestsScreen
        }
      />


      {/* ======================================================
       * BESOIN DE CONDUCTEUR
       * ====================================================== */}

      <Stack.Screen
        name="KmaDriverRequests"
        component={
          KmaDriverRequestsScreen
        }
      />


      {/* ======================================================
       * MATCHING
       * ====================================================== */}

      <Stack.Screen
        name="KmaMatching"
        component={
          KmaMatchingScreen
        }
      />

      <Stack.Screen
        name="KmaMatchDetail"
        component={
          KmaMatchDetailScreen
        }
      />


      {/* ======================================================
       * QUÊTES
       * ====================================================== */}

      <Stack.Screen
        name="KmaQuests"
        component={
          KmaQuestsScreen
        }
      />


      {/* ======================================================
       * MODERATION
       * ====================================================== */}

      <Stack.Screen
        name="KmaModeration"
        component={
          KmaModerationScreen
        }
      />

      <Stack.Screen
        name="KmaContentDetail"
        component={
          KmaContentDetailScreen
        }
      />

      <Stack.Screen
        name="KmaModerationAction"
        component={
          KmaModerationActionScreen
        }
      />


      {/* ======================================================
       * RAPPORTS
       * ====================================================== */}

      <Stack.Screen
        name="KmaReports"
        component={
          KmaReportsScreen
        }
      />

      <Stack.Screen
        name="KmaCreateReport"
        component={
          KmaCreateReportScreen
        }
      />

      <Stack.Screen
        name="KmaReportDetail"
        component={
          KmaReportDetailScreen
        }
      />

    </Stack.Navigator>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
     * TAB BAR FLOTTANTE
     * ======================================================== */

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
          ios:
            spacing.xl,

          android:
            spacing.lg,
        }),
    },


    /* ========================================================
     * BARRE
     * ======================================================== */

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


    /* ========================================================
     * TAB ITEM
     * ======================================================== */

    tabItem: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    /* ========================================================
     * PILL
     * ======================================================== */

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


    /* ========================================================
     * LABEL
     * ======================================================== */

    label: {
      fontSize: 15,

      top: 2,
    },

  });
