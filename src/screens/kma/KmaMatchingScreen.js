
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import EmptyState from '../../components/EmptyState';
import Card from '../../components/Card';

import {
  colors,
  fontSizes,
  lineHeights,
  radii,
  spacing,
  typography,
  shadows,
} from '../../theme/theme';

import {
  listMatches,
} from '../../services/kmerDiasporaService';

import {
  KmaStatus,
} from '../../components/kma/KmaUI';


/* ============================================================
 * FILTERS
 * ============================================================ */

const FILTERS = [
  {
    value: undefined,
    label: 'Tous',
  },
  {
    value: 'matched',
    label: 'Suggérés',
  },
  {
    value: 'selected',
    label: 'Sélectionnés',
  },
  {
    value: 'recruitment_requested',
    label: 'Recrutement',
  },
];


/* ============================================================
 * HELPERS
 * ============================================================ */

function getScoreColor(score) {
  if (score >= 80) {
    return colors.success.default;
  }

  if (score >= 60) {
    return colors.warning.default;
  }

  return colors.brand.primary;
}


function getScoreLabel(score) {
  if (score >= 80) {
    return 'Excellente correspondance';
  }

  if (score >= 60) {
    return 'Bonne correspondance';
  }

  if (score >= 40) {
    return 'Correspondance moyenne';
  }

  return 'Faible correspondance';
}


function getMissionCities(
  driverRequest
) {
  const cities =
    driverRequest?.cities;

  if (
    Array.isArray(
      cities
    )
  ) {
    return cities
      .map(
        (entry) =>
          typeof entry ===
          'string'
            ? entry
            : entry?.city ||
              entry?.name
      )
      .filter(Boolean);
  }

  if (
    typeof cities ===
    'string'
  ) {
    return cities
      .split(',')
      .map(
        (city) =>
          city.trim()
      )
      .filter(Boolean);
  }

  return [];
}


function joinLocation(
  values
) {
  return values
    .filter(Boolean)
    .join(' · ');
}


function getInitials(name) {
  const value =
    String(name || '')
      .trim();

  if (!value) {
    return 'K';
  }

  const parts =
    value
      .split(/\s+/)
      .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ||
          ''
      )
      .join('') || 'K'
  );
}


/* ============================================================
 * SCORE BADGE
 * ============================================================ */

function ScoreBadge({
  score,
}) {
  const safeScore =
    Math.min(
      100,
      Math.max(
        0,
        Number(score) || 0
      )
    );

  const scoreColor =
    getScoreColor(
      safeScore
    );

  return (
    <View
      style={[
        styles.scoreBadge,
        {
          borderColor:
            scoreColor,
        },
      ]}
    >
      <Text
        style={[
          styles.scoreValue,
          {
            color:
              scoreColor,
          },
        ]}
      >
        {safeScore}
      </Text>

      <Text
        style={[
          styles.scorePercent,
          {
            color:
              scoreColor,
          },
        ]}
      >
        %
      </Text>
    </View>
  );
}


/* ============================================================
 * INFO CHIP
 * ============================================================ */

function InfoChip({
  icon,
  label,
  value,
}) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  return (
    <View
      style={
        styles.infoChip
      }
    >
      <Ionicons
        name={icon}
        size={14}
        color={
          colors.text.secondary
        }
      />

      <Text
        style={
          styles.infoChipText
        }
        numberOfLines={1}
      >
        {label
          ? `${label} : `
          : ''}
        {value}
      </Text>
    </View>
  );
}


/* ============================================================
 * MATCH CARD
 * ============================================================ */

