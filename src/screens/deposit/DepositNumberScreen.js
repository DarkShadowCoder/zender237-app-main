import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Toast from 'react-native-toast-message';

import {
  colors,
  fontSizes,
  fontWeights,
  paymentMethods,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Button from '../../components/Button';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  createDeposit,
  listMomoNumbers,
} from '../../services/transactionService';

import {
  getCountryCodeFromPhone,
} from '../../utils/phone';

function normalizeOperatorKey(
  holderName = ''
) {
  const key =
    String(holderName)
      .toLowerCase()
      .replace(/[^a-z]/g, '');

  if (key.includes('mtn')) {
    return 'mtn';
  }

  if (key.includes('orange')) {
    return 'orange_money';
  }

  if (key.includes('moov')) {
    return 'moov_money';
  }

  return null;
}

function formatU(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} U`;
}

export default function DepositNumberScreen({
  route,
  navigation,
}) {
  const {
    amount,
  } = route.params || {};

  const {
    user,
    profile,
  } = useAuth();

  const amountValue =
    Number(amount);

  const senderPhone =
    profile?.whatsapp_number ||
    null;

  const resolvedCountryCode =
    useMemo(
      () =>
        getCountryCodeFromPhone(
          senderPhone
        ),
      [senderPhone]
    );

  const [
    numbers,
    setNumbers,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!resolvedCountryCode) {
        if (active) {
          setNumbers([]);
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);

        const available =
          await listMomoNumbers({
            amount: amountValue,
            countryCode:
              resolvedCountryCode,
          });

        if (!active) {
          return;
        }

        setNumbers(
          available
        );

        setSelectedId(
          available.length === 1
            ? available[0].id
            : null
        );
      } catch (error) {
        if (active) {
          Toast.show({
            type: 'error',
            text1: 'Erreur',
            text2:
              error?.message ||
              'Impossible de charger les numéros Mobile Money.',
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [
    amountValue,
    resolvedCountryCode,
  ]);

  const handleContinue =
    async () => {
      if (!selectedId) {
        Toast.show({
          type: 'error',
          text1: 'Choisissez un numéro',
          text2:
            'Sélectionnez le numéro Mobile Money à utiliser.',
        });

        return;
      }

      if (!user?.id) {
        Toast.show({
          type: 'error',
          text1: 'Session expirée',
          text2:
            'Reconnectez-vous avant de continuer.',
        });

        return;
      }

      if (!senderPhone) {
        Toast.show({
          type: 'error',
          text1: 'Numéro utilisateur introuvable',
          text2:
            'Votre numéro WhatsApp est requis pour effectuer ce dépôt.',
        });

        return;
      }

      if (!resolvedCountryCode) {
        Toast.show({
          type: 'error',
          text1: 'Indicatif introuvable',
          text2:
            'Impossible de déterminer le pays associé à votre numéro.',
        });

        return;
      }

      setSubmitting(true);

      try {
        const transaction =
          await createDeposit({
            userId: user.id,
            amount: amountValue,
            momoDepositNumberId:
              selectedId,
          });

        navigation.navigate(
          'DepositProof',
          {
            transactionId:
              transaction.id,
          }
        );
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2:
            error?.message ||
            'Impossible de créer la recharge.',
        });
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <ScrollView
      style={
        styles.wrapper
      }
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
      }}
    >
      <Header
        title="Choisir un numéro"
      />

      <Text
        style={[
          typography.body,
          {
            marginTop:
              spacing.lg,

            marginBottom:
              spacing.sm,
          },
        ]}
      >
        Les numéros ci-dessous correspondent au pays associé à votre numéro de connexion et acceptent le montant de{' '}
        {formatU(amountValue)}.
      </Text>

      <Text
        style={
          styles.senderIdentity
        }
      >
        Numéro utilisé automatiquement :{' '}
        {senderPhone || 'indisponible'}
      </Text>

      {loading ? (
        <ActivityIndicator
          color={
            colors.brand.primary
          }
          style={{
            marginTop:
              spacing.xl,
          }}
        />
      ) : !resolvedCountryCode ? (
        <Text
          style={[
            typography.body,
            styles.message,
          ]}
        >
          Impossible de déterminer le pays associé à votre numéro. Vérifiez votre profil puis réessayez.
        </Text>
      ) : numbers.length === 0 ? (
        <Text
          style={[
            typography.body,
            styles.message,
          ]}
        >
          Aucun numéro Mobile Money actif de ce pays ne couvre le montant de{' '}
          {formatU(amountValue)}.
        </Text>
      ) : (
        numbers.map(
          (item) => {
            const operatorKey =
              normalizeOperatorKey(
                item.holder_name
              );

            const brand =
              operatorKey
                ? paymentMethods[
                    operatorKey
                  ]
                : null;

            const selected =
              selectedId ===
              item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setSelectedId(
                    item.id
                  )
                }
                style={[
                  styles.card,
                  {
                    borderColor:
                      selected
                        ? colors.brand.primary
                        : colors.border.light,
                  },
                ]}
              >
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        brand
                          ? brand.background
                          : colors.background.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.overline,
                      {
                        color:
                          brand
                            ? brand.text
                            : colors.text.secondary,
                      },
                    ]}
                  >
                    {(
                      brand?.label ||
                      item.holder_name ||
                      'MM'
                    )
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    marginLeft:
                      spacing.md,
                  }}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        color:
                          colors.text.primary,
                        fontSize:
                          fontSizes.md,
                        fontWeight:
                          fontWeights.medium,
                      },
                    ]}
                  >
                    {brand?.label ||
                      item.holder_name}
                  </Text>

                  <Text
                    style={[
                      typography.body,
                      {
                        color:
                          colors.brand.primary,
                        fontSize:
                          fontSizes.sm,
                      },
                    ]}
                  >
                    {item.phone_number || '—'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected &&
                      styles.radioSelected,
                  ]}
                >
                  {selected ? (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          }
        )
      )}

      <View
        style={{
          marginTop:
            spacing.xl,
        }}
      >
        <Button
          title="Continuer"
          onPress={
            handleContinue
          }
          loading={
            submitting
          }
        />
      </View>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor:
        colors.background.default,
    },

    senderIdentity: {
      ...typography.caption,
      color:
        colors.text.secondary,
      marginBottom:
        spacing.md,
    },

    message: {
      marginTop:
        spacing.md,
      marginBottom:
        spacing.xl,
    },

    card: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderRadius:
        radii.md,
      padding:
        spacing.md,
      marginBottom:
        spacing.md,
    },

    badge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        colors.border.default,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    radioSelected: {
      borderColor:
        colors.brand.primary,
    },

    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        colors.brand.primary,
    },
  });
