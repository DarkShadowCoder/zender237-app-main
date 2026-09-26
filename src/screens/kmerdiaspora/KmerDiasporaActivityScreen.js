import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
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
  KdScreen,
  Card,
  SectionTitle,
} from './components/KdUI';


/* ============================================================
 * ACTIVITES
 * ============================================================ */

const rows = [
  {
    key: 'publications',
    label: 'Mes publications',
    subtitle: 'Consultez et gérez vos demandes de position.',
    icon: 'briefcase-outline',
    route: 'MyJobRequests',
  },

  {
    key: 'missions',
    label: 'Mes missions recruteur',
    subtitle: 'Suivez les missions que vous avez publiées.',
    icon: 'people-outline',
    route: 'MyDriverRequests',
  },

  {
    key: 'quests',
    label: 'Mes quêtes',
    subtitle: 'Retrouvez les quêtes que vous avez créées ou rejointes.',
    icon: 'heart-outline',
    route: 'MyQuests',
  },

  {
    key: 'contributions',
    label: 'Mes contributions',
    subtitle: 'Consultez votre historique de contributions.',
    icon: 'cash-outline',
    route: 'MyContributions',
  },

  {
    key: 'matches',
    label: 'Correspondances',
    subtitle: 'Retrouvez les profils et opportunités correspondant à vos besoins.',
    icon: 'git-network-outline',
    route: 'MyMatches',
  },
];


/* ============================================================
 * PAGE
 * ============================================================ */

export default function KmerDiasporaActivityScreen({
  navigation,
}) {
  return (
    <KdScreen
      title="Activités"
      scrollView={ScrollView}
    >

      {/* ======================================================
          INTRODUCTION
          ====================================================== */}

      <View style={styles.intro}>

        <View style={styles.introIcon}>
          <Ionicons
            name="grid-outline"
            size={19}
            color={colors.brand.primary}
          />
        </View>

        <View style={styles.introContent}>

          <Text
            style={[
              typography.h3,
              styles.introTitle,
            ]}
          >
            Mon activité KmerDiaspora
          </Text>

          <Text
            style={[
              typography.caption,
              styles.introSubtitle,
            ]}
          >
            Retrouvez rapidement vos publications, missions,
            quêtes et correspondances.
          </Text>

        </View>

      </View>


      {/* ======================================================
          LISTE DES ACTIVITES
          ====================================================== */}

      <View style={styles.activityList}>

        {rows.map((item, index) => (
          <Pressable
            key={item.key}
            onPress={() =>
              navigation.navigate(
                item.route
              )
            }
            style={({ pressed }) => [
              styles.activityCard,
              pressed &&
                styles.activityCardPressed,
            ]}
          >

            {/* --------------------------------------------------
                ICON
                -------------------------------------------------- */}

            <View style={styles.activityIcon}>

              <Ionicons
                name={item.icon}
                size={21}
                color={
                  colors.brand.primary
                }
              />

            </View>


            {/* --------------------------------------------------
                CONTENU
                -------------------------------------------------- */}

            <View style={styles.activityContent}>

              <Text
                style={[
                  typography.body,
                  styles.activityTitle,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.activitySubtitle,
                ]}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>

            </View>


            {/* --------------------------------------------------
                CHEVRON
                -------------------------------------------------- */}

            <View style={styles.activityArrow}>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={
                  colors.text.tertiary
                }
              />

            </View>

          </Pressable>
        ))}

      </View>
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
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: spacing.sm,
      marginBottom: spacing.lg,

      paddingHorizontal: spacing.xs,
    },


    introIcon: {
      width: 40,
      height: 40,

      borderRadius: 20,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight: spacing.sm,
    },


    introContent: {
      flex: 1,
    },


    introTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    introSubtitle: {
      marginTop: 3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       LISTE
       ======================================================== */

    activityList: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: spacing.md,
      height: '100%',
    },


    activityCard: {
      flexDirection: 'row',
      
      alignItems: 'center',

      minHeight: 76,

      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,

      borderRadius: radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth: 1,

      borderColor:
        colors.border.light,

      shadowColor: '#000',

      shadowOpacity: 0.045,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },


    activityCardPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.985,
        },
      ],
    },


    /* ========================================================
       ICON
       ======================================================== */

    activityIcon: {
      width: 44,
      height: 44,

      borderRadius: radii.lg,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight: spacing.sm,
    },


    /* ========================================================
       CONTENT
       ======================================================== */

    activityContent: {
      flex: 1,

      paddingRight: spacing.sm,
    },


    activityTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    activitySubtitle: {
      marginTop: 3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       ARROW
       ======================================================== */

    activityArrow: {
      width: 30,
      height: 30,

      borderRadius: 15,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        colors.background.default,
    },


    /* ========================================================
       INFO CARD
       ======================================================== */

    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',

      marginTop: spacing.lg,

      padding: spacing.md,

      borderRadius: radii.xl,

      backgroundColor:
        colors.info.light,

      borderWidth: 1,

      borderColor:
        colors.info.border,
    },


    infoIcon: {
      width: 34,
      height: 34,

      borderRadius: 17,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        colors.background.surface,

      marginRight: spacing.sm,
    },


    infoContent: {
      flex: 1,
    },


    infoTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    infoText: {
      marginTop: 4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
       FOOTER
       ======================================================== */

    footer: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent: 'center',

      marginTop: spacing.md,
      marginBottom: spacing.lg,

      paddingHorizontal: spacing.md,
    },


    footerText: {
      marginLeft: 5,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      textAlign: 'center',
    },

  });