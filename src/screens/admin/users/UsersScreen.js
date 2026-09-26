// src/screens/admin/users/UsersScreen.js

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
} from '../../../theme/theme';

import Input from '../../../components/Input';
import Card from '../../../components/Card';

import {
  deleteUser,
  listUsers,
} from '../../../services/adminService';

import {
  Screen,
  Loading,
  ErrorBox,
  Row,
  Divider,
  styles,
} from '../AdminUI';

export default function UsersScreen({
  navigation,
}) {
  const [
    search,
    setSearch,
  ] = useState('');

  const [
    data,
    setData,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const load = useCallback(
    async () => {
      try {
        setError(null);

        const result =
          await listUsers({
            search,
            limit: 50,
          });

        setData(
          Array.isArray(
            result?.data
          )
            ? result.data
            : []
        );
      } catch (e) {
        setError(
          e?.message ||
            'Impossible de charger les utilisateurs.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  const handleDelete =
    useCallback(
      (user) => {
        if (!user?.id) {
          return;
        }

        const displayName =
          user.username ||
          'cet utilisateur';

        Alert.alert(
          'Supprimer l’utilisateur',
          `Voulez-vous vraiment supprimer ${displayName} ?\n\nCette action est définitive. Les comptes possédant un historique de transactions ne peuvent pas être supprimés afin de préserver les données financières.`,
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress:
                async () => {
                  try {
                    await deleteUser(
                      user.id
                    );

                    setData(
                      (current) =>
                        current.filter(
                          (item) =>
                            item.id !==
                            user.id
                        )
                    );
                  } catch (e) {
                    Alert.alert(
                      'Suppression impossible',
                      e?.message ||
                        'Impossible de supprimer cet utilisateur.'
                    );
                  }
                },
            },
          ]
        );
      },
      []
    );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen title="Utilisateurs">
        <Loading />
      </Screen>
    );
  }

  if (
    error &&
    !data.length
  ) {
    return (
      <Screen title="Utilisateurs">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Utilisateurs">
      <Input
        label="Rechercher"
        value={search}
        onChangeText={
          setSearch
        }
        placeholder="Nom d'utilisateur ou WhatsApp"
        leftAdornment={
          <Ionicons
            name="search"
            size={20}
            color={
              colors.icon.muted
            }
          />
        }
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        contentContainerStyle={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Card>
          {data.length ? (
            data.map(
              (
                user,
                index
              ) => (
                <View
                  key={
                    user.id
                  }
                >
                  <Row
                    icon="person-outline"
                    iconColor={
                      colors.brand
                        .primary
                    }
                    title={
                      user.username
                    }
                    subtitle={`${user.whatsapp_number || '—'} · ${
                      user.country ||
                      '—'
                    }`}
                    right={
                      <View
                        style={{
                          flexDirection:
                            'row',
                          alignItems:
                            'center',
                          gap: 10,
                        }}
                      >
                        <Pressable
                          onPress={(
                            event
                          ) => {
                            event
                              ?.stopPropagation?.();

                            handleDelete(
                              user
                            );
                          }}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer ${
                            user.username ||
                            'l’utilisateur'
                          }`}
                          style={({
                            pressed,
                          }) => ({
                            opacity:
                              pressed
                                ? 0.55
                                : 1,
                          })}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={21}
                            color={
                              colors
                                .error
                                .default
                            }
                          />
                        </Pressable>

                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={
                            colors.text
                              .tertiary
                          }
                        />
                      </View>
                    }
                    onPress={() =>
                      navigation.navigate(
                        'AdminUserDetail',
                        {
                          userId:
                            user.id,
                        }
                      )
                    }
                  >
                    {user.wallets?.[0] ? (
                      <Text
                        style={[
                          typography.caption,
                          {
                            color:
                              colors
                                .success
                                .text,
                          },
                        ]}
                      >
                        Solde:{' '}
                        {
                          user
                            .wallets[0]
                            .available_balance
                        }{' '}
                        U
                      </Text>
                    ) : null}
                  </Row>

                  {index <
                    data.length - 1 && (
                    <Divider />
                  )}
                </View>
              )
            )
          ) : (
            <Row
              icon="people-outline"
              title="Aucun utilisateur"
              subtitle="Aucun résultat pour cette recherche."
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}