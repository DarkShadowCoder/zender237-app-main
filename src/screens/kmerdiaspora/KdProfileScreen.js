import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
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
  fontWeights,
  lineHeights,
} from '../../theme/theme';

import {
  getMyKdProfile,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  KdScreen,
  Card,
  SectionTitle,
  KdLoading,
  Button,
  InfoBanner,
} from './components/KdUI';
import { ImageBackground } from 'expo-image';


export default function KdProfileScreen({
  navigation,
}) {
  const {
    profile: account,
  } = useAuth();


  const [
    p,
    setP,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const load =
    useCallback(
      async () => {
        setP(
          await getMyKdProfile()
        );
      },
      []
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


  if (loading) {
    return (
      <KdLoading
        label="Chargement du profil KmerDiaspora…"
      />
    );
  }


  /* ============================================================
   * DONNEES DERIVEES
   * ============================================================ */

  const phone =
    account?.whatsapp_number ||
    p?.phone_number ||
    '—';


  const profileType =
    p?.profile_type === 'both'
      ? 'Conducteur & recruteur'
      : p?.profile_type === 'driver'
        ? 'Conducteur'
        : 'Recruteur';


  const initial =
    p?.full_name
      ?.slice(0, 1)
      ?.toUpperCase() ||
    '?';


  const residence =
    [
      p?.residence_country,
      p?.region,
    ]
      .filter(Boolean)
      .join(' · ');


  const location =
    p?.city ||
    'Ville non renseignée';


  const neighborhood =
    p?.neighborhood ||
    'Quartier non renseigné';


  const mobility =
    p?.mobility_area ||
    'Zone de mobilité non renseignée';


  const bio =
    p?.bio ||
    'Aucune présentation disponible.';
  
    const KM_BACKGROUND =
  require('../../../assets/images/KmBackground.png');


  return (
    <ImageBackground
      source={KM_BACKGROUND}
      style={styles.root}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
    <KdScreen
      title="Mon profil KmerDiaspora"
      scrollView={ScrollView}
    >
      
      {/* ======================================================
          ETAT VIDE
          ====================================================== */}

      {!p ? (

        <View
          style={
            styles.emptyWrapper
          }
        >

          <View
            style={
              styles.emptyCard
            }
          >

            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="person-add-outline"
                size={27}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <Text
              style={[
                typography.h2,
                styles.emptyTitle,
              ]}
            >
              Créez votre profil professionnel
            </Text>


            <Text
              style={[
                typography.body,
                styles.emptyText,
              ]}
            >
              Votre profil permet au moteur de matching de vous proposer aux recruteurs dont les besoins correspondent le mieux à votre expérience.
            </Text>


            <View
              style={
                styles.emptyBenefits
              }
            >

              <View
                style={
                  styles.emptyBenefit
                }
              >
                <View
                  style={
                    styles.emptyBenefitIcon
                  }
                >
                  <Ionicons
                    name="search-outline"
                    size={15}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>

                <Text
                  style={[
                    typography.caption,
                    styles.emptyBenefitText,
                  ]}
                >
                  Soyez visible dans les recherches.
                </Text>
              </View>


              <View
                style={
                  styles.emptyBenefit
                }
              >
                <View
                  style={
                    styles.emptyBenefitIcon
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
                    styles.emptyBenefitText,
                  ]}
                >
                  Recevez des correspondances pertinentes.
                </Text>
              </View>


              <View
                style={
                  styles.emptyBenefit
                }
              >
                <View
                  style={
                    styles.emptyBenefitIcon
                  }
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={15}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>

                <Text
                  style={[
                    typography.caption,
                    styles.emptyBenefitText,
                  ]}
                >
                  Présentez votre expérience aux recruteurs.
                </Text>
              </View>

            </View>


            <Button
              title="Créer mon profil"
              onPress={() =>
                navigation.navigate(
                  'EditKdProfile'
                )
              }
              style={
                styles.primaryButton
              }
            />

          </View>

        </View>

      ) : (

        /* ====================================================
           PROFIL EXISTANT
           ==================================================== */

        <>

          {/* ==================================================
              CARTE PRINCIPALE DU PROFIL
              ================================================== */}

          <View
            style={
              styles.profileHero
            }
          >

            <View
              style={
                styles.profileHeroTop
              }
            >

              <View
                style={
                  styles.avatar
                }
              >
                <Text
                  style={
                    styles.initial
                  }
                >
                  {initial}
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
                  {p.full_name}
                </Text>


                <View
                  style={
                    styles.profileRoleRow
                  }
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={14}
                    color={
                      colors.brand.primary
                    }
                  />

                  <Text
                    style={[
                      typography.caption,
                      styles.profileRole,
                    ]}
                  >
                    {profileType}
                  </Text>
                </View>

              </View>

            </View>


            {/* STATUS */}

            <View
              style={
                styles.profileStatusRow
              }
            >

              <View
                style={
                  styles.statusDot
                }
              />

              <Text
                style={[
                  typography.caption,
                  styles.statusText,
                ]}
              >
                Profil actif sur KmerDiaspora
              </Text>

            </View>

          </View>


          {/* ==================================================
              INFORMATIONS
              ================================================== */}

          <SectionTitle
            title="Informations professionnelles"
          />


          <View
            style={
              styles.infoGrid
            }
          >

            {/* RESIDENCE */}

            <View
              style={
                styles.infoCard
              }
            >

              <View
                style={
                  styles.infoIcon
                }
              >
                <Ionicons
                  name="home-outline"
                  size={16}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.infoBody
                }
              >

                <Text
                  style={[
                    typography.caption,
                    styles.infoLabel,
                  ]}
                >
                  Résidence
                </Text>

                <Text
                  style={[
                    typography.body,
                    styles.infoValue,
                  ]}
                  numberOfLines={2}
                >
                  {residence ||
                    'Non renseignée'}
                </Text>

              </View>

            </View>


            {/* VILLE */}

            <View
              style={
                styles.infoCard
              }
            >

              <View
                style={
                  styles.infoIcon
                }
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.infoBody
                }
              >

                <Text
                  style={[
                    typography.caption,
                    styles.infoLabel,
                  ]}
                >
                  Ville
                </Text>

                <Text
                  style={[
                    typography.body,
                    styles.infoValue,
                  ]}
                  numberOfLines={2}
                >
                  {location}
                </Text>

              </View>

            </View>


            {/* QUARTIER */}

            <View
              style={
                styles.infoCard
              }
            >

              <View
                style={
                  styles.infoIcon
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={16}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.infoBody
                }
              >

                <Text
                  style={[
                    typography.caption,
                    styles.infoLabel,
                  ]}
                >
                  Quartier
                </Text>

                <Text
                  style={[
                    typography.body,
                    styles.infoValue,
                  ]}
                  numberOfLines={2}
                >
                  {neighborhood}
                </Text>

              </View>

            </View>


            {/* TELEPHONE */}

            <View
              style={
                styles.infoCard
              }
            >

              <View
                style={
                  styles.infoIcon
                }
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.infoBody
                }
              >

                <Text
                  style={[
                    typography.caption,
                    styles.infoLabel,
                  ]}
                >
                  Téléphone
                </Text>

                <Text
                  style={[
                    typography.body,
                    styles.infoValue,
                  ]}
                  numberOfLines={1}
                >
                  {phone}
                </Text>

              </View>

            </View>

          </View>


          {/* ==================================================
              ZONE DE MOBILITE
              ================================================== */}

          <View
            style={
              styles.sectionCard
            }
          >

            <View
              style={
                styles.sectionCardHeader
              }>

              <View
                style={
                  styles.sectionCardIcon
                }
              >
                <Ionicons
                  name="map-outline"
                  size={17}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.sectionCardHeaderText
                }
              >

                <Text
                  style={[
                    typography.body,
                    styles.sectionCardTitle,
                  ]}
                >
                  Zone de mobilité
                </Text>

                <Text
                  style={[
                    typography.caption,
                    styles.sectionCardSubtitle,
                  ]}
                >
                  Où êtes-vous disponible ?
                </Text>

              </View>

            </View>


            <Text
              style={[
                typography.body,
                styles.sectionCardValue,
              ]}
            >
              {mobility}
            </Text>

          </View>


          {/* ==================================================
              PRESENTATION
              ================================================== */}

          <View
            style={
              styles.sectionCard
            }
          >

            <View
              style={
                styles.sectionCardHeader
              }>

              <View
                style={
                  styles.sectionCardIcon
                }
              >
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.sectionCardHeaderText
                }
              >

                <Text
                  style={[
                    typography.body,
                    styles.sectionCardTitle,
                  ]}
                >
                  Présentation
                </Text>

                <Text
                  style={[
                    typography.caption,
                    styles.sectionCardSubtitle,
                  ]}
                >
                  Votre profil professionnel
                </Text>

              </View>

            </View>


            <Text
              style={[
                typography.body,
                styles.bioText,
              ]}
            >
              {bio}
            </Text>

          </View>


          {/* ==================================================
              EDITION
              ================================================== */}

          <Button
            title="Modifier mon profil"
            variant="outline"
            onPress={() =>
              navigation.navigate(
                'EditKdProfile',
                {
                  profile: p,
                }
              )
            }
            style={
              styles.editButton
            }
          />


          <Text
            style={[
              typography.caption,
              styles.bottomHint,
            ]}
          >
            Gardez votre profil à jour pour améliorer la pertinence des correspondances proposées aux recruteurs.
          </Text>

        </>

      )}
    
    </KdScreen>
    </ImageBackground>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       EMPTY
       ======================================================== */
    root: {
      flex: 1,
      backgroundColor:
        colors.background?.default ||
        '#F5F7FB',
    },
    emptyWrapper: {
      marginTop:
        spacing.lg,
    },


    emptyCard: {
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

      shadowColor:
        '#000',

      shadowOpacity:
        0.06,

      shadowRadius:
        10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 2,
    },


    emptyIcon: {
      width:
        56,

      height:
        56,

      borderRadius:
        radii.circle,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.md,
    },


    emptyTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    emptyText: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.md,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    emptyBenefits: {
      gap:
        spacing.sm,

      marginBottom:
        spacing.lg,
    },


    emptyBenefit: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    emptyBenefitIcon: {
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


    emptyBenefitText: {
      flex:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    primaryButton: {
      marginTop:
        spacing.xs,
    },


    /* ========================================================
       PROFIL HERO
       ======================================================== */

    profileHero: {
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

      shadowColor:
        '#000',

      shadowOpacity:
        0.07,

      shadowRadius:
        11,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      elevation: 3,
    },


    profileHeroTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    avatar: {
      width:
        62,

      height:
        62,

      borderRadius:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primary,

      marginRight:
        spacing.md,
    },


    initial: {
      color:
        colors.text.inverse,

      fontSize:
        25,

      lineHeight:
        29,

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


    profileRoleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.xs,
    },


    profileRole: {
      marginLeft:
        4,

      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    profileStatusRow: {
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


    statusDot: {
      width:
        8,

      height:
        8,

      borderRadius:
        4,

      backgroundColor:
        colors.success.default,

      marginRight:
        spacing.xs,
    },


    statusText: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       INFO GRID
       ======================================================== */

    infoGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      marginTop:
        spacing.xs,
    },


    infoCard: {
      width:
        '48.5%',

      minHeight:
        82,

      padding:
        spacing.sm,

      marginBottom:
        spacing.sm,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.background.surface,

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

      marginBottom:
        spacing.xs,
    },


    infoBody: {
      flex:
        1,
    },


    infoLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,
    },


    infoValue: {
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
       SECTION CARD
       ======================================================== */

    sectionCard: {
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


    sectionCardHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.sm,
    },


    sectionCardIcon: {
      width:
        34,

      height:
        34,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    sectionCardHeaderText: {
      flex:
        1,
    },


    sectionCardTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    sectionCardSubtitle: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    sectionCardValue: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    bioText: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
       BUTTON
       ======================================================== */

    editButton: {
      marginTop:
        spacing.lg,
    },


    bottomHint: {
      marginTop:
        spacing.sm,

      marginHorizontal:
        spacing.md,

      marginBottom:
        spacing.lg,

      textAlign:
        'center',

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

  });