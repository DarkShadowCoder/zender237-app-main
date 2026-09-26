
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
  Alert,
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
  formatAmount,
} from '../../utils/formatters';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  getAdminDashboard,
  listTransactions,
} from '../../services/adminService';

import {
  listSettlements,
} from '../../services/settlementService';

import Card from '../../components/Card';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import InfoBanner from '../../components/InfoBanner';
import EmptyState from '../../components/EmptyState';
import SegmentedControl from '../../components/SegmentedControl';


/* ============================================================
 * CONSTANTES
 * ============================================================ */

const RECENT_TRANSACTION_LIMIT = 5;
const RECENT_SETTLEMENT_LIMIT = 5;

const QUICK_ACTIONS = [
  {
    key: 'AdminTransactions',
    label: 'Transactions',
    icon: 'swap-horizontal-outline',
    color: colors.brand.primary,
    background: colors.brand.primaryLight,
  },
  {
    key: 'AdminKmAdministrators',
    label: 'Kmer Admin',
    icon: 'business-outline',
    color: colors.info.default,
    background: colors.info.light,
  },
  {
    key: 'AdminUsers',
    label: 'Utilisateurs',
    icon: 'people-outline',
    color: colors.success.default,
    background: colors.success.light,
  },
  {
    key: 'AdminKmerDiaspora',
    label: 'KmerDiaspora',
    icon: 'globe-outline',
    color: colors.brand.secondaryDark,
    background: '#FFF4D8',
  },
  {
    key: 'AdminLoans',
    label: 'Prêts',
    icon: 'cash-outline',
    color: colors.brand.primary,
    background: colors.brand.primaryLight,
  },
  {
    key: 'AdminLoanRules',
    label: 'Règles de prêts',
    icon: 'options-outline',
    color: colors.info.default,
    background: colors.info.light,
  },
];

const MANAGEMENT_ACTIONS = [
  {
    key: 'AdminLoans',
    label: 'Prêts',
    subtitle: 'Demandes et remboursements',
    icon: 'cash-outline',
  },
  {
    key: 'AdminLoanRules',
    label: 'Règles de prêts',
    subtitle: 'Plafonds, durées et accès par rang',
    icon: 'options-outline',
  },
  {
    key: 'AdminKmAdministrators',
    label: 'KmAdministrateur',
    subtitle: 'Modérateur KmerDiaspora',
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'AdminPartners',
    label: 'Partenaires',
    subtitle: 'Gérer les opérateurs',
    icon: 'briefcase-outline',
  },
  {
    key: 'AdminMomoNumbers',
    label: 'Mobile Money',
    subtitle: 'Numéros de dépôt',
    icon: 'phone-portrait-outline',
  },
  {
    key: 'AdminTariffs',
    label: 'Tarifs',
    subtitle: 'Frais de transfert',
    icon: 'pricetag-outline',
  },
  {
    key: 'AdminAudit',
    label: 'Audit',
    subtitle: 'Historique des opérations',
    icon: 'shield-checkmark-outline',
  },
];

const ACTIVITY_TABS = [
  {
    value: 'transactions',
    label: 'Transactions',
  },
  {
    value: 'settlements',
    label: 'Règlements',
  },
];


/* ============================================================
 * UTILITAIRES
 * ============================================================ */

function formatCount(value) {
  const numericValue = Number(value) || 0;
  return numericValue.toLocaleString('fr-FR');
}

function getTransactionAmount(transaction) {
  return Number(transaction?.amount) || 0;
}

function getTransactionTypeLabel(type) {
  switch (type) {
    case 'deposit':
      return 'Recharge';

    case 'transfer':
      return 'Transfert';

    case 'withdrawal':
      return 'Retrait';

    default:
      return 'Transaction';
  }
}

function getTransactionVisuals(type) {
  if (type === 'deposit') {
    return {
      icon: 'arrow-down-outline',
      color: colors.success.default,
      sign: '+',
    };
  }

  if (type === 'withdrawal') {
    return {
      icon: 'arrow-up-outline',
      color: colors.error.default,
      sign: '-',
    };
  }

  return {
    icon: 'swap-horizontal-outline',
    color: colors.brand.primary,
    sign: '-',
  };
}

function getSettlementStatusToken(status) {
  if (status === 'completed') {
    return 'confirmed';
  }

  if (
    status === 'rejected' ||
    status === 'failed'
  ) {
    return 'rejected';
  }

  return 'pending';
}

