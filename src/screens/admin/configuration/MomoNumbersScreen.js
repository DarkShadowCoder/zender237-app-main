import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  View,
  Pressable,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../../theme/theme';

import Card from '../../../components/Card';

import {
  listMomoDepositNumbers,
  deleteMomoDepositNumber,
} from '../../../services/adminService';

import {
  Screen,
  Loading,
  ErrorBox,
  Empty,
  Row,
  Divider,
  styles as adminStyles,
} from '../AdminUI';

const formatMoney =
  (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '∞';
    }

    return Number(value)
      .toLocaleString('fr-FR')
      .replace(/\u202f/g, ' ');
  };

export default function MomoNumbersScreen({
  navigation,
}) {
  const [
    data,
    setData,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState(null);

  const load =
    useCallback(async () => {
      try {
        setError(null);

        const result =
          await listMomoDepositNumbers({
            active: null,
          });

        setData(result);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete =
    (item) => {
      Alert.alert(
        'Supprimer le numéro ?',
        `Voulez-vous supprimer définitivement ${item.phone_number} ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },

          {
            text: 'Supprimer',
            style: 'destructive',

            onPress: async () => {
              try {
                setDeletingId(
                  item.id
                );

                await deleteMomoDepositNumber(
                  {
                    id: item.id,
                  }
                );

                Alert.alert(
                  'Supprimé',
                  'Le numéro Mobile Money a été supprimé.'
                );

                await load();
              } catch (e) {
                Alert.alert(
                  'Suppression impossible',
                  e.message
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    };

  if (loading) {
    return (
      <Screen title="Mobile Money">
        <Loading />
      </Screen>
    );
  }

  if (
    error &&
    !data.length
  ) {
    return (
      <Screen title="Mobile Money">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Mobile Money"
      right={
        <Pressable
          onPress={() =>
            navigation.navigate(
              'AdminMomoNumberForm'
            )
          }
          hitSlop={8}
        >
          <Ionicons
            name="add"
            size={24}
            color={
              colors.brand.primary
            }
          />
        </Pressable>
      }
    >
      <ScrollView
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {!!data.length && (
          <Text
            style={[
              typography.caption,
              styles.summary,
            ]}
          >
            {data.length}{' '}
            numéro
            {data.length >
            1
              ? 's'
              : ''}{' '}
            enregistré
            {data.length >
            1
              ? 's'
              : ''}
          </Text>
        )}

        <Card>
          {data.length ? (
            data.map(
              (item, index) => (
                <View
                  key={
                    item.id
                  }
                >
                  <Row
                    icon="phone-portrait-outline"
                    title={
                      item.phone_number
                    }
                    subtitle={`${item.holder_name} · ${formatMoney(item.min_amount)}–${formatMoney(item.max_amount)} U`}
                    right={
                      <View
                        style={
                          styles.actions
                        }
                      >
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor:
                                item.active
                                  ? colors
                                      .success
                                      .light
                                  : colors
                                      .error
                                      .light,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              typography.caption,
                              {
                                color:
                                  item.active
                                    ? colors
                                        .success
                                        .text
                                    : colors
                                        .error
                                        .text,
                              },
                            ]}
                          >
                            {item.active
                              ? 'Actif'
                              : 'Inactif'}
                          </Text>
                        </View>

                        <Pressable
                          disabled={
                            deletingId ===
                            item.id
                          }
                          onPress={() =>
                            handleDelete(
                              item
                            )
                          }
                          hitSlop={
                            10
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={19}
                            color={
                              colors
                                .error
                                .default
                            }
                          />
                        </Pressable>
                      </View>
                    }
                  />

                  {index <
                    data.length -
                      1 && (
                    <Divider />
                  )}
                </View>
              )
            )
          ) : (
            <Empty
              icon="phone-portrait-outline"
              title="Aucun numéro"
              subtitle="Ajoutez un numéro Mobile Money."
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    color:
      colors.text.secondary,
    marginBottom:
      spacing.sm,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  statusPill: {
    borderRadius:
      radii.pill,
    paddingHorizontal:
      spacing.sm,
    paddingVertical: 3,
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.error.light,
  },
});