import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  components,
  transactionTypeColors,
  fontWeights,
  lineHeights,
} from '../../../theme/theme';

import {
  formatAmount,
} from '../../../utils/formatters';

import Button from '../../../components/Button';

import {
  getTransaction,
} from '../../../services/adminService';

import {
  supabase,
} from '../../../lib/supabase';

import {
  Screen,
  Loading,
  ErrorBox,
} from '../AdminUI';


/* ============================================================
 * CONSTANTS
 * ============================================================ */

const TYPE_ICONS = {
  deposit:
    'arrow-down-circle',

  transfer:
    'swap-horizontal',

  withdrawal:
    'arrow-up-circle',
};

const TERMINAL_STATUSES = [
  'completed',
  'confirmed',
  'rejected',
  'cancelled',
];


/* ============================================================
 * ADMIN TRANSACTION ACTION
 * ============================================================ */

/**
 * Toutes les actions administrateur passent par l'Edge Function
 * `admin-transaction-action`.
 */
async function executeAdminTransactionAction({
  transactionId,
  action,
  reason = null,
}) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (!action) {
    throw new Error(
      'Action de transaction requise.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'admin-transaction-action',
      {
        body: {
          transactionId,

          action,

          reason:
            reason
              ? String(
                  reason
                ).trim()
              : null,
        },
      }
    );

  if (error) {
    let message =
      error?.message ||
      'Impossible de traiter la transaction.';

    try {
      const context =
        error?.context;

      if (
        context &&
        typeof context.json ===
          'function'
      ) {
        const body =
          await context.json();

        if (
          body?.message
        ) {
          message =
            body.message;
        }
      }
    } catch (_) {
      // Message Supabase conservé.
    }

    const actionError =
      new Error(
        message
      );

    actionError.code =
      data?.code ||
      error?.code ||
      null;

    actionError.details =
      data ||
      null;

    throw actionError;
  }

  if (
    data?.success ===
    false
  ) {
    const actionError =
      new Error(
        data?.message ||
          'Impossible de traiter la transaction.'
      );

    actionError.code =
      data?.code ||
      null;

    actionError.details =
      data;

    throw actionError;
  }

  return (
    data?.transaction ||
    data
  );
}


async function approveTransaction({
  transactionId,
}) {
  return executeAdminTransactionAction({
    transactionId,

    action:
      'approve',
  });
}


async function rejectTransaction({
  transactionId,
  reason,
}) {
  return executeAdminTransactionAction({
    transactionId,

    action:
      'reject',

    reason,
  });
}


async function cancelTransaction({
  transactionId,
  reason,
}) {
  return executeAdminTransactionAction({
    transactionId,

    action:
      'cancel',

    reason,
  });
}


/* ============================================================
 * STATUS
 * ============================================================ */

function getStatusBanner(
  status
) {
  if (
    status ===
      'confirmed' ||
    status ===
      'completed'
  ) {
    return {
      title:
        'Transaction confirmée',

      badge:
        'Confirmée',

      color:
        colors.success.default,
    };
  }

  if (
    status ===
    'rejected'
  ) {
    return {
      title:
        'Transaction rejetée',

      badge:
        'Rejetée',

      color:
        colors.error.default,
    };
  }

  if (
    status ===
    'cancelled'
  ) {
    return {
      title:
        'Transaction annulée',

      badge:
        'Annulée',

      color:
        colors.text.tertiary,
    };
  }

  return {
    title:
      'Transaction en cours',

    badge:
      'En attente',

    color:
      colors.brand.primary,
  };
}


/* ============================================================
 * DATE
 * ============================================================ */

