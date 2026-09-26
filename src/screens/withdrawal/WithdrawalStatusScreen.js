import React from 'react';
import TransactionStatusView from '../shared/TransactionStatusView';

/** Écrans 28-30 — Retrait en attente / effectué / rejeté. */
export default function WithdrawalStatusScreen({ route, navigation }) {
  return (
    <TransactionStatusView
      transactionId={route.params.transactionId}
      type="withdrawal"
      primaryActionLabel="Voir mes retraits"
      onPrimaryAction={() => navigation.navigate('MyWithdrawals')}
    />
  );
}
