import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import * as SecureStore from 'expo-secure-store';

import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../theme/theme';

import i18n from '../../i18n';

const BIOMETRIC_KEY =
  'zender237_biometric_enabled';

export default function BiometricSettingsScreen() {
  const [
    enabled,
    setEnabled,
  ] = useState(false);

  const [
    available,
    setAvailable,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const load =
    useCallback(async () => {
      try {
        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        const enrolled =
          hasHardware
            ? await LocalAuthentication.isEnrolledAsync()
            : false;

        const stored =
          (
            await SecureStore.getItemAsync(
              BIOMETRIC_KEY
            )
          ) === 'true';

        setAvailable(
          hasHardware &&
            enrolled
        );

        setEnabled(
          stored &&
            hasHardware &&
            enrolled
        );
      } catch (error) {
        console.warn(
          '[Biometric]',
          error
        );

        setAvailable(false);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle =
    async (nextValue) => {
      if (
        nextValue &&
        !available
      ) {
        Toast.show({
          type: 'error',
          text1:
            i18n.t(
              'security.biometric'
            ),
          text2:
            i18n.t(
              'security.biometricUnavailable'
            ),
        });

        return;
      }

      try {
        if (nextValue) {
          const result =
            await LocalAuthentication.authenticateAsync(
              {
                promptMessage:
                  'Autoriser la biométrie pour Zender237',
                cancelLabel:
                  'Annuler',
                disableDeviceFallback:
                  false,
              }
            );

          if (
            !result.success
          ) {
            return;
          }

          await SecureStore.setItemAsync(
            BIOMETRIC_KEY,
            'true'
          );

          setEnabled(true);

          Toast.show({
            type: 'success',
            text1:
              i18n.t(
                'security.biometricEnabled'
              ),
          });
        } else {
          await SecureStore.deleteItemAsync(
            BIOMETRIC_KEY
          );

          setEnabled(false);

          Toast.show({
            type: 'success',
            text1:
              i18n.t(
                'security.biometricDisabled'
              ),
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2:
            error.message,
        });
      }
    };

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
          'security.biometric'
        )}
      />

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons
              name="finger-print-outline"
              size={28}
              color={
                colors.brand.primary
              }
            />
          </View>

          <View
            style={{
              flex: 1,
              marginLeft:
                spacing.md,
            }}
          >
            <Text
              style={
                typography.bodyBold
              }
            >
              {i18n.t(
                'security.biometric'
              )}
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  marginTop: 4,
                },
              ]}
            >
              {loading
                ? 'Vérification…'
                : available
                  ? 'Utilisez votre empreinte ou Face ID pour sécuriser l’accès.'
                  : i18n.t(
                      'security.biometricUnavailable'
                    )}
            </Text>
          </View>

          <Switch
            value={enabled}
            onValueChange={
              toggle
            }
            disabled={
              loading ||
              !available
            }
            trackColor={{
              false:
                colors.border.default,
              true:
                colors.brand.primary,
            }}
          />
        </View>
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.brand.primaryLight,
  },
});