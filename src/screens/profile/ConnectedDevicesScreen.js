import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

import * as Device from 'expo-device';

import Header from '../../components/Header';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../theme/theme';

import i18n from '../../i18n';

export default function ConnectedDevicesScreen() {
  const deviceName =
    Device.deviceName ||
    Device.modelName ||
    'Appareil actuel';

  const platform =
    `${Device.osName || 'Mobile'} ${
      Device.osVersion || ''
    }`.trim();

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
          'security.connectedDevices'
        )}
      />

      <View style={styles.card}>
        <Text
          style={typography.bodyBold}
        >
          {i18n.t(
            'security.currentDevice'
          )}
        </Text>

        <View style={styles.deviceRow}>
          <View style={styles.dot} />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                typography.bodyBold
              }
            >
              {deviceName}
            </Text>

            <Text
              style={
                typography.caption
              }
            >
              {platform}
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {i18n.t(
                'security.sessionActive'
              )}
            </Text>
          </View>
        </View>

        <Text
          style={[
            typography.caption,
            {
              marginTop:
                spacing.lg,
            },
          ]}
        >
          {i18n.t(
            'security.sessionInfo'
          )}
        </Text>
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
    marginTop:
      spacing.xl,
  },

  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop:
      spacing.lg,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor:
      colors.success.default,
    marginRight:
      spacing.md,
  },

  badge: {
    backgroundColor:
      colors.success.light,
    borderRadius:
      radii.pill,
    paddingHorizontal:
      spacing.sm,
    paddingVertical: 5,
  },

  badgeText: {
    color:
      colors.success.text,
    fontSize: 11,
    fontWeight: '700',
  },
});