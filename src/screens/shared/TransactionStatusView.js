import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme/theme';
import StatusIcon from '../../components/StatusIcon';
import Button from '../../components/Button';
import { getTransaction, subscribeToTransaction } from '../../services/transactionService';
import { useWallet } from '../../context/WalletContext';
import { formatAmount } from '../../utils/formatters';
import { TXN_STATUS } from '../../constants';

const COPY = {
  deposit: {
    under_review: { title: 'Recharge en attente', subtitle: "Votre dépôt a été soumis et est en cours de vérification." },
    confirmed: { title: 'Recharge confirmé !', subtitle: 'Votre dépôt a été confirmé.' },
    rejected: { title: 'Recharge rejeté', subtitle: 'Votre dépôt a été rejeté. Veuillez soumettre un nouveau dépôt.' },
  },
  transfer: {
    under_review: { title: 'Transfert en cours', subtitle: 'Vérifiez les informations. Votre transfert est en cours de traitement.' },
    confirmed: { title: 'Transfert réussi !', subtitle: 'Votre transfert a été effectué avec succès.' },
    rejected: { title: 'Transfert rejeté', subtitle: 'Votre transfert a échoué.' },
  },
  withdrawal: {
    under_review: { title: 'Retrait en attente', subtitle: 'Votre retrait est en attente de traitement.' },
    confirmed: { title: 'Retrait effectué !', subtitle: 'Votre retrait a été effectué avec succès.' },
    rejected: { title: 'Retrait rejeté', subtitle: 'Votre retrait a été rejeté.' },
  },
};

/**
 * Vue partagée pour les écrans "en attente / confirmé / rejeté" des trois
 * flux (dépôt 16-18, transfert 23-24, retrait 27-30). Suit le statut en
 * temps réel via Supabase Realtime (le back-end/admin fait progresser le
 * statut ; ce composant se contente d'afficher l'état courant).
 */
export default function TransactionStatusView({ transactionId, type, primaryActionLabel, onPrimaryAction, homeRoute = 'MainTabs' }) {
  const navigation = useNavigation();
  const { refresh: refreshWallet } = useWallet();
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    getTransaction(transactionId).then(setTransaction).catch(() => {});
    const unsubscribe = subscribeToTransaction(transactionId, (updated) => {
      setTransaction(updated);
      refreshWallet();
    });
    return unsubscribe;
  }, [transactionId, refreshWallet]);

  if (!transaction) return null;

  const status = transaction.status === TXN_STATUS.PENDING_PROOF ? TXN_STATUS.UNDER_REVIEW : transaction.status;
  const copy = COPY[type]?.[status] ?? COPY[type][TXN_STATUS.UNDER_REVIEW];

  return (
    <View style={styles.wrapper}>
      <StatusIcon status={status} />
      <Text style={[typography.h1, styles.title]}>{copy.title}</Text>
      <Text style={[typography.body, styles.subtitle]}>{copy.subtitle}</Text>

      <View style={styles.summaryCard}>
        <Text style={typography.caption}>Montant</Text>
        <Text style={typography.amountMd}>{formatAmount(transaction.amount)}</Text>
        {transaction.reference_note ? (
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>
            N° de transaction : {transaction.reference_note}
          </Text>
        ) : null}
        {status === TXN_STATUS.REJECTED && transaction.rejection_reason ? (
          <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.error.text }]}>
            Raison : {transaction.rejection_reason}
          </Text>
        ) : null}
        {status === TXN_STATUS.UNDER_REVIEW ? (
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>Temps estimé : 10 min</Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />

      {status === TXN_STATUS.CONFIRMED && (
        <Button
          title={primaryActionLabel ?? 'Voir mes transactions'}
          onPress={onPrimaryAction ?? (() => navigation.navigate(homeRoute))}
        />
      )}
      {status === TXN_STATUS.REJECTED && (
        <Button title="Réessayer" onPress={onPrimaryAction ?? (() => navigation.goBack())} />
      )}
      {status === TXN_STATUS.UNDER_REVIEW && (
        <Button
          title="Voir le statut"
          variant="outline"
          onPress={() => navigation.navigate(homeRoute)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing.screenHorizontal,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: { textAlign: 'center', marginTop: spacing.xl },
  subtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
    alignItems: 'center',
  },
});
