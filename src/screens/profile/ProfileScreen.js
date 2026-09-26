import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import Toast from 'react-native-toast-message';

import {
  colors,
  typography,
  spacing,
  radii,
  components,
  fontWeights,
  fontSizes,
} from '../../theme/theme';

import { getRankColors } from '../../theme/theme';

import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

import i18n from '../../i18n';

import Button from '../../components/Button';

export default function ProfileScreen({
  navigation,
}) {
  const {
    profile,
    logout,
  } = useAuth();

  const {
    locale,
  } = useLocale();

  const [
    pushEnabled,
    setPushEnabled,
  ] = React.useState(true);

  const [
    whatsappEnabled,
    setWhatsappEnabled,
  ] = React.useState(true);

  const rankCode =
    String(
      profile?.rank_code ||
      'standard'
    ).toLowerCase();

  const rankMeta =
    getRankColors(rankCode);

  const rankLabel =
    i18n.t(
      `profile.${rankCode}`
    );

  const handleLogout =
    async () => {
      try {
        await logout();
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: error.message,
        });
      }
    };

  const menuItems = [
    {
      icon: 'person-outline',
      label:
        i18n.t(
          'profile.personalInfo'
        ),
      onPress: () =>
        navigation.navigate(
          'PersonalInfoEdit'
        ),
    },

    {
      icon:
        'shield-checkmark-outline',
      label:
        i18n.t(
          'profile.security'
        ),
      onPress: () =>
        navigation.navigate(
          'Security'
        ),
    },

    {
      icon: 'options-outline',
      label:
        i18n.t(
          'profile.preferences'
        ),
      onPress: () =>
        Toast.show({
          type: 'info',
          text1:
            i18n.t(
              'profile.preferences'
            ),
          text2:
            locale === 'fr'
              ? 'Les préférences générales seront disponibles ici.'
              : 'General preferences will be available here.',
        }),
    },

    {
      icon: 'language-outline',
      label:
        `${i18n.t('profile.language')} · ${
          locale === 'en'
            ? 'English'
            : 'Français'
        }`,
      onPress: () =>
        navigation.navigate(
          'Language'
        ),
    },

    {
      icon:
        'help-circle-outline',
      label:
        i18n.t(
          'profile.help'
        ),
      onPress: () =>
        navigation.navigate(
          'Help'
        ),
    },

    {
      icon: 'headset-outline',
      label:
        i18n.t(
          'profile.support'
        ),
      onPress: () =>
        navigation.navigate(
          'ContactSupport'
        ),
    },
  ];

  return (
    <ScrollView
      style={styles.wrapper}
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
        paddingTop: 60,
        paddingBottom:
          spacing.huge,
      }}
      showsVerticalScrollIndicator={
        false
      }
    >
      <View style={styles.header}>
        <View
          style={[
            styles.avatarOuter,
            {
              borderColor:
                rankMeta.border,
              backgroundColor:
                rankMeta.background,
            },
          ]}
        >
          <View style={styles.avatar}>
            <Text
              style={[
                typography.h1,
                styles.avatarText,
              ]}
            >
              {(
                profile?.username ||
                'U'
              )
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              styles.rankDot,
              {
                backgroundColor:
                  rankMeta.accent,
              },
            ]}
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <Text style={typography.h3}>
            {profile?.username ||
              '...'}
          </Text>

          <Text
            style={[
              typography.caption,
              {
                lineHeight:
                  spacing.md * 2,
              },
            ]}
          >
            {profile?.whatsapp_number}
          </Text>

          <View
            style={[
              styles.rankBadge,
              {
                backgroundColor:
                  rankMeta.background,
                borderColor:
                  rankMeta.border,
              },
            ]}
          >
            <Text
              style={[
                styles.rankBadgeText,
                {
                  color:
                    rankMeta.text,
                },
              ]}
            >
              {rankLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <Text style={typography.body}>
            {i18n.t(
              'profile.pushNotifications'
            )}
          </Text>

          <Switch
            value={
              pushEnabled
            }
            onValueChange={
              setPushEnabled
            }
            trackColor={{
              true:
                colors.brand.primary,
            }}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={typography.body}>
            {i18n.t(
              'profile.whatsappNotifications'
            )}
          </Text>

          <Switch
            value={
              whatsappEnabled
            }
            onValueChange={
              setWhatsappEnabled
            }
            trackColor={{
              true:
                colors.brand.primary,
            }}
          />
        </View>
      </View>

      <View
        style={[
          styles.card,
          {
            marginTop:
              spacing.lg,
          },
        ]}
      >
        {menuItems.map(
          (item, index) => (
            <Pressable
              key={item.label}
              onPress={
                item.onPress
              }
              style={[
                styles.menuRow,
                index <
                  menuItems.length -
                    1 &&
                  styles.menuRowBorder,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={
                  colors.icon.default
                }
              />

              <Text
                style={[
                  typography.body,
                  {
                    flex: 1,
                    marginLeft:
                      spacing.md,
                  },
                ]}
              >
                {item.label}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  colors.icon.muted
                }
              />
            </Pressable>
          )
        )}
      </View>

      <Text
        style={[
          typography.caption,
          {
            textAlign:
              'center',
            marginVertical:
              spacing.lg,
          },
        ]}
      >
        Version 1.0.0
      </Text>

      <Button
        title={i18n.t(
          'profile.logout'
        )}
        variant="danger"
        onPress={
          handleLogout
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor:
      colors.background.default,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom:
      spacing.xl,
  },

  avatarOuter: {
    width:
      components.avatar.lg +
      8,

    height:
      components.avatar.lg +
      8,

    borderRadius:
      (components.avatar.lg +
        8) /
      2,

    alignItems: 'center',
    justifyContent:
      'center',

    borderWidth: 2,
    position: 'relative',
  },

  avatar: {
    width:
      components.avatar.lg -
      4,

    height:
      components.avatar.lg -
      4,

    borderRadius:
      components.avatar.radius,

    backgroundColor:
      colors.brand.primary,

    alignItems: 'center',
    justifyContent:
      'center',
  },

  avatarText: {
    color:
      colors.brand.primaryLight,
    fontWeight:
      fontWeights.extraBold,
    fontSize:
      fontSizes.xxl,
  },

  rankDot: {
    position: 'absolute',
    right: 1,
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor:
      colors.background.surface,
  },

  rankBadge: {
    alignSelf:
      'flex-start',
    marginTop: 6,
    borderRadius:
      radii.pill,
    borderWidth: 1,
    paddingHorizontal:
      spacing.sm,
    paddingVertical: 4,
  },

  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform:
      'uppercase',
  },

  card: {
    backgroundColor:
      colors.background.surface,

    borderRadius:
      radii.md,

    borderWidth: 1,

    borderColor:
      colors.border.light,

    padding: spacing.lg,
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom:
      spacing.md,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical:
      spacing.md,
  },

  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border.light,
  },
});