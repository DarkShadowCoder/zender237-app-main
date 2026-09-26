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
  listQuestContributions,
} from '../../services/kmerDiasporaService';

import {
  colors,
  spacing,
  typography,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
} from '../../theme/theme';

import {
  KdScreen,
  KdEmpty,
  KdLoading,
  SectionTitle,
  KdStatus,
} from './components/KdUI';


export default function MyContributionsScreen({
  route,
}) {
  const questId =
    route.params?.questId;


  const [
    items,
    setItems,
  ] = useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        const result =
          await listQuestContributions({
            questId,

            mine:
              !questId,

            limit:
              100,
          });


        setItems(
          result.data || []
        );
      },
      [questId]
    );


  useEffect(() => {
    load()
      .catch(
        console.error
      );
  }, [load]);


  /* ==========================================================
   * FORMAT
   * ========================================================== */

  const formatAmount =
    (value) =>
      Number(
        value || 0
      ).toLocaleString(
        'fr-FR'
      );


  const formatDate =
    (value) => {
      if (!value) {
        return '—';
      }

      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(
          value
        ).slice(
          0,
          10
        );
      }

      return date.toLocaleDateString(
        'fr-FR',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric',
        }
      );
    };


  return (
    <KdScreen
      title="Contributions"
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
            name="wallet-outline"
            size={21}
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
            {questId
              ? 'Contributeurs'
              : 'Mes contributions'}
          </Text>

          <Text
            style={[
              typography.caption,
              styles.heroSubtitle,
            ]}
          >
            {questId
              ? 'Les contributions enregistrées dans cette Quête.'
              : 'Retrouvez l’ensemble des dons que vous avez réalisés.'}
          </Text>

        </View>

      </View>


      {/* ======================================================
          SUMMARY
          ====================================================== */}

      {items &&
      items.length > 0 ? (

        <View
          style={
            styles.summaryCard
          }
        >

          <View
            style={
              styles.summaryItem
            }
          >

            <View
              style={
                styles.summaryIcon
              }
            >
              <Ionicons
                name="cash-outline"
                size={15}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Contributions
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              {items.length}
            </Text>

          </View>


          <View
            style={
              styles.summaryDivider
            }
          />


          <View
            style={
              styles.summaryItem
            }
          >

            <View
              style={
                styles.summaryIcon
              }
            >
              <Ionicons
                name="heart-outline"
                size={15}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Total
            </Text>

            <Text
              style={
                styles.summaryValue
              }
              numberOfLines={1}
            >
              {formatAmount(
                items.reduce(
                  (
                    total,
                    contribution
                  ) =>
                    total +
                    Number(
                      contribution.amount ||
                        0
                    ),
                  0
                )
              )}
            </Text>

          </View>

        </View>

      ) : null}


      {/* ======================================================
          TITLE
          ====================================================== */}

      <View
        style={
          styles.listHeader
        }
      >

        <View>
          <Text
            style={[
              typography.h3,
              styles.listTitle,
            ]}
          >
            {questId
              ? 'Historique des dons'
              : 'Historique'}
          </Text>

          {items ? (
            <Text
              style={[
                typography.caption,
                styles.listCount,
              ]}
            >
              {items.length}{' '}
              {items.length > 1
                ? 'entrées'
                : 'entrée'}
            </Text>
          ) : null}

        </View>

      </View>


      {/* ======================================================
          LOADING
          ====================================================== */}

      {items === null ? (

        <View
          style={
            styles.loading
          }
        >
          <KdLoading
            label="Chargement des contributions…"
          />
        </View>

      ) : !items.length ? (

        /* ====================================================
           EMPTY
           ==================================================== */

        <View
          style={
            styles.empty
          }
        >
          <KdEmpty
            icon="wallet-outline"
            title="Aucune contribution"
            subtitle={
              questId
                ? 'Cette Quête n’a encore reçu aucune contribution confirmée.'
                : 'Vous n’avez encore enregistré aucune contribution.'
            }
          />
        </View>

      ) : (

        /* ====================================================
           LIST
           ==================================================== */

        <View
          style={
            styles.list
          }
        >

          {items.map(
            (
              contribution,
              index
            ) => {

              const contributor =
                contribution
                  ?.contributor
                  ?.username ||
                contribution
                  ?.contributor
                  ?.full_name ||
                'Utilisateur';


              return (
                <View
                  key={
                    contribution.id
                  }
                  style={
                    styles.contributionCard
                  }
                >

                  {/* ------------------------------------------
                      HEADER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.contributionTop
                    }
                  >

                    <View
                      style={
                        styles.contributionIcon
                      }
                    >
                      <Ionicons
                        name="cash-outline"
                        size={17}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.contributionIdentity
                      }
                    >

                      <Text
                        style={[
                          typography.body,
                          styles.contributorName,
                        ]}
                        numberOfLines={1}
                      >
                        {contributor}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          styles.contributionDate,
                        ]}
                      >
                        {formatDate(
                          contribution.contributed_at
                        )}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.amountContainer
                      }
                    >

                      <Text
                        style={
                          styles.amount
                        }
                      >
                        +{formatAmount(
                          contribution.amount
                        )}
                      </Text>

                      <Text
                        style={
                          styles.currency
                        }
                      >
                        XAF
                      </Text>

                    </View>

                  </View>


                  {/* ------------------------------------------
                      FOOTER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.contributionFooter
                    }
                  >

                    <KdStatus
                      status={
                        contribution.status
                      }
                    />


                    <View
                      style={
                        styles.confirmedInfo
                      }
                    >

                      <Ionicons
                        name={
                          contribution.status ===
                          'confirmed'
                            ? 'checkmark-circle-outline'
                            : 'time-outline'
                        }
                        size={13}
                        color={
                          contribution.status ===
                          'confirmed'
                            ? colors.success.default
                            : colors.text.tertiary
                        }
                      />

                      <Text
                        style={
                          styles.confirmedText
                        }
                      >
                        {contribution.status ===
                          'confirmed'
                          ? 'Contribution confirmée'
                          : 'Traitement en cours'}
                      </Text>

                    </View>

                  </View>

                </View>
              );
            }
          )}

        </View>
      )}

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
       SUMMARY
       ======================================================== */

    summaryCard: {
      flexDirection:
        'row',

      alignItems:
        'stretch',

      marginTop:
        spacing.md,

      paddingVertical:
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


    summaryItem: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.xs,
    },


    summaryIcon: {
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
        4,
    },


    summaryLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        11,
    },


    summaryValue: {
      marginTop:
        2,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.bold,
    },


    summaryDivider: {
      width:
        1,

      backgroundColor:
        colors.border.light,
    },


    /* ========================================================
       HEADER
       ======================================================== */

    listHeader: {
      marginTop:
        spacing.lg,

      marginBottom:
        spacing.sm,
    },


    listTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    listCount: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
       CONTRIBUTION
       ======================================================== */

    list: {
      gap:
        spacing.sm,
    },


    contributionCard: {
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
        8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation:
        2,
    },


    contributionTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    contributionIcon: {
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


    contributionIdentity: {
      flex:
        1,

      minWidth:
        0,
    },


    contributorName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    contributionDate: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    amountContainer: {
      alignItems:
        'flex-end',

      marginLeft:
        spacing.sm,
    },


    amount: {
      color:
        colors.success.text,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.bold,
    },


    currency: {
      marginTop:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        9,
    },


    contributionFooter: {
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


    confirmedInfo: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    confirmedText: {
      marginLeft:
        4,

      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        11,
    },


    /* ========================================================
       INFO
       ======================================================== */

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