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
  Platform,
} from 'react-native';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

  const [
    downloadingReceipt,
    setDownloadingReceipt,
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

  const downloadReceipt =
    async () => {
      if (downloadingReceipt) {
        return;
      }

      setDownloadingReceipt(true);

      try {
        const rows = [
          ['Identifiant', transaction.id],
          ['Utilisateur', transaction.user_id],
          ['Type', typeTokens?.label || transaction.type],
          ['Statut', transaction.status],
          ['Date de création', formatDateTime(transaction.created_at)],
          ['Date de confirmation', formatDateTime(transaction.confirmed_at)],
          ['Date limite de traitement', formatDateTime(transaction.review_deadline)],
          ['Montant', formatAmount(transaction.amount)],
          ['Frais', formatAmount(transaction.fee_amount)],
          ['Total', formatAmount(total)],
          ['Nom de l’expéditeur', transaction.sender_name],
          ['Téléphone de l’expéditeur', transaction.sender_phone_number],
          ['Indicatif de l’expéditeur', transaction.sender_country_code],
          ['Numéro Mobile Money utilisé', transaction.momo_deposit_number_id],
          ['Nom du destinataire', transaction.recipient_name],
          ['Téléphone du destinataire', transaction.recipient_mobile_number],
          ['Indicatif du destinataire', transaction.recipient_country_code],
          ['Pays du destinataire', transaction.recipient_location],
          ['Pays détecté', transaction.recipient_country],
          ['Référence', transaction.reference_note],
          ['Motif du rejet', transaction.rejection_reason],
          ['Administrateur', transaction.admin_id],
          ['Lot de traitement', transaction.batch_id],
          ...(transaction.transaction_proofs || []).map(
            (proof, index) => [
              `Preuve ${index + 1}`,
              `${proof.file_url}${proof.uploaded_at ? ` (${formatDateTime(proof.uploaded_at)})` : ''}`,
            ]
          ),
        ].filter(
          ([, value]) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        );

        const escapeHtml = (value) =>
          String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const tableRows = rows
          .map(
            ([label, value]) =>
              `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
          )
          .join('');

        const html = `<!doctype html>
          <html lang="fr">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Reçu de transaction ${escapeHtml(transaction.id.slice(0, 8).toUpperCase())}</title>
              <style>
                body { font-family: Arial, sans-serif; color: #172033; padding: 32px; }
                h1 { color: #1F63F2; font-size: 24px; margin-bottom: 4px; }
                p { color: #5b6475; margin-top: 0; }
                table { border-collapse: collapse; width: 100%; margin-top: 24px; }
                th, td { border-bottom: 1px solid #dce2ec; padding: 11px 8px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
                th { color: #5b6475; font-weight: 600; width: 38%; }
                .footer { margin-top: 28px; font-size: 11px; color: #7b8494; }
              </style>
            </head>
            <body>
              <h1>Reçu de transaction</h1>
              <p>Zender237 · ${escapeHtml(transaction.id)}</p>
              <table><tbody>${tableRows}</tbody></table>
              <div class="footer">Document généré le ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
            </body>
          </html>`;

        if (Platform.OS === 'web') {
          await Print.printAsync({ html });
          return;
        }

        const file = await Print.printToFileAsync({
          html,
          base64: false,
        });

        if (!(await Sharing.isAvailableAsync())) {
          throw new Error(
            'Le partage de fichiers PDF n’est pas disponible sur cet appareil.'
          );
        }

        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Enregistrer ou partager le reçu',
          UTI: 'com.adobe.pdf',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Téléchargement impossible',
          text2:
            error?.message ||
            'Le reçu PDF n’a pas pu être généré.',
        });
      } finally {
        setDownloadingReceipt(false);
      }
    };

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

      <View
        style={{
          marginTop:
            spacing.lg,
        }}
      >
        <Button
          title="Télécharger le reçu"
          variant="outline"
          onPress={downloadReceipt}
          loading={downloadingReceipt}
        />
      </View>

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