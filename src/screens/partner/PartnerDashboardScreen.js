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
} from '../../theme/theme';

import {
  formatAmount,
  formatDateTime,
} from '../../utils/formatters';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useAuthorization,
} from '../../context/AuthorizationContext';

import {
  getPartnerDashboard,
  listAssignedTransactions,
} from '../../services/partnerService';

import {
  listSettlements,
} from '../../services/settlementService';

import Card from '../../components/Card';
import InfoBanner from '../../components/InfoBanner';
import EmptyState from '../../components/EmptyState';
import TransactionListItem from '../../components/TransactionListItem';
import StatusBadge from '../../components/StatusBadge';


/* ============================================================
 * CONSTANTES
 * ============================================================ */

const RECENT_TRANSACTIONS_LIMIT = 5;
const RECENT_SETTLEMENTS_LIMIT = 5;


/* ============================================================
 * OUTILS
 * ============================================================ */

function formatCount(value) {
  return (
    Number(value) || 0
  ).toLocaleString('fr-FR');
}


/**
 * Retourne un libellé lisible pour le type de règlement.
 */
function getSettlementTypeLabel(
  settlementType
) {
  switch (settlementType) {
    case 'user_deposit_settlement':
      return 'Règlement dépôt';

    case 'partner_bank_transfer':
      return 'Virement partenaire';

    case 'recipient_transfer':
      return 'Virement destinataire';

    case 'withdrawal_bank_transfer':
      return 'Règlement retrait';

    case 'daily_batch_settlement':
      return 'Lot journalier';

    case 'correction':
      return 'Correction';

    default:
      return 'Règlement bancaire';
  }
}


/**
 * Mapping visuel du statut des règlements vers les statuts
 * actuellement compris par StatusBadge/theme.js.
 *
 * Le schéma bank_settlements possède ses propres statuts :
 * pending / processing / completed / failed / rejected / cancelled.
 */
function getSettlementBadgeStatus(
  status
) {
  switch (status) {
    case 'completed':
      return 'confirmed';

    case 'failed':
    case 'rejected':
      return 'rejected';

    case 'cancelled':
      return 'cancelled';

    case 'processing':
    case 'pending':
    default:
      return 'under_review';
  }
}


/* ============================================================
 * COMPOSANTS LOCAUX
 * ============================================================ */


/**
 * Carte de statistique opérationnelle.
 */
function StatCard({
  icon,
  label,
  value,
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
            size={21}
            color={iconColor}
          />
        </View>

        {onPress ? (
          <Ionicons
            name="chevron-forward"
            size={18}
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
          typography.caption,
          styles.statLabel,
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
          ? 0.86
          : 1,
      })}
    >
      {content}
    </Pressable>
  );
}


/**
 * Ligne d'action rapide.
 */
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
          size={22}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.quickActionContent
        }
      >
        <Text
          style={[
            typography.h3,
            styles.quickActionTitle,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.quickActionSubtitle,
          ]}
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


/**
 * Ligne de règlement.
 */
function SettlementRow({
  settlement,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settlementRow,
        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={
          styles.settlementIcon
        }
      >
        <Ionicons
          name="business-outline"
          size={21}
          color={
            colors.info.default
          }
        />
      </View>

      <View
        style={
          styles.settlementContent
        }
      >
        <Text
          style={[
            typography.bodyBold,
            styles.settlementTitle,
          ]}
          numberOfLines={1}
        >
          {getSettlementTypeLabel(
            settlement.settlement_type
          )}
        </Text>

        <Text
          style={[
            typography.caption,
            styles.settlementDate,
          ]}
          numberOfLines={1}
        >
          {formatDateTime(
            settlement.initiated_at
          )}
        </Text>

        {settlement.external_reference ? (
          <Text
            style={[
              typography.caption,
              styles.settlementReference,
            ]}
            numberOfLines={1}
          >
            Réf. {settlement.external_reference}
          </Text>
        ) : null}
      </View>

      <View
        style={
          styles.settlementRight
        }
      >
        <Text
          style={[
            typography.bodyBold,
            styles.settlementAmount,
          ]}
        >
          {formatAmount(
            settlement.amount
          )}
        </Text>

        <StatusBadge
          status={
            getSettlementBadgeStatus(
              settlement.status
            )
          }
        />
      </View>
    </Pressable>
  );
}


