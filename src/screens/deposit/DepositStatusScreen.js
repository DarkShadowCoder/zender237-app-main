import React from 'react';
import TransactionStatusView from '../shared/TransactionStatusView';

/** Écrans 16-18 — Recharge en attente / confirmé / rejeté. */
export default function DepositStatusScreen({ route, navigation }) {
  return (
    <TransactionStatusView
      transactionId={route.params.transactionId}
      type="deposit"
      primaryActionLabel="Voir le solde"
      onPrimaryAction={() => navigation.navigate('MainTabs')}
    />
  );
}
