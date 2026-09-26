import React from 'react';

import {
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
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
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  KdScreen,
  SectionTitle,
} from './components/KdUI';


const tiles = [
  {
    key: 'jobs',
    title: 'Besoin de position',
    subtitle:
      'Consulter les profils à la recherche d’un poste.',
    icon: 'briefcase-outline',
    route: 'JobRequests',
  },

  {
    key: 'drivers',
    title: 'Besoin de conducteur',
    subtitle:
      'Consulter les missions et rechercher un chauffeur.',
    icon: 'people-outline',
    route: 'DriverRequests',
  },

  {
    key: 'mineJobs',
    title: 'Mes demandes',
    subtitle:
      'Gérer vos publications de poste.',
    icon: 'document-text-outline',
    route: 'MyJobRequests',
  },

  {
    key: 'mineDrivers',
    title: 'Mes missions',
    subtitle:
      'Gérer vos besoins de conducteur.',
    icon: 'layers-outline',
    route: 'MyDriverRequests',
  },
];


export default function KmerDiasporaRecruitmentScreen({
  navigation,
}) {
  const {
    canCreateJobRequest,
    canCreateDriverRequest,
  } = useAuthorization();


  return (
    <KdScreen
      title="Recrutement"
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
            name="briefcase-outline"
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
            Emploi & recrutement
          </Text>

          <Text
            style={[
              typography.caption,
              styles.heroSubtitle,
            ]}
          >
            Trouvez une opportunité ou recherchez les profils les plus pertinents pour votre besoin.
          </Text>

        </View>

      </View>


      {/* ======================================================
          ACCES RAPIDES
          ====================================================== */}

      <SectionTitle
        title="Accès rapides"
        subtitle="Explorez les opportunités et les missions de la communauté."
      />


      <View
        style={
          styles.tiles
        }
      >

        {tiles.map(
          (
            tile,
            index
          ) => (
            <Pressable
              key={
                tile.key
              }
              onPress={() =>
                navigation.navigate(
                  tile.route
                )
              }
              style={({ pressed }) => [
                styles.tile,
                pressed &&
                  styles.tilePressed,
              ]}
            >

              <View
                style={
                  styles.tileTop
                }
              >

                <View
                  style={
                    styles.tileIcon
                  }
                >
                  <Ionicons
                    name={
                      tile.icon
                    }
                    size={19}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>


                <View
                  style={
                    styles.tileArrow
                  }
                >
                  <Ionicons
                    name="arrow-up"
                    size={15}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>

              </View>


              <Text
                style={[
                  typography.body,
                  styles.tileTitle,
                ]}
                numberOfLines={2}
              >
                {tile.title}
              </Text>


              <Text
                style={[
                  typography.caption,
                  styles.tileSubtitle,
                ]}
                numberOfLines={3}
              >
                {tile.subtitle}
              </Text>

            </Pressable>
          )
        )}

      </View>


      {/* ======================================================
          PUBLIER
          ====================================================== */}

      <SectionTitle
        title="Publier"
        subtitle="Créez votre propre demande en quelques étapes."
      />


      <View
        style={
          styles.publishContainer
        }
      >

        {canCreateJobRequest() && (
          <Pressable
            onPress={() =>
              navigation.navigate(
                'CreateJobRequest'
              )
            }
            style={({ pressed }) => [
              styles.primaryAction,

              pressed &&
                styles.actionPressed,
            ]}
          >

            <View
              style={
                styles.actionIcon
              }
            >
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={
                  colors.text.inverse
                }
              />
            </View>


            <View
              style={
                styles.actionContent
              }
            >

              <Text
                style={[
                  typography.body,
                  styles.primaryActionTitle,
                ]}
              >
                Besoin de position
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.primaryActionSubtitle,
                ]}
              >
                Publier votre profil professionnel
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.text.inverse
              }
            />

          </Pressable>
        )}


        {canCreateDriverRequest() && (
          <Pressable
            onPress={() =>
              navigation.navigate(
                'CreateDriverRequest'
              )
            }
            style={({ pressed }) => [
              styles.secondaryAction,

              pressed &&
                styles.actionPressed,
            ]}
          >

            <View
              style={
                styles.secondaryActionIcon
              }
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <View
              style={
                styles.actionContent
              }>

              <Text
                style={[
                  typography.body,
                  styles.secondaryActionTitle,
                ]}
              >
                Mission recruteur
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.secondaryActionSubtitle,
                ]}
              >
                Rechercher un ou plusieurs chauffeurs
              </Text>

            </View>


            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.brand.primary
              }
            />

          </Pressable>
        )}

      </View>


      {/* ======================================================
          EXPLICATION MATCHING
          ====================================================== */}

      <View
        style={
          styles.matchingInfo
        }
      >

        <View
          style={
            styles.matchingIcon
          }
        >
          <Ionicons
            name="sparkles-outline"
            size={17}
            color={
              colors.brand.primary
            }
          />
        </View>


        <View
          style={
            styles.matchingContent
          }
        >

          <Text
            style={[
              typography.body,
              styles.matchingTitle,
            ]}
          >
            Matching intelligent
          </Text>

          <Text
            style={[
              typography.caption,
              styles.matchingText,
            ]}
          >
            Le système classe les profils selon leur pertinence, même lorsqu’ils ne correspondent pas à 100 % au besoin.
          </Text>

        </View>

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

    /* ========================================================
       HERO
       ======================================================== */

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

      lineHeight:
        lineHeights.xs,

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


    /* ========================================================
       TILES
       ======================================================== */

    tiles: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      marginTop:
        spacing.xs,
    },


    tile: {
      width:
        '48.5%',

      minHeight:
        142,

      marginBottom:
        spacing.sm,

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


    tilePressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },


    tileTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    tileIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,
    },


    tileArrow: {
      width:
        28,

      height:
        28,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.default,
    },


    tileTitle: {
      marginTop:
        spacing.sm,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    tileSubtitle: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       PUBLISH
       ======================================================== */

    publishContainer: {
      marginTop:
        spacing.xs,
    },


    primaryAction: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        66,

      padding:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.brand.primary,

      shadowColor:
        '#000',

      shadowOpacity:
        0.08,

      shadowRadius:
        9,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation:
        3,
    },


    secondaryAction: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        66,

      marginTop:
        spacing.sm,

      padding:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.brand.primary,
    },


    actionIcon: {
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


    secondaryActionIcon: {
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


    actionContent: {
      flex:
        1,
    },


    primaryActionTitle: {
      color:
        colors.text.inverse,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    primaryActionSubtitle: {
      marginTop:
        2,

      color:
        'rgba(255,255,255,0.80)',

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    secondaryActionTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    secondaryActionSubtitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    actionPressed: {
      opacity:
        0.80,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    /* ========================================================
       MATCHING
       ======================================================== */

    matchingInfo: {
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


    matchingIcon: {
      width:
        32,

      height:
        32,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    matchingContent: {
      flex:
        1,
    },


    matchingTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    matchingText: {
      marginTop:
        2,

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