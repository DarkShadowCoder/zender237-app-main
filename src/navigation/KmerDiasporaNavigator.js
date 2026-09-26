
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
  View,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
} from '../theme/theme';


/* ============================================================
 * SCREENS
 * ============================================================ */

import KmerDiasporaHomeScreen
  from '../screens/kmerdiaspora/KmerDiasporaHomeScreen';

import KmerDiasporaRecruitmentScreen
  from '../screens/kmerdiaspora/KmerDiasporaRecruitmentScreen';

import KmerDiasporaActivityScreen
  from '../screens/kmerdiaspora/KmerDiasporaActivityScreen';

import KdProfileScreen
  from '../screens/kmerdiaspora/KdProfileScreen';

import JobRequestsScreen
  from '../screens/kmerdiaspora/JobRequestsScreen';

import CreateJobRequestScreen
  from '../screens/kmerdiaspora/CreateJobRequestScreen';

import JobRequestDetailScreen
  from '../screens/kmerdiaspora/JobRequestDetailScreen';

import MyJobRequestsScreen
  from '../screens/kmerdiaspora/MyJobRequestsScreen';

import DriverRequestsScreen
  from '../screens/kmerdiaspora/DriverRequestsScreen';

import CreateDriverRequestScreen
  from '../screens/kmerdiaspora/CreateDriverRequestScreen';

import DriverRequestDetailScreen
  from '../screens/kmerdiaspora/DriverRequestDetailScreen';

import MyDriverRequestsScreen
  from '../screens/kmerdiaspora/MyDriverRequestsScreen';

import QuestsScreen
  from '../screens/kmerdiaspora/QuestsScreen';

import CreateQuestScreen
  from '../screens/kmerdiaspora/CreateQuestScreen';

import QuestDetailScreen
  from '../screens/kmerdiaspora/QuestDetailScreen';

import QuestContributionScreen
  from '../screens/kmerdiaspora/QuestContributionScreen';

import MyQuestsScreen
  from '../screens/kmerdiaspora/MyQuestsScreen';

import MyContributionsScreen
  from '../screens/kmerdiaspora/MyContributionsScreen';

import EditQuestScreen
  from '../screens/kmerdiaspora/EditQuestScreen';

import EditKdProfileScreen
  from '../screens/kmerdiaspora/EditKdProfileScreen';

import MatchDetailScreen
  from '../screens/kmerdiaspora/MatchDetailScreen';

import MyMatchesScreen
  from '../screens/kmerdiaspora/MyMatchesScreen';


/* ============================================================
 * NAVIGATORS
 * ============================================================ */

const Stack =
  createNativeStackNavigator();

const Tab =
  createBottomTabNavigator();


/* ============================================================
 * TAB CONFIGURATION
 * ============================================================ */

const ICONS = {
  Home: 'home',
  Recruitment: 'briefcase',
  Quests: 'heart',
  Activity: 'stats-chart',
  Profile: 'person',
};

const LABELS = {
  Home: 'Accueil',
  Recruitment: 'Emplois',
  Quests: 'Quêtes',
  Activity: 'Activités',
  Profile: 'Profil',
};


/* ============================================================
 * ANIMATED TAB ICON
 * ============================================================
 *
 * Même comportement que MainTabNavigator :
 *
 * - rebond immédiat lors du tap
 * - spring indépendant du focus
 * - pastille active qui passe de 40 à 112 px
 * - libellé révélé progressivement
 * - icône pleine lorsque l'onglet est actif
 * - icône outline lorsqu'il est inactif
 *
 * ============================================================ */

