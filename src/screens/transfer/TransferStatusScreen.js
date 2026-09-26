import React from 'react';
import TransactionStatusView from '../shared/TransactionStatusView';

/** Écrans 23-24 — Transfert en cours / réussi / rejeté. */
export default function TransferStatusScreen({ route, navigation }) {
  return (
    <TransactionStatusView
      transactionId={route.params.transactionId}
      type="transfer"
      primaryActionLabel="Voir mes transferts"
      onPrimaryAction={() => navigation.navigate('MyTransfers')}
    />
  );
}
