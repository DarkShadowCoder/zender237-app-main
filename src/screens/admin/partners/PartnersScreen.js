// src/screens/admin/partners/PartnersScreen.js

import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  View,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/theme';
import {
  listPartners,
  deletePartner,
} from '../../../services/adminService';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import {
  Screen,
  Loading,
  ErrorBox,
  Row,
  Divider,
  styles,
} from '../AdminUI';

export default function PartnersScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);

      const result = await listPartners();

      setData(
        Array.isArray(result)
          ? result
          : (result?.data ?? [])
      );
    } catch (e) {
      setError(
        e?.message ||
          'Impossible de charger les partenaires.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDelete = useCallback((partner) => {
    if (!partner?.id) {
      return;
    }

    Alert.alert(
      'Supprimer le partenaire',
      `Voulez-vous vraiment supprimer ${
        partner.full_name || 'ce partenaire'
      } ?\n\nCette action est définitive. Les transactions, règlements et traces historiques seront conservés, mais leurs références vers ce partenaire seront détachées.`,
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
              await deletePartner(partner.id);

              setData((current) =>
                current.filter(
                  (item) =>
                    item.id !== partner.id
                )
              );
            } catch (e) {
              Alert.alert(
                'Suppression impossible',
                e?.message ||
                  'Impossible de supprimer ce partenaire.'
              );
            }
          },
        },
      ]
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <Screen title="Partenaires">
        <Loading />
      </Screen>
    );
  }

  if (error && !data.length) {
    return (
      <Screen title="Partenaires">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Partenaires"
      right={
        <Pressable
          onPress={() =>
            navigation.navigate(
              'AdminCreatePartner'
            )
          }
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un partenaire"
        >
          <Ionicons
            name="add"
            size={24}
            color={colors.brand.primary}
          />
        </Pressable>
      }
    >
      <Button
        title="Ajouter un partenaire"
        icon={
          <Ionicons
            name="add"
            size={20}
            color="#fff"
          />
        }
        onPress={() =>
          navigation.navigate(
            'AdminCreatePartner'
          )
        }
      />

      <ScrollView
        contentContainerStyle={
          styles.scroll
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Card
          style={{
            marginTop: 16,
          }}
        >
          {data.length ? (
            data.map((partner, index) => (
              <View
                key={partner.id}
              >
                <Row
                  icon="briefcase-outline"
                  title={
                    partner.full_name
                  }
                  subtitle={`${
                    partner.phone_number ||
                    partner.whatsapp_number ||
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
                      <Ionicons
                        name={
                          partner.active
                            ? 'checkmark-circle'
                            : 'close-circle'
                        }
                        size={19}
                        color={
                          partner.active
                            ? colors.success
                                .default
                            : colors.error
                                .default
                        }
                      />

                      <Pressable
                        onPress={(event) => {
                          event
                            ?.stopPropagation?.();

                          handleDelete(
                            partner
                          );
                        }}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer ${
                          partner.full_name ||
                          'le partenaire'
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
                            colors.error
                              .default
                          }
                        />
                      </Pressable>
                    </View>
                  }
                  onPress={() =>
                    navigation.navigate(
                      'AdminPartnerDetail',
                      {
                        partnerId:
                          partner.id,
                      }
                    )
                  }
                />

                {index <
                  data.length - 1 && (
                  <Divider />
                )}
              </View>
            ))
          ) : (
            <Row
              title="Aucun partenaire"
              subtitle="Aucun partenaire enregistré."
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}