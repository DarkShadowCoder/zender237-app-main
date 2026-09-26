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
  listQuests,
} from '../../services/kmerDiasporaService';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  KdScreen,
  KdEmpty,
  KdLoading,
  SectionTitle,
  KdProgress,
  KdStatus,
} from './components/KdUI';


const FILTERS = [
  [
    'active',
    'Actives',
    'heart-outline',
  ],

  [
    'published',
    'Ouvertes',
    'radio-button-on-outline',
  ],

  [
    'completed',
    'Terminées',
    'checkmark-circle-outline',
  ],

  [
    'expired',
    'Expirées',
    'time-outline',
  ],

  [
    null,
    'Toutes',
    'apps-outline',
  ],
];


export default function QuestsScreen({
  navigation,
}) {
  const {
    canCreateQuest,
  } = useAuthorization();


  const [
    status,
    setStatus,
  ] = useState(
    'active'
  );


  const [
    items,
    setItems,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        const result =
          await listQuests({
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
   * FORMAT
   * ========================================================== */

  const formatAmount =
    (value) =>
      Number(
        value || 0
      ).toLocaleString(
        'fr-FR'
      );


  return (
    <KdScreen
      title="Quêtes"
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
            name="heart-outline"
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
            Collectes communautaires
          </Text>

          <Text
            style={[
              typography.caption,
              styles.heroSubtitle,
            ]}
          >
            Inscrivez-vous à une Quête avant de participer à sa collecte.
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
          Explorer les Quêtes
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

          {FILTERS.map(
            ([
              value,
              label,
              icon,
            ]) => {

              const active =
                status ===
                value;

              return (
                <Pressable
                  key={
                    String(value)
                  }
                  onPress={() =>
                    setStatus(
                      value
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
                      icon
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
                    {label}
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
            Quêtes disponibles
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
                ? 'collectes'
                : 'collecte'}
            </Text>
          ) : null}
        </View>


        {!loading &&
        items.length > 0 ? (
          <View
            style={
              styles.resultsBadge
            }
          >

            <Ionicons
              name="heart-outline"
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
              Solidarité
            </Text>

          </View>
        ) : null}

      </View>


      {/* ======================================================
          LOADING
          ====================================================== */}

      {loading ? (

        <View
          style={
            styles.loading
          }
        >
          <KdLoading
            label="Chargement des Quêtes…"
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
            icon="heart-outline"
            title="Aucune quête"
            subtitle="Aucune collecte ne correspond à ce filtre."
          />
        </View>

      ) : (

        /* ====================================================
           QUEST LIST
           ==================================================== */

        <View
          style={
            styles.questList
          }
        >

          {items.map(
            (quest) => {

              const current =
                Number(
                  quest.current_amount ||
                    0
                );


              const target =
                Number(
                  quest.target_amount ||
                    0
                );


              const pct =
                target
                  ? Math.min(
                      100,
                      Math.round(
                        (
                          current /
                          target
                        ) *
                        100
                      )
                    )
                  : 0;


              const currency =
                quest.currency ||
                'XAF';


              return (
                <Pressable
                  key={
                    quest.id
                  }
                  onPress={() =>
                    navigation.navigate(
                      'QuestDetail',
                      {
                        questId:
                          quest.id,
                      }
                    )
                  }
                  style={({ pressed }) => [
                    styles.questCard,

                    pressed &&
                      styles.questCardPressed,
                  ]}
                >

                  {/* ------------------------------------------
                      HEADER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.questHeader
                    }
                  >

                    <View
                      style={
                        styles.questIcon
                      }
                    >
                      <Ionicons
                        name="heart-outline"
                        size={19}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.questIdentity
                      }
                    >

                      <Text
                        style={[
                          typography.caption,
                          styles.questEyebrow,
                        ]}
                      >
                        QUÊTE SOLIDAIRE
                      </Text>

                      <Text
                        style={[
                          typography.body,
                          styles.questTitle,
                        ]}
                        numberOfLines={2}
                      >
                        {quest.title}
                      </Text>

                    </View>


                    <KdStatus
                      status={
                        quest.status
                      }
                    />

                  </View>


                  {/* ------------------------------------------
                      MONTANT
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.amountRow
                    }
                  >

                    <View>
                      <Text
                        style={[
                          typography.caption,
                          styles.amountLabel,
                        ]}
                      >
                        COLLECTÉ
                      </Text>

                      <View
                        style={
                          styles.amountValueRow
                        }
                      >

                        <Text
                          style={[
                            typography.h2,
                            styles.amountValue,
                          ]}
                        >
                          {formatAmount(
                            current
                          )}
                        </Text>

                        <Text
                          style={[
                            typography.caption,
                            styles.currency,
                          ]}
                        >
                          {currency}
                        </Text>

                      </View>

                    </View>


                    <View
                      style={
                        styles.percentBadge
                      }
                    >
                      <Text
                        style={
                          styles.percentValue
                        }
                      >
                        {target
                          ? `${pct}%`
                          : '—'}
                      </Text>

                      <Text
                        style={
                          styles.percentLabel
                        }
                      >
                        objectif
                      </Text>
                    </View>

                  </View>


                  {/* ------------------------------------------
                      PROGRESS
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.progressSection
                    }
                  >

                    <View
                      style={
                        styles.progressLabels
                      }
                    >

                      <Text
                        style={[
                          typography.caption,
                          styles.progressCurrent,
                        ]}
                      >
                        {target
                          ? `${formatAmount(current)} ${currency}`
                          : 'Sans plafond'}
                      </Text>


                      {target ? (
                        <Text
                          style={[
                            typography.caption,
                            styles.progressTarget,
                          ]}
                        >
                          {formatAmount(
                            target
                          )}{' '}
                          {currency}
                        </Text>
                      ) : null}

                    </View>


                    {target ? (
                      <KdProgress
                        value={
                          pct
                        }
                      />
                    ) : null}

                  </View>


                  {/* ------------------------------------------
                      FOOTER
                      ------------------------------------------ */}

                  <View
                    style={
                      styles.questFooter
                    }
                  >

                    <View
                      style={
                        styles.questFooterInfo
                      }
                    >

                      <Ionicons
                        name="people-outline"
                        size={13}
                        color={
                          colors.text.tertiary
                        }
                      />

                      <Text
                        style={[
                          typography.caption,
                          styles.questFooterText,
                        ]}
                      >
                        Collecte communautaire
                      </Text>

                    </View>


                    <View
                      style={
                        styles.viewQuest
                      }
                    >

                      <Text
                        style={
                          styles.viewQuestText
                        }
                      >
                        Voir la quête
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={
                          colors.brand.primary
                        }
                      />

                    </View>

                  </View>

                </Pressable>
              );
            }
          )}

        </View>

      )}


      {/* ======================================================
          CREATION
          ====================================================== */}

      {canCreateQuest() ? (

        <Pressable
          onPress={() =>
            navigation.navigate(
              'CreateQuest'
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
              styles.createButtonContent
            }
          >

            <Text
              style={[
                typography.body,
                styles.createButtonTitle,
              ]}
            >
              Proposer une quête
            </Text>

            <Text
              style={[
                typography.caption,
                styles.createButtonSubtitle,
              ]}
            >
              Lancer une collecte communautaire
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
            name="information-circle-outline"
            size={16}
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
          Pour contribuer à une Quête, vous devez d'abord vous y inscrire. Votre contribution est ensuite prélevée directement de votre solde disponible après confirmation avec votre code secret.
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


/* ============================================================
 * STYLES
 * ============================================================ */

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
       FILTERS
       ======================================================== */

    filterSection: {
      marginTop:
        spacing.lg,
    },


    filterLabel: {
      marginBottom:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
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
       RESULTS
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


    /* ========================================================
       QUEST LIST
       ======================================================== */

    questList: {
      gap:
        spacing.sm,
    },


    questCard: {
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
        0.06,

      shadowRadius:
        10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation:
        2,
    },


    questCardPressed: {
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
       QUEST HEADER
       ======================================================== */

    questHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },


    questIcon: {
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


    questIdentity: {
      flex:
        1,

      marginRight:
        spacing.sm,
    },


    questEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    questTitle: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       AMOUNT
       ======================================================== */

    amountRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    amountLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        11,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    amountValueRow: {
      flexDirection:
        'row',

      alignItems:
        'baseline',

      marginTop:
        2,
    },


    amountValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    currency: {
      marginLeft:
        5,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    percentBadge: {
      alignItems:
        'center',

      justifyContent:
        'center',

      minWidth:
        56,

      paddingHorizontal:
        spacing.xs,

      paddingVertical:
        5,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primaryLight,
    },


    percentValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.bold,
    },


    percentLabel: {
      marginTop:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        11,
    },


    /* ========================================================
       PROGRESS
       ======================================================== */

    progressSection: {
      marginTop:
        spacing.md,
    },


    progressLabels: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.xs,
    },


    progressCurrent: {
      flex:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    progressTarget: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
       FOOTER
       ======================================================== */

    questFooter: {
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


    questFooterInfo: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    questFooterText: {
      marginLeft:
        4,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    viewQuest: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    viewQuestText: {
      marginRight:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.medium,
    },


    /* ========================================================
       CREATE
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


    createButtonContent: {
      flex:
        1,
    },


    createButtonTitle: {
      color:
        colors.text.inverse,

      fontSize:
        fontSizes.sm,

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
       INFO
       ======================================================== */

    infoBox: {
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
        150,

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