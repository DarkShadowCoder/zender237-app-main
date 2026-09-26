
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
  fontSizes,
  lineHeights,
  fontWeights,
} from '../../../theme/theme';

import Card from '../../../components/Card';

import {
  listJobRequests,
} from '../../../services/kmerDiasporaService';

import {
  Screen,
  Loading,
  ErrorBox,
  Divider,
  Empty,
  Pill,
  SearchField,
  Segmented,
  statusLabel,
  statusTone,
  styles as adminStyles,
} from '../AdminUI';


/* ============================================================
 * HELPERS
 * ============================================================ */

function formatDate(
  value
) {
  if (!value) {
    return 'Date non renseignée';
  }

  try {
    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ).format(
      new Date(value)
    );
  } catch {
    return String(value);
  }
}


function getCreatorName(
  request
) {
  return (
    request?.profile?.full_name ||
    request?.full_name ||
    'Créateur non renseigné'
  );
}


function getCreatorPhone(
  request
) {
  return (
    request?.profile?.phone_number ||
    request?.phone_number ||
    'Numéro non renseigné'
  );
}


function JobRequestCard({
  request,
}) {
  const creatorName =
    getCreatorName(
      request
    );

  const creatorPhone =
    getCreatorPhone(
      request
    );

  return (
    <View
      style={
        styles.requestCard
      }
    >
      {/* ======================================================
       * HEADER
       * ====================================================== */}

      <View
        style={
          styles.headerRow
        }
      >
        <View
          style={
            styles.headerIcon
          }
        >
          <Ionicons
            name="briefcase-outline"
            size={21}
            color={
              colors.brand.primary
            }
          />
        </View>

        <View
          style={
            styles.headerContent
          }
        >
          <Text
            style={
              styles.requestTitle
            }
            numberOfLines={2}
          >
            {
              request?.title ||
              'Demande de poste'
            }
          </Text>

          <Text
            style={
              styles.requestSubtitle
            }
          >
            Demande #{String(
              request?.id || ''
            ).slice(
              0,
              8
            )}
          </Text>
        </View>

        <Pill
          tone={
            statusTone(
              request?.status
            )
          }
          label={
            statusLabel(
              request?.status
            )
          }
        />
      </View>


      {/* ======================================================
       * CREATOR
       * ====================================================== */}

      <View
        style={
          styles.creatorBlock
        }
      >
        <View
          style={
            styles.creatorAvatar
          }
        >
          <Text
            style={
              styles.creatorAvatarText
            }
          >
            {String(
              creatorName
            )
              .trim()
              .split(
                /\s+/
              )
              .slice(
                0,
                2
              )
              .map(
                (
                  part
                ) =>
                  part?.[0]
                    ?.toUpperCase() ||
                  ''
              )
              .join('') || 'C'}
          </Text>
        </View>

        <View
          style={
            styles.creatorContent
          }
        >
          <Text
            style={
              styles.creatorLabel
            }
          >
            CRÉATEUR DE LA DEMANDE
          </Text>

          <Text
            style={
              styles.creatorName
            }
            numberOfLines={2}
          >
            {creatorName}
          </Text>

          <Text
            style={
              styles.creatorPhone
            }
            numberOfLines={1}
          >
            {creatorPhone}
          </Text>
        </View>
      </View>


      {/* ======================================================
       * DETAILS
       * ====================================================== */}

      <View
        style={
          styles.detailsContainer
        }
      >
        <View
          style={
            styles.detailItem
          }
        >
          <Ionicons
            name="briefcase-outline"
            size={17}
            color={
              colors.text.tertiary
            }
          />

          <View
            style={
              styles.detailContent
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              Poste
            </Text>

            <Text
              style={
                styles.detailValue
              }
            >
              {
                request?.title ||
                'Poste non renseigné'
              }
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function KdJobRequestsAdminScreen() {
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

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState('all');


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setError(
            null
          );

          const result =
            await listJobRequests({
              limit: 100,
            });

          setData(
            result?.data ||
              []
          );
        } catch (
          e
        ) {
          console.error(
            '[KdJobRequestsAdmin] load:',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger les besoins de position.'
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );


  useEffect(
    () => {
      load();
    },
    [load]
  );


  /* ==========================================================
   * STATUS OPTIONS
   * ========================================================== */

  const statusOptions =
    useMemo(
      () => {
        const found =
          Array.from(
            new Set(
              data
                .map(
                  (
                    request
                  ) =>
                    request.status
                )
                .filter(
                  Boolean
                )
            )
          );

        return [
          {
            key: 'all',
            label: 'Tous',
          },

          ...found.map(
            (
              status
            ) => ({
              key:
                status,

              label:
                statusLabel(
                  status
                ),
            })
          ),
        ];
      },
      [
        data,
      ]
    );


  /* ==========================================================
   * FILTER
   * ========================================================== */

  const filtered =
    useMemo(
      () => {
        const q =
          search
            .trim()
            .toLowerCase();

        return data.filter(
          (
            request
          ) => {
            const matchesFilter =
              filter ===
                'all' ||
              request.status ===
                filter;

            if (
              !matchesFilter
            ) {
              return false;
            }

            if (!q) {
              return true;
            }

            const creatorName =
              getCreatorName(
                request
              );

            const creatorPhone =
              getCreatorPhone(
                request
              );

            const haystack = [
              creatorName,
              creatorPhone,
              request.title,
              request.full_name,
              request.country,
              request.region,
              request.city,
              request.mobility_area,
              request.description,
              request.id,
            ]
              .filter(
                Boolean
              )
              .join(
                ' '
              )
              .toLowerCase();

            return haystack.includes(
              q
            );
          }
        );
      },
      [
        data,
        search,
        filter,
      ]
    );


  /* ==========================================================
   * RENDER
   * ========================================================== */

  if (loading) {
    return (
      <Screen
        title="Besoins de position"
      >
        <Loading />
      </Screen>
    );
  }


  if (error) {
    return (
      <Screen
        title="Besoins de position"
      >
        <ErrorBox
          message={
            error
          }
          onRetry={
            load
          }
        />
      </Screen>
    );
  }


  return (
    <Screen
      title="Besoins de position"
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true
              );

              load();
            }}
            tintColor={
              colors.brand.primary
            }
          />
        }
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <SearchField
          value={
            search
          }
          onChangeText={
            setSearch
          }
          placeholder="Créateur, poste, pays, ville, zone…"
        />


        {statusOptions.length >
        1 ? (
          <View
            style={
              styles.filterContainer
            }
          >
            <Segmented
              options={
                statusOptions
              }
              value={
                filter
              }
              onChange={
                setFilter
              }
            />
          </View>
        ) : null}


        <View
          style={
            styles.resultsHeader
          }
        >
          <Text
            style={[
              typography.caption,
              styles.muted,
            ]}
          >
            {filtered.length} sur{' '}
            {data.length} demande
            {data.length >
            1
              ? 's'
              : ''}
          </Text>
        </View>


        <Card
          style={
            styles.listCard
          }
        >
          {filtered.length ? (
            filtered.map(
              (
                request,
                index
              ) => (
                <View
                  key={
                    request.id
                  }
                >
                  <JobRequestCard
                    request={
                      request
                    }
                  />

                  {index <
                  filtered.length -
                    1 ? (
                    <Divider />
                  ) : null}
                </View>
              )
            )
          ) : (
            <Empty
              icon="briefcase-outline"
              title="Aucune demande"
              subtitle={
                data.length
                  ? 'Aucun résultat pour ce filtre ou cette recherche.'
                  : 'Aucun besoin de position pour le moment.'
              }
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({
    filterContainer: {
      marginTop:
        spacing.md,
    },

    resultsHeader: {
      marginTop:
        spacing.md,

      marginBottom:
        spacing.xs,
    },

    muted: {
      color:
        colors.text.tertiary,
    },

    listCard: {
      marginTop:
        spacing.sm,

      padding:
        spacing.xs,
    },

    requestCard: {
      padding:
        spacing.sm,
    },

    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    headerIcon: {
      width: 42,
      height: 42,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },

    headerContent: {
      flex: 1,

      minWidth:
        0,

      paddingRight:
        spacing.xs,
    },

    requestTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.bold,
    },

    requestSubtitle: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xxs,
    },

    creatorBlock: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.surfaceAlt,
    },

    creatorAvatar: {
      width: 40,
      height: 40,

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },

    creatorAvatarText: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.bold,
    },

    creatorContent: {
      flex: 1,

      minWidth:
        0,
    },

    creatorLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xxs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },

    creatorName: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.bold,
    },

    creatorPhone: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },

    detailsContainer: {
      marginTop:
        spacing.md,
    },

    detailItem: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginBottom:
        spacing.sm,
    },

    detailContent: {
      flex: 1,

      marginLeft:
        spacing.xs,
    },

    detailLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xxs,

      fontWeight:
        fontWeights.semiBold,
    },

    detailValue: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

    descriptionBox: {
      marginTop:
        spacing.xs,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.surfaceAlt,
    },

    descriptionLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xxs,

      fontWeight:
        fontWeights.bold,

      marginBottom:
        4,
    },

    description: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },

    footer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        spacing.sm,

      flexWrap:
        'wrap',

      marginTop:
        spacing.sm,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        colors.border.light,
    },

    footerText: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xxs,
    },
  });

