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

import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';

import {
  colors,
  fontSizes,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import {
  formatAmount,
} from '../../utils/formatters';

import {
  listQuests,
} from '../../services/kmerDiasporaService';

import {
  KmaStatus,
} from '../../components/kma/KmaUI';


const FILTERS = [
  {
    value: 'published',
    label: 'Publiées',
  },
  {
    value: 'active',
    label: 'Actives',
  },
  {
    value: 'completed',
    label: 'Terminées',
  },
  {
    value: 'suspended',
    label: 'Suspendues',
  },
];


function progress(
  current,
  target
) {
  const currentValue =
    Number(current) || 0;

  const targetValue =
    Number(target) || 0;

  if (
    targetValue <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (
        currentValue /
        targetValue
      ) *
      100
    )
  );
}


export default function KmaQuestsScreen({
  navigation,
}) {
  const [
    status,
    setStatus,
  ] = useState(
    'published'
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
          const result =
            await listQuests({
              status,
              limit: 100,
              offset: 0,
            });

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaQuests]',
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
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Quêtes"
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
          Suivez les collectes communautaires et leur progression.
        </Text>

        <SegmentedControl
          options={
            FILTERS
          }
          value={
            status
          }
          onChange={
            setStatus
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

          keyExtractor={(
            item
          ) =>
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
              tintColor={
                colors.brand.primary
              }
            />
          }

          renderItem={({
            item,
          }) => {

            const pct =
              progress(
                item.current_amount,
                item.target_amount
              );

            const currency =
              item.currency ||
              'XAF';

            return (
              <Card
                style={
                  styles.card
                }
              >

                <View
                  style={
                    styles.top
                  }
                >

                  <View
                    style={
                      styles.icon
                    }
                  >
                    <Text
                      style={
                        styles.heart
                      }
                    >
                      ♥
                    </Text>
                  </View>


                  <View
                    style={
                      styles.content
                    }
                  >

                    <Text
                      style={
                        styles.title
                      }
                      numberOfLines={2}
                    >
                      {
                        item.title
                      }
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                      numberOfLines={2}
                    >
                      {
                        item.description ||
                        'Collecte communautaire'
                      }
                    </Text>

                  </View>


                  <KmaStatus
                    status={
                      item.status
                    }
                  />

                </View>


                <View
                  style={
                    styles.track
                  }
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width:
                          `${pct}%`,
                      },
                    ]}
                  />
                </View>


                <View
                  style={
                    styles.amountRow
                  }
                >

                  <Text
                    style={
                      styles.percent
                    }
                  >
                    {pct}% atteint
                  </Text>

                  <Text
                    style={
                      styles.amount
                    }
                  >
                    {
                      formatAmount(
                        item.current_amount
                      )
                    }{' '}
                    {currency}

                    {item.target_amount
                      ? ` / ${formatAmount(
                          item.target_amount
                        )} ${currency}`
                      : ''}
                  </Text>

                </View>


                <View
                  style={
                    styles.metaRow
                  }
                >

                  <Text
                    style={
                      styles.meta
                    }
                  >
                    Créateur :{' '}
                    {
                      item.creator
                        ?.username ||
                      '—'
                    }
                  </Text>

                  <Text
                    style={
                      styles.meta
                    }
                  >
                    Bénéficiaire :{' '}
                    {
                      item.beneficiary
                        ?.username ||
                      '—'
                    }
                  </Text>

                </View>

              </Card>
            );
          }}

          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="Aucune quête"
              subtitle="Aucune quête ne correspond au statut sélectionné."
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
      borderRadius:
        radii.xl,
    },

    top: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    icon: {
      width: 42,
      height: 42,
      borderRadius:
        radii.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#FFF6E0',
      marginRight:
        spacing.sm,
    },

    heart: {
      fontSize: 21,
      color:
        colors.brand.secondaryDark,
    },

    content: {
      flex: 1,
      minWidth: 0,
      marginRight:
        spacing.xs,
    },

    title: {
      ...typography.bodyBold,
      fontSize:
        fontSizes.sm,
      color:
        colors.text.primary,
    },

    description: {
      marginTop: 3,
      color:
        colors.text.tertiary,
      fontSize:
        fontSizes.xs,
    },

    track: {
      height: 7,
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.background.surfaceAlt,
      overflow: 'hidden',
      marginTop:
        spacing.md,
    },

    fill: {
      height: '100%',
      borderRadius:
        radii.pill,
      backgroundColor:
        colors.brand.primary,
    },

    amountRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginTop:
        spacing.xs,
    },

    percent: {
      ...typography.caption,
      color:
        colors.text.secondary,
    },

    amount: {
      ...typography.caption,
      color:
        colors.text.primary,
      textAlign:
        'right',
    },

    metaRow: {
      marginTop:
        spacing.sm,
      paddingTop:
        spacing.sm,
      borderTopWidth: 1,
      borderTopColor:
        colors.border.light,
      gap: 2,
    },

    meta: {
      color:
        colors.text.tertiary,
      fontSize: 10,
    },

    loader: {
      marginTop:
        spacing.xl,
    },
  });