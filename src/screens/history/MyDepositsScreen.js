import React from 'react';
import TransactionTypeListView from '../shared/TransactionTypeListView';

export default function MyDepositsScreen() {
  return <TransactionTypeListView title="Mes dépôts" type="deposit" />;
}
