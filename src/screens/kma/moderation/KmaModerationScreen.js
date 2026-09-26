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

import Header from '../../../../src/components/Header';
import SegmentedControl from '../../../../src/components/SegmentedControl';
import Card from '../../../../src/components/Card';
import EmptyState from '../../../../src/components/EmptyState';

import {
  colors,
  spacing,
  typography,
} from '../../../../src/theme/theme';

import {
  listJobRequests,
  listDriverRequests,
  listQuests,
} from '../../../../src/services/kmerDiasporaService';

import {
  ListRow,
  KmaStatus,
} from '../../../components/kma/KmaUI';


const TABS = [
  {
    value: 'jobs',
    label: 'Postes',
  },
  {
    value: 'drivers',
    label: 'Missions',
  },
  {
    value: 'quests',
    label: 'Quêtes',
  },
];


export default function KmaModerationScreen({
  navigation,
}) {
  const [
    type,
    setType,
  ] = useState(
    'jobs'
  );

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
          let result;

          if (
            type ===
            'jobs'
          ) {
            result =
              await listJobRequests({
                limit: 100,
                offset: 0,
              });
          } else if (
            type ===
            'drivers'
          ) {
            result =
              await listDriverRequests({
                limit: 100,
                offset: 0,
              });
          } else {
            result =
              await listQuests({
                limit: 100,
                offset: 0,
              });
          }

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaModeration]',
            e
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [type]
    );


  useEffect(() => {
    load();
  }, [load]);


  const contentType =
    type === 'jobs'
      ? 'job_request'
      : type === 'drivers'
        ? 'driver_request'
        : 'quest';


  return (
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Modération"
      />


      <View
        style={
          styles.headerBlock
        }
      >

        <Text
          style={
            styles.subtitle
          }
        >
          Examinez les contenus KmerDiaspora et intervenez uniquement lorsque cela est nécessaire.
        </Text>


        <SegmentedControl
          options={
            TABS
          }
          value={
            type
          }
          onChange={
            setType
          }
        />

      </View>


      {loading ? (
        <ActivityIndicator
          style={
            styles.loader
          }
          color={
            colors.brand.primary
          }
        />
      ) : (
        <FlatList
          data={
            items
          }

          keyExtractor={
            (item) =>
              item.id
          }

          contentContainerStyle={
            styles.list
          }

          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                load(true)
              }
            />
          }

          renderItem={({
            item,
          }) => (
            <Card
              style={
                styles.card
              }
            >
              <ListRow
                icon={
                  type === 'jobs'
                    ? 'briefcase-outline'
                    : type === 'drivers'
                      ? 'people-outline'
                      : 'heart-outline'
                }

                title={
                  item.title ||
                  item.full_name ||
                  `${
                    item.drivers_needed ||
                    0
                  } conducteur(s)`
                }

                subtitle={
                  item.description ||
                  [
                    item.city,
                    item.region,
                    item.country,
                  ]
                    .filter(Boolean)
                    .join(
                      ' · '
                    )
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
                      contentType,
                      contentId:
                        item.id,
                      content:
                        item,
                    }
                  )
                }
              />
            </Card>
          )}

          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title="Aucun contenu"
              subtitle="Aucun contenu n'est actuellement disponible dans cette catégorie."
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
    },

    loader: {
      marginTop:
        spacing.xl,
    },
  });