/**
 * Initiales d'affichage pour l'avatar du header.
 * Exemple : "Jean Dupont" => "JD".
 */
function getInitials(name) {
  if (!name) {
    return 'A';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase() ?? ''
    );

  return (
    initials.join('') ||
    'A'
  );
}


/* ============================================================
 * SOUS-COMPOSANTS DE PRÉSENTATION
 * ============================================================ */

/**
 * En-tête de section réutilisable :
 * titre + sous-titre optionnel + action optionnelle.
 */
function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={typography.h2}
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
        >
          <Text
            style={[
              typography.caption,
              styles.linkText,
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}


/**
 * Carte statistique compacte.
 */
function MetricCard({
  label,
  value,
  icon,
  iconColor,
  iconBackground,
  onPress,
}) {
  const content = (
    <Card
      style={
        styles.metricCard
      }
    >
      <View
        style={
          styles.metricTopRow
        }
      >
        <View
          style={[
            styles.metricIcon,
            {
              backgroundColor:
                iconBackground ??
                colors
                  .background
                  .surfaceAlt,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={
              iconColor ??
              colors.brand
                .primary
            }
          />
        </View>

        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={
              colors.text
                .tertiary
            }
          />
        )}
      </View>

      <Text
        style={[
          typography.h2,
          styles.metricValue,
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          typography.caption,
          styles.metricLabel,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed
          ? 0.88
          : 1,
      })}
    >
      {content}
    </Pressable>
  );
}


/**
 * Ligne d'action de gestion.
 */
function ManagementRow({
  item,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.managementRow,
        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={
          styles.managementIcon
        }
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={
            colors.brand
              .primary
          }
        />
      </View>

      <View
        style={
          styles.managementContent
        }
      >
        <Text
          style={[
            typography.h3,
            styles.rowTitle,
          ]}
        >
          {item.label}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.rowSubtitle,
          ]}
        >
          {item.subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          colors.text
            .tertiary
        }
      />
    </Pressable>
  );
}


/**
 * Ligne d'activité unifiée :
 * transaction ou règlement.
 */
