import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import {
  colors,
  typography,
  spacing,
  components,
  radii,
  fontSizes,
  lineHeights,
} from '../../theme/theme';

import { formatAmount } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useTransactions } from '../../hooks/useTransactions';
import { deleteTransaction } from '../../services/transactionService';

import {
  getMyWhatsappGroupRequest,
  requestWhatsappGroupJoin,
} from '../../services/whatsappGroupService';

import TransactionListItem from '../../components/TransactionListItem';
import TransactionActionSheet from '../../components/TransactionActionSheet';
import EmptyState from '../../components/EmptyState';

const KMA_BACKGROUND = require('../../../assets/images/KmBackground.png');

const QUICK_ACTIONS = [
  {
    key: 'DepositAmount',
    label: 'Recharge',
    icon: 'add-circle-outline',
  },
  {
    key: 'TransferDestination',
    label: 'Transfert',
    icon: 'swap-horizontal-outline',
  },
  {
    key: 'WithdrawalAmount',
    label: 'Retrait',
    icon: 'remove-circle-outline',
  },
];

const RECENT_LIMIT = 10;

/**
 * Dashboard utilisateur :
 * - solde
 * - actions rapides
 * - accès KmerDiaspora
 * - transactions récentes
 * - demande d'intégration au groupe WhatsApp
 */
