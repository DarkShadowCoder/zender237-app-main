import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { updateQuest } from '../../services/kmerDiasporaService';

import {
  Input,
  Button,
  KdScreen,
  KdFormSection,
} from './components/KdUI';

import {
  colors,
  typography,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
} from '../../theme/theme';


export default function EditQuestScreen({
  route,
  navigation,
}) {
  const item =
    route.params?.quest;


  const [
    title,
    setTitle,
  ] = useState(
    item?.title || ''
  );


  const [
    description,
    setDescription,
  ] = useState(
    item?.description || ''
  );


  const [
    durationEnd,
    setDurationEnd,
  ] = useState(
    item?.duration_end
      ? String(
          item.duration_end
        ).slice(0, 10)
      : ''
  );


  const [
    loading,
    setLoading,
  ] = useState(false);


  /* ==========================================================
   * DONNEES DE PREVIEW
   * ========================================================== */

  const previewTitle =
    useMemo(
      () =>
        title.trim() ||
        'Votre quête',
      [title]
    );


  const previewDescription =
    useMemo(
      () =>
        description.trim() ||
        'Aucune description pour le moment.',
      [description]
    );


  const previewDate =
    useMemo(() => {
      if (!durationEnd) {
        return 'Date non définie';
      }

      const date =
        new Date(
          durationEnd
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return durationEnd;
      }

      return date.toLocaleDateString(
        'fr-FR',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }
      );
    }, [durationEnd]);


  /* ==========================================================
   * ENREGISTREMENT
   * ========================================================== */

  const submit =
    async () => {
      if (!item?.id) {
        Alert.alert(
          'Erreur',
          'Impossible d’identifier la quête à modifier.'
        );
        return;
      }


      if (!title.trim()) {
        Alert.alert(
          'Titre manquant',
          'Veuillez renseigner le titre de la quête.'
        );
        return;
      }


      if (!durationEnd) {
        Alert.alert(
          'Date manquante',
          'Veuillez renseigner une date de fin.'
        );
        return;
      }


      setLoading(true);

      try {
        await updateQuest({
          questId:
            item.id,

          updates: {
            title:
              title.trim(),

            description:
              description.trim(),

            duration_end:
              new Date(
                durationEnd
              ).toISOString(),
          },
        });

        navigation.goBack();

      } catch (e) {
        Alert.alert(
          'Impossible de modifier',
          e.message
        );
      } finally {
        setLoading(false);
      }
    };


  return (
    <KdScreen
      title="Modifier la quête"
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
            name="create-outline"
            size={18}
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
            Modifier votre quête
          </Text>

          <Text
            style={[
              typography.caption,
              styles.introText,
            ]}
          >
            Mettez à jour les informations avant de poursuivre la collecte.
          </Text>
        </View>

      </View>


      {/* ======================================================
          INFORMATIONS
          ====================================================== */}

      <KdFormSection
        title="Informations"
      >

        <Input
          label="Titre"
          value={
            title
          }
          onChangeText={
            setTitle
          }
          placeholder="Titre de la quête"
          autoCapitalize="sentences"
        />


        <Input
          label="Description"
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Expliquez la raison de cette quête…"
          autoCapitalize="sentences"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={
            styles.descriptionInput
          }
        />


        <Input
          label="Date de fin"
          value={
            durationEnd
          }
          onChangeText={
            setDurationEnd
          }
          placeholder="2026-12-31"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
        />

        <Text
          style={[
            typography.caption,
            styles.dateHint,
          ]}
        >
          Format recommandé : AAAA-MM-JJ
        </Text>

      </KdFormSection>


      {/* ======================================================
          PREVIEW
          ====================================================== */}

      <View
        style={
          styles.previewCard
        }
      >

        {/* HEADER */}

        <View
          style={
            styles.previewHeader
          }
        >

          <View
            style={
              styles.previewHeaderLeft
            }
          >

            <View
              style={
                styles.previewIcon
              }
            >
              <Ionicons
                name="eye-outline"
                size={17}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View>
              <Text
                style={[
                  typography.caption,
                  styles.previewEyebrow,
                ]}
              >
                APERÇU
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewTitleLabel,
                ]}
              >
                Votre quête
              </Text>
            </View>

          </View>


          <View
            style={
              styles.previewBadge
            }
          >
            <Ionicons
              name="create-outline"
              size={12}
              color={
                colors.brand.primary
              }
            />

            <Text
              style={[
                typography.caption,
                styles.previewBadgeText,
              ]}
            >
              Modification
            </Text>
          </View>

        </View>


        {/* HERO */}

        <View
          style={
            styles.previewHero
          }
        >

          <View
            style={
              styles.questSymbol
            }
          >
            <Ionicons
              name="heart-outline"
              size={22}
              color={
                colors.brand.primary
              }
            />
          </View>


          <View
            style={
              styles.previewHeroContent
            }
          >

            <Text
              style={[
                typography.caption,
                styles.previewHeroEyebrow,
              ]}
            >
              QUÊTE SOLIDAIRE
            </Text>

            <Text
              style={[
                typography.h2,
                styles.previewQuestTitle,
              ]}
              numberOfLines={3}
            >
              {previewTitle}
            </Text>

          </View>

        </View>


        {/* DESCRIPTION */}

        <View
          style={
            styles.previewDescription
          }
        >

          <Text
            style={[
              typography.caption,
              styles.previewSectionLabel,
            ]}
          >
            Description
          </Text>

          <Text
            style={[
              typography.body,
              styles.previewDescriptionText,
            ]}
            numberOfLines={5}
          >
            {previewDescription}
          </Text>

        </View>


        {/* DATE */}

        <View
          style={
            styles.previewMeta
          }
        >

          <View
            style={
              styles.previewMetaItem
            }
          >

            <View
              style={
                styles.previewMetaIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.previewMetaContent
              }
            >

              <Text
                style={[
                  typography.caption,
                  styles.previewMetaLabel,
                ]}
              >
                Date limite
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewMetaValue,
                ]}
              >
                {previewDate}
              </Text>

            </View>

          </View>

        </View>


        {/* EXISTING INFORMATION */}

        {item?.beneficiary_user_id ? (

          <View
            style={
              styles.previewInfoRow
            }
          >

            <View
              style={
                styles.previewInfoIcon
              }
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.previewInfoContent
              }
            >

              <Text
                style={[
                  typography.caption,
                  styles.previewInfoLabel,
                ]}
              >
                Bénéficiaire
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewInfoValue,
                ]}
              >
                {item?.beneficiary?.username ||
                  'Bénéficiaire de la quête'}
              </Text>

            </View>

          </View>

        ) : null}


        {/* FOOTER */}

        <View
          style={
            styles.previewFooter
          }
        >

          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={
              colors.brand.primary
            }
          />

          <Text
            style={[
              typography.caption,
              styles.previewFooterText,
            ]}
          >
            Les modifications seront enregistrées sur cette quête existante.
          </Text>

        </View>

      </View>


      {/* ======================================================
          ACTION
          ====================================================== */}

      <Button
        title="Enregistrer les modifications"
        onPress={
          submit
        }
        loading={
          loading
        }
        style={
          styles.button
        }
      />


      <Text
        style={[
          typography.caption,
          styles.bottomHint,
        ]}
      >
        Vérifiez le titre, la description et la date limite avant d’enregistrer.
      </Text>

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
       FORM
       ======================================================== */

    descriptionInput: {
      minHeight:
        120,

      paddingTop:
        spacing.sm,
    },


    dateHint: {
      marginTop:
        -spacing.sm,

      marginBottom:
        spacing.xs,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
       PREVIEW
       ======================================================== */

    previewCard: {
      marginTop:
        spacing.lg,

      overflow:
        'hidden',

      backgroundColor:
        colors.background.surface,

      borderRadius:
        radii.xl,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      shadowColor:
        '#000',

      shadowOpacity:
        0.07,

      shadowRadius:
        12,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      elevation:
        3,
    },


    previewHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.sm,
    },


    previewHeaderLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flex:
        1,
    },


    previewIcon: {
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

      marginRight:
        spacing.sm,
    },


    previewEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.7,
    },


    previewTitleLabel: {
      marginTop:
        1,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    previewBadge: {
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
        colors.background.default,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    previewBadgeText: {
      marginLeft:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.medium,
    },


    /* ========================================================
       HERO
       ======================================================== */

    previewHero: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginHorizontal:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    questSymbol: {
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


    previewHeroContent: {
      flex:
        1,
    },


    previewHeroEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.6,
    },


    previewQuestTitle: {
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


    /* ========================================================
       DESCRIPTION
       ======================================================== */

    previewDescription: {
      marginHorizontal:
        spacing.md,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    previewSectionLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    previewDescriptionText: {
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
       META
       ======================================================== */

    previewMeta: {
      marginHorizontal:
        spacing.md,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    previewMetaItem: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    previewMetaIcon: {
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


    previewMetaContent: {
      flex:
        1,
    },


    previewMetaLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,
    },


    previewMetaValue: {
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
       BENEFICIAIRE
       ======================================================== */

    previewInfoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginHorizontal:
        spacing.md,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    previewInfoIcon: {
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


    previewInfoContent: {
      flex:
        1,
    },


    previewInfoLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,
    },


    previewInfoValue: {
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
       FOOTER
       ======================================================== */

    previewFooter: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      backgroundColor:
        colors.background.default,
    },


    previewFooterText: {
      flex:
        1,

      marginLeft:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       ACTION
       ======================================================== */

    button: {
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