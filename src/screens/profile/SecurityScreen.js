import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../theme/theme';

import Header from '../../components/Header';

import { useAuth } from '../../context/AuthContext';

import i18n from '../../i18n';

export default function SecurityScreen({
  navigation,
}) {
  const { profile } =
    useAuth();

  const items = [
    {
      icon: 'key-outline',
      label:
        i18n.t(
          'security.changeCode'
        ),
      onPress: () =>
        navigation.navigate(
          'ForgotSecretCode',
          {
            whatsappNumber:
              profile?.whatsapp_number,
          }
        ),
    },

    {
      icon:
        'finger-print-outline',
      label:
        i18n.t(
          'security.biometric'
        ),
      onPress: () =>
        navigation.navigate(
          'BiometricSettings'
        ),
    },

    {
      icon:
        'phone-portrait-outline',
      label:
        i18n.t(
          'security.connectedDevices'
        ),
      onPress: () =>
        navigation.navigate(
          'ConnectedDevices'
        ),
    },
  ];

  return (
    <ScrollView
      style={styles.wrapper}
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
      }}
    >
      <Header
        title={i18n.t(
          'security.title'
        )}
      />

      <View
        style={[
          styles.card,
          {
            marginTop:
              spacing.xl,
          },
        ]}
      >
        {items.map(
          (item, index) => (
            <Pressable
              key={item.label}
              onPress={
                item.onPress
              }
              style={[
                styles.row,
                index <
                  items.length - 1 &&
                  styles.rowBorder,
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor:
      colors.background.default,
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical:
      spacing.md,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border.light,
  },
});