/* ============================================================
 * ECRAN PRINCIPAL
 * ============================================================ */

export default function PartnerDashboardScreen({
  navigation,
}) {

  /* ----------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------- */

  const {
    partner,
  } = useAuth();


  /* ----------------------------------------------------------
   * AUTHORIZATION
   * ---------------------------------------------------------- */

  const {
    canViewSettlements,
    canExecuteSettlement,
    canViewKmerDiaspora,
    canManageMatching,
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
   * CHARGEMENT DU DASHBOARD
   * ========================================================== */

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

            getPartnerDashboard(),

            listAssignedTransactions({
              limit:
                RECENT_TRANSACTIONS_LIMIT,
              offset: 0,
            }),

            canViewSettlements()
              ? listSettlements({
                  limit:
                    RECENT_SETTLEMENTS_LIMIT,
                  offset: 0,
                })
              : Promise.resolve({
                  data: [],
                  count: 0,
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

        } catch (loadError) {

          console.error(
            '[PartnerDashboard] Erreur de chargement:',
            loadError
          );

          setError(
            loadError?.message ??
              'Impossible de charger votre espace partenaire.'
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
      [
        canViewSettlements,
      ]
    );


  /* ==========================================================
   * INITIAL LOAD
   * ========================================================== */

  useEffect(() => {
    loadDashboard(true);
  }, [
    loadDashboard,
  ]);


  /* ==========================================================
   * REFRESH
   * ========================================================== */

  const handleRefresh =
    useCallback(() => {
      setRefreshing(true);
      loadDashboard(false);
    }, [
      loadDashboard,
    ]);


  /* ==========================================================
   * NOM DU PARTENAIRE
   * ========================================================== */

  const partnerName =
    partner?.full_name ??
    'Partenaire';


  /* ==========================================================
   * METRIQUES
   * ========================================================== */

  const transactionCount =
    formatCount(
      dashboard?.assignedTransactions
    );

  const reviewCount =
    formatCount(
      dashboard?.pendingReviews
    );

  const settlementCount =
    formatCount(
      dashboard?.pendingSettlements
    );

  const questCount =
    formatCount(
      dashboard?.activeQuests
    );

  const driverRequestCount =
    formatCount(
      dashboard?.openDriverRequests
    );


  /* ==========================================================
   * TOTAL DES OPERATIONS RECENTES
   * ========================================================== */

  const recentTransactionAmount =
    useMemo(() => {

      return recentTransactions.reduce(
        (
          total,
          transaction
        ) =>
          total +
          (
            Number(
              transaction.amount
            ) || 0
          ),
        0
      );

    }, [
      recentTransactions,
    ]);


  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (
    loading &&
    !dashboard
  ) {

    return (
      <View
        style={
          styles.loadingScreen
        }
      >
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
          Chargement de votre espace partenaire…
        </Text>
      </View>
    );
  }


  /* ==========================================================
   * ERREUR
   * ========================================================== */

  if (
    error &&
    !dashboard
  ) {

    return (
      <View
        style={
          styles.errorScreen
        }
      >

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
          Espace indisponible
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
            size={19}
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

      </View>
    );
  }


  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <View
      style={
        styles.screen
      }
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
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

        {/* ==================================================
         * HEADER
         * ================================================== */}

        <View
          style={
            styles.header
          }
        >

          <View
            style={
              styles.headerText
            }
          >

            <Text
              style={[
                typography.h2,
                styles.greeting,
              ]}
            >
              Bonjour, {partnerName}
            </Text>

            <Text
              style={[
                typography.caption,
                styles.subtitle,
              ]}
            >
              Votre activité opérationnelle
            </Text>

          </View>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'PartnerProfile'
              )
            }
            style={
              styles.profileButton
            }
          >

            <View
              style={
                styles.profileAvatar
              }
            >
              <Text
                style={
                  styles.profileInitial
                }
              >
                {partnerName
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

          </Pressable>

        </View>


        {/* ==================================================
         * CARTE ACTIVITE
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
            styles.operationCard,
            {
              borderRadius:
                components
                  .balanceCard
                  .radius,
              padding:
                components
                  .balanceCard
                  .padding,
            },
          ]}
        >

          <View
            style={
              styles.operationHeader
            }
          >

            <View
              style={
                styles.operationTitleWrapper
              }
            >

              <Text
                style={[
                  typography.caption,
                  styles.whiteCaption,
                ]}
              >
                Activité assignée
              </Text>

              <Text
                style={[
                  typography.amountLg,
                  styles.operationValue,
                ]}
              >
                {transactionCount}
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.operationSubtitle,
                ]}
              >
                opérations à traiter
              </Text>

            </View>

            <View
              style={
                styles.operationIcon
              }
            >
              <Ionicons
                name="pulse-outline"
                size={25}
                color={
                  colors.text.inverse
                }
              />
            </View>

          </View>


          <View
            style={
              styles.operationDivider
            }
          />


          <View
            style={
              styles.operationBottom
            }
          >

            <View
              style={
                styles.operationStat
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.whiteCaption,
                ]}
              >
                À vérifier
              </Text>

              <Text
                style={[
                  typography.bodyBold,
                  styles.whiteValue,
                ]}
              >
                {reviewCount}
              </Text>
            </View>

            <View
              style={
                styles.verticalDivider
              }
            />

            <View
              style={
                styles.operationStat
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.whiteCaption,
                ]}
              >
                Règlements
              </Text>

              <Text
                style={[
                  typography.bodyBold,
                  styles.whiteValue,
                ]}
              >
                {settlementCount}
              </Text>
            </View>

            <View
              style={
                styles.verticalDivider
              }
            />

            <View
              style={
                styles.operationStat
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.whiteCaption,
                ]}
              >
                KmerDiaspora
              </Text>

              <Text
                style={[
                  typography.bodyBold,
                  styles.whiteValue,
                ]}
              >
                {questCount +
                  driverRequestCount}
              </Text>
            </View>

          </View>

        </LinearGradient>


        {/* ==================================================
         * INFO WORKFLOW
         * ================================================== */}

        <InfoBanner
          icon="shield-checkmark-outline"
          text="Vérifiez les preuves, confirmez ou rejetez les opérations, puis effectuez les règlements bancaires avec leur justificatif."
        />


        {/* ==================================================
         * ACTIONS RAPIDES
         * ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={
              typography.h2
            }
          >
            Actions rapides
          </Text>
        </View>


        <View
          style={
            styles.quickActions
          }
        >

          <QuickAction
            icon="swap-horizontal-outline"
            title="Transactions"
            subtitle={`${reviewCount} à vérifier`}
            iconColor={
              colors.brand.primary
            }
            iconBackground={
              colors.brand.primaryLight
            }
            onPress={() =>
              navigation.navigate(
                'PartnerTransactions'
              )
            }
          />

          {canViewSettlements() && (
            <QuickAction
              icon="business-outline"
              title="Règlements"
              subtitle={`${settlementCount} en attente`}
              iconColor={
                colors.info.default
              }
              iconBackground={
                colors.info.light
              }
              onPress={() =>
                navigation.navigate(
                  'PartnerSettlements'
                )
              }
            />
          )}

          {canViewKmerDiaspora() && (
            <QuickAction
              icon="people-outline"
              title="KmerDiaspora"
              subtitle={`${driverRequestCount} demandes chauffeur`}
              iconColor={
                colors.success.default
              }
              iconBackground={
                colors.success.light
              }
              onPress={() =>
                navigation.navigate(
                  'PartnerKmerDiaspora'
                )
              }
            />
          )}

          {canManageMatching() && (
            <QuickAction
              icon="git-network-outline"
              title="Matching"
              subtitle="Gérer les correspondances"
              iconColor={
                colors.brand.secondaryDark
              }
              iconBackground={
                '#FFF6E0'
              }
              onPress={() =>
                navigation.navigate(
                  'PartnerMatching'
                )
              }
            />
          )}

        </View>


        {/* ==================================================
         * TRANSACTIONS
         * ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>
            <Text
              style={
                typography.h2
              }
            >
              Mes transactions
            </Text>

            <Text
              style={[
                typography.caption,
                styles.sectionSubtitle,
              ]}
            >
              Montant récent :{' '}
              {formatAmount(
                recentTransactionAmount
              )}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'PartnerTransactions'
              )
            }
          >
            <Text
              style={[
                typography.caption,
                styles.link,
              ]}
            >
              Voir tout
            </Text>
          </Pressable>

        </View>


        <Card
          style={
            styles.transactionsCard
          }
        >

          {recentTransactions.length === 0 ? (

            <EmptyState
              icon="swap-horizontal-outline"
              title="Aucune transaction assignée"
              subtitle="Les opérations qui vous seront attribuées apparaîtront ici."
            />

          ) : (

            recentTransactions
              .slice(
                0,
                RECENT_TRANSACTIONS_LIMIT
              )
              .map(
                (
                  transaction
                ) => (

                  <View
                    key={
                      transaction.id
                    }
                  >

                    <TransactionListItem
                      transaction={
                        transaction
                      }
                      onPress={() =>
                        navigation.navigate(
                          'PartnerTransactionDetail',
                          {
                            transactionId:
                              transaction.id,
                          }
                        )
                      }
                    />

                  </View>

                )
              )

          )}

        </Card>


        {/* ==================================================
         * PRIORITE OPERATIONNELLE
         * ================================================== */}

        {(Number(
          dashboard?.pendingReviews
        ) > 0) && (

          <Card
            style={
              styles.priorityCard
            }
          >

            <View
              style={
                styles.priorityIcon
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={26}
                color={
                  colors.warning.default
                }
              />
            </View>

            <View
              style={
                styles.priorityContent
              }
            >

              <Text
                style={[
                  typography.h3,
                  styles.priorityTitle,
                ]}
              >
                {reviewCount} opération
                {Number(
                  dashboard?.pendingReviews
                ) > 1
                  ? 's'
                  : ''}{' '}
                à vérifier
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.priorityText,
                ]}
              >
                Une vérification rapide permet
                de maintenir le traitement dans
                les délais prévus.
              </Text>

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'PartnerTransactions'
                  )
                }
                style={
                  styles.priorityButton
                }
              >
                <Text
                  style={[
                    typography.button,
                    styles.priorityButtonText,
                  ]}
                >
                  Examiner maintenant
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={
                    colors.brand.primary
                  }
                />
              </Pressable>

            </View>

          </Card>

        )}


        {/* ==================================================
         * REGLEMENTS BANCAIRES
         * ================================================== */}

        {canViewSettlements() && (
          <View>

            <View
              style={
                styles.sectionHeader
              }
            >

              <View>

                <Text
                  style={
                    typography.h2
                  }
                >
                  Règlements bancaires
                </Text>

                <Text
                  style={[
                    typography.caption,
                    styles.sectionSubtitle,
                  ]}
                >
                  Vos dernières opérations
                </Text>

              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'PartnerSettlements'
                  )
                }
              >
                <Text
                  style={[
                    typography.caption,
                    styles.link,
                  ]}
                >
                  Voir tout
                </Text>
              </Pressable>

            </View>


            <Card
              style={
                styles.settlementsCard
              }
            >

              {recentSettlements.length === 0 ? (

                <EmptyState
                  icon="business-outline"
                  title="Aucun règlement récent"
                  subtitle="Les règlements bancaires apparaîtront ici."
                />

              ) : (

                recentSettlements
                  .slice(
                    0,
                    RECENT_SETTLEMENTS_LIMIT
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

                        <SettlementRow
                          settlement={
                            settlement
                          }
                          onPress={() =>
                            navigation.navigate(
                              'PartnerSettlementDetail',
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
                            RECENT_SETTLEMENTS_LIMIT
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

          </View>
        )}


        {/* ==================================================
         * KMERDIASPORA
         * ================================================== */}

        {canViewKmerDiaspora() && (
          <View>

            <View
              style={
                styles.sectionHeader
              }
            >

              <View>

                <Text
                  style={
                    typography.h2
                  }
                >
                  KmerDiaspora
                </Text>

                <Text
                  style={[
                    typography.caption,
                    styles.sectionSubtitle,
                  ]}
                >
                  Activité communautaire
                </Text>

              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'PartnerKmerDiaspora'
                  )
                }
              >
                <Text
                  style={[
                    typography.caption,
                    styles.link,
                  ]}
                >
                  Ouvrir
                </Text>
              </Pressable>

            </View>


            <View
              style={
                styles.metricsRow
              }
            >

              <StatCard
                icon="briefcase-outline"
                label="Quêtes actives"
                value={
                  questCount
                }
                iconColor={
                  colors.brand.secondaryDark
                }
                iconBackground={
                  '#FFF6E0'
                }
                onPress={() =>
                  navigation.navigate(
                    'PartnerQuests'
                  )
                }
              />

              <StatCard
                icon="people-outline"
                label="Besoins de conducteur"
                value={
                  driverRequestCount
                }
                iconColor={
                  colors.success.default
                }
                iconBackground={
                  colors.success.light
                }
                onPress={() =>
                  navigation.navigate(
                    'PartnerDriverRequests'
                  )
                }
              />

            </View>

            {canManageMatching() && (
              <Pressable
                onPress={() =>
                  navigation.navigate(
                    'PartnerMatching'
                  )
                }
                style={
                  styles.matchingBanner
                }
              >

                <View
                  style={
                    styles.matchingIcon
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
                    styles.matchingContent
                  }
                >

                  <Text
                    style={[
                      typography.bodyBold,
                      styles.matchingTitle,
                    ]}
                  >
                    Gestion du matching
                  </Text>

                  <Text
                    style={[
                      typography.caption,
                      styles.matchingSubtitle,
                    ]}
                  >
                    Relier les besoins de conducteurs
                    aux profils correspondants.
                  </Text>

                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={
                    colors.text.tertiary
                  }
                />

              </Pressable>
            )}

          </View>
        )}


        {/* ==================================================
         * ETAT DE LA PLATEFORME
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
              styles.footerText,
            ]}
          >
            Espace partenaire opérationnel
          </Text>

        </View>

      </ScrollView>

    </View>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({

  /* ==========================================================
   * ROOT
   * ========================================================== */

  screen: {
    flex: 1,

    backgroundColor:
      colors.background.default,
  },

  content: {
    paddingHorizontal:
      spacing.screenHorizontal,

    paddingTop:
      60,

    paddingBottom:
      spacing.huge + 50,
  },


  /* ==========================================================
   * LOADING
   * ========================================================== */

  loadingScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      colors.background.default,
  },

  loadingText: {
    marginTop:
      spacing.md,

    color:
      colors.text.secondary,
  },


  /* ==========================================================
   * ERROR
   * ========================================================== */

  errorScreen: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal:
      spacing.screenHorizontal,

    backgroundColor:
      colors.background.default,
  },

  errorIcon: {
    width: 76,
    height: 76,

    borderRadius:
      radii.circle,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      colors.error.light,

    marginBottom:
      spacing.lg,
  },

  errorTitle: {
    textAlign: 'center',

    color:
      colors.text.primary,
  },

  errorMessage: {
    textAlign: 'center',

    color:
      colors.text.secondary,

    marginTop:
      spacing.sm,

    marginBottom:
      spacing.xl,
  },

  retryButton: {
    height:
      components
        .button
        .height
        .md,

    paddingHorizontal:
      components
        .button
        .paddingHorizontal,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: spacing.xs,

    borderRadius:
      components
        .button
        .radius,

    backgroundColor:
      colors.brand.primary,
  },

  retryButtonText: {
    color:
      colors.text.inverse,
  },


  /* ==========================================================
   * HEADER
   * ========================================================== */

  header: {
    flexDirection: 'row',

    justifyContent:
      'space-between',

    alignItems: 'center',

    marginBottom:
      spacing.lg,
  },

  headerText: {
    flex: 1,

    paddingRight:
      spacing.md,
  },

  greeting: {
    color:
      colors.brand.primary,
  },

  subtitle: {
    color:
      colors.text.secondary,

    marginTop:
      spacing.xs,
  },

  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileAvatar: {
    width:
      components.avatar.md,

    height:
      components.avatar.md,

    borderRadius:
      components.avatar.radius,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      components.avatar.backgroundColor,

    ...require('../../theme/theme').shadows.card,
  },

  profileInitial: {
    fontFamily:
      'Baloo2_700Bold',

    fontWeight:
      '800',

    fontSize:
      fontSizes.lg,

    color:
      colors.text.inverse,
  },


  /* ==========================================================
   * OPERATION CARD
   * ========================================================== */

  operationCard: {
    marginBottom:
      spacing.lg,

    ...require('../../theme/theme').shadows.button,
  },

  operationHeader: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent:
      'space-between',
  },

  operationTitleWrapper: {
    flex: 1,
  },

  whiteCaption: {
    color:
      colors.palette.gray100,
  },

  operationValue: {
    marginTop:
      spacing.xxs,
  },

  operationSubtitle: {
    color:
      'rgba(255,255,255,0.78)',

    marginTop:
      spacing.xxs,
  },

  operationIcon: {
    width: 48,
    height: 48,

    borderRadius:
      radii.md,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  operationDivider: {
    height: 1,

    backgroundColor:
      'rgba(255,255,255,0.18)',

    marginVertical:
      spacing.lg,
  },

  operationBottom: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  operationStat: {
    flex: 1,
  },

  whiteValue: {
    color:
      colors.text.inverse,

    marginTop:
      spacing.xxs,
  },

  verticalDivider: {
    width: 1,
    height: 32,

    backgroundColor:
      'rgba(255,255,255,0.18)',

    marginHorizontal:
      spacing.sm,
  },


  /* ==========================================================
   * SECTIONS
   * ========================================================== */

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

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
      colors.text.secondary,
  },

  link: {
    color:
      colors.text.link,
  },


  /* ==========================================================
   * QUICK ACTIONS
   * ========================================================== */

  quickActions: {
    gap: spacing.sm,
  },

  quickAction: {
    minHeight: 70,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal:
      spacing.md,

    paddingVertical:
      spacing.sm,

    borderRadius:
      components
        .card
        .radius,

    backgroundColor:
      components
        .card
        .backgroundColor,

    borderWidth:
      components
        .card
        .borderWidth,

    borderColor:
      components
        .card
        .borderColor,

    ...require('../../theme/theme').shadows.card,
  },

  quickActionPressed: {
    opacity:
      0.84,

    backgroundColor:
      colors.overlay.pressed,
  },

  quickActionIcon: {
    width: 42,
    height: 42,

    borderRadius:
      radii.sm,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight:
      spacing.sm,
  },

  quickActionContent: {
    flex: 1,
  },

  quickActionTitle: {
    fontSize:
      fontSizes.sm,

    lineHeight:
      fontSizes.sm + 3,
  },

  quickActionSubtitle: {
    marginTop:
      2,

    color:
      colors.text.tertiary,
  },


  /* ==========================================================
   * TRANSACTIONS
   * ========================================================== */

  transactionsCard: {
    padding:
      spacing.md,
  },


  /* ==========================================================
   * PRIORITY
   * ========================================================== */

  priorityCard: {
    marginTop:
      spacing.md,

    flexDirection: 'row',

    alignItems: 'flex-start',

    backgroundColor:
      colors.warning.light,

    borderColor:
      colors.warning.border,
  },

  priorityIcon: {
    width: 44,
    height: 44,

    borderRadius:
      radii.circle,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      colors.background.surface,

    marginRight:
      spacing.sm,
  },

  priorityContent: {
    flex: 1,
  },

  priorityTitle: {
    color:
      colors.warning.text,

    fontSize:
      fontSizes.sm,

    lineHeight:
      fontSizes.sm + 4,
  },

  priorityText: {
    color:
      colors.warning.text,

    marginTop:
      spacing.xxs,
  },

  priorityButton: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.xxs,

    marginTop:
      spacing.sm,

    alignSelf:
      'flex-start',
  },

  priorityButtonText: {
    color:
      colors.brand.primary,

    fontSize:
      fontSizes.sm,
  },


  /* ==========================================================
   * SETTLEMENTS
   * ========================================================== */

  settlementsCard: {
    padding:
      spacing.md,
  },

  settlementRow: {
    flexDirection: 'row',

    alignItems: 'center',

    minHeight: 72,

    paddingVertical:
      spacing.sm,
  },

  settlementIcon: {
    width: 42,
    height: 42,

    borderRadius:
      radii.sm,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      colors.info.light,

    marginRight:
      spacing.sm,
  },

  settlementContent: {
    flex: 1,

    minWidth: 0,
  },

  settlementTitle: {
    fontSize:
      fontSizes.sm,

    lineHeight:
      fontSizes.sm + 3,
  },

  settlementDate: {
    marginTop:
      2,

    color:
      colors.text.tertiary,
  },

  settlementReference: {
    marginTop:
      2,

    color:
      colors.text.tertiary,
  },

  settlementRight: {
    alignItems:
      'flex-end',

    marginLeft:
      spacing.sm,
  },

  settlementAmount: {
    marginBottom:
      spacing.xxs,
  },

  rowPressed: {
    backgroundColor:
      colors.overlay.pressed,
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
  },


  /* ==========================================================
   * KMERDIASPORA
   * ========================================================== */

  metricsRow: {
    flexDirection: 'row',

    gap: spacing.sm,
  },

  statCard: {
    flex: 1,

    minHeight: 132,

    padding:
      spacing.md,
  },

  statHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  statIcon: {
    width: 38,
    height: 38,

    borderRadius:
      radii.sm,

    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    fontSize:
      fontSizes.xl,

    marginTop:
      spacing.sm,
  },

  statLabel: {
    color:
      colors.text.secondary,

    marginTop:
      spacing.xxs,
  },

  matchingBanner: {
    flexDirection: 'row',

    alignItems: 'center',

    minHeight: 72,

    marginTop:
      spacing.sm,

    padding:
      spacing.md,

    borderRadius:
      components
        .card
        .radius,

    backgroundColor:
      colors.background.surface,

    borderWidth:
      components
        .card
        .borderWidth,

    borderColor:
      colors.border.light,

    ...require('../../theme/theme').shadows.card,
  },

  matchingIcon: {
    width: 42,
    height: 42,

    borderRadius:
      radii.sm,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      colors.brand.primaryLight,

    marginRight:
      spacing.sm,
  },

  matchingContent: {
    flex: 1,
  },

  matchingTitle: {
    fontSize:
      fontSizes.sm,
  },

  matchingSubtitle: {
    marginTop:
      2,

    color:
      colors.text.tertiary,
  },


  /* ==========================================================
   * FOOTER
   * ========================================================== */

  footerStatus: {
    flexDirection: 'row',

    alignItems: 'center',
    justifyContent:
      'center',

    marginTop:
      spacing.xl,

    paddingBottom:
      spacing.xl,
  },

  statusDot: {
    width: 8,
    height: 8,

    borderRadius:
      radii.circle,

    backgroundColor:
      colors.success.default,

    marginRight:
      spacing.xs,
  },

  footerText: {
    color:
      colors.text.tertiary,
  },

});