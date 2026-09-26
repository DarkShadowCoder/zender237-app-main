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
  View,
} from 'react-native';

import Header from '../../../../src/components/Header';
import Card from '../../../../src/components/Card';
import EmptyState from '../../../../src/components/EmptyState';
import Button from '../../../../src/components/Button';

import {
  colors,
  spacing,
} from '../../../../src/theme/theme';

import {
  listReports,
} from '../../../../src/services/kmerDiasporaService';

import {
  ListRow,
} from '../../../components/kma/KmaUI';


export default function KmaReportsScreen({
  navigation,
}) {
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
            await listReports({
              limit: 100,
              offset: 0,
            });

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaReports]',
            e
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  useEffect(() => {
    load();
  }, [load]);


  return (
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Rapports communautaires"
      />


      <View
        style={
          styles.topAction
        }
      >

        <Button
          title="Nouveau rapport"
          onPress={() =>
            navigation.navigate(
              'KmaCreateReport'
            )
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
                icon="document-text-outline"
                title={
                  item.title ||
                  'Rapport communautaire'
                }
                subtitle={[
                  item.report_type ||
                    'community',
                  item.report_date,
                ]
                  .filter(Boolean)
                  .join(
                    ' · '
                  )}
                onPress={() =>
                  navigation.navigate(
                    'KmaReportDetail',
                    {
                      report:
                        item,
                    }
                  )
                }
              />
            </Card>
          )}

          ListEmptyComponent={
            <EmptyState
              icon="bar-chart-outline"
              title="Aucun rapport"
              subtitle="Créez un rapport pour conserver les synthèses de supervision."
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

    topAction: {
      paddingHorizontal:
        spacing.screenHorizontal,
      paddingTop:
        spacing.md,
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