export default function DashboardScreen({ navigation }) {
  const { profile } = useAuth();

  const {
    wallet,
    refresh: refreshWallet,
  } = useWallet();

  const {
    items,
    refreshing,
    refresh,
    removeLocally,
    reload,
  } = useTransactions();

  const [selectedTxn, setSelectedTxn] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [whatsappRequest, setWhatsappRequest] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const loadWhatsappRequest = async () => {
    try {
      const request = await getMyWhatsappGroupRequest();

      setWhatsappRequest(request);
    } catch (error) {
      console.error(
        '[Dashboard] Erreur demande groupe WhatsApp:',
        error
      );
    }
  };

  useEffect(() => {
    loadWhatsappRequest();
  }, []);

  const onRefresh = () => {
    refreshWallet();
    refresh();
    loadWhatsappRequest();
  };

  const handleWhatsappGroupRequest = async () => {
    if (whatsappLoading) {
      return;
    }

    if (whatsappRequest?.status === 'approved') {
      Toast.show({
        type: 'success',
        text1: 'Demande acceptée',
        text2:
          'Votre intégration au groupe KmerDiaspora a été validée.',
      });

      return;
    }

    if (whatsappRequest?.status === 'pending') {
      Toast.show({
        type: 'info',
        text1: 'Demande déjà envoyée',
        text2:
          'Votre demande d\'intégration au groupe KmerDiaspora est en cours de traitement',
      });

      return;
    }

    setWhatsappLoading(true);

    try {
      const request =
        await requestWhatsappGroupJoin();

      setWhatsappRequest(request);

      Toast.show({
        type: 'success',
        text1: 'Demande envoyée',
        text2:
          'Demande d\'intégration au Groupe KmerDiaspora envoyée.',
      });
    } catch (error) {
      console.error(
        '[Dashboard] Envoi demande WhatsApp:',
        error
      );

      Toast.show({
        type: 'error',
        text1:
          'Impossible d’envoyer la demande',
        text2:
          error?.message ||
          'Veuillez réessayer.',
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const openActionSheet = (
    transaction
  ) => {
    setSelectedTxn(transaction);
    setSheetVisible(true);
  };

  const closeActionSheet = () => {
    if (deleting) {
      return;
    }

    setSheetVisible(false);
  };

  const handleDelete = async () => {
    if (!selectedTxn) {
      return;
    }

    const transactionId =
      selectedTxn.id;

    setDeleting(true);

    try {
      await deleteTransaction(
        transactionId
      );

      removeLocally(
        transactionId
      );

      setSheetVisible(false);

      Toast.show({
        type: 'success',
        text1: 'Transaction supprimée',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: e.message,
      });

      reload();
    } finally {
      setDeleting(false);
    }
  };

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
        locations={[0, 0.38, 1]}
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

      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.h2,
                {
                  color:
                    colors.brand.primary,
                },
              ]}
            >
              Bonjour,{' '}
              {profile?.username ??
                '...'}
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors.text.secondary,
                  marginTop:
                    spacing.xs,
                },
              ]}
            >
              Aperçu de votre compte
            </Text>
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'Notifications'
              )
            }
            hitSlop={8}
          >
            <Ionicons
              name="notifications-sharp"
              size={24}
              color={
                colors.icon.default
              }
            />
          </Pressable>
        </View>

        <LinearGradient
          colors={
            components.balanceCard
              .gradient
          }
          style={[
            styles.balanceCard,
            {
              borderRadius:
                radii.md,
              padding:
                components
                  .balanceCard
                  .padding,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color:
                  colors.palette
                    .blue100,
                lineHeight:
                  fontSizes.sm *
                  1.4,
              },
            ]}
          >
            Solde disponible
          </Text>

          <Text
            style={
              typography.amountLg
            }
          >
            {formatAmount(
              wallet.available_balance
            )}
          </Text>

          <View
            style={
              styles.pendingRow
            }
          >
            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors.palette
                      .gray200,
                  lineHeight:
                    fontSizes.sm *
                    1.4,
                },
              ]}
            >
              Solde en attente
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors.palette
                      .gray200,
                  lineHeight:
                    fontSizes.sm *
                    1.4,
                },
              ]}
            >
              {formatAmount(
                wallet.pending_balance
              )}
            </Text>
          </View>
        </LinearGradient>

        <View
          style={styles.actionsRow}
        >
          {QUICK_ACTIONS.map(
            (action) => (
              <Pressable
                key={action.key}
                style={
                  styles.actionButton
                }
                onPress={() =>
                  navigation.navigate(
                    action.key
                  )
                }
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={
                    colors.text.primary
                  }
                />

                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        colors.text
                          .primary,
                      lineHeight:
                        fontSizes.sm *
                        1.4,
                      top: 2,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            )
          )}
        </View>

        <Pressable
          style={styles.kmerCard}
          onPress={() =>
            navigation.navigate(
              'KmerDiaspora'
            )
          }
        >
          <View
            style={styles.kmerIcon}
          >
            <Ionicons
              name="globe-outline"
              size={24}
              color={
                colors.brand.primary
              }
            />
          </View>

          <View
            style={{ flex: 1 }}
          >
            <Text
              style={[
                typography.h3,
                {
                  color:
                    colors.brand
                      .primaryDark,
                },
              ]}
            >
              KmerDiaspora
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  marginTop: 2,
                  lineHeight:
                    lineHeights.md -
                    2,
                },
              ]}
            >
              Emploi, recrutement et
              quêtes
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={
              colors.brand.primary
            }
          />
        </Pressable>

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={typography.h3}
          >
            Transactions récentes
          </Text>

          <Pressable
            onPress={() =>
              navigation.navigate(
                'History'
              )
            }
            hitSlop={8}
          >
            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors.text.link,
                  lineHeight:
                    fontSizes.sm *
                    1.4,
                },
              ]}
            >
              Voir tout
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={
          styles.listContent
        }
        data={items.slice(
          0,
          RECENT_LIMIT
        )}
        keyExtractor={(item) =>
          item.id
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            onPress={() =>
              navigation.navigate(
                'TransactionDetail',
                {
                  transactionId:
                    item.id,
                }
              )
            }
            onLongPress={
              openActionSheet
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Aucune transaction"
            subtitle="Vos dépôts, transferts et retraits apparaîtront ici."
          />
        }
      />

      <TransactionActionSheet
        visible={sheetVisible}
        transaction={
          selectedTxn
        }
        onClose={
          closeActionSheet
        }
        onDelete={
          handleDelete
        }
        deleting={deleting}
      />

      <Pressable
        onPress={
          handleWhatsappGroupRequest
        }
        disabled={
          whatsappLoading
        }
        accessibilityRole="button"
        accessibilityLabel="Demander à rejoindre le groupe WhatsApp"
        style={({ pressed }) => [
          styles.whatsappFloatingButton,
          pressed &&
            styles.whatsappFloatingButtonPressed,
          whatsappLoading &&
            styles.whatsappFloatingButtonDisabled,
        ]}
      >
        {whatsappLoading ? (
          <View
            style={
              styles.whatsappLoadingDot
            }
          >
            <Text
              style={
                styles.whatsappLoadingText
              }
            >
              …
            </Text>
          </View>
        ) : (
          <Ionicons
            name="logo-whatsapp"
            size={29}
            color={
              colors.text.inverse
            }
          />
        )}

        {whatsappRequest?.status ===
        'pending' ? (
          <View
            style={
              styles.whatsappPendingDot
            }
          />
        ) : null}

        {whatsappRequest?.status ===
        'approved' ? (
          <View
            style={
              styles.whatsappApprovedDot
            }
          >
            <Ionicons
              name="checkmark"
              size={10}
              color={
                colors.text.inverse
              }
            />
          </View>
        ) : null}
      </Pressable>
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

  fixedHeader: {
    paddingHorizontal:
      spacing.screenHorizontal,
    paddingTop: 60,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'flex-start',
    marginBottom:
      spacing.lg,
  },

  balanceCard: {
    marginBottom:
      spacing.xl,
  },

  pendingRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop:
      spacing.lg,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom:
      spacing.xxl,
  },

  kmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom:
      spacing.xxl,
    padding: spacing.md,
    borderRadius:
      radii.lg,
    backgroundColor:
      colors.background
        .surface,
    borderWidth: 1,
    borderColor:
      colors.brand
        .primaryLight,
  },

  kmerIcon: {
    width: 44,
    height: 44,
    borderRadius:
      radii.md,
    backgroundColor:
      colors.brand
        .primaryLight,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  whatsappFloatingButton: {
    position: 'absolute',
    right:
      spacing.screenHorizontal,
    bottom: 105,
    width: 58,
    height: 58,
    borderRadius:
      radii.circle,
    backgroundColor:
      '#25D366',
    alignItems: 'center',
    justifyContent:
      'center',
    shadowColor:
      colors.background
        .dark,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },

  whatsappFloatingButtonPressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  whatsappFloatingButtonDisabled: {
    opacity: 0.75,
  },

  whatsappPendingDot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor:
      colors.warning
        .default,
    borderWidth: 2,
    borderColor:
      colors.background
        .surface,
  },

  whatsappApprovedDot: {
    position: 'absolute',
    right: -1,
    top: -1,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 2,
    borderRadius: 8,
    backgroundColor:
      colors.success
        .default,
    borderWidth: 2,
    borderColor:
      colors.background
        .surface,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  whatsappLoadingDot: {
    alignItems: 'center',
    justifyContent:
      'center',
  },

  whatsappLoadingText: {
    color:
      colors.text.inverse,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal:
      spacing.md,
    height:
      components.button
        .height.sm,
    borderRadius:
      radii.xs,
    shadowColor:
      colors.background
        .dark,
    shadowOffset: {
      width: 2,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor:
      components.card
        .backgroundColor,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom:
      spacing.sm,
  },

  list: {
    flex: 1,
    backgroundColor:
      'transparent',
  },

  listContent: {
    paddingHorizontal:
      spacing.screenHorizontal,
    paddingBottom:
      spacing.huge,
    flexGrow: 1,
  },
});