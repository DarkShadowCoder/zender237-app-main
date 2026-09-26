
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  Ionicons,
} from '@expo/vector-icons';

import Toast from 'react-native-toast-message';

import {
  colors,
  typography,
  spacing,
  components,
  radii,
  fontSizes,
  lineHeights,
  shadows,
} from '../../theme/theme';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  listJobRequests,
  listDriverRequests,
  listQuests,
  listMatches,
} from '../../services/kmerDiasporaService';

import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';

const KMA_BACKGROUND =
  require('../../../assets/images/KmBackground.png');

const ITEMS_LIMIT = 5;

function formatCount(value) {
  const numericValue =
    Number(value) || 0;

  return numericValue.toLocaleString(
    'fr-FR'
  );
}

function getRequestStatus(status) {
  switch (status) {
    case 'published':
    case 'open':
    case 'active':
    case 'accepted':
      return 'confirmed';

    case 'matched':
    case 'partially_matched':
    case 'pending':
    case 'pending_validation':
    case 'processing':
      return 'under_review';

    case 'closed':
    case 'completed':
      return 'confirmed';

    case 'rejected':
    case 'cancelled':
    case 'suspended':
      return 'rejected';

    default:
      return 'under_review';
  }
}

function getQuestProgress(
  current,
  target
) {
  const currentAmount =
    Number(current) || 0;

  const targetAmount =
    Number(target) || 0;

  if (targetAmount <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (currentAmount /
        targetAmount) *
        100
    )
  );
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

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={[
            typography.h2,
            styles.sectionTitle,
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={[
              typography.caption,
              styles.sectionSubtitle,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionLabel &&
      onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={
            styles.sectionAction
          }
        >
          <Text
            style={[
              typography.caption,
              styles.linkText,
            ]}
          >
            {actionLabel}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={
              colors.text.link
            }
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  iconColor,
  iconBackground,
  onPress,
}) {
  const content = (
    <Card
      style={
        styles.statCard
      }
    >
      <View
        style={
          styles.statHeader
        }
      >
        <View
          style={[
            styles.statIcon,
            {
              backgroundColor:
                iconBackground,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={
              iconColor
            }
          />
        </View>

        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={17}
            color={
              colors.text.tertiary
            }
          />
        ) : null}
      </View>

      <Text
        style={[
          typography.h2,
          styles.statValue,
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          typography.bodyBold,
          styles.statTitle,
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[
            typography.caption,
            styles.statSubtitle,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed &&
          styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  iconColor,
  iconBackground,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed &&
          styles.quickActionPressed,
      ]}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            iconColor
          }
        />
      </View>

      <View
        style={
          styles.quickActionContent
        }
      >
        <Text
          style={[
            typography.bodyBold,
            styles.quickActionTitle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.quickActionSubtitle,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          colors.text.tertiary
        }
      />
    </Pressable>
  );
}

function RequestRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  status,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.requestRow,
        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.requestIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            iconColor
          }
        />
      </View>

      <View
        style={
          styles.requestContent
        }
      >
        <Text
          style={[
            typography.bodyBold,
            styles.requestTitle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.requestSubtitle,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={
          styles.requestRight
        }
      >
        <StatusBadge
          status={
            getRequestStatus(
              status
            )
          }
        />

        <Ionicons
          name="chevron-forward"
          size={15}
          color={
            colors.text.tertiary
          }
          style={
            styles.requestChevron
          }
        />
      </View>
    </Pressable>
  );
}

function OperationsStat({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.operationsInfoItem
      }
    >
      <View
        style={
          styles.operationsStatIcon
        }
      >
        <Ionicons
          name={icon}
          size={14}
          color={
            colors.text.inverse
          }
        />
      </View>

      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={[
            typography.caption,
            styles.whiteCaption,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        <Text
          style={[
            typography.bodyBold,
            styles.whiteValue,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function QuestRow({
  quest,
  onPress,
}) {
  const progress =
    getQuestProgress(
      quest?.current_amount,
      quest?.target_amount
    );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.questRow,
        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={
          styles.questIcon
        }
      >
        <Ionicons
          name="heart"
          size={19}
          color={
            colors.brand.secondaryDark
          }
        />
      </View>

      <View
        style={
          styles.questContent
        }
      >
        <Text
          style={[
            typography.bodyBold,
            styles.questTitle,
          ]}
          numberOfLines={1}
        >
          {quest?.title ||
            'Collecte communautaire'}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.questBeneficiary,
          ]}
          numberOfLines={1}
        >
          Bénéficiaire :{' '}
          {quest?.beneficiary_user_id ||
            'Non renseigné'}
        </Text>

        <View
          style={
            styles.progressTrack
          }
        >
          <View
            style={[
              styles.progressFill,
              {
                width:
                  `${progress}%`,
              },
            ]}
          />
        </View>

        <View
          style={
            styles.progressLabels
          }
        >
          <Text
            style={[
              typography.caption,
              styles.progressText,
            ]}
          >
            {progress}% atteint
          </Text>

          <Text
            style={[
              typography.caption,
              styles.progressAmount,
            ]}
            numberOfLines={1}
          >
            {quest?.current_amount ||
              0}
            {' / '}
            {quest?.target_amount ||
              0}{' '}
            {quest?.currency ||
              'XAF'}
          </Text>
        </View>
      </View>

      <StatusBadge
        status={
          getRequestStatus(
            quest?.status
          )
        }
      />
    </Pressable>
  );
}

export default function KmaDashboardScreen({
  navigation,
}) {
  const {
    kmerDiasporaAdmin,
    logout,
  } = useAuth();

  const {
    canViewKdReports,
    canModerateKmerDiaspora,
    canManageMatching,
  } = useAuthorization();

  const [
    jobRequests,
    setJobRequests,
  ] = useState([]);

  const [
    driverRequests,
    setDriverRequests,
  ] = useState([]);

  const [
    quests,
    setQuests,
  ] = useState([]);

  const [
    matches,
    setMatches,
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

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (logoutError) {
              console.error(
                '[KmaDashboard] Erreur de déconnexion:',
                logoutError
              );

              Toast.show({
                type: 'error',
                text1:
                  'Déconnexion impossible',
                text2:
                  logoutError?.message ??
                  'Réessayez dans quelques instants.',
              });
            }
          },
        },
      ]
    );
  }, [logout]);

  const loadDashboard =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError(null);

          const [
            jobsResult,
            driversResult,
            questsResult,
            matchesResult,
          ] = await Promise.all([
            listJobRequests({
              limit:
                ITEMS_LIMIT,
              offset: 0,
            }),

            listDriverRequests({
              limit:
                ITEMS_LIMIT,
              offset: 0,
            }),

            listQuests({
              status:
                'published',
              limit:
                ITEMS_LIMIT,
              offset: 0,
            }),

            canManageMatching()
              ? listMatches({
                  limit:
                    ITEMS_LIMIT,
                  offset: 0,
                })
              : Promise.resolve({
                  data: [],
                  count: 0,
                }),
          ]);

          setJobRequests(
            jobsResult?.data ??
              []
          );

          setDriverRequests(
            driversResult?.data ??
              []
          );

          setQuests(
            questsResult?.data ??
              []
          );

          setMatches(
            matchesResult?.data ??
              []
          );
        } catch (loadError) {
          console.error(
            '[KmaDashboard] Erreur:',
            loadError
          );

          setError(
            loadError?.message ??
              'Impossible de charger KmerDiaspora.'
          );

          Toast.show({
            type: 'error',
            text1:
              'Erreur KmerDiaspora',
            text2:
              loadError?.message ??
              'Réessayez dans quelques instants.',
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        canManageMatching,
      ]
    );

  useEffect(() => {
    loadDashboard(true);
  }, [
    loadDashboard,
  ]);

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);
      loadDashboard(false);
    }, [
      loadDashboard,
    ]);

  const jobCount =
    formatCount(
      jobRequests.length
    );

  const driverCount =
    formatCount(
      driverRequests.length
    );

  const questCount =
    formatCount(
      quests.length
    );

  const matchCount =
    formatCount(
      matches.length
    );

  const administratorName =
    kmerDiasporaAdmin?.full_name ??
    'Administrateur';

  const administratorInitials =
    useMemo(
      () =>
        getInitials(
          administratorName
        ),
      [
        administratorName,
      ]
    );

  const hasManagementSection =
    canModerateKmerDiaspora() ||
    canViewKdReports();

  const totalRequests =
    jobRequests.length +
    driverRequests.length;

  const primaryActivityText =
    totalRequests === 0
      ? 'Aucune demande en attente'
      : `${formatCount(
          totalRequests
        )} demande${
          totalRequests > 1
            ? 's'
            : ''
        } à superviser`;

  if (
    loading &&
    jobRequests.length === 0 &&
    driverRequests.length === 0 &&
    quests.length === 0
  ) {
    return (
      <ImageBackground
        source={KMA_BACKGROUND}
        style={styles.loadingScreen}
        imageStyle={
          styles.pageBackgroundImage
        }
      >
        <LinearGradient
          colors={[
            'rgba(0,18,87,0.18)',
            'rgba(255,255,255,0.84)',
            'rgba(255,255,255,0.96)',
          ]}
          locations={[
            0,
            0.38,
            1,
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 0,
            y: 1,
          }}
          pointerEvents="none"
          style={
            StyleSheet.absoluteFill
          }
        />

        <ActivityIndicator
          size="large"
          color={
            colors.brand.primary
          }
        />

        <Text
          style={[
            typography.caption,
            styles.loadingText,
          ]}
        >
          Chargement de KmerDiaspora…
        </Text>
      </ImageBackground>
    );
  }

  if (
    error &&
    jobRequests.length === 0 &&
    driverRequests.length === 0 &&
    quests.length === 0
  ) {
    return (
      <ImageBackground
        source={KMA_BACKGROUND}
        style={styles.errorScreen}
        imageStyle={
          styles.pageBackgroundImage
        }
      >
        <LinearGradient
          colors={[
            'rgba(0,18,87,0.18)',
            'rgba(255,255,255,0.84)',
            'rgba(255,255,255,0.96)',
          ]}
          locations={[
            0,
            0.38,
            1,
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 0,
            y: 1,
          }}
          pointerEvents="none"
          style={
            StyleSheet.absoluteFill
          }
        />

        <View
          style={
            styles.errorIcon
          }
        >
          <Ionicons
            name="cloud-offline-outline"
            size={34}
            color={
              colors.error.default
            }
          />
        </View>

        <Text
          style={[
            typography.h2,
            styles.errorTitle,
          ]}
        >
          KmerDiaspora
        </Text>

        <Text
          style={[
            typography.body,
            styles.errorMessage,
          ]}
        >
          {error}
        </Text>

        <Pressable
          onPress={() =>
            loadDashboard(true)
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
            style={[
              typography.button,
              styles.retryButtonText,
            ]}
          >
            Réessayer
          </Text>
        </Pressable>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={KMA_BACKGROUND}
      style={styles.screen}
      imageStyle={
        styles.pageBackgroundImage
      }
    >
      <LinearGradient
        colors={[
          'rgba(0,18,87,0.18)',
          'rgba(255,255,255,0.84)',
          'rgba(255,255,255,0.96)',
        ]}
        locations={[
          0,
          0.38,
          1,
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 0,
          y: 1,
        }}
        pointerEvents="none"
        style={
          StyleSheet.absoluteFill
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor={
              colors.brand.primary
            }
          />
        }
      >
        <View
          style={
            styles.heroBackground
          }
        >
          <View
            style={
              styles.heroTopRow
            }
          >
            <View>
              <Text
                style={
                  styles.wordmark
                }
              >
                KmerDiaspora
              </Text>

              <Text
                style={
                  styles.heroSectionLabel
                }
              >
                Espace administrateur
              </Text>
            </View>

            <Pressable
              onPress={handleLogout}
              style={
                styles.logoutButton
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={
                  colors.text.primary
                }
              />
            </Pressable>
          </View>

          <View
            style={
              styles.heroBottom
            }
          >
            <View
              style={
                styles.heroAvatar
              }
            >
              <Text
                style={
                  styles.heroAvatarText
                }
              >
                {
                  administratorInitials
                }
              </Text>
            </View>

            <View
              style={
                styles.heroTextWrapper
              }
            >
              <Text
                style={
                  styles.heroGreeting
                }
                numberOfLines={1}
              >
                Bonjour,{' '}
                {
                  administratorName
                }
              </Text>

              <Text
                style={
                  styles.heroSubtitle
                }
              >
                Supervisez l'activité de
                la communauté KmerDiaspora.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.body
          }
        >
          <LinearGradient
            colors={
              components.balanceCard.gradient
            }
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 1,
            }}
            style={
              styles.operationsCard
            }
          >
            <View
              style={
                styles.operationsHeader
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.whiteCaption
                  }
                >
                  Activité KmerDiaspora
                </Text>

                <Text
                  style={
                    styles.operationsTitle
                  }
                >
                  {jobCount}
                </Text>

                <Text
                  style={
                    styles.operationsSubtitle
                  }
                >
                  demandes de poste
                </Text>
              </View>

              <View
                style={
                  styles.operationsIcon
                }
              >
                <Ionicons
                  name="pulse-outline"
                  size={22}
                  color={
                    colors.text.inverse
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.operationsDivider
              }
            />

            <View
              style={
                styles.operationsBottomRow
              }
            >
              <OperationsStat
                icon="people-outline"
                label="Conducteurs"
                value={
                  driverCount
                }
              />

              <View
                style={
                  styles.verticalDivider
                }
              />

              <OperationsStat
                icon="git-network-outline"
                label="Matchings"
                value={
                  matchCount
                }
              />

              <View
                style={
                  styles.verticalDivider
                }
              />

              <OperationsStat
                icon="heart-outline"
                label="Quêtes"
                value={
                  questCount
                }
              />
            </View>
          </LinearGradient>

          <SectionHeader
            title="Vue d'ensemble"
            subtitle="État actuel des opérations"
          />

          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              icon="briefcase-outline"
              title="Demandes de poste"
              value={
                jobCount
              }
              iconColor={
                colors.brand.primary
              }
              iconBackground={
                colors.brand.primaryLight
              }
              onPress={() =>
                navigation.navigate(
                  'KmaJobRequests'
                )
              }
            />

            <StatCard
              icon="people-outline"
              title="Besoins de conducteur"
              value={
                driverCount
              }
              iconColor={
                colors.success.default
              }
              iconBackground={
                colors.success.light
              }
              onPress={() =>
                navigation.navigate(
                  'KmaDriverRequests'
                )
              }
            />
          </View>

          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              icon="git-network-outline"
              title="Correspondances"
              value={
                matchCount
              }
              iconColor={
                colors.info.default
              }
              iconBackground={
                colors.info.light
              }
              onPress={
                canManageMatching()
                  ? () =>
                      navigation.navigate(
                        'KmaMatching'
                      )
                  : undefined
              }
            />

            <StatCard
              icon="heart-outline"
              title="Quêtes actives"
              value={
                questCount
              }
              iconColor={
                colors.brand.secondaryDark
              }
              iconBackground="#FFF4D8"
              onPress={() =>
                navigation.navigate(
                  'KmaQuests'
                )
              }
            />
          </View>

          {hasManagementSection ? (
            <>
              <SectionHeader
                title="Supervision"
                subtitle="Contrôle et suivi de l'espace KMA"
              />

              <View
                style={
                  styles.supervisionCard
                }
              >
                {canModerateKmerDiaspora() ? (
                  <QuickAction
                    icon="shield-checkmark-outline"
                    title="Modération"
                    subtitle="Examiner et traiter les contenus signalés"
                    iconColor={
                      colors.warning.default
                    }
                    iconBackground={
                      colors.warning.light
                    }
                    onPress={() =>
                      navigation.navigate(
                        'KmaModeration'
                      )
                    }
                  />
                ) : null}

                {canModerateKmerDiaspora() &&
                canViewKdReports() ? (
                  <View
                    style={
                      styles.divider
                    }
                  />
                ) : null}

                {canViewKdReports() ? (
                  <QuickAction
                    icon="bar-chart-outline"
                    title="Rapports communautaires"
                    subtitle="Consulter l'activité et les rapports KMA"
                    iconColor={
                      colors.brand.primary
                    }
                    iconBackground={
                      colors.brand.primaryLight
                    }
                    onPress={() =>
                      navigation.navigate(
                        'KmaReports'
                      )
                    }
                  />
                ) : null}
              </View>
            </>
          ) : null}

          <SectionHeader
            title="Activité récente"
            subtitle={
              primaryActivityText
            }
          />

          <Card
            style={
              styles.activityCard
            }
          >
            {jobRequests.length ===
              0 &&
            driverRequests.length ===
              0 ? (
              <EmptyState
                icon="people-outline"
                title="Aucune activité récente"
                subtitle="Les nouvelles demandes apparaîtront ici."
              />
            ) : (
              <>
                {jobRequests
                  .slice(0, 3)
                  .map(
                    (
                      request,
                      index
                    ) => (
                      <React.Fragment
                        key={
                          `job-${request.id}`
                        }
                      >
                        <RequestRow
                          icon="briefcase-outline"
                          iconColor={
                            colors.brand.primary
                          }
                          iconBackground={
                            colors.brand.primaryLight
                          }
                          title={
                            request.full_name ??
                            request.title ??
                            'Demande de poste'
                          }
                          subtitle={
                            [
                              request.country,
                              request.region,
                              request.mobility_area,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' · '
                              ) ||
                            'Recherche de position'
                          }
                          status={
                            request.status
                          }
                          onPress={() =>
                            navigation.navigate(
                              'KmaJobRequests'
                            )
                          }
                        />

                        {index <
                        Math.min(
                          jobRequests.length,
                          3
                        ) -
                          1 ? (
                          <View
                            style={
                              styles.divider
                            }
                          />
                        ) : null}
                      </React.Fragment>
                    )
                  )}

                {driverRequests
                  .slice(0, 2)
                  .map(
                    (
                      request
                    ) => (
                      <React.Fragment
                        key={
                          `driver-${request.id}`
                        }
                      >
                        <View
                          style={
                            styles.divider
                          }
                        />

                        <RequestRow
                          icon="people-outline"
                          iconColor={
                            colors.success.default
                          }
                          iconBackground={
                            colors.success.light
                          }
                          title={`${request.drivers_needed ?? 0} conducteur${
                            Number(
                              request.drivers_needed
                            ) > 1
                              ? 's'
                              : ''
                          }`}
                          subtitle={
                            [
                              request.country,
                              request.city,
                              request.neighborhood,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' · '
                              ) ||
                            'Recherche de conducteur'
                          }
                          status={
                            request.status
                          }
                          onPress={() =>
                            navigation.navigate(
                              'KmaDriverRequests'
                            )
                          }
                        />
                      </React.Fragment>
                    )
                  )}
              </>
            )}
          </Card>

          <SectionHeader
            title="Quêtes en cours"
            subtitle="Suivi des collectes communautaires"
            actionLabel="Voir tout"
            onAction={() =>
              navigation.navigate(
                'KmaQuests'
              )
            }
          />

          <Card
            style={
              styles.questCard
            }
          >
            {quests.length ===
            0 ? (
              <EmptyState
                icon="heart-outline"
                title="Aucune quête active"
                subtitle="Les collectes publiées apparaîtront ici."
              />
            ) : (
              quests
                .slice(
                  0,
                  ITEMS_LIMIT
                )
                .map(
                  (
                    quest,
                    index
                  ) => (
                    <React.Fragment
                      key={
                        quest.id
                      }
                    >
                      <QuestRow
                        quest={
                          quest
                        }
                        onPress={() =>
                          navigation.navigate(
                            'KmaQuests',
                            {
                              questId:
                                quest.id,
                            }
                          )
                        }
                      />

                      {index <
                      Math.min(
                        quests.length,
                        ITEMS_LIMIT
                      ) -
                        1 ? (
                        <View
                          style={
                            styles.divider
                          }
                        />
                      ) : null}
                    </React.Fragment>
                  )
                )
            )}
          </Card>

          <View
            style={
              styles.footerStatus
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
                styles.footerText,
              ]}
            >
              Espace KmerDiaspora opérationnel
            </Text>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  pageBackgroundImage: {
    resizeMode: 'cover',
  },

  content: {
    paddingBottom:
      spacing.huge + 60,
  },

  body: {
    paddingHorizontal:
      spacing.screenHorizontal,
    paddingTop:
      spacing.lg,
  },

  pressable: {
    flex: 1,
  },

  pressed: {
    opacity:
      0.86,
  },

  rowPressed: {
    backgroundColor:
      colors.overlay.pressed,
  },

  divider: {
    height:
      components.divider.thickness,
    backgroundColor:
      components.divider.color,
  },

  loadingScreen: {
    flex: 1,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  loadingText: {
    marginTop:
      spacing.md,
    color:
      colors.text.secondary,
  },

  errorScreen: {
    flex: 1,
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingHorizontal:
      spacing.screenHorizontal,
  },

  errorIcon: {
    width: 76,
    height: 76,
    borderRadius:
      radii.circle,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.error.light,
    marginBottom:
      spacing.lg,
  },

  errorTitle: {
    color:
      colors.text.primary,
    textAlign:
      'center',
  },

  errorMessage: {
    color:
      colors.text.secondary,
    textAlign:
      'center',
    marginTop:
      spacing.sm,
    marginBottom:
      spacing.xl,
  },

  retryButton: {
    minHeight:
      components.button.height.md,
    paddingHorizontal:
      components.button.paddingHorizontal,
    borderRadius:
      components.button.radius,
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
    gap:
      spacing.xs,
    backgroundColor:
      colors.brand.primary,
  },

  retryButtonText: {
    color:
      colors.text.inverse,
  },

  heroBackground: {
    height:
      245,
    justifyContent:
      'space-between',
    paddingHorizontal:
      spacing.screenHorizontal,
    paddingTop:
      spacing.xl,
    paddingBottom:
      spacing.giant,
    overflow:
      'hidden',
  },

  heroTopRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
  },

  wordmark: {
    fontFamily:
      typography.overline.fontFamily,
    fontWeight:
      typography.overline.fontWeight,
    fontSize:
      fontSizes.xs,
    letterSpacing:
      1,
    textTransform:
      'uppercase',
    color:
      'rgba(255,255,255,0.9)',
  },

  heroSectionLabel: {
    marginTop:
      2,
    fontFamily:
      typography.caption.fontFamily,
    fontWeight:
      typography.caption.fontWeight,
    fontSize:
      fontSizes.xs,
    color:
      'rgba(255,255,255,0.7)',
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius:
      radii.md,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      'rgba(255,255,255,0.88)',
    borderWidth:
      1,
    borderColor:
      'rgba(0,18,87,0.12)',
    ...shadows.card,
  },

  heroBottom: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius:
      26,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      'rgba(255,255,255,0.2)',
    borderWidth:
      1,
    borderColor:
      'rgba(255,255,255,0.5)',
    marginRight:
      spacing.sm,
  },

  heroAvatarText: {
    fontFamily:
      typography.bodyBold.fontFamily,
    fontWeight:
      typography.bodyBold.fontWeight,
    fontSize:
      fontSizes.sm,
    color:
      colors.text.inverse,
  },

  heroTextWrapper: {
    flex: 1,
  },

  heroGreeting: {
    fontFamily:
      typography.h1.fontFamily,
    fontWeight:
      typography.h1.fontWeight,
    fontSize:
      fontSizes.xl,
    lineHeight:
      lineHeights.xl,
    color:
      colors.text.inverse,
  },

  heroSubtitle: {
    marginTop:
      spacing.xxs,
    fontFamily:
      typography.body.fontFamily,
    fontWeight:
      typography.body.fontWeight,
    fontSize:
      fontSizes.sm,
    lineHeight:
      lineHeights.sm,
    color:
      'rgba(255,255,255,0.82)',
  },

  operationsCard: {
    marginTop:
      -spacing.xxl,
    marginBottom:
      spacing.lg,
    padding:
      components.balanceCard.padding,
    borderRadius:
      components.balanceCard.radius,
    ...shadows.button,
  },

  operationsHeader: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    justifyContent:
      'space-between',
  },

  whiteCaption: {
    color:
      'rgba(255,255,255,0.72)',
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.sm,
  },

  operationsTitle: {
    marginTop:
      spacing.xxs,
    fontFamily:
      typography.h1.fontFamily,
    fontWeight:
      typography.h1.fontWeight,
    fontSize:
      fontSizes.display,
    lineHeight:
      lineHeights.display,
    color:
      colors.text.inverse,
  },

  operationsSubtitle: {
    marginTop:
      -2,
    fontFamily:
      typography.caption.fontFamily,
    fontWeight:
      typography.caption.fontWeight,
    fontSize:
      fontSizes.xs,
    color:
      'rgba(255,255,255,0.78)',
  },

  operationsIcon: {
    width: 44,
    height: 44,
    borderRadius:
      radii.md,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      'rgba(255,255,255,0.15)',
  },

  operationsDivider: {
    height: 1,
    marginVertical:
      spacing.md,
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  operationsBottomRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  operationsInfoItem: {
    flex: 1,
    flexDirection:
      'row',
    alignItems:
      'center',
    minWidth:
      0,
  },

  operationsStatIcon: {
    width: 28,
    height: 28,
    borderRadius:
      14,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.xxs,
    backgroundColor:
      'rgba(255,255,255,0.13)',
  },

  whiteValue: {
    marginTop:
      1,
    color:
      colors.text.inverse,
  },

  verticalDivider: {
    width: 1,
    height: 32,
    marginHorizontal:
      spacing.xs,
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  sectionHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginTop:
      spacing.xl,
  },

  sectionTitle: {
    color:
      colors.text.primary,
  },

  sectionSubtitle: {
    marginTop:
      spacing.xxs,
    lineHeight:
      lineHeights.md,
    color:
      colors.text.secondary,
  },

  sectionAction: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      2,
  },

  linkText: {
    color:
      colors.text.link,
  },

  quickActionsCard: {
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.xs,
    borderRadius:
      components.card.radius,
    backgroundColor:
      components.card.backgroundColor,
    borderWidth:
      components.card.borderWidth,
    borderColor:
      components.card.borderColor,
    ...shadows.card,
  },

  quickAction: {
    minHeight:
      68,
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingVertical:
      spacing.sm,
  },

  quickActionPressed: {
    opacity:
      0.82,
  },

  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radii.sm,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.sm,
  },

  quickActionContent: {
    flex: 1,
    minWidth:
      0,
  },

  quickActionTitle: {
    fontSize:
      fontSizes.sm,
    color:
      colors.text.primary,
  },

  quickActionSubtitle: {
    color:
      colors.text.tertiary,
    lineHeight:
      lineHeights.md * 0.9,
    marginTop:
      2,
  },

  statsGrid: {
    flexDirection:
      'row',
    gap:
      spacing.sm,
    marginBottom:
      spacing.sm,
  },

  statCard: {
    flex: 1,
    minHeight:
      145,
    padding:
      spacing.md,
    borderRadius:
      components.card.radius,
  },

  statHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius:
      radii.sm,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  statValue: {
    marginTop:
      spacing.sm,
    fontSize:
      fontSizes.xl,
    color:
      colors.brand.primaryDark,
  },

  statTitle: {
    marginTop:
      spacing.xxs,
    fontSize:
      fontSizes.sm,
    color:
      colors.text.primary,
  },

  statSubtitle: {
    marginTop:
      2,
    color:
      colors.text.tertiary,
  },

  supervisionCard: {
    paddingHorizontal:
      spacing.md,
    paddingVertical:
      spacing.xs,
    borderRadius:
      components.card.radius,
    backgroundColor:
      components.card.backgroundColor,
    borderWidth:
      components.card.borderWidth,
    borderColor:
      components.card.borderColor,
    ...shadows.card,
  },

  activityCard: {
    padding:
      spacing.sm,
    borderRadius:
      components.card.radius,
  },

  requestRow: {
    minHeight:
      78,
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingHorizontal:
      spacing.xs,
    paddingVertical:
      spacing.sm,
    borderRadius:
      radii.sm,
  },

  requestIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radii.sm,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.sm,
  },

  requestContent: {
    flex: 1,
    minWidth:
      0,
    paddingRight:
      spacing.xs,
  },

  requestTitle: {
    fontSize:
      fontSizes.sm,
    color:
      colors.text.primary,
  },

  requestSubtitle: {
    marginTop:
      2,
    color:
      colors.text.tertiary,
    lineHeight:
      lineHeights.md * 0.9,
  },

  requestRight: {
    alignItems:
      'flex-end',
    marginLeft:
      spacing.xs,
  },

  requestChevron: {
    marginTop:
      spacing.xxs,
  },

  questCard: {
    padding:
      spacing.sm,
    borderRadius:
      components.card.radius,
  },

  questRow: {
    minHeight:
      88,
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    paddingHorizontal:
      spacing.xs,
    paddingVertical:
      spacing.sm,
    borderRadius:
      radii.sm,
  },

  questIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radii.sm,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      '#FFF4D8',
    marginRight:
      spacing.sm,
  },

  questContent: {
    flex: 1,
    minWidth:
      0,
    marginRight:
      spacing.xs,
  },

  questTitle: {
    fontSize:
      fontSizes.sm,
    color:
      colors.text.primary,
  },

  questBeneficiary: {
    marginTop:
      2,
    color:
      colors.text.tertiary,
  },

  progressTrack: {
    height: 6,
    borderRadius:
      radii.pill,
    overflow:
      'hidden',
    backgroundColor:
      colors.background.surfaceAlt,
  },

  progressFill: {
    height:
      '100%',
    borderRadius:
      radii.pill,
    backgroundColor:
      colors.brand.primary,
  },

  progressLabels: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginTop:
      spacing.xxs,
  },

  progressText: {
    color:
      colors.text.secondary,
  },

  progressAmount: {
    flexShrink:
      1,
    marginLeft:
      spacing.sm,
    textAlign:
      'right',
    color:
      colors.text.tertiary,
  },

  footerStatus: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
    marginTop:
      spacing.xl,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius:
      radii.circle,
    marginRight:
      spacing.xs,
    backgroundColor:
      colors.success.default,
  },

  footerText: {
    color:
      colors.text.tertiary,
  },
});
