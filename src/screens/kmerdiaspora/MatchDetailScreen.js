import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
  Linking,
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
  getMatch,
  selectMatch,
  markMatchContactInitiated,
  getKmAdministrator,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  KdScreen,
  SectionTitle,
  KdLoading,
  KdStatus,
  Button,
  InfoBanner,
} from './components/KdUI';


export default function MatchDetailScreen({
  route,
  navigation,
}) {
  const {
    profile,
  } = useAuth();


  const {
    matchId,
  } = route.params || {};


  const [
    m,
    setM,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    busy,
    setBusy,
  ] = useState(false);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        setM(
          await getMatch(
            matchId
          )
        );
      },
      [matchId]
    );


  useEffect(() => {
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
   * DONNEES
   * ========================================================== */

  const score =
    Math.round(
      Number(
        m?.score ??
        m?.match_score ??
        0
      )
    );


  const owner =
    m?.driver_request
      ?.requester_user_id ===
    profile?.id;


  const cities =
    useMemo(() => {
      const raw =
        m?.driver_request
          ?.cities || [];

      if (!Array.isArray(raw)) {
        return [];
      }

      return raw
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
        .filter(Boolean);
    }, [m]);


  /* ==========================================================
   * WHATSAPP
   * ========================================================== */

  const openWhatsApp =
    async () => {
      setBusy(true);

      try {
        const admin =
          await getKmAdministrator();


        const phone =
          String(
            admin.whatsapp_admin_number
          ).replace(
            /[^0-9]/g,
            ''
          );


        if (!phone) {
          throw new Error(
            'Le numéro WhatsApp de KmAdministrateur n’est pas configuré.'
          );
        }


        const text =
          encodeURIComponent(
            `Bonjour KmAdministrateur, je souhaite activer la mise en relation pour la mission ${m.driver_request_id} avec le profil ${m.job_request?.full_name || m.job_request_id}.`
          );


        const url =
          `https://wa.me/${phone}?text=${text}`;


        const can =
          await Linking.canOpenURL(
            url
          );


        if (!can) {
          throw new Error(
            'WhatsApp n’est pas disponible sur cet appareil.'
          );
        }


        await Linking.openURL(
          url
        );


        await markMatchContactInitiated(
          matchId
        );


        await load();

      } catch (e) {
        Alert.alert(
          'WhatsApp',
          e.message
        );
      } finally {
        setBusy(false);
      }
    };


  /* ==========================================================
   * SELECTION
   * ========================================================== */

  const select =
    async () => {
      setBusy(true);

      try {
        await selectMatch({
          matchId,
        });


        Alert.alert(
          'Profil sélectionné',
          'Le profil a été sélectionné. Vous pouvez maintenant contacter KmAdministrateur sur WhatsApp.'
        );


        await load();

      } catch (e) {
        Alert.alert(
          'Sélection impossible',
          e.message
        );
      } finally {
        setBusy(false);
      }
    };


  if (loading) {
    return (
      <KdLoading
        label="Chargement de la correspondance…"
      />
    );
  }


  if (!m) {
    return null;
  }


  const profileData =
    m.job_request
      ?.profile;


  const mission =
    m.driver_request;


  const job =
    m.job_request;


  const statusText =
    m.status ===
      'selected'
      ? 'Profil sélectionné par le recruteur.'
      : m.status ===
          'contact_initiated'
        ? 'La mise en relation a été initiée via WhatsApp avec KmAdministrateur.'
        : m.status ===
            'matched'
          ? 'Correspondance trouvée par le moteur de matching.'
          : 'Correspondance proposée au recruteur.';


  return (
    <KdScreen
      title="Correspondance"
      scrollView={ScrollView}
    >

      {/* ======================================================
          SCORE HERO
          ====================================================== */}

      <View
        style={
          styles.scoreHero
        }
      >

        <View
          style={
            styles.scoreHeroContent
          }
        >

          <Text
            style={[
              typography.caption,
              styles.scoreEyebrow,
            ]}
          >
            COMPATIBILITÉ
          </Text>


          <View
            style={
              styles.scoreRow
            }
          >

            <Text
              style={[
                typography.h1,
                styles.score,
              ]}
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
            style={[
              typography.caption,
              styles.scoreDescription,
            ]}
          >
            Niveau de pertinence du profil pour cette mission
          </Text>

        </View>


        <View
          style={
            styles.scoreIcon
          }
        >
          <Ionicons
            name="git-network-outline"
            size={27}
            color={
              colors.brand.primary
            }
          />
        </View>

      </View>


      {/* ======================================================
          INFO MATCHING
          ====================================================== */}

      <InfoBanner
        icon="information-circle-outline"
        text="Le score sert à classer les profils. Une compatibilité partielle peut être proposée au recruteur."
      />


      {/* ======================================================
          MISSION
          ====================================================== */}

      <SectionTitle
        title="Mission"
      />


      <View
        style={
          styles.missionCard
        }
      >

        <View
          style={
            styles.sectionTop
          }
        >

          <View
            style={
              styles.sectionIcon
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
              styles.sectionTopContent
            }
          >

            <Text
              style={[
                typography.caption,
                styles.sectionEyebrow,
              ]}
            >
              BESOIN DE CONDUCTEUR
            </Text>

            <Text
              style={[
                typography.h3,
                styles.sectionTitle,
              ]}
            >
              {mission?.drivers_needed ||
                0}{' '}
              {Number(
                mission?.drivers_needed
              ) > 1
                ? 'chauffeurs'
                : 'chauffeur'}
            </Text>

          </View>

        </View>


        {/* VILLES */}

        {cities.length > 0 ? (

          <View
            style={
              styles.cityWrap
            }
          >

            {cities.map(
              (city) => (
                <View
                  key={city}
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


        {/* QUARTIER */}

        {mission?.neighborhood ? (

          <View
            style={
              styles.metaRow
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
              style={
                styles.metaText
              }
            >
              {mission.neighborhood}
            </Text>

          </View>

        ) : null}


        {/* STATUS */}

        <View
          style={
            styles.statusRow
          }
        >
          <KdStatus
            status={
              mission?.status
            }
          />
        </View>

      </View>


      {/* ======================================================
          PROFIL
          ====================================================== */}

      <SectionTitle
        title="Profil proposé"
      />


      <View
        style={
          styles.profileCard
        }
      >

        <View
          style={
            styles.profileHeader
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
              {(
                job?.full_name ||
                'P'
              )
                .slice(
                  0,
                  1
                )
                .toUpperCase()}
            </Text>
          </View>


          <View
            style={
              styles.profileIdentity
            }
          >

            <Text
              style={[
                typography.h2,
                styles.profileName,
              ]}
              numberOfLines={2}
            >
              {job?.full_name ||
                'Profil'}
            </Text>

            <Text
              style={[
                typography.caption,
                styles.profileRole,
              ]}
            >
              {job?.title ||
                'Conducteur'}
            </Text>

          </View>

        </View>


        {/* LOCALISATION */}

        <View
          style={
            styles.profileMeta
          }
        >

          <View
            style={
              styles.profileMetaItem
            }
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={
                colors.brand.primary
              }
            />

            <Text
              style={
                styles.profileMetaText
              }
              numberOfLines={1}
            >
              {[
                job?.city,
                job?.region,
              ]
                .filter(Boolean)
                .join(' · ') ||
                'Localisation non précisée'}
            </Text>
          </View>


          <View
            style={
              styles.profileMetaItem
            }
          >
            <Ionicons
              name="navigate-outline"
              size={14}
              color={
                colors.brand.primary
              }
            />

            <Text
              style={
                styles.profileMetaText
              }
              numberOfLines={2}
            >
              Zone de mobilité :{' '}
              {job?.mobility_area ||
                'Non précisée'}
            </Text>
          </View>

        </View>


        {/* DESCRIPTION */}

        <View
          style={
            styles.profileDescription
          }
        >

          <Text
            style={[
              typography.caption,
              styles.descriptionLabel,
            ]}
          >
            Présentation
          </Text>

          <Text
            style={[
              typography.body,
              styles.descriptionText,
            ]}
          >
            {job?.description ||
              profileData?.bio ||
              'Aucune présentation supplémentaire.'}
          </Text>

        </View>

      </View>


      {/* ======================================================
          ETAT DE LA MISE EN RELATION
          ====================================================== */}

      <SectionTitle
        title="État de la mise en relation"
      />


      <View
        style={
          styles.stateCard
        }
      >

        <View
          style={
            styles.stateHeader
          }
        >

          <View
            style={
              styles.stateIcon
            }
          >
            <Ionicons
              name={
                m.status ===
                  'contact_initiated'
                  ? 'logo-whatsapp'
                  : 'git-network-outline'
              }
              size={18}
              color={
                colors.brand.primary
              }
            />
          </View>


          <View
            style={
              styles.stateContent
            }
          >

            <Text
              style={[
                typography.body,
                styles.stateTitle,
              ]}
            >
              État actuel
            </Text>

            <Text
              style={[
                typography.caption,
                styles.stateDescription,
              ]}
            >
              {statusText}
            </Text>

          </View>

        </View>


        <View
          style={
            styles.stateStatus
          }
        >
          <KdStatus
            status={
              m.status
            }
          />
        </View>

      </View>


      {/* ======================================================
          ACTIONS RECRUTEUR
          ====================================================== */}

      {owner &&
      m.status !==
        'selected' &&
      m.status !==
        'contact_initiated' ? (

        <Button
          title="Sélectionner ce profil"
          onPress={
            select
          }
          loading={
            busy
          }
          style={
            styles.actionButton
          }
        />

      ) : null}


      {owner &&
      [
        'selected',
        'contact_initiated',
      ].includes(
        m.status
      ) ? (

        <Button
          title="Ouvrir WhatsApp avec KmAdministrateur"
          onPress={
            openWhatsApp
          }
          loading={
            busy
          }
          style={
            styles.actionButton
          }
        />

      ) : null}


      {/* ======================================================
          FOOTER
          ====================================================== */}

      {owner ? (

        <View
          style={
            styles.whatsappInfo
          }
        >

          <View
            style={
              styles.whatsappIcon
            }
          >
            <Ionicons
              name="logo-whatsapp"
              size={16}
              color={
                colors.brand.primary
              }
            />
          </View>

          <Text
            style={[
              typography.caption,
              styles.whatsappText,
            ]}
          >
            La mise en relation passe par KmAdministrateur sur WhatsApp. Le numéro du chauffeur n'est pas directement exposé.
          </Text>

        </View>

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

    scoreHero: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

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


    scoreHeroContent: {
      flex:
        1,
    },


    scoreEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.7,
    },


    scoreRow: {
      flexDirection:
        'row',

      alignItems:
        'baseline',

      marginTop:
        1,
    },


    score: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.xxl,

      lineHeight:
        lineHeights.xxl,

      fontWeight:
        fontWeights.bold,
    },


    scorePercent: {
      marginLeft:
        3,

      color:
        colors.brand.primary,

      fontSize:
        fontSizes.lg,

      fontWeight:
        fontWeights.bold,
    },


    scoreDescription: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    scoreIcon: {
      width:
        54,

      height:
        54,

      borderRadius:
        27,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.surface,
    },


    /* ========================================================
       MISSION
       ======================================================== */

    missionCard: {
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


    sectionTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    sectionIcon: {
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
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    sectionTopContent: {
      flex:
        1,
    },


    sectionEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    sectionTitle: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


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


    metaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.sm,
    },


    metaText: {
      marginLeft:
        spacing.xs,

      flex:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    statusRow: {
      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    /* ========================================================
       PROFILE
       ======================================================== */

    profileCard: {
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


    profileHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    avatar: {
      width:
        52,

      height:
        52,

      borderRadius:
        26,

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
    },


    profileName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    profileRole: {
      marginTop:
        2,

      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    profileMeta: {
      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,

      gap:
        spacing.xs,
    },


    profileMetaItem: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    profileMetaText: {
      flex:
        1,

      marginLeft:
        5,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    profileDescription: {
      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    descriptionLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    descriptionText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
       STATE
       ======================================================== */

    stateCard: {
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


    stateHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    stateIcon: {
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
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    stateContent: {
      flex:
        1,
    },


    stateTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    stateDescription: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    stateStatus: {
      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    /* ========================================================
       ACTIONS
       ======================================================== */

    actionButton: {
      marginTop:
        spacing.lg,
    },


    whatsappInfo: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    whatsappIcon: {
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
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    whatsappText: {
      flex:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    bottomSpace: {
      height:
        spacing.lg,
    },

  });