
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
  supabase,
} from '../../../lib/supabase';

import {
  listDriverRequests,
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
    request?.creator?.full_name ||
    request?.creator?.username ||
    request?.profile?.full_name ||
    request?.requester_name ||
    'Créateur non renseigné'
  );
}


function getCreatorPhone(
  request
) {
  return (
    request?.creator?.phone_number ||
    request?.creator?.whatsapp_number ||
    request?.contact_phone ||
    'Numéro non renseigné'
  );
}


function getRequestCities(
  request
) {
  const cities =
    Array.isArray(
      request?.cities
    )
      ? request.cities
          .map(
            (item) =>
              typeof item ===
              'string'
                ? item
                : item?.city
          )
          .filter(Boolean)
      : [];

  if (
    cities.length
  ) {
    return Array.from(
      new Set(
        cities
      )
    ).join(
      ', '
    );
  }

  return (
    request?.city ||
    'Ville non renseignée'
  );
}


/* ============================================================
 * REQUEST CARD
 * ============================================================ */

function DriverRequestCard({
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

  const cities =
    getRequestCities(
      request
    );

  const status =
    request?.status;


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
            name="car-outline"
            size={21}
            color={
              colors.success.default
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
            {request?.drivers_needed || 0}{' '}
            conducteur
            {Number(
              request?.drivers_needed
            ) > 1
              ? 's'
              : ''}
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
              status
            )
          }
          label={
            statusLabel(
              status
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
       * DESCRIPTION
       * ====================================================== */}

      {request?.description ? (
        <View
          style={
            styles.descriptionBox
          }
        >
          <Text
            style={
              styles.descriptionLabel
            }
          >
            DESCRIPTION
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {
              request.description
            }
          </Text>
        </View>
      ) : null}
    </View>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function KdDriverRequestsAdminScreen() {
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
            await listDriverRequests({
              limit: 100,
            });

          const requests =
            result?.data ||
            [];

          /*
           * --------------------------------------------------
           * ENRICHISSEMENT DU CRÉATEUR
           * --------------------------------------------------
           *
           * kd_driver_requests contient requester_user_id.
           *
           * On récupère d'abord kd_profiles via user_id.
           * Puis profiles comme fallback pour les utilisateurs
           * qui n'ont pas encore de profil KmerDiaspora complet.
           */

          const userIds =
            Array.from(
              new Set(
                requests
                  .map(
                    (
                      request
                    ) =>
                      request?.requester_user_id
                  )
                  .filter(Boolean)
              )
            );


          let creatorByUserId =
            new Map();


          if (
            userIds.length
          ) {
            const [
              kdProfilesResult,
              profilesResult,
            ] =
              await Promise.all([
                supabase
                  .from(
                    'kd_profiles'
                  )
                  .select(
                    `
                      id,
                      user_id,
                      full_name,
                      phone_number,
                      residence_country,
                      region,
                      city,
                      neighborhood,
                      mobility_area
                    `
                  )
                  .in(
                    'user_id',
                    userIds
                  ),

                supabase
                  .from(
                    'profiles'
                  )
                  .select(
                    `
                      id,
                      username,
                      whatsapp_number,
                      country
                    `
                  )
                  .in(
                    'id',
                    userIds
                  ),
              ]);


            if (
              kdProfilesResult.error
            ) {
              throw kdProfilesResult.error;
            }

            if (
              profilesResult.error
            ) {
              throw profilesResult.error;
            }


            const profileByUserId =
              new Map(
                (
                  kdProfilesResult.data ||
                  []
                ).map(
                  (
                    profile
                  ) => [
                    profile.user_id,
                    profile,
                  ]
                )
              );


            const accountByUserId =
              new Map(
                (
                  profilesResult.data ||
                  []
                ).map(
                  (
                    profile
                  ) => [
                    profile.id,
                    profile,
                  ]
                )
              );


            creatorByUserId =
              new Map(
                userIds.map(
                  (
                    userId
                  ) => {
                    const kdProfile =
                      profileByUserId.get(
                        userId
                      );

                    const account =
                      accountByUserId.get(
                        userId
                      );

                    return [
                      userId,
                      {
                        ...(kdProfile ||
                          {}),
                        ...(account ||
                          {}),

                        full_name:
                          kdProfile?.full_name ||
                          account?.username ||
                          null,

                        phone_number:
                          kdProfile?.phone_number ||
                          account?.whatsapp_number ||
                          null,
                      },
                    ];
                  }
                )
              );
          }


          const enrichedRequests =
            requests.map(
              (
                request
              ) => ({
                ...request,

                creator:
                  creatorByUserId.get(
                    request.requester_user_id
                  ) ||
                  null,
              })
            );


          setData(
            enrichedRequests
          );
        } catch (
          e
        ) {
          console.error(
            '[KdDriverRequestsAdmin] load:',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger les besoins de conducteur.'
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
   * FILTER OPTIONS
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

            const cities =
              getRequestCities(
                request
              );

            const haystack = [
              creatorName,
              creatorPhone,
              request.country,
              request.city,
              request.neighborhood,
              request.description,
              cities,
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
        title="Besoins de conducteur"
      >
        <Loading />
      </Screen>
    );
  }


  if (error) {
    return (
      <Screen
        title="Besoins de conducteur"
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
      title="Besoins de conducteur"
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
          placeholder="Créateur, téléphone, pays, ville, quartier…"
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
                  <DriverRequestCard
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
              icon="car-outline"
              title="Aucune demande"
              subtitle={
                data.length
                  ? 'Aucun résultat pour ce filtre ou cette recherche.'
                  : 'Aucun besoin de conducteur pour le moment.'
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
        colors.success.light,

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
        colors.success.light,

      marginRight:
        spacing.sm,
    },

    creatorAvatarText: {
      color:
        colors.success.default,

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
