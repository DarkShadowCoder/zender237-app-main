import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';

import {
  listDriverRequests,
} from '../../services/kmerDiasporaService';

import {
  ListRow,
  KmaStatus,
} from '../../components/kma/KmaUI';


const FILTERS = [
  {
    value: undefined,
    label: 'Toutes',
  },
  {
    value: 'open',
    label: 'Ouvertes',
  },
  {
    value: 'matched',
    label: 'Matchées',
  },
  {
    value: 'closed',
    label: 'Fermées',
  },
];


export default function KmaDriverRequestsScreen({
  navigation,
}) {
  const [
    status,
    setStatus,
  ] = useState(undefined);

  const [
    items,
    setItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const load =
    useCallback(
      async (
        refresh = false
      ) => {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        try {
          const result =
            await listDriverRequests({
              status,
              limit: 100,
              offset: 0,
            });

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaDriverRequests]',
            e
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [status]
    );


  useEffect(() => {
    load();
  }, [load]);


  return (
    <View style={styles.screen}>
      <Header
        title="Missions conducteurs"
      />

      <View style={styles.headerBlock}>
        <Text style={styles.subtitle}>
          Supervision des besoins de conducteurs créés par les recruteurs.
        </Text>

        <SegmentedControl
          options={FILTERS}
          value={status}
          onChange={setStatus}
        />
      </View>


      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={
            colors.brand.primary
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) =>
            item.id
          }

          contentContainerStyle={
            styles.list
          }

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                load(true)
              }
              tintColor={
                colors.brand.primary
              }
            />
          }

          renderItem={({
            item,
          }) => {
            const cities =
              (
                item.cities ||
                []
              )
                .map((entry) =>
                  typeof entry ===
                  'string'
                    ? entry
                    : entry?.city
                )
                .filter(Boolean);

            return (
              <Card
                style={
                  styles.card
                }
              >
                <ListRow
                  icon="people-outline"
                  title={`${
                    item.drivers_needed ||
                    0
                  } conducteur${
                    Number(
                      item.drivers_needed
                    ) > 1
                      ? 's'
                      : ''
                  }`}
                  subtitle={[
                    item.country,
                    cities.join(
                      ', '
                    ) ||
                      item.city,
                    item.neighborhood,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  right={
                    <KmaStatus
                      status={
                        item.status
                      }
                    />
                  }
                  onPress={() =>
                    navigation.navigate(
                      'KmaContentDetail',
                      {
                        contentType:
                          'driver_request',
                        contentId:
                          item.id,
                        request:
                          item,
                      }
                    )
                  }
                />
              </Card>
            );
          }}

          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Aucune mission"
              subtitle="Aucune mission ne correspond au filtre sélectionné."
            />
          }
        />
      )}
    </View>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background.default,
    },

    headerBlock: {
      paddingHorizontal:
        spacing.screenHorizontal,
      paddingTop:
        spacing.md,
    },

    subtitle: {
      ...typography.caption,
      color:
        colors.text.secondary,
      marginBottom:
        spacing.sm,
    },

    list: {
      padding:
        spacing.screenHorizontal,
      paddingTop:
        spacing.md,
      paddingBottom:
        spacing.huge,
    },

    card: {
      marginBottom:
        spacing.sm,
      padding:
        spacing.xs,
      borderRadius:
        18,
    },

    loader: {
      marginTop:
        spacing.xl,
    },
  });