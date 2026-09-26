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
  RefreshControl,
  StyleSheet,
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
  fontWeights,
  lineHeights,
} from '../../theme/theme';

import {
  listDriverRequests,
} from '../../services/kmerDiasporaService';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  KdScreen,
  KdEmpty,
  KdLoading,
  SectionTitle,
} from './components/KdUI';


export default function DriverRequestsScreen({
  navigation,
}) {
  const {
    canCreateDriverRequest,
  } = useAuthorization();


  const [
    items,
    setItems,
  ] = useState([]);


  const [
    status,
    setStatus,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        const result =
          await listDriverRequests({
            status,
            limit: 50,
          });

        setItems(
          result.data || []
        );
      },
      [status]
    );


  useEffect(() => {
    setLoading(true);

    load()
      .catch(
        console.error
      )
      .finally(
        () =>
          setLoading(false)
      );
  }, [load]);


  /* ==========================================================
   * REFRESH
   * ========================================================== */

  const refresh =
    useCallback(
      async () => {
        setRefreshing(true);

        try {
          await load();
        } finally {
          setRefreshing(false);
        }
      },
      [load]
    );


  /* ==========================================================
   * FILTERS
   * ========================================================== */

  const filters = [
    {
      key: 'all',
      value: null,
      label: 'Toutes',
      icon: 'apps-outline',
    },

    {
      key: 'open',
      value: 'open',
      label: 'Ouvertes',
      icon: 'radio-button-on-outline',
    },

    {
      key: 'partially',
      value: 'partially_matched',
      label: 'Partiellement matchées',
      icon: 'sparkles-outline',
    },

    {
      key: 'matched',
      value: 'matched',
      label: 'Matchées',
      icon: 'checkmark-circle-outline',
    },
  ];


  /* ==========================================================
   * STATUS
   * ========================================================== */

  const getStatusConfig =
    (value) => {
      switch (value) {
        case 'partially_matched':
          return {
            label:
              'Partiellement matchée',

            icon:
              'sparkles-outline',
          };

        case 'matched':
          return {
            label:
              'Matchée',

            icon:
              'checkmark-circle-outline',
          };

        case 'closed':
          return {
            label:
              'Clôturée',

            icon:
              'checkmark-done-outline',
          };

        case 'cancelled':
          return {
            label:
              'Annulée',

            icon:
              'close-circle-outline',
          };

        default:
          return {
            label:
              'Ouverte',

            icon:
              'radio-button-on-outline',
          };
      }
    };


  return (
    <KdScreen
      title="Besoins de conducteur"
      scrollView={ScrollView}
    >

      {/* ======================================================
          INTRO
          ====================================================== */}

      <View
        style={
          styles.introCard
        }
      >

        <View
          style={
            styles.introIcon
          }
        >
          <Ionicons
            name="people-outline"
            size={19}
            color={
              colors.brand.primary
            }
          />
        </View>


        <View
          style={
            styles.introContent
          }
        >

          <Text
            style={[
              typography.body,
              styles.introTitle,
            ]}
          >
            Recherches de chauffeurs
          </Text>

          <Text
            style={[
              typography.caption,
              styles.introText,
            ]}
          >
            Consultez les missions publiées par les recruteurs et découvrez les besoins de la communauté.
          </Text>

        </View>

      </View>


      {/* ======================================================
          FILTRES
          ====================================================== */}

      <View
        style={
          styles.filterSection
        }
      >

        <Text
          style={[
            typography.caption,
            styles.filterLabel,
          ]}
        >
          Filtrer les missions
        </Text>


        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterScroll
          }
        >

          {filters.map(
            (filter) => {

              const active =
                status ===
                filter.value;

              return (
                <Pressable
                  key={
                    filter.key
                  }
                  onPress={() =>
                    setStatus(
                      filter.value
                    )
                  }
                  style={[
                    styles.filterChip,
                    active &&
                      styles.filterChipActive,
                  ]}
                >

                  <Ionicons
                    name={
                      filter.icon
                    }
                    size={14}
                    color={
                      active
                        ? colors.brand.primary
                        : colors.text.secondary
                    }
                  />

                  <Text
                    style={[
                      typography.caption,
                      styles.filterText,
                      active &&
                        styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>

                </Pressable>
              );
            }
          )}

        </ScrollView>

      </View>


      {/* ======================================================
          RESULTATS
          ====================================================== */}

      <View
        style={
          styles.resultsHeader
        }
      >

        <View>
          <Text
            style={[
              typography.h3,
              styles.resultsTitle,
            ]}
          >
            Missions disponibles
          </Text>

          {!loading ? (
            <Text
              style={[
                typography.caption,
                styles.resultsCount,
              ]}
            >
              {items.length}{' '}
              {items.length > 1
                ? 'missions'
                : 'mission'}
            </Text>
          ) : null}
        </View>


        {!loading &&
        items.length > 0 ? (
          <View
            style={
              styles.resultsBadge
            }
          >

            <Ionicons
              name="people-outline"
              size={13}
              color={
                colors.brand.primary
              }
            />

            <Text
              style={
                styles.resultsBadgeText
              }
            >
              Recrutement
            </Text>

          </View>
        ) : null}

      </View>


      {/* ======================================================
          LISTE
          ====================================================== */}

      {loading ? (

        <View
          style={
            styles.loading
          }
        >
          <KdLoading
            label="Chargement des missions…"
          />
        </View>

      ) : !items.length ? (

        <View
          style={
            styles.empty
          }
        >
          <KdEmpty
            icon="people-outline"
            title="Aucun besoin"
            subtitle="Les recherches de conducteurs apparaîtront ici."
          />
        </View>

      ) : (

        <View
          style={
            styles.list
          }
        >

          {items.map(
            (item) => {

              const count =
                Number(
                  item.drivers_needed
                ) || 0;


              const cities = Array.isArray(item?.cities) && item.cities.length
              ? item.cities
                  .map((entry) => {
                    if (typeof entry === 'string') {
                      return entry;
                    }

                    if (entry && typeof entry === 'object') {
                      return entry.city || null;
                    }

                    return null;
                  })
                  .filter(Boolean)
              : item?.city
                ? [
                    typeof item.city === 'object'
                      ? item.city.city
                      : item.city
                  ].filter(Boolean)
                : [];


              const statusConfig =
                getStatusConfig(
                  item.status
                );


              return (
                <Pressable
                  key={
                    item.id
                  }
                  onPress={() =>
                    navigation.navigate(
                      'DriverRequestDetail',
                      {
                        requestId:
                          item.id,
                      }
                    )
                  }
                  style={({ pressed }) => [
                    styles.missionCard,
                    pressed &&
                      styles.missionCardPressed,
                  ]}
                >

                  {/* ------------------------------------------
                      HEADER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.missionHeader
                    }
                  >

                    <View
                      style={
                        styles.missionIcon
                      }
                    >
                      <Ionicons
                        name="people-outline"
                        size={19}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.missionIdentity
                      }
                    >

                      <Text
                        style={[
                          typography.caption,
                          styles.missionEyebrow,
                        ]}
                      >
                        BESOIN DE CONDUCTEUR
                      </Text>

                      <Text
                        style={[
                          typography.body,
                          styles.missionTitle,
                        ]}
                      >
                        {count}{' '}
                        {count > 1
                          ? 'chauffeurs recherchés'
                          : 'chauffeur recherché'}
                      </Text>

                    </View>


                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        colors.icon.muted
                      }
                    />

                  </View>


                  {/* ------------------------------------------
                      VILLES
                      ------------------------------------------ */}

                  {cities.length > 0 ? (

                    <View
                      style={
                        styles.cityWrap
                      }
                    >

                      {cities
                        .slice(0, 3)
                        .map(
                          (city) => (
                            <View
                              key={
                                city
                              }
                              style={
                                styles.cityChip
                              }
                            >

                              <Ionicons
                                name="location"
                                size={11}
                                color={
                                  colors.brand.primary
                                }
                              />

                              <Text
                                style={
                                  styles.cityText
                                }
                              >
                                {city}
                              </Text>

                            </View>
                          )
                        )}

                    </View>

                  ) : null}


                  {/* ------------------------------------------
                      INFOS
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.infoRow
                    }
                  >

                    <View
                      style={
                        styles.infoItem
                      }
                    >

                      <Ionicons
                        name="globe-outline"
                        size={13}
                        color={
                          colors.text.tertiary
                        }
                      />

                      <Text
                        style={
                          styles.infoText
                        }
                        numberOfLines={1}
                      >
                        {item.country ||
                          'Pays non précisé'}
                      </Text>

                    </View>


                    {item.neighborhood ? (
                      <View
                        style={
                          styles.infoItem
                        }
                      >

                        <Ionicons
                          name="navigate-outline"
                          size={13}
                          color={
                            colors.text.tertiary
                          }
                        />

                        <Text
                          style={
                            styles.infoText
                          }
                          numberOfLines={1}
                        >
                          {item.neighborhood}
                        </Text>

                      </View>
                    ) : null}

                  </View>


                  {/* ------------------------------------------
                      FOOTER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.missionFooter
                    }
                  >

                    <View
                      style={
                        styles.statusBadge
                      }
                    >

                      <Ionicons
                        name={
                          statusConfig.icon
                        }
                        size={12}
                        color={
                          colors.brand.primary
                        }
                      />

                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        {
                          statusConfig.label
                        }
                      </Text>

                    </View>


                    <View
                      style={
                        styles.viewMission
                      }
                    >

                      <Text
                        style={
                          styles.viewMissionText
                        }
                      >
                        Voir la mission
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={
                          colors.brand.primary
                        }
                      />

                    </View>

                  </View>

                </Pressable>
              );
            }
          )}

        </View>

      )}


      {/* ======================================================
          CTA
          ====================================================== */}

      {canCreateDriverRequest() ? (

        <Pressable
          onPress={() =>
            navigation.navigate(
              'CreateDriverRequest'
            )
          }
          style={({ pressed }) => [
            styles.createButton,
            pressed &&
              styles.createButtonPressed,
          ]}
        >

          <View
            style={
              styles.createButtonIcon
            }
          >
            <Ionicons
              name="add"
              size={22}
              color={
                colors.text.inverse
              }
            />
          </View>


          <View
            style={
              styles.createButtonContent
            }
          >

            <Text
              style={[
                typography.body,
                styles.createButtonTitle,
              ]}
            >
              Publier un besoin
            </Text>

            <Text
              style={[
                typography.caption,
                styles.createButtonSubtitle,
              ]}
            >
              Recherchez un ou plusieurs chauffeurs
            </Text>

          </View>


          <Ionicons
            name="chevron-forward"
            size={19}
            color={
              colors.text.inverse
            }
          />

        </Pressable>

      ) : null}


      <View
        style={
          styles.bottomSpace
        }
      />

    </KdScreen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       INTRO
       ======================================================== */

    introCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.sm,

      padding:
        spacing.sm,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,

      borderWidth:
        1,

      borderColor:
        colors.brand.primaryLight,
    },


    introIcon: {
      width:
        38,

      height:
        38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    introContent: {
      flex:
        1,
    },


    introTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    introText: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       FILTRES
       ======================================================== */

    filterSection: {
      marginTop:
        spacing.lg,
    },


    filterLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,

      marginBottom:
        spacing.xs,
    },


    filterScroll: {
      paddingVertical:
        2,

      paddingRight:
        spacing.md,

      gap:
        spacing.xs,
    },


    filterChip: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.xs,

      borderRadius:
        radii.pill,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    filterChipActive: {
      backgroundColor:
        colors.brand.primaryLight,

      borderColor:
        colors.brand.primary,
    },


    filterText: {
      marginLeft:
        5,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.medium,
    },


    filterTextActive: {
      color:
        colors.brand.primary,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       RESULTATS
       ======================================================== */

    resultsHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        spacing.lg,

      marginBottom:
        spacing.sm,
    },


    resultsTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    resultsCount: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    resultsBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        5,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    resultsBadgeText: {
      marginLeft:
        4,

      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       LISTE
       ======================================================== */

    list: {
      gap:
        spacing.sm,
    },


    missionCard: {
      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      shadowColor:
        '#000',

      shadowOpacity:
        0.05,

      shadowRadius:
        9,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation:
        2,
    },


    missionCardPressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    missionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    missionIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    missionIdentity: {
      flex:
        1,

      marginRight:
        spacing.sm,
    },


    missionEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    missionTitle: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       CITIES
       ======================================================== */

    cityWrap: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing.xs,

      marginTop:
        spacing.md,
    },


    cityChip: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        5,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    cityText: {
      marginLeft:
        4,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       INFO
       ======================================================== */

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    infoItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flex:
        1,

      minWidth:
        0,
    },


    infoText: {
      flex:
        1,

      marginLeft:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       FOOTER
       ======================================================== */

    missionFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    statusBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        4,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    statusText: {
      marginLeft:
        4,

      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    viewMission: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    viewMissionText: {
      marginRight:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.medium,
    },


    /* ========================================================
       CTA
       ======================================================== */

    createButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        64,

      marginTop:
        spacing.lg,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.brand.primary,

      shadowColor:
        '#000',

      shadowOpacity:
        0.10,

      shadowRadius:
        10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation:
        3,
    },


    createButtonPressed: {
      opacity:
        0.85,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    createButtonIcon: {
      width:
        40,

      height:
        40,

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',

      marginRight:
        spacing.sm,
    },


    createButtonContent: {
      flex:
        1,
    },


    createButtonTitle: {
      color:
        colors.text.inverse,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    createButtonSubtitle: {
      marginTop:
        2,

      color:
        'rgba(255,255,255,0.80)',

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       STATES
       ======================================================== */

    loading: {
      minHeight:
        140,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    empty: {
      marginTop:
        spacing.md,
    },


    bottomSpace: {
      height:
        spacing.lg,
    },

  });