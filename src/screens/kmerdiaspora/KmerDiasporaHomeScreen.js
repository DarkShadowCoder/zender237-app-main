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
  ImageBackground,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

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
  getMyKdProfile,
} from '../../services/kmerDiasporaService';

import {
  Card,
  KdListRow,
  KdLoading,
} from './components/KdUI';


/**
 * Background principal KmerDiaspora
 */
const KM_BACKGROUND =
  require('../../../assets/images/KmBackground.png');


export default function KmerDiasporaHomeScreen({
  navigation,
}) {
  const {
    canCreateJobRequest,
    canCreateDriverRequest,
    canCreateQuest,
  } = useAuthorization();


  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);


  const load =
    useCallback(
      async () => {
        const p =
          await getMyKdProfile();

        setProfile(p);
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


  /*
   * ----------------------------------------------------------
   * ACTIONS PRINCIPALES
   * ----------------------------------------------------------
   */
  const actions = [
    canCreateJobRequest() && {
      key: 'job',

      title:
        'Besoin de position',

      subtitle:
        'Chercher un emploi / chauffeur',

      icon:
        'briefcase-outline',

      onPress: () =>
        navigation.navigate(
          'CreateJobRequest'
        ),
    },

    canCreateDriverRequest() && {
      key: 'driver',

      title:
        'Besoin de conducteur',

      subtitle:
        'Publier une mission',

      icon:
        'people-outline',

      onPress: () =>
        navigation.navigate(
          'CreateDriverRequest'
        ),
    },

    canCreateQuest() && {
      key: 'quest',

      title:
        'Quêtes',

      subtitle:
        'Soutenir ou proposer une quête',

      icon:
        'heart-outline',

      onPress: () =>
        navigation.navigate(
          'Quests'
        ),
    },

  ].filter(Boolean);


  /*
   * ----------------------------------------------------------
   * ACTIVITES
   * ----------------------------------------------------------
   */
  const activities = [
    {
      key: 'publications',

      title:
        'Mes publications',

      icon:
        'document-text-outline',

      onPress: () =>
        navigation.navigate(
          'MyJobRequests'
        ),
    },

    {
      key: 'quests',

      title:
        'Mes quêtes',

      icon:
        'heart-outline',

      onPress: () =>
        navigation.navigate(
          'MyQuests'
        ),
    },

    {
      key: 'contributions',

      title:
        'Mes contributions',

      icon:
        'stats-chart-outline',

      onPress: () =>
        navigation.navigate(
          'MyContributions'
        ),
    },

    {
      key: 'profile',

      title:
        'Mon profil KmerDiaspora',

      icon:
        'person-outline',

      onPress: () =>
        navigation.navigate(
          'KdProfile'
        ),
    },
  ];


  if (loading) {
    return (
      <KdLoading
        label="Chargement de KmerDiaspora…"
      />
    );
  }


  return (
    <ImageBackground
      source={KM_BACKGROUND}
      style={styles.root}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >

      {/* ----------------------------------------------------
          Couche légère pour conserver la lisibilité
          ---------------------------------------------------- */}
      <View
        style={
          styles.backgroundOverlay
        }
      />


      <SafeAreaView
        style={
          styles.safeArea
        }
        edges={['top', 'bottom']}
      >

        {/* ==================================================
            HEADER
            ================================================== */}
        <View
          style={
            styles.header
          }
        >

          <View>
            <Text
              style={
                styles.brand
              }
            >
              KmerDiaspora
            </Text>

            <Text
              style={
                styles.brandSubtitle
              }
            >
              Communauté Zender237
            </Text>
          </View>


          <Pressable
            style={
              styles.notificationButton
            }
            android_ripple={{
              color:
                'rgba(255,255,255,0.15)',
            }}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={
                colors.text.inverse
              }
            />
          </Pressable>

        </View>


        {/* ==================================================
            GREETING
            ================================================== */}
        <View
          style={
            styles.greetingBlock
          }
        >

          <Text
            style={
              styles.greeting
            }
          >
            Bienvenue{' '}
            {profile?.full_name ||
              'User'}
          </Text>

          <Text
            style={
              [typography.caption, styles.tagline]
            }
          >
            Communauté des utilisateurs de KmerDiaspora 
          </Text>

        </View>


        {/* ==================================================
            CONTENU PRINCIPAL
            ================================================== */}
        <ScrollView
          style={
            styles.body
          }
          contentContainerStyle={
            styles.bodyContent
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refresh
              }
              tintColor={
                colors.brand.primary
              }
            />
          }
        >

          {/* ==================================================
              ACTIONS PRINCIPALES
              ================================================== */}
          <Card
            style={
              styles.actionStack
            }
          >

            {actions.map(
              (a, index) => (
                <View
                  key={
                    a.key
                  }
                >

                  <Pressable
                    onPress={
                      a.onPress
                    }
                    style={({ pressed }) => [
                      styles.actionRow,

                      pressed &&
                        styles.pressed,
                    ]}
                  >

                    <View
                      style={
                        styles.actionIcon
                      }
                    >
                      <Ionicons
                        name={
                          a.icon
                        }
                        size={19}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.actionText
                      }
                    >
                      <Text
                        style={
                          styles.actionTitle
                        }
                      >
                        {a.title}
                      </Text>

                      <Text
                        style={
                          styles.actionSubtitle
                        }
                      >
                        {a.subtitle}
                      </Text>
                    </View>


                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={
                        colors.brand.primary
                      }
                    />

                  </Pressable>


                  {index <
                    actions.length -
                      1 && (
                    <View
                      style={
                        styles.divider
                      }
                    />
                  )}

                </View>
              )
            )}

          </Card>


          {/* ==================================================
              ACTIVITES
              ================================================== */}
          


          <Card style={{marginTop: spacing.md}}>
            <Text
            style={
              [typography.caption,
                styles.sectionTitle]
            }
          >
            Mes activités
          </Text>
            {activities.map(
              (a, i) => (
                <View
                  key={
                    a.key
                  }
                >

                  <KdListRow
                    icon={
                      a.icon
                    }
                    title={
                      a.title
                    }
                    onPress={
                      a.onPress
                    }
                  />

                  {i <
                    activities.length -
                      1 && (
                    <View
                      style={
                        styles.divider
                      }
                    />
                  )}

                </View>
              )
            )}
          </Card>


          {/* ==================================================
              ESPACE BAS
              ================================================== */}
          <View
            style={
              styles.bottomSpace
            }
          />

        </ScrollView>

      </SafeAreaView>

    </ImageBackground>
  );
}