function fmtDT(
  iso
) {
  if (!iso) {
    return null;
  }

  const d =
    new Date(iso);

  const date =
    d.toLocaleDateString(
      'fr-FR',
      {
        day:
          '2-digit',

        month:
          'long',

        year:
          'numeric',
      }
    );

  const time =
    d.toLocaleTimeString(
      'fr-FR',
      {
        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    );

  return `${date} - ${time}`;
}


function fmtDate(
  iso
) {
  if (!iso) {
    return null;
  }

  return new Date(
    iso
  ).toLocaleDateString(
    'fr-FR',
    {
      day:
        '2-digit',

      month:
        'long',

      year:
        'numeric',
    }
  );
}


/* ============================================================
 * TIMELINE
 * ============================================================ */

function buildSteps(
  t
) {
  const success =
    t.status ===
      'confirmed' ||
    t.status ===
      'completed';

  const stopped =
    t.status ===
      'rejected' ||
    t.status ===
      'cancelled';

  const steps = [
    {
      key:
        'created',

      label:
        'Demande initiée',

      timestamp:
        t.created_at,

      done:
        true,
    },

    {
      key:
        'review',

      label:
        'Paiement validé',

      timestamp:
        t.first_reviewed_at,

      done:
        !!t.executed_at ||
        success,
    },

    {
      key:
        'execution',

      label:
        "En attente d'exécution",

      timestamp:
        t.executed_at,

      done:
        !!t.settled_at ||
        success,
    },

    {
      key:
        'confirmation',

      label:
        'Confirmation administrateur',

      timestamp:
        t.settled_at,

      done:
        success,
    },
  ];

  const pendingIndex =
    steps.findIndex(
      (
        s
      ) => !s.done
    );

  return steps.map(
    (
      s,
      i
    ) => ({
      ...s,

      isCurrent:
        !stopped &&
        i ===
          pendingIndex,

      isStopped:
        stopped &&
        i ===
          pendingIndex,
    })
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function AdminTransactionDetailScreen({
  route,
  navigation,
}) {
  const {
    transactionId,
  } =
    route.params;

  const [
    d,
    setD,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState(null);

  const [
    infoExpanded,
    setInfoExpanded,
  ] =
    useState(false);

  const [
    rejectModalVisible,
    setRejectModalVisible,
  ] =
    useState(false);

  const [
    rejectReason,
    setRejectReason,
  ] =
    useState('');

  const [
    rejectReasonError,
    setRejectReasonError,
  ] =
    useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        try {
          setError(
            null
          );

          const result =
            await getTransaction(
              transactionId
            );

          setD(
            result
          );
        } catch (
          e
        ) {
          console.error(
            '[AdminTransactionDetail] load:',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger la transaction.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        transactionId,
      ]
    );


  useEffect(
    () => {
      load();
    },
    [load]
  );


  /* ==========================================================
   * ACTION
   * ========================================================== */

  const act =
    async (
      fn,
      title,
      options = {}
    ) => {
      try {
        if (
          typeof fn !==
          'function'
        ) {
          throw new Error(
            'Action administrative indisponible.'
          );
        }

        setActionLoading(
          true
        );

        await fn({
          transactionId,

          ...(options.reason
            ? {
                reason:
                  options.reason,
              }
            : {}),
        });

        Alert.alert(
          title,
          'Opération enregistrée.'
        );

        await load();
      } catch (
        e
      ) {
        console.error(
          '[AdminTransactionDetail] action:',
          e
        );

        let message =
          e?.message ||
          'Une erreur est survenue.';

        if (
          e?.code ===
          'INVALID_TRANSACTION_STATUS'
        ) {
          message =
            e?.message ||
            'Cette transaction ne peut plus être modifiée depuis son statut actuel.';
        }

        if (
          e?.code ===
          'ACCOUNT_DISABLED'
        ) {
          message =
            'Votre compte administrateur est désactivé.';
        }

        Alert.alert(
          'Erreur',
          message
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };


  /* ==========================================================
   * CONFIRM DIALOG
   * ========================================================== */

  const confirmAct =
    (
      fn,
      title,
      question,
      options = {}
    ) => {
      Alert.alert(
        title,
        question,
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Confirmer',

            style:
              options.destructive
                ? 'destructive'
                : 'default',

            onPress:
              () =>
                act(
                  fn,
                  title,
                  options
                ),
          },
        ]
      );
    };


  /* ==========================================================
   * REJECT MODAL
   * ========================================================== */

  const openRejectModal = () => {
    if (actionLoading) {
      return;
    }

    setRejectReason('');
    setRejectReasonError(null);
    setRejectModalVisible(true);
  };


  const closeRejectModal = () => {
    if (actionLoading) {
      return;
    }

    setRejectModalVisible(false);
    setRejectReason('');
    setRejectReasonError(null);
  };


  const submitReject = async () => {
    const reason =
      String(rejectReason || '')
        .trim();

    if (!reason) {
      setRejectReasonError(
        'Veuillez entrer le motif du rejet.'
      );

      return;
    }

    if (reason.length < 3) {
      setRejectReasonError(
        'Le motif doit contenir au moins 3 caractères.'
      );

      return;
    }

    setRejectReasonError(null);
    setRejectModalVisible(false);

    try {
      await act(
        rejectTransaction,
        'Transaction rejetée',
        {
          reason,
          destructive: true,
        }
      );
    } finally {
      setRejectReason('');
    }
  };


  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <Screen
        title="Transaction"
      >
        <Loading
          label="Chargement de la transaction…"
        />
      </Screen>
    );
  }


  /* ==========================================================
   * ERROR
   * ========================================================== */

  if (error) {
    return (
      <Screen
        title="Transaction"
      >
        <ErrorBox
          message={
            error
          }
          onRetry={
            load
          }
        />
      </Screen>
    );
  }


  if (!d?.transaction) {
    return (
      <Screen
        title="Transaction"
      >
        <ErrorBox
          message="Transaction introuvable."
          onRetry={
            load
          }
        />
      </Screen>
    );
  }


  /* ==========================================================
   * DATA
   * ========================================================== */

  const t =
    d.transaction;

  const terminal =
    TERMINAL_STATUSES.includes(
      t.status
    );

  const typeMeta =
    transactionTypeColors[
      t.type
    ] ||
    transactionTypeColors.transfer;

  const typeIcon =
    TYPE_ICONS[
      t.type
    ] ||
    'document-text-outline';

  const banner =
    getStatusBanner(
      t.status
    );

  const executionProofs =
    Array.isArray(
      d.executionProofs
    )
      ? d.executionProofs
      : [];

  const hasExecutionProof =
    executionProofs.length >
    0;

  const shortRef =
    t.id
      ? `TXN-${String(t.id)
          .slice(
            0,
            3
          )
          .toUpperCase()}-${String(t.id)
          .slice(
            3,
            7
          )
          .toUpperCase()}`
      : '—';

  const rawNetwork =
    t.network ||
    t.payment_method ||
    t.momo_provider ||
    null;

  const network =
    typeof rawNetwork ===
      'string' ||
    typeof rawNetwork ===
      'number'
      ? String(rawNetwork)
      : null;

  const steps =
    buildSteps(
      t
    );

  const allDone =
    steps.every(
      (
        s
      ) =>
        s.done
    );


  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <Screen
      title={
        typeMeta.label ||
        'Transaction'
      }
    >
      <ScrollView
        contentContainerStyle={
          local.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ====================================================
         * STATUS + REFERENCE
         * ==================================================== */}

        <View
          style={[
            local.banner,
            {
              backgroundColor:
                banner.color,
            },
          ]}
        >
          <View
            style={
              local.bannerRow
            }
          >
            <View
              style={
                local.bannerIconWrap
            }
          >
            <Ionicons
              name="checkmark"
              size={15}
              color={
                banner.color
              }
            />
          </View>

            <Text
              style={[
                typography.caption,
                local.bannerTitle,
                {
                  fontWeight:
                    fontWeights.bold,
                },
              ]}
              numberOfLines={1}
            >
              {
                banner.title
              }
            </Text>

            <View
              style={
                local.bannerBadge
              }
            >
              <Text
                style={
                  local.bannerBadgeText
                }
              >
                {
                  banner.badge
                }
              </Text>
            </View>
          </View>

          <View
            style={
              local.bannerMetaRow
            }
          >
            <Text
              style={
                local.bannerMeta
              }
            >
              {
                shortRef
              }
            </Text>

            <Text
              style={
                local.bannerMeta
              }
            >
              {
                fmtDate(
                  t.created_at
                )
              }
            </Text>
          </View>
        </View>


        {/* ====================================================
         * AMOUNT
         * ==================================================== */}

        <View
          style={
            local.card
          }
        >
          <View
            style={{
              flex: 1,

              flexDirection:
                'row',

              alignItems:
                'center',

              gap:
                spacing.xs,
            }}
          >
            <View
              style={[
                local.amountIconWrap,
                {
                  backgroundColor:
                    typeMeta.background,
                },
              ]}
            >
              <Ionicons
                name={
                  typeIcon
                }
                size={
                  24
                }
                color={
                  typeMeta.color
                }
              />
            </View>

            <Text
              style={[
                typography.amountMd,
                {
                  color:
                    typeMeta.color,

                  bottom:
                    4,
                },
              ]}
            >
              {
                typeMeta.label
              }
            </Text>
          </View>

          <Text
            style={[
              typography.caption,
              {
                lineHeight:
                  spacing.md *
                  1.4,

                fontWeight:
                  fontWeights.semiBold,
              },
            ]}
          >
            {
              formatAmount(
                t.amount
              )
            }
          </Text>
        </View>


        {/* ====================================================
         * PARTIES
         * ==================================================== */}

        <View
          style={
            local.partiesCard
          }
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                local.partyLabel
              }
            >
              Expéditeur
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  fontWeight:
                    fontWeights.semiBold,
                },
              ]}
              numberOfLines={1}
            >
              {
                typeof t.profiles?.username ===
                  'string'
                  ? t.profiles.username
                  : 'Utilisateur'
              }
            </Text>

            <Text
              style={
                typography.caption
              }
              numberOfLines={1}
            >
              {
                typeof t.profiles?.whatsapp_number ===
                  'string'
                  ? t.profiles.whatsapp_number
                  : network ||
                    '—'
              }
            </Text>
          </View>

          <View
            style={
              local.partiesDivider
            }
          />

          <View
            style={{
              flex: 1,

              justifyContent:
                'flex-end',

              alignItems:
                'flex-end',
            }}
          >
            <Text
              style={
                local.partyLabel
              }
            >
              Bénéficiaire
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  fontWeight:
                    fontWeights.semiBold,
                },
              ]}
              numberOfLines={1}
            >
              {
                typeof t.recipient_name ===
                  'string'
                  ? t.recipient_name
                  : 'Non renseigné'
              }
            </Text>

            <Text
              style={
                typography.caption
              }
              numberOfLines={1}
            >
              {
                typeof t.recipient_mobile_number ===
                  'string'
                  ? t.recipient_mobile_number
                  : network ||
                    '—'
              }
            </Text>
          </View>
        </View>


        {/* ====================================================
         * GENERAL INFORMATION
         * ==================================================== */}

        <Pressable
          style={
            local.collapseHeader
          }
          onPress={() =>
            setInfoExpanded(
              (
                v
              ) =>
                !v
            )
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={
              colors.text.secondary
            }
          />

          <Text
            style={[
              typography.caption,
              {
                flex: 1,
              },
            ]}
          >
            Informations générales
          </Text>

          <Ionicons
            name={
              infoExpanded
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={16}
            color={
              colors.text.tertiary
            }
          />
        </Pressable>

        {infoExpanded ? (
          <View
            style={
              local.infoSection
            }
          >
            <InfoRow
              icon="calendar-outline"
              label="Date de demande"
              value={
                fmtDT(
                  t.created_at
                )
              }
            />

            <InfoRow
              icon="person-outline"
              label="Nom du bénéficiaire"
              value={
                t.recipient_name ||
                '—'
              }
            />

            {network ? (
              <InfoRow
                icon="card-outline"
                label="Réseau"
                value={
                  network
                }
                last
              />
            ) : null}
          </View>
        ) : null}


        {/* ====================================================
         * TRACKING + PROOF
         * ==================================================== */}

        <View
          style={
            local.card
          }
        >
          <View
            style={
              local.suiviHeader
            }
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={
                colors.text.primary
              }
            />

            <Text
              style={[
                typography.bodyBold,
                {
                  flex: 1,
                },
              ]}
            >
              Suivi
            </Text>

            <View
              style={[
                local.suiviBadge,
                {
                  backgroundColor:
                    allDone
                      ? colors.success.light
                      : colors.brand.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  typography.overline,
                  {
                    color:
                      allDone
                        ? colors.success.text
                        : colors.brand.primary,
                  },
                ]}
              >
                {
                  allDone
                    ? 'Terminé'
                    : 'En cours'
                }
              </Text>
            </View>
          </View>


          {steps.map(
            (
              step,
              i
            ) => (
              <StepRow
                key={
                  step.key
                }
                step={
                  step
                }
                isLast={
                  i ===
                  steps.length -
                    1
                }
              />
            )
          )}


          <View
            style={
              local.proofRow
            }
          >
            <Ionicons
              name="image-outline"
              size={15}
              color={
                colors.text.tertiary
              }
            />

            <Text
              style={[
                typography.caption,
                {
                  flex: 1,
                },
              ]}
            >
              {hasExecutionProof
                ? `${executionProofs.length} preuve${
                    executionProofs.length >
                    1
                      ? 's'
                      : ''
                  }`
                : 'Aucune preuve ajoutée'}
            </Text>

            <Pressable
              style={({
                pressed,
              }) => [
                local.proofButton,

                pressed && {
                  opacity:
                    0.85,
                },
              ]}
              onPress={() =>
                navigation.navigate(
                  'AdminTransactionProof',
                  {
                    transactionId,
                  }
                )
              }
            >
              <Text
                style={
                  local.proofButtonText
                }
              >
                {
                  hasExecutionProof
                    ? 'Voir'
                    : 'Ajouter'
                }
              </Text>
            </Pressable>
          </View>
        </View>


        {/* ====================================================
         * CANCEL
         * ==================================================== */}

        {!terminal ? (
          <Pressable
            style={
              local.cancelLink
            }
            disabled={
              actionLoading
            }
            onPress={() =>
              confirmAct(
                cancelTransaction,

                'Transaction annulée',

                'Voulez-vous annuler définitivement cette transaction ?',

                {
                  destructive:
                    true,

                  reason:
                    'Annulation administrative',
                }
              )
            }
          >
            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors.text.tertiary,
                },
              ]}
            >
              Annuler la transaction
            </Text>
          </Pressable>
        ) : null}


        {/* ====================================================
         * TERMINAL NOTICE / ACTIONS
         * ==================================================== */}

        {terminal ? (
          <View
            style={
              local.notice
            }
          >
            <Ionicons
              name="lock-closed-outline"
              size={15}
              color={
                components
                  .infoBanner
                  .iconColor
              }
            />

            <Text
              style={[
                typography.caption,
                {
                  color:
                    components
                      .infoBanner
                      .textColor,

                  flex: 1,

                  lineHeight:
                    lineHeights.md,
                },
              ]}
            >
              Transaction clôturée — aucune action n'est disponible pour ce statut.
            </Text>
          </View>
        ) : (
          <View
            style={
              local.bottomActionsRow
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Button
                title="Rejeter"
                variant="outline"
                loading={
                  actionLoading
                }
                disabled={
                  actionLoading
                }
                onPress={
                  openRejectModal
                }
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Button
                title="Confirmer"
                variant="primary"
                loading={
                  actionLoading
                }
                disabled={
                  actionLoading
                }
                onPress={() =>
                  act(
                    approveTransaction,
                    'Transaction confirmée'
                  )
                }
              />
            </View>
          </View>
        )}
      </ScrollView>


      {/* ====================================================
       * REJECT MODAL
       * ==================================================== */}

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <KeyboardAvoidingView
          style={local.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <Pressable
            style={local.modalBackdrop}
            onPress={closeRejectModal}
          />

          <View
            style={
              local.rejectModal
            }
          >
            <View
              style={
                local.rejectModalHeader
              }
            >
              <View
                style={
                  local.rejectModalIcon
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={22}
                  color={
                    colors.error.default
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
                    typography.bodyBold,
                    local.rejectModalTitle,
                  ]}
                >
                  Rejeter la transaction
                </Text>

                <Text
                  style={[
                    typography.caption,
                    local.rejectModalSubtitle,
                  ]}
                >
                  Indiquez pourquoi cette transaction est rejetée.
                </Text>
              </View>
            </View>


            <Text
              style={[
                typography.caption,
                local.rejectInputLabel,
              ]}
            >
              Motif du rejet
            </Text>


            <TextInput
              value={
                rejectReason
              }

              onChangeText={(
                value
              ) => {
                setRejectReason(
                  value
                );

                if (
                  rejectReasonError
                ) {
                  setRejectReasonError(
                    null
                  );
                }
              }}

              placeholder="Ex. paiement non reçu ou informations incorrectes"

              placeholderTextColor={
                colors.text.tertiary
              }

              multiline

              maxLength={
                500
              }

              textAlignVertical="top"

              editable={
                !actionLoading
              }

              style={[
                local.rejectInput,

                rejectReasonError &&
                  local.rejectInputError,
              ]}
            />


            <View
              style={
                local.rejectCounterRow
              }
            >
              {rejectReasonError ? (
                <Text
                  style={[
                    typography.caption,
                    local.rejectErrorText,
                  ]}
                >
                  {
                    rejectReasonError
                  }
                </Text>
              ) : (
                <Text
                  style={[
                    typography.caption,
                    local.rejectHelpText,
                  ]}
                >
                  Ce motif sera enregistré dans l'historique de la transaction.
                </Text>
              )}

              <Text
                style={[
                  typography.caption,
                  local.rejectCounter,
                ]}
              >
                {
                  rejectReason.length
                }/500
              </Text>
            </View>


            <View
              style={
                local.rejectModalActions
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Button
                  title="Annuler"
                  variant="outline"
                  disabled={
                    actionLoading
                  }
                  onPress={
                    closeRejectModal
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Button
                  title="Rejeter"
                  variant="primary"
                  loading={
                    actionLoading
                  }
                  disabled={
                    actionLoading
                  }
                  onPress={
                    submitReject
                  }
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}


/* ============================================================
 * INFO ROW
 * ============================================================ */

function normalizeInfoValue(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  if (
    typeof value ===
      'string' ||
    typeof value ===
      'number' ||
    typeof value ===
      'boolean'
  ) {
    return String(value);
  }

  try {
    const json =
      JSON.stringify(
        value
      );

    return json || '—';
  } catch {
    return '—';
  }
}


function InfoRow({
  icon,
  label,
  value,
  last,
}) {
  return (
    <View
      style={[
        local.infoRow,
        !last &&
          local.infoRowBorder,
      ]}
    >
      <Ionicons
        name={
          icon
        }
        size={14}
        color={
          colors.text.tertiary
        }
      />

      <Text
        style={[
          typography.caption,
          {
            flex: 1,
          },
        ]}
        numberOfLines={
          2
        }
      >
        {
          normalizeInfoValue(
            label
          )
        }
      </Text>

      <Text
        style={[
          typography.caption,
          {
            fontWeight:
              fontWeights.regular,

            flexShrink:
              1,

            maxWidth:
              '60%',
          },
        ]}
        numberOfLines={
          2
        }
      >
        {
          normalizeInfoValue(
            value
          )
        }
      </Text>
    </View>
  );
}


/* ============================================================
 * STEP ROW
 * ============================================================ */

function StepRow({
  step,
  isLast,
}) {
  const icon =
    step.isStopped
      ? 'close-circle'
      : step.done
        ? 'checkmark-circle'
        : step.isCurrent
          ? 'ellipse'
          : 'ellipse-outline';

  const color =
    step.isStopped
      ? colors.error.default
      : step.done ||
          step.isCurrent
        ? colors.brand.primary
        : colors.border.default;

  const dateLabel =
    step.timestamp
      ? fmtDT(
          step.timestamp
        )
      : step.isCurrent
        ? 'En cours de traitement'
        : 'À venir';

  return (
    <View
      style={[
        local.stepRow,
        step.isCurrent &&
          local.stepRowCurrent,
      ]}
    >
      <View
        style={
          local.stepRail
        }
      >
        <Ionicons
          name={
            icon
          }
          size={
            16
          }
          color={
            color
          }
        />

        {!isLast ? (
          <View
            style={[
              local.stepLine,

              (
                step.done ||
                step.isCurrent
              ) && {
                backgroundColor:
                  colors
                    .brand
                    .primary,
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={{
          flex: 1,

          paddingBottom:
            isLast
              ? spacing.xxs
              : spacing.sm,

          bottom:
            10,
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              fontWeight:
                fontWeights.semiBold,
            },

            step.isCurrent && {
              color:
                colors
                  .brand
                  .primary,
            },
          ]}
          numberOfLines={
            1
          }
        >
          {
            step.label
          }
        </Text>

        <Text
          style={[
            typography.caption,
            {
              lineHeight:
                lineHeights.md,
            },
          ]}
        >
          {
            dateLabel
          }
        </Text>
      </View>
    </View>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const local =
  StyleSheet.create({
    /* ------------------------------------------
     * REJECT MODAL
     * ------------------------------------------ */

    modalOverlay: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.md,
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        'rgba(15, 23, 42, 0.55)',
    },

    rejectModal: {
      width:
        '100%',

      maxWidth:
        520,

      backgroundColor:
        colors.background.surface,

      borderRadius:
        radii.lg ||
        radii.md,

      padding:
        spacing.lg,

      ...shadows.modal,
    },

    rejectModalHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        spacing.sm,

      marginBottom:
        spacing.lg,
    },

    rejectModalIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        radii.circle,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.error.light,
    },

    rejectModalTitle: {
      marginBottom:
        3,
    },

    rejectModalSubtitle: {
      color:
        colors.text.secondary,

      lineHeight:
        lineHeights.md,
    },

    rejectInputLabel: {
      fontWeight:
        fontWeights.semiBold,

      marginBottom:
        spacing.xs,
    },

    rejectInput: {
      minHeight:
        120,

      borderWidth:
        1,

      borderColor:
        colors.border.default,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.default,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        spacing.md,

      color:
        colors.text.primary,

      fontSize:
        14,

      lineHeight:
        20,
    },

    rejectInputError: {
      borderColor:
        colors.error.default,
    },

    rejectCounterRow: {
      minHeight:
        36,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        spacing.sm,

      marginTop:
        spacing.xs,
    },

    rejectHelpText: {
      flex: 1,

      color:
        colors.text.secondary,

      lineHeight:
        lineHeights.md,
    },

    rejectErrorText: {
      flex: 1,

      color:
        colors.error.default,

      lineHeight:
        lineHeights.md,
    },

    rejectCounter: {
      color:
        colors.text.tertiary,

      minWidth:
        48,

      textAlign:
        'right',
    },

    rejectModalActions: {
      flexDirection:
        'row',

      gap:
        spacing.sm,

      marginTop:
        spacing.md,
    },

    scroll: {
      paddingHorizontal:
        spacing.xxs,

      paddingTop:
        spacing.sm,

      paddingBottom:
        spacing.xl,

      gap:
        spacing.sm,
    },


    /* ------------------------------------------
     * STATUS
     * ------------------------------------------ */

    banner: {
      borderRadius:
        radii.sm,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        spacing.sm,
    },

    bannerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,
    },

    bannerIconWrap: {
      width:
        26,

      height:
        26,

      borderRadius:
        radii.circle,

      backgroundColor:
        colors.background.surface,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    bannerTitle: {
      flex: 1,

      color:
        colors.text.inverse,
    },

    bannerBadge: {
      backgroundColor:
        'rgba(255,255,255,0.22)',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        3,

      borderRadius:
        radii.pill,
    },

    bannerBadgeText: {
      ...typography.caption,

      lineHeight:
        spacing.md *
        1.4,

      color:
        colors.text.inverse,
    },

    bannerMetaRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      paddingLeft:
        26 +
        spacing.xs,
    },

    bannerMeta: {
      ...typography.caption,

      lineHeight:
        spacing.md *
        1.4,

      color:
        'rgba(255,255,255,0.85)',
    },


    /* ------------------------------------------
     * GENERIC CARD
     * ------------------------------------------ */

    card: {
      borderRadius:
        components.card.radius,

      backgroundColor:
        components.card.backgroundColor,

      borderWidth:
        components.card.borderWidth,

      borderColor:
        components.card.borderColor,

      padding:
        spacing.md,

      ...shadows.card,
    },


    /* ------------------------------------------
     * AMOUNT
     * ------------------------------------------ */

    amountIconWrap: {
      width:
        34,

      height:
        34,

      borderRadius:
        radii.circle,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        spacing.xs,
    },


    /* ------------------------------------------
     * PARTIES
     * ------------------------------------------ */

    partiesCard: {
      flexDirection:
        'row',

      alignItems:
        'stretch',

      width:
        '100%',

      justifyContent:
        'space-between',

      flex: 1,
    },

    partiesDivider: {
      width:
        components
          .divider
          .thickness,

      backgroundColor:
        colors
          .border
          .light,

      marginHorizontal:
        spacing.sm,
    },

    partyLabel: {
      ...typography.caption,

      color:
        colors
          .brand
          .primary,

      marginBottom:
        spacing.xxs,
    },


    /* ------------------------------------------
     * INFORMATION
     * ------------------------------------------ */

    collapseHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      paddingVertical:
        spacing.xs,
    },

    infoSection: {
      paddingBottom:
        spacing.xs,
    },

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      paddingVertical:
        spacing.xs,
    },

    infoRowBorder: {
      borderBottomWidth:
        components
          .divider
          .thickness,

      borderBottomColor:
        components
          .divider
          .color,
    },


    /* ------------------------------------------
     * TRACKING
     * ------------------------------------------ */

    suiviHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      marginBottom:
        spacing.xs,
    },

    suiviBadge: {
      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        3,

      borderRadius:
        radii.pill,
    },

    stepRow: {
      flexDirection:
        'row',

      gap:
        spacing.sm,
    },

    stepRowCurrent: {
      backgroundColor:
        colors
          .brand
          .primaryLight,

      marginHorizontal:
        -spacing.sm,

      paddingHorizontal:
        spacing.sm,

      borderRadius:
        radii.sm,
    },

    stepRail: {
      alignItems:
        'center',

      width:
        16,
    },

    stepLine: {
      flex: 1,

      width:
        components
          .divider
          .thickness *
        2,

      backgroundColor:
        colors
          .border
          .light,

      marginTop:
        2,

      minHeight:
        12,
    },


    /* ------------------------------------------
     * PROOF
     * ------------------------------------------ */

    proofRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      marginTop:
        spacing.xs,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        components
          .divider
          .thickness,

      borderTopColor:
        components
          .divider
          .color,
    },

    proofButton: {
      backgroundColor:
        colors
          .brand
          .primary,

      borderRadius:
        radii.pill,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.xxs,
    },

    proofButtonText: {
      ...typography.overline,

      color:
        colors
          .text
          .inverse,
    },


    /* ------------------------------------------
     * CANCEL
     * ------------------------------------------ */

    cancelLink: {
      alignItems:
        'center',

      paddingVertical:
        spacing.xxs,
    },


    /* ------------------------------------------
     * CLOSED NOTICE
     * ------------------------------------------ */

    notice: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      backgroundColor:
        components
          .infoBanner
          .backgroundColor,

      borderRadius:
        components
          .infoBanner
          .radius,

      padding:
        spacing.sm,
    },


    /* ------------------------------------------
     * ACTIONS
     * ------------------------------------------ */

    bottomActionsRow: {
      flexDirection:
        'row',

      gap:
        spacing.sm,
    },
  });