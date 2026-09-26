import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  listMatches,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

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
  KdScreen,
  KdEmpty,
  KdLoading,
  KdStatus,
  SectionTitle,
} from './components/KdUI';


export default function MyMatchesScreen({
  navigation,
}) {
  const {
    profile: account,
  } = useAuth();


  const [
    items,
    setItems,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setError(null);

          const result =
            await listMatches({
              limit: 100,
            });

          setItems(
            result.data || []
          );
        } catch (e) {
          setError(e);
          setItems([]);
        }
      },
      []
    );


  useEffect(() => {
    load();
  }, [load]);


  if (items === null) {
    return (
      <KdLoading
        label="Chargement des correspondances…"
      />
    );
  }


  /* ==========================================================
   * MES MATCHINGS
   * ========================================================== */

  const rows =
    items.filter(
      (match) => {
        const recruiterOwner =
          match?.driver_request
            ?.requester_user_id ===
          account?.id;

        const candidateOwner =
          match?.job_request
            ?.profile
            ?.user_id ===
          account?.id;

        return (
          recruiterOwner ||
          candidateOwner
        );
      }
    );


  /* ==========================================================
   * STATUS
   * ========================================================== */

  const getStatusConfig =
    (matchStatus) => {
      switch (
        matchStatus
      ) {
        case 'selected':
          return {
            label:
              'Profil sélectionné',
            icon:
              'checkmark-circle-outline',
          };

        case 'contact_initiated':
          return {
            label:
              'Contact initié',
            icon:
              'logo-whatsapp',
          };

        case 'accepted':
          return {
            label:
              'Acceptée',
            icon:
              'checkmark-done-outline',
          };

        case 'rejected':
          return {
            label:
              'Refusée',
            icon:
              'close-circle-outline',
          };

        default:
          return {
            label:
              'Correspondance',
            icon:
              'sparkles-outline',
          };
      }
    };


  return (
    <KdScreen
      title="Mes correspondances"
      scrollView={ScrollView}
    >

      {/* ======================================================
          HERO
          ====================================================== */}

      <View
        style={
          styles.hero
        }
      >

        <View
          style={
            styles.heroIcon
          }
        >
          <Ionicons
            name="git-network-outline"
            size={22}
            color={
              colors.brand.primary
            }
          />
        </View>


        <View
          style={
            styles.heroContent
          }
        >

          <Text
            style={[
              typography.caption,
              styles.heroEyebrow,
            ]}
          >
            KMERDIASPORA
          </Text>

          <Text
            style={[
              typography.h2,
              styles.heroTitle,
            ]}
          >
            Mes correspondances
          </Text>

          <Text
            style={[
              typography.caption,
              styles.heroSubtitle,
            ]}
          >
            Retrouvez ici les profils et missions liés à votre activité.
          </Text>

        </View>

      </View>


      {/* ======================================================
          ERROR
          ====================================================== */}

      {error ? (

        <View
          style={
            styles.errorCard
          }
        >

          <View
            style={
              styles.errorIcon
            }
          >
            <Ionicons
              name="warning-outline"
              size={17}
              color={
                colors.error.default
              }
            />
          </View>


          <Text
            style={[
              typography.caption,
              styles.errorText,
            ]}
          >
            {error.message ||
              'Impossible de charger les correspondances.'}
          </Text>

        </View>

      ) : null}


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
            Vos matchings
          </Text>

          <Text
            style={[
              typography.caption,
              styles.resultsCount,
            ]}
          >
            {rows.length}{' '}
            {rows.length > 1
              ? 'correspondances'
              : 'correspondance'}
          </Text>
        </View>


        {rows.length > 0 ? (
          <View
            style={
              styles.resultsBadge
            }
          >

            <Ionicons
              name="sparkles-outline"
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
              Matching
            </Text>

          </View>
        ) : null}

      </View>


      {/* ======================================================
          EMPTY
          ====================================================== */}

      {!rows.length ? (

        <View
          style={
            styles.emptyContainer
          }
        >

          <KdEmpty
            icon="git-network-outline"
            title="Aucune correspondance"
            subtitle="Les nouvelles correspondances apparaîtront ici lorsqu'un matching sera disponible."
          />

        </View>

      ) : (

        /* ====================================================
           MATCH LIST
           ==================================================== */

        <View
          style={
            styles.matchList
          }
        >

          {rows.map(
            (
              match,
              index
            ) => {

              const score =
                Math.round(
                  Number(
                    match.score ??
                    match.match_score ??
                    0
                  )
                );


              const job =
                match.job_request;


              const profile =
                job?.profile;


              const mission =
                match.driver_request;


              const rawCities =
                mission?.cities ||
                [];


              /*
               * Normalisation :
               * ['Douala']
               * ou [{ city: 'Douala' }]
               */
              const cities =
                Array.isArray(
                  rawCities
                )
                  ? rawCities
                      .map(
                        (entry) => {
                          if (
                            typeof entry ===
                            'string'
                          ) {
                            return entry;
                          }

                          if (
                            entry &&
                            typeof entry ===
                            'object'
                          ) {
                            return (
                              entry.city ||
                              null
                            );
                          }

                          return null;
                        }
                      )
                      .filter(Boolean)
                  : [];


              const location =
                job
                  ? [
                      job.city,
                      job.region,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : (
                      cities.length
                        ? cities.join(
                            ' · '
                          )
                        : mission?.city ||
                          'Ville non précisée'
                    );


              const title =
                job?.title ||
                'Conducteur';


              const name =
                job?.full_name ||
                profile?.full_name ||
                'Correspondance';


              const statusConfig =
                getStatusConfig(
                  match.status
                );


              return (
                <Pressable
                  key={
                    match.id
                  }
                  onPress={() =>
                    navigation.navigate(
                      'MatchDetail',
                      {
                        matchId:
                          match.id,
                      }
                    )
                  }
                  style={({ pressed }) => [
                    styles.matchCard,

                    pressed &&
                      styles.matchCardPressed,
                  ]}
                >

                  {/* RANG */}

                  <View
                    style={
                      styles.rank
                    }
                  >
                    <Text
                      style={
                        styles.rankText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>


                  {/* AVATAR */}

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
                      {name
                        ?.slice(
                          0,
                          1
                        )
                        ?.toUpperCase() ||
                        '?'}
                    </Text>
                  </View>


                  {/* INFORMATION */}

                  <View
                    style={
                      styles.matchContent
                    }
                  >

                    <Text
                      style={[
                        typography.body,
                        styles.matchName,
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>


                    <Text
                      style={[
                        typography.caption,
                        styles.matchRole,
                      ]}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>


                    <View
                      style={
                        styles.locationRow
                      }
                    >

                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={
                          colors.text.tertiary
                        }
                      />

                      <Text
                        style={[
                          typography.caption,
                          styles.locationText,
                        ]}
                        numberOfLines={1}
                      >
                        {location}
                      </Text>

                    </View>

                  </View>


                  {/* SCORE */}

                  <View
                    style={
                      styles.scoreColumn
                    }
                  >

                    <View
                      style={
                        styles.scoreBadge
                      }
                    >

                      <Text
                        style={
                          styles.scoreValue
                        }
                      >
                        {score}
                      </Text>

                      <Text
                        style={
                          styles.scorePercent
                        }
                      >
                        %
                      </Text>

                    </View>

                    <Text
                      style={
                        styles.scoreLabel
                      }
                    >
                      compatibilité
                    </Text>

                  </View>


                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      colors.icon.muted
                    }
                  />

                </Pressable>
              );
            }
          )}

        </View>
      )}


      {/* ======================================================
          INFO
          ====================================================== */}

      <View
        style={
          styles.infoBox
        }
      >

        <View
          style={
            styles.infoIcon
          }
        >
          <Ionicons
            name="sparkles-outline"
            size={15}
            color={
              colors.brand.primary
            }
          />
        </View>

        <Text
          style={[
            typography.caption,
            styles.infoText,
          ]}
        >
          Le score permet de classer les profils selon leur pertinence. Une correspondance partielle peut être proposée.
        </Text>

      </View>


      <View
        style={
          styles.bottomSpace
        }
      />

    </KdScreen>
  );
}


const styles =
  StyleSheet.create({

    hero: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.brand.primaryLight,

      borderWidth:
        1,

      borderColor:
        colors.brand.primaryLight,
    },


    heroIcon: {
      width:
        44,

      height:
        44,

      borderRadius:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    heroContent: {
      flex:
        1,
    },


    heroEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.8,
    },


    heroTitle: {
      marginTop:
        2,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    heroSubtitle: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    errorCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.error.light,

      borderWidth:
        1,

      borderColor:
        colors.error.default,
    },


    errorIcon: {
      marginRight:
        spacing.sm,
    },


    errorText: {
      flex:
        1,

      color:
        colors.error.text,
    },


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


    matchList: {
      gap:
        spacing.sm,
    },


    matchCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        78,

      padding:
        spacing.sm,

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
        8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation:
        2,
    },


    matchCardPressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    rank: {
      width:
        21,

      alignItems:
        'center',

      marginRight:
        spacing.xs,
    },


    rankText: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,
    },


    avatar: {
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


    avatarText: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.md,

      fontWeight:
        fontWeights.bold,
    },


    matchContent: {
      flex:
        1,

      minWidth:
        0,
    },


    matchName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    matchRole: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    locationRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        3,
    },


    locationText: {
      flex:
        1,

      marginLeft:
        3,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    scoreColumn: {
      alignItems:
        'center',

      marginLeft:
        spacing.xs,

      marginRight:
        spacing.xs,
    },


    scoreBadge: {
      flexDirection:
        'row',

      alignItems:
        'baseline',

      justifyContent:
        'center',

      minWidth:
        49,

      paddingHorizontal:
        6,

      paddingVertical:
        5,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primaryLight,
    },


    scoreValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.bold,
    },


    scorePercent: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,
    },


    scoreLabel: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        8,

      lineHeight:
        10,

      textAlign:
        'center',
    },


    infoBox: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop:
        spacing.lg,

      padding:
        spacing.sm,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.background.default,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    infoIcon: {
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


    infoText: {
      flex:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
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