/* ============================================================
   STYLES
   ============================================================ */

const styles =
  StyleSheet.create({

    /*
     * Image de fond :
     * couvre absolument toute la page.
     */
    root: {
      flex: 1,
      backgroundColor:
        colors.background?.default ||
        '#F5F7FB',
    },


    /*
     * Le background est étiré sur toute
     * la surface disponible.
     */
    backgroundImage: {
      width: '100%',
      height: '100%',
    },


    /*
     * Couche très légère :
     * elle permet de conserver une bonne
     * lisibilité sans masquer l'image.
     */
    backgroundOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        'rgba(255,255,255,0.18)',
    },


    safeArea: {
      flex: 1,
    },


    /* --------------------------------------------------------
       HEADER
       -------------------------------------------------------- */

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.sm,

      paddingBottom:
        spacing.sm,
    },


    brand: {
      ...typography.h3,

      color:
        colors.text.inverse,

      fontWeight:
        '700',

      fontSize:
        fontSizes.md,
    },


    brandSubtitle: {
      marginTop:
        2,

      color:
        colors.text.inverse,

      opacity:
        0.82,

      fontSize:
        fontSizes.xs,
    },


    notificationButton: {
      width: 38,
      height: 38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',

      borderWidth:
        1,

      borderColor:
        'rgba(255,255,255,0.32)',
    },


    /* --------------------------------------------------------
       GREETING
       -------------------------------------------------------- */

    greetingBlock: {
      alignItems:
        'center',

      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.lg,
    },


    greeting: {
      ...typography.h1,

      color:
        colors.text.inverse,

      textAlign:
        'center',

      fontSize:
        fontSizes.lg,

      fontWeight:
        fontWeights.semiBold,
    },


    tagline: {
      marginTop:
        4,

      color:
        colors.text.inverse,

      opacity:
        0.90,

      fontSize:
        fontSizes.sm,

      textAlign:
        'center',

      lineHeight:
        lineHeights.md,
    },


    /* --------------------------------------------------------
       BODY
       -------------------------------------------------------- */

    body: {
      flex: 1,

      backgroundColor:
        'transparent',
    },


    bodyContent: {
      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.sm,

      paddingBottom:
        spacing.xl,
    },


    /* --------------------------------------------------------
       ACTIONS
       -------------------------------------------------------- */

    actionStack: {
      backgroundColor:
        'rgba(255,255,255,0.95)',

      borderRadius:
        radii.xl,

      paddingVertical:
        spacing.xs,

      shadowColor:
        '#000',

      shadowOpacity:
        0.08,

      shadowRadius:
        10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation:
        3,
    },


    actionRow: {
      minHeight:
        62,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.xs,
    },


    actionIcon: {
      width: 38,
      height: 38,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,
    },


    actionText: {
      flex: 1,

      marginLeft:
        spacing.sm,
    },


    actionTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,

      lineHeight:
        lineHeights.sm,
    },


    actionSubtitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* --------------------------------------------------------
       SECTION
       -------------------------------------------------------- */

    sectionTitle: {
      marginBottom:
        spacing.sm,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      fontWeight:
        fontWeights.semiBold,
    },


    /* --------------------------------------------------------
       DIVIDER
       -------------------------------------------------------- */

    divider: {
      height: 1,

      marginLeft:
        46,

      backgroundColor:
        colors.border.light,
    },


    /* --------------------------------------------------------
       PRESSED
       -------------------------------------------------------- */

    pressed: {
      opacity:
        0.72,

      transform: [
        {
          scale:
            0.99,
        },
      ],
    },


    /* --------------------------------------------------------
       ESPACE BAS
       -------------------------------------------------------- */

    bottomSpace: {
      height:
        spacing.xl,
    },

  });