function AnimatedKdTabIcon({
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
  }, [isFocused, pillGrow]);

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

  const icon =
    ICONS[routeName];

  const label =
    LABELS[routeName];

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
                ? colors.brand.primaryLight
                : 'transparent',

            width:
              pillGrow.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 112],
              }),
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: bounce,
              },
            ],
            width: 24,
            height: 24,
          }}
        >
          <Ionicons
            name={
              isFocused
                ? icon
                : `${icon}-outline`
            }
            size={24}
            color={
              isFocused
                ? colors.brand.primary
                : colors.text.tertiary
            }
          />
        </Animated.View>

        <Animated.Text
          style={[
            typography.caption,
            styles.label,
            {
              color:
                colors.brand.primary,

              opacity:
                pillGrow,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}


/* ============================================================
 * FLOATING TAB BAR
 * ============================================================ */

function KdFloatingTabBar({
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
              <AnimatedKdTabIcon
                key={route.key}
                routeName={route.name}
                isFocused={
                  isFocused
                }
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
 * KMERDIASPORA TABS
 * ============================================================ */

function KmerDiasporaTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <KdFloatingTabBar
          {...props}
        />
      )}
    >
      <Tab.Screen
        name="Home"
        component={
          KmerDiasporaHomeScreen
        }
        options={{
          title: 'Accueil',
        }}
      />

      <Tab.Screen
        name="Recruitment"
        component={
          KmerDiasporaRecruitmentScreen
        }
        options={{
          title: 'Emplois',
        }}
      />

      <Tab.Screen
        name="Quests"
        component={
          QuestsScreen
        }
        options={{
          title: 'Quêtes',
        }}
      />

      <Tab.Screen
        name="Activity"
        component={
          KmerDiasporaActivityScreen
        }
        options={{
          title: 'Activités',
        }}
      />

      <Tab.Screen
        name="Profile"
        component={
          KdProfileScreen
        }
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}


/* ============================================================
 * KMERDIASPORA NAVIGATOR
 * ============================================================ */

export default function KmerDiasporaNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="KmerTabs"
      screenOptions={{
        headerShown: false,
        animation:
          'slide_from_right',
      }}
    >
      {/* ======================================================
       * MAIN KMERDIASPORA TABS
       * ====================================================== */}

      <Stack.Screen
        name="KmerTabs"
        component={
          KmerDiasporaTabs
        }
      />

      {/* ======================================================
       * PROFILE
       * ====================================================== */}

      <Stack.Screen
        name="KdProfile"
        component={
          KdProfileScreen
        }
      />

      <Stack.Screen
        name="EditKdProfile"
        component={
          EditKdProfileScreen
        }
      />

      {/* ======================================================
       * JOB REQUESTS
       * ====================================================== */}

      <Stack.Screen
        name="JobRequests"
        component={
          JobRequestsScreen
        }
      />

      <Stack.Screen
        name="CreateJobRequest"
        component={
          CreateJobRequestScreen
        }
      />

      <Stack.Screen
        name="JobRequestDetail"
        component={
          JobRequestDetailScreen
        }
      />

      <Stack.Screen
        name="MyJobRequests"
        component={
          MyJobRequestsScreen
        }
      />

      {/* ======================================================
       * DRIVER REQUESTS
       * ====================================================== */}

      <Stack.Screen
        name="DriverRequests"
        component={
          DriverRequestsScreen
        }
      />

      <Stack.Screen
        name="CreateDriverRequest"
        component={
          CreateDriverRequestScreen
        }
      />

      <Stack.Screen
        name="DriverRequestDetail"
        component={
          DriverRequestDetailScreen
        }
      />

      <Stack.Screen
        name="MyDriverRequests"
        component={
          MyDriverRequestsScreen
        }
      />

      {/* ======================================================
       * QUESTS
       * ====================================================== */}

      <Stack.Screen
        name="QuestsList"
        component={
          QuestsScreen
        }
      />

      <Stack.Screen
        name="CreateQuest"
        component={
          CreateQuestScreen
        }
      />

      <Stack.Screen
        name="QuestDetail"
        component={
          QuestDetailScreen
        }
      />

      <Stack.Screen
        name="QuestContribution"
        component={
          QuestContributionScreen
        }
      />

      <Stack.Screen
        name="MyQuests"
        component={
          MyQuestsScreen
        }
      />

      <Stack.Screen
        name="MyContributions"
        component={
          MyContributionsScreen
        }
      />

      <Stack.Screen
        name="EditQuest"
        component={
          EditQuestScreen
        }
      />

      {/* ======================================================
       * MATCHING
       * ====================================================== */}

      <Stack.Screen
        name="MyMatches"
        component={
          MyMatchesScreen
        }
      />

      <Stack.Screen
        name="MatchDetail"
        component={
          MatchDetailScreen
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
    /* --------------------------------------------------------
     * FLOATING WRAPPER
     * -------------------------------------------------------- */

    floatingWrapper: {
      position: 'absolute',
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

    /* --------------------------------------------------------
     * BAR
     * -------------------------------------------------------- */

    bar: {
      flexDirection:
        'row',

      alignItems:
        'center',

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

    /* --------------------------------------------------------
     * TAB ITEM
     * -------------------------------------------------------- */

    tabItem: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    /* --------------------------------------------------------
     * PILL
     * -------------------------------------------------------- */

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

    /* --------------------------------------------------------
     * LABEL
     * -------------------------------------------------------- */

    label: {
      fontSize: 15,
      top: 2,
    },
  });

