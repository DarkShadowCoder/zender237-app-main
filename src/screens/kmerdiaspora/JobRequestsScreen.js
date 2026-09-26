import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  View,
  Text,
  Pressable,
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
  listJobRequests,
} from '../../services/kmerDiasporaService';

import {
  KdScreen,
  SectionTitle,
  KdEmpty,
  KdLoading,
} from './components/KdUI';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';


export default function JobRequestsScreen({
  navigation,
}) {
  const {
    canCreateJobRequest,
  } = useAuthorization();


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
    status,
    setStatus,
  ] = useState(null);


  /* ==========================================================
   * CHARGEMENT
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        const result =
          await listJobRequests({
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
   * FILTRES
   * ========================================================== */

  const filters = [
    {
      key: 'all',
      value: null,
      label: 'Toutes',
      icon: 'apps-outline',
    },
    {
      key: 'published',
      value: 'published',
      label: 'Publiées',
      icon: 'checkmark-circle-outline',
    },
    {
      key: 'matched',
      value: 'matched',
      label: 'Matchées',
      icon: 'sparkles-outline',
    },
    {
      key: 'closed',
      value: 'closed',
      label: 'Clôturées',
      icon: 'archive-outline',
    },
  ];


  /* ==========================================================
   * STATUT
   * ========================================================== */

  const getStatusConfig =
    (itemStatus) => {

      switch (
        itemStatus
      ) {
        case 'matched':
          return {
            label: 'Matchée',
            icon: 'sparkles-outline',
          };

        case 'closed':
          return {
            label: 'Clôturée',
            icon: 'checkmark-done-outline',
          };

        case 'published':
        default:
          return {
            label: 'Publiée',
            icon: 'checkmark-circle-outline',
          };
      }
    };


  return (
    <KdScreen
      title="Besoins de position"
      scrollView={ScrollView}
    >

      {/* ======================================================
          INTRODUCTION
          ====================================================== */}

      <View
        style={
          styles.intro
        }
      >

        <View
          style={
            styles.introIcon
          }
        >
          <Ionicons
            name="briefcase-outline"
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
            Recherche de poste
          </Text>

          <Text
            style={[
              typography.caption,
              styles.introText,
            ]}
          >
            Découvrez les profils disponibles pour une opportunité et consultez les demandes publiées par la communauté.
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
          Filtrer les demandes
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
            Profils disponibles
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
                ? 'demandes'
                : 'demande'}
            </Text>
          ) : null}
        </View>


        {!loading &&
        items.length > 0 ? (
          <View
            style={
              styles.resultBadge
            }
          >
            <Ionicons
              name="briefcase-outline"
              size={13}
              color={
                colors.brand.primary
              }
            />

            <Text
              style={
                styles.resultBadgeText
              }
            >
              Opportunités
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
            styles.loadingContainer
          }
        >
          <KdLoading
            label="Chargement des demandes…"
          />
        </View>

      ) : !items.length ? (

        <View
          style={
            styles.emptyContainer
          }
        >
          <KdEmpty
            icon="briefcase-outline"
            title="Aucune demande"
            subtitle="Aucun profil ne correspond actuellement à ce filtre."
          />
        </View>

      ) : (

        <View
          style={
            styles.list
          }
        >

          {items.map(
            (item, index) => {

              const statusConfig =
                getStatusConfig(
                  item.status
                );

              const location =
                [
                  item.city,
                  item.region,
                ]
                  .filter(Boolean)
                  .join(' · ');


              return (
                <Pressable
                  key={
                    item.id
                  }
                  onPress={() =>
                    navigation.navigate(
                      'JobRequestDetail',
                      {
                        requestId:
                          item.id,
                      }
                    )
                  }
                  style={({ pressed }) => [
                    styles.profileCard,

                    pressed &&
                      styles.profileCardPressed,
                  ]}
                >

                  {/* ------------------------------------------
                      TOP
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.profileTop
                    }
                  >

                    <View
                      style={
                        styles.avatar
                      }
                    >
                      <Text
                        style={
                          styles.avatarText
                        }
                      >
                        {item.full_name
                          ?.slice(
                            0,
                            1
                          )
                          ?.toUpperCase() ||
                          '?'}
                      </Text>
                    </View>


                    <View
                      style={
                        styles.profileIdentity
                      }
                    >

                      <Text
                        style={[
                          typography.body,
                          styles.profileName,
                        ]}
                        numberOfLines={1}
                      >
                        {item.full_name ||
                          'Profil KmerDiaspora'}
                      </Text>


                      <View
                        style={
                          styles.roleRow
                        }
                      >

                        <Ionicons
                          name="briefcase-outline"
                          size={13}
                          color={
                            colors.brand.primary
                          }
                        />

                        <Text
                          style={[
                            typography.caption,
                            styles.roleText,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title ||
                            'Chauffeur / candidat'}
                        </Text>

                      </View>

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
                      LOCATION
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.locationRow
                    }
                  >

                    <View
                      style={
                        styles.locationIcon
                      }
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.locationContent
                      }
                    >

                      <Text
                        style={[
                          typography.caption,
                          styles.locationLabel,
                        ]}
                      >
                        Localisation
                      </Text>

                      <Text
                        style={[
                          typography.body,
                          styles.locationValue,
                        ]}
                        numberOfLines={1}
                      >
                        {location ||
                          item.country ||
                          'Non renseignée'}
                      </Text>

                    </View>

                  </View>


                  {/* ------------------------------------------
                      MOBILITE
                      ------------------------------------------ */}

                  {item.mobility_area ? (

                    <View
                      style={
                        styles.mobilityRow
                      }
                    >

                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color={
                          colors.text.tertiary
                        }
                      />

                      <Text
                        style={[
                          typography.caption,
                          styles.mobilityText,
                        ]}
                        numberOfLines={1}
                      >
                        Mobilité :{' '}
                        {item.mobility_area}
                      </Text>

                    </View>

                  ) : null}


                  {/* ------------------------------------------
                      FOOTER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.cardFooter
                    }
                  >

                    <View
                      style={[
                        styles.statusBadge,

                        item.status ===
                          'matched' &&
                          styles.statusBadgeMatched,

                        item.status ===
                          'closed' &&
                          styles.statusBadgeClosed,
                      ]}
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


                    <Text
                      style={[
                        typography.caption,
                        styles.viewText,
                      ]}
                    >
                      Voir le profil
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={
                        colors.brand.primary
                      }
                    />

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

      {canCreateJobRequest() ? (

        <Pressable
          onPress={() =>
            navigation.navigate(
              'CreateJobRequest'
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
              styles.createButtonText
            }
          >

            <Text
              style={[
                typography.body,
                styles.createButtonTitle,
              ]}
            >
              Publier une demande
            </Text>

            <Text
              style={[
                typography.caption,
                styles.createButtonSubtitle,
              ]}
            >
              Présentez votre profil aux recruteurs
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

    intro: {
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
       FILTERS
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
       RESULT HEADER
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


    resultBadge: {
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


    resultBadgeText: {
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


    profileCard: {
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


    profileCardPressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    /* ========================================================
       PROFILE TOP
       ======================================================== */

    profileTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    avatar: {
      width:
        46,

      height:
        46,

      borderRadius:
        23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    avatarText: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      fontWeight:
        fontWeights.bold,
    },


    profileIdentity: {
      flex:
        1,

      marginRight:
        spacing.sm,
    },


    profileName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    roleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        3,
    },


    roleText: {
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
       LOCALISATION
       ======================================================== */

    locationRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    locationIcon: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    locationContent: {
      flex:
        1,
    },


    locationLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,
    },


    locationValue: {
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


    mobilityRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.xs,

      paddingLeft:
        38,
    },


    mobilityText: {
      marginLeft:
        5,

      flex:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       CARD FOOTER
       ======================================================== */

    cardFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

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


    statusBadgeMatched: {
      backgroundColor:
        colors.brand.primaryLight,
    },


    statusBadgeClosed: {
      backgroundColor:
        colors.background.default,
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


    viewText: {
      marginLeft:
        'auto',

      marginRight:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
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


    createButtonText: {
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
       AUTRES
       ======================================================== */

    loadingContainer: {
      marginTop:
        spacing.md,

      minHeight:
        140,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    emptyContainer: {
      marginTop:
        spacing.md,
    },


    bottomSpace: {
      height:
        spacing.lg,
    },

  });