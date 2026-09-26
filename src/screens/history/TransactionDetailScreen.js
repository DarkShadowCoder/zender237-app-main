import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import Toast from
  'react-native-toast-message';

import {
  colors,
  typography,
  spacing,
  radii,
  transactionTypeColors,
} from '../../theme/theme';

import Header from
  '../../components/Header';

import StatusBadge from
  '../../components/StatusBadge';

import Button from
  '../../components/Button';

import {
  getTransaction,
  cancelTransaction,
} from '../../services/transactionService';

import {
  formatAmount,
  formatDateTime,
} from '../../utils/formatters';

const DELETABLE_STATUSES = [
  'pending_proof',
  'under_review',
];

export default function TransactionDetailScreen({
  route,
  navigation,
}) {
  const {
    transactionId,
  } = route.params;

  const [
    transaction,
    setTransaction,
  ] =
    useState(null);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  useEffect(
    () => {
      getTransaction(
        transactionId
      )
        .then(
          setTransaction
        )
        .catch(
          () => {}
        );
    },
    [transactionId]
  );

  if (!transaction) {
    return null;
  }

  const typeTokens =
    transactionTypeColors[
      transaction.type
    ];

  const total =
    Number(
      transaction.amount
    ) +
    Number(
      transaction.fee_amount ||
        0
    );

  const isDeletable =
    DELETABLE_STATUSES.includes(
      transaction.status
    );

  const handleDelete =
    () => {
      Alert.alert(
        'Supprimer la transaction',
        'Voulez-vous vraiment supprimer cette transaction ? Cette action est irréversible.',
        [
          {
            text:
              'Annuler',
            style:
              'cancel',
          },

          {
            text:
              'Supprimer',

            style:
              'destructive',

            onPress:
              async () => {
                setDeleting(
                  true
                );

                try {
                  const updated =
                    await cancelTransaction(
                      transactionId
                    );

                  setTransaction(
                    updated
                  );

                  Toast.show({
                    type:
                      'success',
                    text1:
                      'Transaction supprimée.',
                  });

                  navigation?.goBack();
                } catch (
                  e
                ) {
                  Toast.show({
                    type:
                      'error',

                    text1:
                      'Erreur',

                    text2:
                      e.message,
                  });
                } finally {
                  setDeleting(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  return (
    <ScrollView
      style={
        styles.wrapper
      }
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
      }}
    >
      <Header
        title="Détails de la transaction"
      />

      <View
        style={
          styles.card
        }
      >
        <Text
          style={
            typography.caption
          }
        >
          N° de transaction
        </Text>

        <Text
          style={[
            typography.bodyBold,
            {
              marginBottom:
                spacing.md,
            },
          ]}
        >
          {
            transaction.id
              .slice(
                0,
                8
              )
              .toUpperCase()
          }
        </Text>

        <Row
          label="Type"
          value={
            typeTokens.label
          }
        />

        <Row
          label="Date"
          value={
            formatDateTime(
              transaction.created_at
            )
          }
        />

        <Row
          label="Montant"
          value={
            formatAmount(
              transaction.amount
            )
          }
        />

        <Row
          label="Frais"
          value={
            formatAmount(
              transaction.fee_amount
            )
          }
        />

        <Row
          label="Total"
          value={
            formatAmount(
              total
            )
          }
          bold
        />

        {
          transaction.recipient_name ? (
            <Row
              label="Destinataire"
              value={
                transaction.recipient_name
              }
            />
          ) : null
        }

        {
          transaction.sender_phone_number ? (
            <Row
              label="Téléphone payeur"
              value={
                transaction.sender_phone_number
              }
            />
          ) : null
        }

        {
          transaction.sender_country_code ? (
            <Row
              label="Indicatif payeur"
              value={
                transaction.sender_country_code
              }
            />
          ) : null
        }

        {
          transaction.recipient_mobile_number ? (
            <Row
              label="Numéro"
              value={
                transaction.recipient_mobile_number
              }
            />
          ) : null
        }

        {
          transaction.recipient_country_code ? (
            <Row
              label="Indicatif destinataire"
              value={
                transaction.recipient_country_code
              }
            />
          ) : null
        }

        {
          transaction.recipient_location ? (
            <Row
              label="Pays"
              value={
                transaction.recipient_location
              }
            />
          ) : null
        }

        <View
          style={{
            marginTop:
              spacing.md,
          }}
        >
          <StatusBadge
            status={
              transaction.status
            }
          />
        </View>
      </View>

      {
        transaction.transaction_proofs
          ?.length ? (
          <View
            style={{
              marginTop:
                spacing.lg,
            }}
          >
            <Button
              title="Télécharger le reçu"
              variant="outline"
              onPress={() => {}}
            />
          </View>
        ) : null
      }

      {isDeletable ? (
        <View
          style={{
            marginTop:
              spacing.md,
          }}
        >
          <Button
            title="Supprimer la transaction"
            variant="danger"
            onPress={
              handleDelete
            }
            loading={
              deleting
            }
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  bold,
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          typography.caption
        }
      >
        {label}
      </Text>

      <Text
        style={
          bold
            ? typography.bodyBold
            : typography.body
        }
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,

      backgroundColor:
        colors.background
          .default,
    },

    card: {
      backgroundColor:
        colors.background
          .surface,

      borderRadius:
        radii.md,

      borderWidth:
        1,

      borderColor:
        colors.border
          .light,

      padding:
        spacing.lg,

      marginTop:
        spacing.lg,
    },

    row: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.sm,
    },
  });