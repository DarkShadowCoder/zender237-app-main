import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../theme/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import LoansScreen from '../screens/loans/LoansScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: 'home',
  History: 'time',
  Loans: 'cash',
  Profile: 'person',
};

const LABELS = {
  Dashboard: 'Accueil',
  History: 'Historique',
  Loans: 'Prêts',
  Profile: 'Profil',
};

/**
 * Un onglet : l'icône rebondit au tap (spring indépendant du focus,
 * pour un retour tactile immédiat même en retapant l'onglet déjà actif),
 * et un halo bleu s'étire derrière l'icône active pour révéler son
 * libellé — inspiré des tab bars "pill" des apps fintech modernes.
 * Construit avec l'API Animated native (aucune dépendance native
 * supplémentaire type reanimated à installer).
 */
function AnimatedTabIcon({ routeName, isFocused, onPress }) {
  const bounce = useRef(new Animated.Value(1)).current;
  const pillGrow = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(pillGrow, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(bounce, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
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
        <Animated.View
          style={{
            transform: [{ scale: bounce }],
            width: 24,
            height: 24,
          }}
        >
          <Ionicons
            name={
              isFocused
                ? ICONS[routeName]
                : `${ICONS[routeName]}-outline`
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
              color: colors.brand.primary,
              opacity: pillGrow,
            },
          ]}
          numberOfLines={1}
        >
          {LABELS[routeName]}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Barre d'onglets flottante — remplace le tabBar par défaut de React Navigation.
 */
function FloatingTabBar({ state, navigation }) {
  return (
    <View
      style={styles.floatingWrapper}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <AnimatedTabIcon
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Accueil',
        }}
      />

      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Historique',
        }}
      />

      <Tab.Screen
        name="Loans"
        component={LoansScreen}
        options={{
          title: 'Prêts',
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: Platform.select({
      ios: spacing.xl,
      android: spacing.lg,
    }),
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
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
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    gap: spacing.xxs,
  },

  label: {
    fontSize: 15,
    top: 2,
  },
});