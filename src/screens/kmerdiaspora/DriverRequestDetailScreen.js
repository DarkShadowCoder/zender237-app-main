import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  getDriverRequest,
  listMatches,
  updateMyDriverRequest,
  deleteMyDriverRequest,
  recruitMatchedProfile,
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
  SectionTitle,
  KdLoading,
  Button,
  InfoBanner,
} from './components/KdUI';


export default function DriverRequestDetailScreen({
  route,
  navigation,
}) {
  const {
    requestId,
  } = route.params || {};


  const {
    profile,
  } = useAuth();


  const [
    item,
    setItem,
  ] = useState(null);


  const [
    matches,
    setMatches,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    busy,
    setBusy,
  ] = useState(false);


  const [
    recruitingMatchId,
    setRecruitingMatchId,
  ] = useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {

        const driverRequest =
          await getDriverRequest(
            requestId
          );

        setItem(
          driverRequest
        );


        const matchResult =
          await listMatches({
            driverRequestId:
              requestId,

            limit:
              100,
          });


        setMatches(
          matchResult.data ||
            []
        );

      },
      [
        requestId,
      ]
    );


  useEffect(() => {
    let mounted =
      true;

    setLoading(
      true
    );

    load()
      .catch(
        (error) => {

          console.error(
            '[DriverRequestDetail]',
            error
          );

          if (
            mounted
          ) {

            Alert.alert(
              'Erreur',
              error?.message ||
                'Impossible de charger la mission.'
            );
          }
        }
      )
      .finally(() => {

        if (
          mounted
        ) {
          setLoading(
            false
          );
        }

      });

    return () => {
      mounted =
        false;
    };

  }, [
    load,
  ]);


  /* ==========================================================
   * OWNERSHIP
   * ========================================================== */

  const isOwner =
    !!item &&
    !!profile?.id &&
    item.requester_user_id ===
      profile.id;


  /*
   * IMPORTANT :
   * La propriété est la seule condition.
   * Les permissions générales ne doivent pas donner
   * accès à une mission qui appartient à quelqu'un d'autre.
   */
  const canManage =
    isOwner;


  /* ==========================================================
   * CLOTURE
   * ========================================================== */

  const close =
    async () => {

      if (!canManage) {
        return;
      }

      Alert.alert(
        'Clôturer la mission',
        'Voulez-vous vraiment clôturer cette mission ?',
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Clôturer',

            style:
              'destructive',

            onPress:
              async () => {

                setBusy(
                  true
                );

                try {

                  await updateMyDriverRequest({
                    requestId,

                    updates: {
                      status:
                        'closed',
                    },
                  });

                  await load();

                } catch (
                  error
                ) {

                  Alert.alert(
                    'Erreur',
                    error?.message ||
                      'Impossible de clôturer la mission.'
                  );

                } finally {

                  setBusy(
                    false
                  );
                }
              },
          },
        ]
      );
    };


  /* ==========================================================
   * SUPPRESSION
   * ========================================================== */

  const remove =
    async () => {

      if (!canManage) {
        return;
      }

      Alert.alert(
        'Supprimer la mission',
        'Cette action est définitive. Continuer ?',
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Supprimer',

            style:
              'destructive',

            onPress:
              async () => {

                setBusy(
                  true
                );

                try {

                  await deleteMyDriverRequest(
                    requestId
                  );

                  navigation.goBack();

                } catch (
                  error
                ) {

                  Alert.alert(
                    'Erreur',
                    error?.message ||
                      'Impossible de supprimer la mission.'
                  );

                } finally {

                  setBusy(
                    false
                  );
                }
              },
          },
        ]
      );
    };


  /* ==========================================================
   * RECRUTEMENT
   * ========================================================== */

  const recruit =
    async (
      match
    ) => {

      if (!isOwner) {
        Alert.alert(
          'Accès refusé',
          'Seul le créateur de la mission peut recruter un profil.'
        );

        return;
      }


      if (
        recruitingMatchId
      ) {
        return;
      }


      Alert.alert(
        'Recruter ce profil',
        'Le KmAdministrateur recevra les informations de votre mission ainsi que celles du candidat afin de vous mettre en contact. Continuer ?',
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Recruter',

            onPress:
              async () => {

                setRecruitingMatchId(
                  match.id
                );

                try {

                  await recruitMatchedProfile({
                    matchId:
                      match.id,
                  });

                  await load();


                  Alert.alert(
                    'Demande envoyée',
                    'KmAdministrateur a été informé. Il pourra maintenant mettre en contact les deux acteurs.'
                  );

                } catch (
                  error
                ) {

                  console.error(
                    '[Recruitment]',
                    error
                  );

                  Alert.alert(
                    'Impossible de recruter',
                    error?.message ||
                      'La demande de recrutement n’a pas pu être envoyée.'
                  );

                } finally {

                  setRecruitingMatchId(
                    null
                  );
                }
              },
          },
        ]
      );
    };


  /* ==========================================================
   * CITIES
   * ========================================================== */

  const cities =
    Array.isArray(
      item?.cities
    )
      ? item.cities
          .map(
            (entry) =>
              typeof entry ===
              'string'
                ? entry
                : entry?.city
          )
          .filter(Boolean)
      : [];


  const driverCount =
    Number(
      item?.drivers_needed
    ) || 0;


  const location =
    [
      item?.country,
      item?.neighborhood,
    ]
      .filter(Boolean)
      .join(' · ');


  const status =
    item?.status ||
    'open';


  const statusLabel =
    useMemo(
      () => {

        switch (
          status
        ) {

          case 'matched':
            return 'Matchée';

          case 'profile_selected':
            return 'Profil sélectionné';

          case 'recruitment_requested':
            return 'Recrutement demandé';

          case 'closed':
            return 'Clôturée';

          case 'cancelled':
            return 'Annulée';

          default:
            return 'Ouverte';
        }

      },
      [
        status,
      ]
    );


  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <KdLoading
        label="Chargement de la mission…"
      />
    );
  }


  if (!item) {
    return (
      <KdScreen
        title="Détail de la mission"
        scrollView={ScrollView}
      >
        <View
          style={
            styles.notFound
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={
              colors.icon.muted
            }
          />

          <Text
            style={
              styles.notFoundTitle
            }
          >
            Mission introuvable
          </Text>

        </View>
      </KdScreen>
    );
  }


  return (
    <KdScreen
      title="Détail de la mission"
      scrollView={ScrollView}
    >

      {/* ======================================================
          HEADER
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
            name="people-outline"
            size={24}
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
            style={
              styles.heroEyebrow
            }
          >
            BESOIN DE CONDUCTEURS
          </Text>


          <Text
            style={
              styles.heroTitle
            }
          >
            {driverCount}{' '}
            {driverCount > 1
              ? 'chauffeurs'
              : 'chauffeur'}
          </Text>


          <Text
            style={
              styles.heroLocation
            }
          >
            {location ||
              'Localisation non précisée'}
          </Text>


          <View
            style={
              styles.statusPill
            }
          >

            <Text
              style={
                styles.statusText
              }
            >
              {statusLabel}
            </Text>

          </View>

        </View>

      </View>


      {/* ======================================================
          VILLES
          ====================================================== */}

      <SectionTitle
        title="Villes recherchées"
        subtitle="Les demandes de poste publiées dans ces villes sont éligibles au matching."
      />


      <View
        style={
          styles.cityCard
        }
      >

        <View
          style={
            styles.cityWrap
          }
        >

          {cities.map(
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
                  name="location-outline"
                  size={13}
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

      </View>

      {/* ======================================================
          MATCHES
          ====================================================== */}

      <SectionTitle
        title="Profils recommandés"
        subtitle={`${matches.length} profil${matches.length > 1 ? 's' : ''} correspondant${matches.length > 1 ? 's' : ''} à cette mission.`}
      />


      <View
        style={
          styles.matchesContainer
        }
      >

        {matches.length ===
        0 ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <Ionicons
              name="people-outline"
              size={28}
              color={
                colors.icon.muted
              }
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              Aucun profil trouvé
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Aucun candidat n’a actuellement une demande de poste publiée dans les villes recherchées.
            </Text>

          </View>

        ) : (

          matches.map(
            (
              match,
              index
            ) => {

              const request =
                match?.job_request ||
                {};

              const candidate =
                request?.profile ||
                {};

              const name =
                request.full_name ||
                candidate.full_name ||
                candidate.username ||
                'Candidat';


              const candidateCity =
                request.city ||
                candidate.city ||
                'Ville non précisée';


              const title =
                request.title ||
                'Poste recherché';


              const score =
                Number(
                  match.score ??
                  match.match_score ??
                  0
                );


              const alreadyRequested =
                match.status ===
                'recruitment_requested';


              return (
                <View
                  key={
                    match.id ||
                    index
                  }
                  style={
                    styles.matchCard
                  }
                >

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
                        .slice(
                          0,
                          1
                        )
                        .toUpperCase()}
                    </Text>

                  </View>


                  {/* CONTENT */}

                  <View
                    style={
                      styles.matchContent
                    }
                  >

                    <Text
                      style={
                        styles.matchName
                      }
                    >
                      {name}
                    </Text>


                    <Text
                      style={
                        styles.matchTitle
                      }
                    >
                      {title}
                    </Text>


                    <View
                      style={
                        styles.matchLocation
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
                        style={
                          styles.matchLocationText
                        }
                      >
                        {candidateCity}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.scoreRow
                      }
                    >

                      <Text
                        style={
                          styles.scoreText
                        }
                      >
                        {score}% de pertinence
                      </Text>

                    </View>


                    {/* RECRUTER */}

                    {isOwner ? (

                      <Button
                        title={
                          alreadyRequested
                            ? 'Recrutement demandé'
                            : 'Recruter'
                        }

                        loading={
                          recruitingMatchId ===
                          match.id
                        }

                        disabled={
                          alreadyRequested ||
                          recruitingMatchId !==
                            null
                        }

                        onPress={() =>
                          recruit(
                            match
                          )
                        }

                        style={
                          styles.recruitButton
                        }
                      />

                    ) : null}

                  </View>


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
                      #{index + 1}
                    </Text>

                  </View>

                </View>
              );
            }
          )

        )}

      </View>


      {/* ======================================================
          ACTIONS PROPRIETAIRE
          ====================================================== */}

      {isOwner ? (

        <View
          style={
            styles.actions
          }
        >

          {status !==
          'closed' ? (

            <Button
              title="Clôturer la mission"
              variant="outline"
              loading={
                busy
              }
              onPress={
                close
              }
            />

          ) : null}


          <Button
            title="Modifier la mission"
            variant="outline"
            disabled={
              busy
            }
            onPress={() =>
              navigation.navigate(
                'CreateDriverRequest',
                {
                  item,
                }
              )
            }
            style={
              styles.secondaryButton
            }
          />


          <Button
            title="Supprimer la mission"
            variant="danger"
            loading={
              busy
            }
            onPress={
              remove
            }
            style={
              styles.secondaryButton
            }
          />

        </View>

      ) : null}


      <View
        style={
          styles.bottom
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

    hero: {
      flexDirection:
        'row',

      padding:
        spacing.md,

      marginTop:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    heroIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

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
        10,

      fontWeight:
        '800',

      letterSpacing:
        0.7,
    },


    heroTitle: {
      marginTop:
        3,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      fontWeight:
        '800',
    },


    heroLocation: {
      marginTop:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    statusPill: {
      alignSelf:
        'flex-start',

      marginTop:
        spacing.xs,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        5,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    statusText: {
      color:
        colors.brand.primaryDark,

      fontSize:
        10,

      fontWeight:
        '700',
    },


    cityCard: {
      marginTop:
        spacing.xs,

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
    },


    cityWrap: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing.xs,
    },


    cityChip: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        6,

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
        '700',
    },


    matchesContainer: {
      gap:
        spacing.sm,
    },


    matchCard: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

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
    },


    avatar: {
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
        '800',
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

      fontWeight:
        '800',
    },


    matchTitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    matchLocation: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        3,
    },


    matchLocationText: {
      marginLeft:
        3,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    scoreRow: {
      marginTop:
        5,
    },


    scoreText: {
      color:
        colors.brand.primary,

      fontSize:
        11,

      fontWeight:
        '700',
    },


    recruitButton: {
      marginTop:
        spacing.sm,
    },


    rank: {
      marginLeft:
        spacing.xs,
    },


    rankText: {
      color:
        colors.text.tertiary,

      fontSize:
        10,

      fontWeight:
        '700',
    },


    actions: {
      marginTop:
        spacing.md,

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
    },


    secondaryButton: {
      marginTop:
        spacing.sm,
    },


    emptyCard: {
      alignItems:
        'center',

      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    emptyTitle: {
      marginTop:
        spacing.sm,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        '800',
    },


    emptyText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      textAlign:
        'center',
    },


    bottom: {
      height:
        spacing.xl * 2,
    },


    notFound: {
      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,
    },


    notFoundTitle: {
      marginTop:
        spacing.sm,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      fontWeight:
        '700',
    },

  });