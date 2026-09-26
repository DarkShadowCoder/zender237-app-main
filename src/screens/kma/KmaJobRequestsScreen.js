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
  listJobRequests,
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
    value: 'published',
    label: 'Publiées',
  },
  {
    value: 'active',
    label: 'Actives',
  },
  {
    value: 'closed',
    label: 'Fermées',
  },
];


export default function KmaJobRequestsScreen({
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

  const [
    error,
    setError,
  ] = useState(null);


  const load =
    useCallback(
      async (
        refresh = false
      ) => {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        try {
          setError(null);

          const result =
            await listJobRequests({
              status,
              limit: 100,
              offset: 0,
            });

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaJobRequests]',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger les demandes.'
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
        title="Demandes de poste"
      />

      <View style={styles.headerBlock}>
        <Text style={styles.subtitle}>
          Supervision de toutes les demandes de position publiées.
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
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Chargement impossible
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
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
            const title =
              item.full_name ||
              item.title ||
              'Demande de poste';

            const subtitle =
              [
                item.title,
                item.city,
                item.region,
                item.country,
              ]
                .filter(Boolean)
                .join(' · ');

            return (
              <Card
                style={
                  styles.card
                }
              >
                <ListRow
                  icon="briefcase-outline"
                  title={title}
                  subtitle={
                    subtitle ||
                    'Informations non renseignées'
                  }
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
                          'job_request',
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
              icon="briefcase-outline"
              title="Aucune demande"
              subtitle="Aucune demande de poste ne correspond au filtre."
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

    errorBox: {
      margin:
        spacing.screenHorizontal,
      marginTop:
        spacing.lg,
      padding:
        spacing.md,
      borderRadius:
        16,
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderColor:
        colors.border.light,
    },

    errorTitle: {
      ...typography.bodyBold,
      color:
        colors.text.primary,
    },

    errorText: {
      ...typography.caption,
      marginTop:
        spacing.xs,
      color:
        colors.text.secondary,
    },
  });