function MatchCard({
  item,
  rank,
  onPress,
}) {
  const profile =
    item.job_request
      ?.profile || {};

  const name =
    item.job_request
      ?.full_name ||
    profile.full_name ||
    profile.username ||
    'Profil';

  const title =
    item.job_request
      ?.title ||
    item.job_request
      ?.position ||
    'Demande de poste';

  const candidateCity =
    item.job_request
      ?.city ||
    profile.city ||
    null;

  const candidateCountry =
    item.job_request
      ?.country ||
    profile.residence_country ||
    null;

  const candidateMobility =
    item.job_request
      ?.mobility_area ||
    profile.mobility_area ||
    null;

  const score =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          Number(
            item.score ??
            item.match_score ??
            0
          ) || 0
        )
      )
    );

  const missionCities =
    getMissionCities(
      item.driver_request
    );

  const missionLocation =
    missionCities.length > 0
      ? missionCities.join(' · ')
      : joinLocation([
          item.driver_request
            ?.city,
          item.driver_request
            ?.country,
        ]);

  const driversNeeded =
    Number(
      item.driver_request
        ?.drivers_needed
    ) || 0;

  const scoreLabel =
    getScoreLabel(
      score
    );

  const initials =
    getInitials(
      name
    );

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({ pressed }) => [
        styles.matchCard,
        pressed &&
          styles.matchCardPressed,
      ]}
    >
      {/* ======================================================
       * TOP ROW
       * ====================================================== */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.rankContainer
          }
        >
          <Text
            style={
              styles.rankLabel
            }
          >
            MATCH
          </Text>

          <Text
            style={
              styles.rankValue
            }
          >
            #{rank}
          </Text>
        </View>

        <KmaStatus
          status={
            item.status
          }
        />
      </View>


      {/* ======================================================
       * CANDIDAT + SCORE
       * ====================================================== */}

      <View
        style={
          styles.identityRow
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
            {initials}
          </Text>
        </View>

        <View
          style={
            styles.identityBody
          }
        >
          <Text
            style={
              styles.candidateName
            }
            numberOfLines={2}
          >
            {name}
          </Text>

          <Text
            style={
              styles.candidateTitle
            }
            numberOfLines={2}
          >
            {title}
          </Text>

          <View
            style={
              styles.candidateMeta
            }
          >
            <InfoChip
              icon="location-outline"
              value={
                joinLocation([
                  candidateCity,
                  candidateCountry,
                ])
              }
            />

            <InfoChip
              icon="navigate-outline"
              value={
                candidateMobility
              }
            />
          </View>
        </View>

        <View
          style={
            styles.scoreColumn
          }
        >
          <ScoreBadge
            score={
              score
            }
          />

          <Text
            style={
              styles.scoreLabel
            }
            numberOfLines={2}
          >
            {scoreLabel}
          </Text>
        </View>
      </View>


      {/* ======================================================
       * DIVIDER
       * ====================================================== */}

      <View
        style={
          styles.cardDivider
        }
      />


      {/* ======================================================
       * MISSION
       * ====================================================== */}

      <View
        style={
          styles.missionSection
        }
      >
        <View
          style={
            styles.missionIcon
          }
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={
              colors.success.default
            }
          />
        </View>

        <View
          style={
            styles.missionBody
          }
        >
          <Text
            style={
              styles.missionEyebrow
            }
          >
            BESOIN DE CONDUCTEUR
          </Text>

          <Text
            style={
              styles.missionTitle
            }
            numberOfLines={2}
          >
            {driversNeeded > 0
              ? `${driversNeeded} conducteur${
                  driversNeeded > 1
                    ? 's'
                    : ''
                } recherché${
                  driversNeeded > 1
                    ? 's'
                    : ''
                }`
              : 'Besoin de conducteur'}
          </Text>

          <View
            style={
              styles.missionMeta
            }
          >
            <InfoChip
              icon="location-outline"
              value={
                missionLocation
              }
            />

            <InfoChip
              icon="map-outline"
              value={
                item.driver_request
                  ?.neighborhood
              }
            />
          </View>
        </View>
      </View>


      {/* ======================================================
       * FOOTER
       * ====================================================== */}

      <View
        style={
          styles.cardFooter
        }
      >
        <Text
          style={
            styles.detailHint
          }
        >
          Voir le détail de la correspondance
        </Text>

        <View
          style={
            styles.arrowButton
          }
        >
          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              colors.brand.primary
            }
          />
        </View>
      </View>
    </Pressable>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function KmaMatchingScreen({
  navigation,
}) {
  const [
    status,
    setStatus,
  ] = useState(
    undefined
  );

  const [
    items,
    setItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async (
        refresh = false
      ) => {
        if (refresh) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setError(null);

        try {
          const result =
            await listMatches({
              status,
              limit: 100,
              offset: 0,
            });

          setItems(
            result?.data || []
          );
        } catch (e) {
          console.error(
            '[KmaMatching]',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger les correspondances.'
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        status,
      ]
    );


  useEffect(() => {
    load();
  }, [
    load,
  ]);


  /* ==========================================================
   * DERIVED
   * ========================================================== */

  const summary =
    useMemo(() => {
      const total =
        items.length;

      const excellent =
        items.filter(
          (item) =>
            Number(
              item.score ??
              item.match_score ??
              0
            ) >= 80
        ).length;

      const averageScore =
        total === 0
          ? 0
          : Math.round(
              items.reduce(
                (
                  totalScore,
                  item
                ) =>
                  totalScore +
                  Number(
                    item.score ??
                    item.match_score ??
                    0
                  ),
                0
              ) / total
            );

      return {
        total,
        excellent,
        averageScore,
      };
    }, [
      items,
    ]);


  /* ==========================================================
   * HEADER COMPONENT
   * ========================================================== */

  const ListHeader =
    useCallback(
      () => (
        <View
          style={
            styles.listHeader
          }
        >
          <View
            style={
              styles.summaryCard
            }
          >
            <View
              style={
                styles.summaryIcon
              }
            >
              <Ionicons
                name="git-network-outline"
                size={23}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.summaryContent
              }
            >
              <Text
                style={
                  styles.summaryTitle
                }
              >
                Correspondances
              </Text>

              <Text
                style={
                  styles.summarySubtitle
                }
              >
                {summary.total === 0
                  ? 'Aucune correspondance disponible'
                  : `${summary.total} correspondance${
                      summary.total > 1
                        ? 's'
                        : ''
                    } analysée${
                      summary.total > 1
                        ? 's'
                        : ''
                    }`}
              </Text>
            </View>

            <View
              style={
                styles.summaryStats
              }
            >
              <Text
                style={
                  styles.summaryScore
                }
              >
                {summary.averageScore}%
              </Text>

              <Text
                style={
                  styles.summaryScoreLabel
                }
              >
                score moyen
              </Text>
            </View>
          </View>

          <SegmentedControl
            options={
              FILTERS
            }
            value={
              status
            }
            onChange={
              setStatus
            }
          />

          <View
            style={
              styles.resultsHeader
            }
          >
            <Text
              style={
                styles.resultsTitle
              }
            >
              Résultats
            </Text>

            <Text
              style={
                styles.resultsCount
              }
            >
              {summary.total}
            </Text>
          </View>
        </View>
      ),
      [
        summary,
        status,
      ]
    );


  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <View
      style={
        styles.screen
      }
    >
      <Header
        title="Matching"
      />

      {loading &&
      items.length === 0 ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingCard
            }
          >
            <View
              style={
                styles.loadingIcon
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  colors.brand.primary
                }
              />
            </View>

            <Text
              style={
                styles.loadingTitle
              }
            >
              Analyse des correspondances
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              Récupération des profils et calcul
              des compatibilités…
            </Text>
          </View>
        </View>
      ) : error &&
        items.length === 0 ? (
        <View
          style={
            styles.errorContainer
          }
        >
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
                name="cloud-offline-outline"
                size={30}
                color={
                  colors.error.default
                }
              />
            </View>

            <Text
              style={
                styles.errorTitle
              }
            >
              Impossible de charger le matching
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>

            <Pressable
              onPress={() =>
                load()
              }
              style={
                styles.retryButton
              }
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={
                  colors.text.inverse
                }
              />

              <Text
                style={
                  styles.retryButtonText
                }
              >
                Réessayer
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={
            items
          }

          keyExtractor={(
            item
          ) =>
            String(
              item.id
            )
          }

          ListHeaderComponent={
            ListHeader
          }

          renderItem={({
            item,
            index,
          }) => (
            <MatchCard
              item={
                item
              }
              rank={
                index + 1
              }
              onPress={() =>
                navigation.navigate(
                  'KmaMatchDetail',
                  {
                    matchId:
                      item.id,

                    match:
                      item,
                  }
                )
              }
            />
          )}

          ListEmptyComponent={
            <View
              style={
                styles.emptyWrapper
              }
            >
              <EmptyState
                icon="git-network-outline"
                title="Aucune correspondance"
                subtitle="Aucun matching ne correspond au filtre sélectionné."
              />
            </View>
          }

          contentContainerStyle={
            styles.listContent
          }

          showsVerticalScrollIndicator={
            false
          }

          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                load(true)
              }
              tintColor={
                colors.brand.primary
              }
            />
          }
        />
      )}
    </View>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
     * SCREEN
     * ======================================================== */

    screen: {
      flex: 1,

      backgroundColor:
        colors.background.default,
    },


    /* ========================================================
     * LIST
     * ======================================================== */

    listContent: {
      paddingHorizontal:
        spacing.screenHorizontal,

      paddingBottom:
        spacing.huge + 40,
    },


    /* ========================================================
     * HEADER / SUMMARY
     * ======================================================== */

    listHeader: {
      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.sm,
    },

    summaryCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

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

      ...shadows.card,
    },

    summaryIcon: {
      width: 48,

      height: 48,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },

    summaryContent: {
      flex: 1,

      minWidth: 0,
    },

    summaryTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,
    },

    summarySubtitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

    summaryStats: {
      alignItems:
        'flex-end',

      marginLeft:
        spacing.sm,
    },

    summaryScore: {
      color:
        colors.brand.primary,

      fontFamily:
        typography.h2.fontFamily,

      fontWeight:
        typography.h2.fontWeight,

      fontSize:
        fontSizes.lg,
    },

    summaryScoreLabel: {
      marginTop:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        9,

      textTransform:
        'uppercase',

      letterSpacing:
        0.4,
    },

    intro: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop:
        spacing.sm,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primaryLight,
    },

    introIcon: {
      marginRight:
        spacing.xs,

      marginTop:
        1,
    },

    introText: {
      flex: 1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
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

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,
    },

    resultsCount: {
      minWidth: 28,

      paddingHorizontal:
        spacing.xs,

      paddingVertical:
        4,

      borderRadius:
        radii.pill,

      textAlign:
        'center',

      overflow:
        'hidden',

      color:
        colors.brand.primary,

      backgroundColor:
        colors.brand.primaryLight,

      fontSize:
        fontSizes.xs,

      fontWeight:
        '800',
    },


    /* ========================================================
     * MATCH CARD
     * ======================================================== */

    matchCard: {
      marginBottom:
        spacing.sm,

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

      ...shadows.card,
    },

    matchCardPressed: {
      opacity:
        0.88,

      transform: [
        {
          scale:
            0.995,
        },
      ],
    },

    cardTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.md,
    },

    rankContainer: {
      flexDirection:
        'row',

      alignItems:
        'baseline',

      gap:
        spacing.xxs,
    },

    rankLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        9,

      fontWeight:
        '700',

      letterSpacing:
        0.7,
    },

    rankValue: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        '800',
    },


    /* ========================================================
     * IDENTITY
     * ======================================================== */

    identityRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    avatar: {
      width: 50,

      height: 50,

      borderRadius:
        25,

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

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    identityBody: {
      flex: 1,

      minWidth: 0,

      paddingRight:
        spacing.sm,
    },

    candidateName: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,
    },

    candidateTitle: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,
    },

    candidateMeta: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      marginTop:
        spacing.xs,

      gap:
        spacing.xs,
    },

    scoreColumn: {
      width: 76,

      alignItems:
        'center',

      paddingLeft:
        spacing.xs,
    },

    scoreBadge: {
      width: 62,

      height: 62,

      borderRadius:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      backgroundColor:
        colors.background.surfaceAlt,

      borderWidth:
        2,
    },

    scoreValue: {
      fontFamily:
        typography.h2.fontFamily,

      fontWeight:
        typography.h2.fontWeight,

      fontSize:
        fontSizes.md,
    },

    scorePercent: {
      marginTop:
        7,

      marginLeft:
        1,

      fontSize:
        8,

      fontWeight:
        '800',
    },

    scoreLabel: {
      width: 74,

      marginTop:
        5,

      textAlign:
        'center',

      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        12,
    },


    /* ========================================================
     * INFO CHIP
     * ======================================================== */

    infoChip: {
      flexDirection:
        'row',

      alignItems:
        'center',

      maxWidth:
        '100%',

      flexShrink: 1,
    },

    infoChipText: {
      flexShrink:
        1,

      marginLeft:
        3,

      color:
        colors.text.tertiary,

      fontSize:
        10,

      lineHeight:
        14,
    },


    /* ========================================================
     * DIVIDER
     * ======================================================== */

    cardDivider: {
      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        colors.border.light,

      marginVertical:
        spacing.md,
    },


    /* ========================================================
     * MISSION
     * ======================================================== */

    missionSection: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    missionIcon: {
      width: 40,

      height: 40,

      borderRadius:
        radii.sm,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.success.light,

      marginRight:
        spacing.sm,
    },

    missionBody: {
      flex: 1,

      minWidth: 0,
    },

    missionEyebrow: {
      color:
        colors.text.tertiary,

      fontSize:
        9,

      fontWeight:
        '700',

      letterSpacing:
        0.5,
    },

    missionTitle: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,
    },

    missionMeta: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing.xs,

      marginTop:
        spacing.xs,
    },


    /* ========================================================
     * FOOTER
     * ======================================================== */

    cardFooter: {
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
        StyleSheet.hairlineWidth,

      borderTopColor:
        colors.border.light,
    },

    detailHint: {
      flex: 1,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },

    arrowButton: {
      width: 32,

      height: 32,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginLeft:
        spacing.sm,
    },


    /* ========================================================
     * LOADING
     * ======================================================== */

    loadingContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.screenHorizontal,
    },

    loadingCard: {
      width: '100%',

      maxWidth: 400,

      alignItems:
        'center',

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      ...shadows.card,
    },

    loadingIcon: {
      width: 68,

      height: 68,

      borderRadius:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.md,
    },

    loadingTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,

      textAlign:
        'center',
    },

    loadingText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,

      textAlign:
        'center',
    },


    /* ========================================================
     * ERROR
     * ======================================================== */

    errorContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.screenHorizontal,
    },

    errorCard: {
      width: '100%',

      maxWidth: 420,

      alignItems:
        'center',

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      ...shadows.card,
    },

    errorIcon: {
      width: 68,

      height: 68,

      borderRadius:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.error.light,

      marginBottom:
        spacing.md,
    },

    errorTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,

      textAlign:
        'center',
    },

    errorText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,

      textAlign:
        'center',
    },

    retryButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      minHeight:
        46,

      paddingHorizontal:
        spacing.lg,

      marginTop:
        spacing.lg,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primary,

      gap:
        spacing.xs,
    },

    retryButtonText: {
      color:
        colors.text.inverse,

      fontFamily:
        typography.button.fontFamily,

      fontWeight:
        typography.button.fontWeight,

      fontSize:
        fontSizes.sm,
    },


    /* ========================================================
     * EMPTY
     * ======================================================== */

    emptyWrapper: {
      marginTop:
        spacing.lg,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,
    },
  });