function ActivityRow({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  amount,
  amountColor,
  status,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityRow,
        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.activityIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.activityContent
        }
      >
        <Text
          style={[
            typography.h3,
            styles.rowTitle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.rowSubtitle,
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={
          styles.activityRight
        }
      >
        <Text
          style={[
            typography.body,
            {
              color:
                amountColor ??
                colors.text
                  .primary,
              fontSize:
                fontSizes.md,
              top: 6,
              lineHeight:
                spacing.lg *
                1.4,
            },
          ]}
        >
          {amount}
        </Text>

        <StatusBadge
          status={status}
        />
      </View>
    </Pressable>
  );
}


/* ============================================================
 * ÉCRAN
 * ============================================================ */

export default function AdminDashboardScreen({
  navigation,
}) {
  const {
    admin,
    logout,
  } = useAuth();

  const {
    canViewAudit,
    canManagePartners,
    canManageMomo,
    canManageTariffs,
    canManageBatches,
  } = useAuthorization();

  /* ----------------------------------------------------------
   * STATE
   * ---------------------------------------------------------- */

  const [
    dashboard,
    setDashboard,
  ] = useState(null);

  const [
    recentTransactions,
    setRecentTransactions,
  ] = useState([]);

  const [
    recentSettlements,
    setRecentSettlements,
  ] = useState([]);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    activityTab,
    setActivityTab,
  ] = useState(
    'transactions'
  );


  /* ----------------------------------------------------------
   * CHARGEMENT
   * ---------------------------------------------------------- */

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
            dashboardResult,
            transactionsResult,
            settlementsResult,
          ] = await Promise.all([
            getAdminDashboard(),

            listTransactions({
              limit:
                RECENT_TRANSACTION_LIMIT,
              offset: 0,
            }),

            listSettlements({
              limit:
                RECENT_SETTLEMENT_LIMIT,
              offset: 0,
            }),
          ]);

          setDashboard(
            dashboardResult
          );

          setRecentTransactions(
            transactionsResult?.data ??
              []
          );

          setRecentSettlements(
            settlementsResult?.data ??
              []
          );
        } catch (
          loadError
        ) {
          console.error(
            '[AdminDashboard] Erreur:',
            loadError
          );

          setError(
            loadError?.message ??
              'Impossible de charger le tableau de bord.'
          );

          Toast.show({
            type: 'error',
            text1:
              'Erreur de chargement',
            text2:
              loadError?.message ??
              'Réessayez dans quelques instants.',
          });
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const onRefresh =
    useCallback(() => {
      setRefreshing(true);
      loadDashboard(false);
    }, [loadDashboard]);


  /* ----------------------------------------------------------
   * AUTHENTIFICATION
   * ---------------------------------------------------------- */

  const handleLogout =
    useCallback(() => {
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

            onPress:
              async () => {
                try {
                  await logout();
                } catch (
                  logoutError
                ) {
                  console.error(
                    '[AdminDashboard] Erreur de déconnexion:',
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


  /* ----------------------------------------------------------
   * DONNÉES DÉRIVÉES
   * ---------------------------------------------------------- */

  const metrics =
    useMemo(
      () => ({
        transactions:
          formatCount(
            dashboard?.pendingTransactions
          ),

        settlements:
          formatCount(
            dashboard?.processingSettlements
          ),

        users:
          formatCount(
            dashboard?.activeUsers
          ),

        partners:
          formatCount(
            dashboard?.activePartners
          ),

        quests:
          formatCount(
            dashboard?.activeQuests
          ),

        drivers:
          formatCount(
            dashboard?.openDriverRequests
          ),
      }),
      [dashboard]
    );

  const recentAmount =
    useMemo(
      () =>
        recentTransactions.reduce(
          (
            total,
            transaction
          ) =>
            total +
            getTransactionAmount(
              transaction
            ),
          0
        ),
      [recentTransactions]
    );

  const managementActions =
    useMemo(
      () =>
        MANAGEMENT_ACTIONS.filter(
          (item) => {
            switch (
              item.key
            ) {
              case 'AdminPartners':
                return canManagePartners();

              case 'AdminMomoNumbers':
                return canManageMomo();

              case 'AdminTariffs':
                return canManageTariffs();

              case 'AdminDailyBatches':
                return canManageBatches();

              case 'AdminAudit':
                return canViewAudit();

              default:
                return true;
            }
          }
        ),
      [
        canManagePartners,
        canManageMomo,
        canManageTariffs,
        canManageBatches,
        canViewAudit,
      ]
    );

  const adminName =
    admin?.full_name ??
    'Administrateur';

  const adminInitials =
    getInitials(adminName);


  /* ----------------------------------------------------------
   * CHARGEMENT INITIAL
   * ---------------------------------------------------------- */

  if (
    loading &&
    !dashboard
  ) {
    return (
      <ImageBackground
        source={
          KMA_BACKGROUND
        }
        style={
          styles.loadingScreen
        }
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
            colors.brand
              .primary
          }
        />

        <Text
          style={[
            typography.caption,
            styles.loadingText,
          ]}
        >
          Chargement du tableau de bord…
        </Text>
      </ImageBackground>
    );
  }


  /* ----------------------------------------------------------
   * ERREUR INITIALE
   * ---------------------------------------------------------- */

  if (
    error &&
    !dashboard
  ) {
    return (
      <ImageBackground
        source={
          KMA_BACKGROUND
        }
        style={
          styles.errorScreen
        }
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
            size={32}
            color={
              colors.error
                .default
            }
          />
        </View>

        <Text
          style={[
            typography.h2,
            styles.errorTitle,
          ]}
        >
          Tableau de bord
          indisponible
        </Text>

        <Text
          style={[
            typography.body,
            styles.errorMessage,
          ]}
        >
          {error}
        </Text>

        <Button
          title="Réessayer"
          onPress={() =>
            loadDashboard(
              true
            )
          }
        />
      </ImageBackground>
    );
  }


  /* ----------------------------------------------------------
   * RENDU
   * ---------------------------------------------------------- */

  return (
    <ImageBackground
      source={
        KMA_BACKGROUND
      }
      style={
        styles.screen
      }
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
              onRefresh
            }
            tintColor={
              colors.brand
                .primary
            }
          />
        }
      >

        {/* ==================================================
         * HEADER
         * ================================================== */}

        <View
          style={
            styles.headerWrapper
          }
        >
          <View
            style={
              styles.headerIdentity
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
                {adminInitials}
              </Text>
            </View>

            <View
              style={
                styles.headerTextWrapper
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.subtitle,
                ]}
              >
                Bonjour
              </Text>

              <Text
                style={[
                  typography.h2,
                  styles.greeting,
                ]}
                numberOfLines={1}
              >
                {adminName}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={
              handleLogout
            }
            style={
              styles.logoutButton
            }
            hitSlop={8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={
                colors.error
                  .default
              }
            />
          </Pressable>
        </View>


        {/* ==================================================
         * CARTE OPÉRATIONNELLE
         * ================================================== */}

        <LinearGradient
          colors={
            components
              .balanceCard
              .gradient
          }
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={[
            styles.operationsCard,
            {
              borderRadius:
                components
                  .balanceCard
                  .radius,
            },
          ]}
        >
          <View
            style={
              styles.operationsCardHeader
            }
          >
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
              >
                Activité
                opérationnelle
              </Text>

              <Text
                style={
                  styles.operationsTitle
                }
              >
                {
                  metrics.transactions
                }
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.whiteSubtext,
                ]}
              >
                transactions à
                surveiller
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
                  colors.text
                    .inverse
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
              label="Règlements"
              value={
                metrics.settlements
              }
            />

            <View
              style={
                styles.verticalDivider
              }
            />

            <OperationsStat
              label="Utilisateurs"
              value={
                metrics.users
              }
            />

            <View
              style={
                styles.verticalDivider
              }
            />

            <OperationsStat
              label="Partenaires"
              value={
                metrics.partners
              }
            />
          </View>
        </LinearGradient>


        {/* ==================================================
         * ACTIONS RAPIDES
         * ================================================== */}

        <SectionHeader
          title="Actions rapides"
        />

        <View
          style={
            styles.quickActionsGrid
          }
        >
          {QUICK_ACTIONS.map(
            (action) => (
              <Pressable
                key={
                  action.key
                }
                onPress={() =>
                  navigation.navigate(
                    action.key
                  )
                }
                style={({
                  pressed,
                }) => [
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
                        action.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      action.icon
                    }
                    size={20}
                    color={
                      action.color
                    }
                  />
                </View>

                <Text
                  style={[
                    typography.h3,
                    styles.quickActionTitle,
                  ]}
                  numberOfLines={1}
                >
                  {
                    action.label
                  }
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    colors.text
                      .tertiary
                  }
                />
              </Pressable>
            )
          )}
        </View>


        {/* ==================================================
         * KMERDIASPORA
         * ================================================== */}

        <SectionHeader
          title="KmerDiaspora"
          subtitle="Activité de la communauté"
          actionLabel="Ouvrir"
          onAction={() =>
            navigation.navigate(
              'AdminKmerDiaspora'
            )
          }
        />

        <View
          style={
            styles.metricsGrid
          }
        >
          <MetricCard
            label="Quêtes actives"
            value={
              metrics.quests
            }
            icon="heart-outline"
            iconColor={
              colors.brand
                .secondaryDark
            }
            iconBackground="#FFF4D8"
            onPress={() =>
              navigation.navigate(
                'AdminKdQuests'
              )
            }
          />

          <MetricCard
            label="Demandes chauffeur"
            value={
              metrics.drivers
            }
            icon="people-outline"
            iconColor={
              colors.success
                .default
            }
            iconBackground={
              colors.success
                .light
            }
            onPress={() =>
              navigation.navigate(
                'AdminKdDriverRequests'
              )
            }
          />
        </View>


        {/* ==================================================
         * ACTIVITÉ RÉCENTE
         * ================================================== */}

        <SectionHeader
          title="Activité récente"
          subtitle={
            activityTab ===
            'transactions'
              ? `${formatAmount(
                  recentAmount
                )} sur les dernières opérations`
              : 'Dernières opérations bancaires'
          }
          actionLabel="Voir tout"
          onAction={() =>
            navigation.navigate(
              activityTab ===
                'transactions'
                ? 'AdminTransactions'
                : 'AdminSettlements'
            )
          }
        />

        <SegmentedControl
          options={
            ACTIVITY_TABS
          }
          value={
            activityTab
          }
          onChange={
            setActivityTab
          }
        />

        <Card
          style={
            styles.activityCard
          }
        >
          {activityTab ===
          'transactions' ? (
            recentTransactions.length ===
            0 ? (
              <EmptyState
                title="Aucune transaction"
                subtitle="Les nouvelles opérations apparaîtront ici."
              />
            ) : (
              recentTransactions
                .slice(
                  0,
                  RECENT_TRANSACTION_LIMIT
                )
                .map(
                  (
                    transaction,
                    index
                  ) => {
                    const visuals =
                      getTransactionVisuals(
                        transaction.type
                      );

                    return (
                      <View
                        key={
                          transaction.id
                        }
                      >
                        <ActivityRow
                          icon={
                            visuals.icon
                          }
                          iconColor={
                            visuals.color
                          }
                          iconBackground={
                            colors
                              .background
                              .surfaceAlt
                          }
                          title={getTransactionTypeLabel(
                            transaction.type
                          )}
                          subtitle={`#${String(
                            transaction.id
                          ).slice(
                            0,
                            8
                          )} · ${
                            transaction.recipient_name ??
                            transaction.recipient_mobile_number ??
                            transaction.sender_phone_number ??
                            transaction.sender_name ??
                            'Opération'
                          }`}
                          amount={`${
                            visuals.sign
                          }${formatAmount(
                            transaction.amount
                          )}`}
                          amountColor={
                            visuals.color ===
                            colors.brand
                              .primary
                              ? colors
                                  .text
                                  .primary
                              : visuals.color
                          }
                          status={
                            transaction.status
                          }
                          onPress={() =>
                            navigation.navigate(
                              'AdminTransactionDetail',
                              {
                                transactionId:
                                  transaction.id,
                              }
                            )
                          }
                        />

                        {index <
                          Math.min(
                            recentTransactions.length,
                            RECENT_TRANSACTION_LIMIT
                          ) -
                            1 && (
                          <View
                            style={
                              styles.divider
                            }
                          />
                        )}
                      </View>
                    );
                  }
                )
            )
          ) : recentSettlements.length ===
            0 ? (
            <EmptyState
              title="Aucun règlement"
              subtitle="Les règlements récents apparaîtront ici."
            />
          ) : (
            recentSettlements
              .slice(
                0,
                RECENT_SETTLEMENT_LIMIT
              )
              .map(
                (
                  settlement,
                  index
                ) => (
                  <View
                    key={
                      settlement.id
                    }
                  >
                    <ActivityRow
                      icon="business-outline"
                      iconColor={
                        colors.info
                          .default
                      }
                      iconBackground={
                        colors.info
                          .light
                      }
                      title="Règlement bancaire"
                      subtitle={
                        settlement.external_reference ??
                        `#${String(
                          settlement.id
                        ).slice(
                          0,
                          8
                        )}`
                      }
                      amount={formatAmount(
                        settlement.amount
                      )}
                      status={getSettlementStatusToken(
                        settlement.status
                      )}
                      onPress={() =>
                        navigation.navigate(
                          'AdminSettlementDetail',
                          {
                            settlementId:
                              settlement.id,
                          }
                        )
                      }
                    />

                    {index <
                      Math.min(
                        recentSettlements.length,
                        RECENT_SETTLEMENT_LIMIT
                      ) -
                        1 && (
                      <View
                        style={
                          styles.divider
                        }
                      />
                    )}
                  </View>
                )
              )
          )}
        </Card>


        {/* ==================================================
         * GESTION
         * ================================================== */}

        {managementActions.length >
        0 && (
          <>
            <SectionHeader
              title="Gestion"
              subtitle="Configuration et supervision"
            />

            <View
              style={
                styles.managementCard
              }
            >
              {managementActions.map(
                (
                  item,
                  index
                ) => (
                  <View
                    key={
                      item.key
                    }
                  >
                    <ManagementRow
                      item={
                        item
                      }
                      onPress={() =>
                        navigation.navigate(
                          item.key
                        )
                      }
                    />

                    {index <
                      managementActions.length -
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
            </View>
          </>
        )}


        {/* ==================================================
         * FOOTER
         * ================================================== */}

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
              styles.footerStatusText,
            ]}
          >
            Plateforme opérationnelle
          </Text>
        </View>
      </ScrollView>


      {/* ======================================================
       * BOUTON WHATSAPP FLOTTANT
       * ======================================================
       *
       * Ce bouton n'est volontairement PAS intégré à la tabbar.
       * Il reste flottant au-dessus du contenu du dashboard.
       *
       * La route doit être déclarée dans AdminNavigator :
       *
       * AdminWhatsappGroupRequests
       *
       * vers :
       * WhatsappGroupRequestsScreen
       * ====================================================== */}

      <Pressable
        onPress={() =>
          navigation.navigate(
            'AdminWhatsappGroupRequests'
          )
        }
        accessibilityRole="button"
        accessibilityLabel="Ouvrir les demandes d'intégration au groupe WhatsApp"
        hitSlop={8}
        style={({ pressed }) => [
          styles.whatsappFloatingButton,
          pressed &&
            styles.whatsappFloatingButtonPressed,
        ]}
      >
        <Ionicons
          name="logo-whatsapp"
          size={29}
          color={
            colors.text.inverse
          }
        />
      </Pressable>
    </ImageBackground>
  );
}


/* ============================================================
 * STATISTIQUE OPÉRATIONNELLE
 * ============================================================ */

function OperationsStat({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.operationsInfoItem
      }
    >
      <Text
        style={[
          typography.caption,
          {
            color:
              colors.palette
                .gray100,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          typography.bodyBold,
          {
            color:
              colors.palette
                .gray0,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const KMA_BACKGROUND =
  require(
    '../../../assets/images/KmBackground.png'
  );

const styles =
  StyleSheet.create({

    screen: {
      flex: 1,
      paddingVertical:
        spacing.screenVertical,
    },

    pageBackgroundImage: {
      resizeMode:
        'cover',
    },

    content: {
      paddingHorizontal:
        spacing.screenHorizontal,
      paddingTop:
        spacing.lg,
      paddingBottom:
        0,
    },


    /* --------------------------------------------------------
     * LOADING / ERROR
     * -------------------------------------------------------- */

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
        colors.text
          .secondary,
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
      width: 72,
      height: 72,
      borderRadius:
        radii.circle,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.error
          .light,
      marginBottom:
        spacing.lg,
    },

    errorTitle: {
      textAlign:
        'center',
      color:
        colors.text
          .primary,
    },

    errorMessage: {
      textAlign:
        'center',
      color:
        colors.text
          .secondary,
      marginTop:
        spacing.sm,
      marginBottom:
        spacing.xl,
    },


    /* --------------------------------------------------------
     * HEADER
     * -------------------------------------------------------- */

    headerWrapper: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        spacing.lg,
    },

    headerIdentity: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flex: 1,
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius:
        radii.circle,
      backgroundColor:
        colors.brand
          .primaryLight,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.sm,
    },

    avatarText: {
      color:
        colors.brand
          .primaryDark,
      fontWeight:
        '700',
      fontSize:
        fontSizes.sm,
    },

    headerTextWrapper: {
      flex: 1,
    },

    subtitle: {
      color:
        colors.text
          .secondary,
    },

    greeting: {
      color:
        colors.text
          .primary,
      marginTop: 1,
    },

    logoutButton: {
      width: 44,
      height: 44,
      borderRadius:
        radii.md,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.background
          .surface,
      borderWidth: 1,
      borderColor:
        colors.border
          .light,
      ...shadows.card,
    },


    /* --------------------------------------------------------
     * CARTE OPÉRATIONNELLE
     * -------------------------------------------------------- */

    operationsCard: {
      padding:
        components
          .balanceCard
          .padding,
      marginBottom:
        spacing.lg,
      ...shadows.button,
    },

    operationsCardHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    whiteCaption: {
      color:
        colors.palette
          .gray100,
    },

    operationsTitle: {
      color:
        colors.text
          .inverse,
      fontFamily:
        typography.h2
          .fontFamily,
      fontWeight:
        typography.h2
          .fontWeight,
      fontSize:
        fontSizes.display,
      lineHeight:
        lineHeights.display,
      marginTop:
        spacing.xxs,
    },

    whiteSubtext: {
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
        'rgba(255,255,255,0.16)',
    },

    operationsDivider: {
      height: 1,
      backgroundColor:
        'rgba(255,255,255,0.18)',
      marginVertical:
        spacing.xs,
    },

    operationsBottomRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    operationsInfoItem: {
      flex: 1,
      flexWrap:
        'nowrap',
    },

    whiteValue: {
      color:
        colors.text
          .inverse,
      marginTop:
        spacing.xxs,
    },

    verticalDivider: {
      width: 1,
      height: 32,
      backgroundColor:
        'rgba(255,255,255,0.18)',
      marginHorizontal:
        spacing.xs,
    },


    /* --------------------------------------------------------
     * SECTIONS
     * -------------------------------------------------------- */

    sectionHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginTop:
        spacing.xl,
      marginBottom:
        spacing.sm,
    },

    sectionSubtitle: {
      marginTop:
        spacing.xxs,
      color:
        colors.text
          .secondary,
    },

    linkText: {
      color:
        colors.text.link,
    },


    /* --------------------------------------------------------
     * ACTIONS RAPIDES
     * -------------------------------------------------------- */

    quickActionsGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      justifyContent:
        'space-between',
    },

    quickAction: {
      width: '48.5%',
      minHeight: 68,
      marginBottom:
        spacing.sm,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        spacing.sm,
      paddingVertical:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        components.card
          .backgroundColor,
      borderWidth:
        components.card
          .borderWidth,
      borderColor:
        components.card
          .borderColor,
      ...shadows.card,
    },

    quickActionPressed: {
      opacity: 0.86,
      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    quickActionIcon: {
      width: 38,
      height: 38,
      borderRadius:
        radii.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.xs,
    },

    quickActionTitle: {
      flex: 1,
      fontSize:
        fontSizes.xs,
      lineHeight:
        lineHeights.xs,
    },


    /* --------------------------------------------------------
     * METRICS
     * -------------------------------------------------------- */

    metricsGrid: {
      flexDirection:
        'row',
      gap:
        spacing.sm,
      justifyContent:
        'space-between',
    },

    metricCard: {
      flex: 1,
      padding:
        spacing.md,
      minHeight: 124,
    },

    metricTopRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    metricIcon: {
      width: 36,
      height: 36,
      borderRadius:
        radii.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    metricValue: {
      marginTop:
        spacing.sm,
      fontSize:
        fontSizes.xl,
    },

    metricLabel: {
      marginTop:
        spacing.xxs,
      color:
        colors.text
          .secondary,
    },


    /* --------------------------------------------------------
     * ACTIVITY
     * -------------------------------------------------------- */

    activityCard: {
      padding:
        spacing.sm,
      marginTop:
        spacing.sm,
    },

    activityRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal:
        spacing.xs,
      paddingVertical:
        spacing.sm,
    },

    activityIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.sm,
    },

    activityContent: {
      flex: 1,
      minWidth: 0,
    },

    activityRight: {
      alignItems:
        'flex-end',
      marginLeft:
        spacing.xs,
      gap:
        spacing.xxs,
    },

    rowPressed: {
      backgroundColor:
        colors.overlay
          .pressed,
    },

    rowTitle: {
      fontSize:
        fontSizes.sm,
      lineHeight:
        lineHeights.sm,
    },

    rowSubtitle: {
      marginTop: 2,
      color:
        colors.text
          .tertiary,
    },

    divider: {
      height:
        components
          .divider
          .thickness,
      backgroundColor:
        components
          .divider
          .color,
      marginHorizontal:
        spacing.xs,
    },


    /* --------------------------------------------------------
     * MANAGEMENT
     * -------------------------------------------------------- */

    managementCard: {},

    managementRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      minHeight: 64,
      paddingHorizontal:
        spacing.xs,
      paddingVertical:
        spacing.xxs,
    },

    managementIcon: {
      width: 40,
      height: 40,
      borderRadius:
        radii.sm,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        spacing.sm,
      backgroundColor:
        colors.brand
          .primaryLight,
    },

    managementContent: {
      flex: 1,
    },


    /* --------------------------------------------------------
     * FOOTER
     * -------------------------------------------------------- */

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
      backgroundColor:
        colors.success
          .default,
      marginRight:
        spacing.xs,
    },

    footerStatusText: {
      color:
        colors.text
          .tertiary,
    },


    /* --------------------------------------------------------
     * BOUTON WHATSAPP FLOTTANT
     * -------------------------------------------------------- */

    whatsappFloatingButton: {
      position:
        'absolute',

      right:
        spacing.screenHorizontal,

      /*
       * Le bouton est placé au-dessus de la tabbar flottante
       * admin pour éviter tout chevauchement.
       */
      bottom: 105,

      width: 58,
      height: 58,

      borderRadius:
        radii.circle,

      backgroundColor:
        '#25D366',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 2,

      borderColor:
        colors.background
          .surface,

      ...shadows.button,

      elevation: 8,
    },

    whatsappFloatingButtonPressed: {
      transform: [
        {
          scale: 0.94,
        },
      ],
    },
  });
