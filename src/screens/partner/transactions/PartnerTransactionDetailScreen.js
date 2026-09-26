import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  Text,
  View,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  shadows,
  fontWeights,
  lineHeights,
} from '../../../theme/theme';

import {
  getTransaction,
  approveTransaction,
  rejectTransaction,
  confirmTransaction,
  executeTransaction,
  cancelTransaction,
} from '../../../services/partnerService';

import {
  useAuthorization,
} from '../../../context/AuthorizationContext';

import {
  formatAmount,
  formatDateTime,
} from '../../../utils/formatters';

import Card from
  '../../../components/Card';

import StatusBadge from
  '../../../components/StatusBadge';

import Button from
  '../../../components/Button';

import InfoBanner from
  '../../../components/InfoBanner';

import EmptyState from
  '../../../components/EmptyState';

export default function PartnerTransactionDetailScreen({
  route,
  navigation,
}) {
  const id =
    route?.params?.transactionId;

  const [
    data,
    setData,
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

  const {
    canConfirmTransaction,
    canApproveTransaction,
    canRejectTransaction,
    canExecuteTransaction,
    canCancelTransaction,
    isPartnerAdmin,
    isPartnerOperator,
  } = useAuthorization();

  const load =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setData(
            await getTransaction(
              id
            )
          );
        } catch (
          e
        ) {
          Alert.alert(
            'Erreur',
            e?.message ||
              'Impossible de charger la transaction.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [id]
    );

  useEffect(
    () => {
      load();
    },
    [load]
  );

  if (
    loading &&
    !data
  ) {
    return (
      <View
        style={{
          flex: 1,

          backgroundColor:
            colors.background
              .default,

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <Text
          style={
            typography.caption
          }
        >
          Chargement…
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View
        style={{
          flex: 1,

          backgroundColor:
            colors.background
              .default,

          alignItems:
            'center',

          justifyContent:
            'center',

          padding:
            spacing.screenHorizontal,
        }}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Transaction inaccessible"
          subtitle="Votre rôle ne permet pas de consulter cette transaction."
        />
      </View>
    );
  }

  const t =
    data.transaction ||
    data;

  const pending =
    [
      'pending_proof',
      'under_review',
      'pending',
    ].includes(
      t.status
    );

  const run =
    async (
      callback,
      successMessage
    ) => {
      try {
        setActionLoading(
          true
        );

        await callback();

        Alert.alert(
          'Opération réussie',
          successMessage
        );

        await load();
      } catch (
        e
      ) {
        Alert.alert(
          'Erreur',
          e?.message ||
            'Impossible d’appliquer cette action.'
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  const confirm =
    () => {
      if (
        !canConfirmTransaction()
      ) {
        Alert.alert(
          'Action non autorisée',
          'Votre rôle ne permet pas de confirmer cette transaction.'
        );

        return;
      }

      Alert.alert(
        'Confirmer',
        'Confirmer cette transaction ?',
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

            onPress:
              () =>
                run(
                  () =>
                    confirmTransaction({
                      transactionId:
                        id,
                    }),

                  'La transaction a été confirmée.'
                ),
          },
        ]
      );
    };

  const approve =
    () => {
      if (
        !canApproveTransaction()
      ) {
        return;
      }

      run(
        () =>
          approveTransaction({
            transactionId:
              id,
          }),

        'La transaction a été approuvée.'
      );
    };

  const openRejectModal =
    () => {
      if (!canRejectTransaction()) {
        Alert.alert(
          'Action non autorisée',
          'Votre rôle ne permet pas de rejeter une transaction.'
        );

        return;
      }

      setRejectReason('');
      setRejectReasonError(null);
      setRejectModalVisible(true);
    };

  const closeRejectModal =
    () => {
      if (actionLoading) {
        return;
      }

      setRejectModalVisible(false);
      setRejectReason('');
      setRejectReasonError(null);
    };

  const submitReject =
    async () => {
      const reason =
        rejectReason.trim();

      if (!reason) {
        setRejectReasonError(
          'Le motif du rejet est obligatoire.'
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
        await run(
          () =>
            rejectTransaction({
              transactionId: id,
              reason,
            }),
          'La transaction a été rejetée.'
        );
      } finally {
        setRejectReason('');
        setRejectReasonError(null);
      }
    };

  const reject =
    () => {
      openRejectModal();
    };

  const execute =
    () => {
      if (
        !canExecuteTransaction()
      ) {
        Alert.alert(
          'Action non autorisée',
          'Seul le rôle Admin partenaire peut exécuter une transaction.'
        );

        return;
      }

      run(
        () =>
          executeTransaction({
            transactionId:
              id,
          }),

        'La transaction a été marquée comme exécutée.'
      );
    };

  const cancel =
    () => {
      if (
        !canCancelTransaction()
      ) {
        return;
      }

      Alert.alert(
        'Annuler',
        'Annuler cette transaction ?',
        [
          {
            text:
              'Non',
            style:
              'cancel',
          },

          {
            text:
              'Oui, annuler',

            style:
              'destructive',

            onPress:
              () =>
                run(
                  () =>
                    cancelTransaction({
                      transactionId:
                        id,

                      reason:
                        'Annulation depuis l’espace partenaire.',
                    }),

                  'La transaction a été annulée.'
                ),
          },
        ]
      );
    };

  return (
    <>
    <ScrollView
      style={{
        flex: 1,

        backgroundColor:
          colors.background
            .default,
      }}
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,

        paddingBottom:
          100,
      }}
      showsVerticalScrollIndicator={
        false
      }
    >
      <Text
        style={
          typography.h1
        }
      >
        Détail de la transaction
      </Text>

      <Text
        style={[
          typography.caption,
          {
            marginTop:
              4,
          },
        ]}
      >
        {formatDateTime(
          t.created_at
        )}
      </Text>

      <Card
        style={{
          marginTop:
            20,
        }}
      >
        <View
          style={{
            flexDirection:
              'row',

            justifyContent:
              'space-between',

            alignItems:
              'center',
          }}
        >
          <Text
            style={
              typography.h2
            }
          >
            {formatAmount(
              t.amount
            )}
          </Text>

          <StatusBadge
            status={
              t.status
            }
          />
        </View>

        <Row
          label="Type"
          value={
            t.type
          }
        />

        <Row
          label="Workflow"
          value={
            t.workflow_stage
          }
        />

        <Row
          label="Expéditeur"
          value={
            t.sender_name ||
            '—'
          }
        />

        <Row
          label="Téléphone payeur"
          value={
            t.sender_phone_number
          }
        />

        <Row
          label="Indicatif payeur"
          value={
            t.sender_country_code ||
            '—'
          }
        />

        <Row
          label="Destinataire"
          value={
            t.recipient_name
          }
        />

        <Row
          label="Téléphone destinataire"
          value={
            t.recipient_mobile_number
          }
        />

        <Row
          label="Indicatif destinataire"
          value={
            t.recipient_country_code ||
            '—'
          }
        />

        <Row
          label="Localisation"
          value={
            t.recipient_location
          }
        />

        {t.reference_note ? (
          <Row
            label="Référence"
            value={
              t.reference_note
            }
          />
        ) : null}
      </Card>

      <InfoBanner
        text={
          isPartnerOperator() &&
          !isPartnerAdmin()
            ? 'Vous pouvez confirmer une transaction. Le rejet, l’approbation, l’exécution et l’annulation ne sont pas disponibles avec le rôle Partner.'
            : 'Les actions disponibles ci-dessous sont déterminées par votre rôle.'
        }
      />

      <View
        style={{
          marginTop:
            20,

          gap:
            10,
        }}
      >
        {canConfirmTransaction() &&
        pending ? (
          <Button
            title="Confirmer"
            variant="success"
            disabled={
              actionLoading
            }
            onPress={
              confirm
            }
          />
        ) : null}

        {canApproveTransaction() &&
        pending ? (
          <Button
            title="Approuver"
            disabled={
              actionLoading
            }
            onPress={
              approve
            }
          />
        ) : null}

        {canRejectTransaction() &&
        pending ? (
          <Button
            title="Rejeter"
            variant="danger"
            disabled={
              actionLoading
            }
            onPress={
              reject
            }
          />
        ) : null}

        {canExecuteTransaction() &&
        t.workflow_stage ===
          'execution' ? (
          <Button
            title="Marquer exécutée"
            disabled={
              actionLoading
            }
            onPress={
              execute
            }
          />
        ) : null}

        <Button
          title="Voir la vérification"
          variant="outline"
          disabled={
            actionLoading
          }
          onPress={() =>
            navigation.navigate(
              'PartnerTransactionReview',
              {
                transactionId:
                  id,

                transaction:
                  data,
              }
            )
          }
        />

        {canCancelTransaction() &&
        ![
          'completed',
          'rejected',
          'cancelled',
        ].includes(
          t.status
        ) ? (
          <Button
            title="Annuler"
            variant="ghost"
            disabled={
              actionLoading
            }
            onPress={
              cancel
            }
          />
        ) : null}
      </View>

      <Text
        style={[
          typography.h2,
          {
            marginTop:
              28,
          },
        ]}
      >
        Historique
      </Text>

      <Card
        style={{
          marginTop:
            10,
        }}
      >
        {(
          data.history ??
          []
        ).length ? (
          (
            data.history ??
            []
          ).map(
            (h) => (
              <View
                key={
                  h.id
                }
                style={{
                  paddingVertical:
                    10,

                  borderBottomWidth:
                    1,

                  borderBottomColor:
                    colors.border
                      .light,
                }}
              >
                <Text
                  style={
                    typography.bodyBold
                  }
                >
                  {
                    h.new_status
                  }
                </Text>

                <Text
                  style={
                    typography.caption
                  }
                >
                  {formatDateTime(
                    h.created_at
                  )}{' '}
                  ·{' '}
                  {h.reason ??
                    '—'}
                </Text>
              </View>
            )
          )
        ) : (
          <EmptyState
            title="Aucun événement"
            subtitle="L’historique apparaîtra ici."
          />
        )}
      </Card>
    </ScrollView>

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

        <View style={local.rejectModal}>
          <View style={local.rejectModalHeader}>
            <View style={local.rejectModalIcon}>
              <Ionicons
                name="close-circle-outline"
                size={22}
                color={colors.error.default}
              />
            </View>

            <View style={{ flex: 1 }}>
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
            Motif / preuve du rejet
          </Text>

          <TextInput
            value={rejectReason}
            onChangeText={(value) => {
              setRejectReason(value);

              if (rejectReasonError) {
                setRejectReasonError(null);
              }
            }}
            placeholder="Ex. paiement non reçu ou informations incorrectes"
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={500}
            textAlignVertical="top"
            editable={!actionLoading}
            style={[
              local.rejectInput,
              rejectReasonError &&
                local.rejectInputError,
            ]}
          />

          <View style={local.rejectCounterRow}>
            {rejectReasonError ? (
              <Text
                style={[
                  typography.caption,
                  local.rejectErrorText,
                ]}
              >
                {rejectReasonError}
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
              {rejectReason.length}/500
            </Text>
          </View>

          <View style={local.rejectModalActions}>
            <View style={{ flex: 1 }}>
              <Button
                title="Annuler"
                variant="outline"
                disabled={actionLoading}
                onPress={closeRejectModal}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Button
                title="Rejeter"
                variant="primary"
                loading={actionLoading}
                disabled={actionLoading}
                onPress={submitReject}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

function Row({
  label,
  value,
}) {
  return (
    <View
      style={{
        paddingVertical:
          10,

        borderBottomWidth:
          1,

        borderBottomColor:
          colors.border
            .light,
      }}
    >
      <Text
        style={
          typography.caption
        }
      >
        {label}
      </Text>

      <Text
        style={[
          typography.bodyBold,
          {
            marginTop:
              3,
          },
        ]}
      >
        {value ??
          '—'}
      </Text>
    </View>
  );
}

const local =
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
    },

    rejectModal: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: colors.background.surface,
      borderRadius: radii.lg || radii.md,
      padding: spacing.lg,
      ...shadows.modal,
    },

    rejectModalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },

    rejectModalIcon: {
      width: 42,
      height: 42,
      borderRadius: radii.circle,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error.light,
    },

    rejectModalTitle: {
      marginBottom: 3,
    },

    rejectModalSubtitle: {
      color: colors.text.secondary,
      lineHeight: lineHeights.md,
    },

    rejectInputLabel: {
      fontWeight: fontWeights.semiBold,
      marginBottom: spacing.xs,
    },

    rejectInput: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: radii.md,
      backgroundColor: colors.background.default,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: colors.text.primary,
      fontSize: 14,
      lineHeight: 20,
    },

    rejectInputError: {
      borderColor: colors.error.default,
    },

    rejectCounterRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },

    rejectHelpText: {
      flex: 1,
      color: colors.text.secondary,
      lineHeight: lineHeights.md,
    },

    rejectErrorText: {
      flex: 1,
      color: colors.error.default,
      lineHeight: lineHeights.md,
    },

    rejectCounter: {
      color: colors.text.tertiary,
      minWidth: 48,
      textAlign: 'right',
    },

    rejectModalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
  });
