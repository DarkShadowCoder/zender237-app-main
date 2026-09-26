import React from 'react';
import TransactionTypeListView from '../shared/TransactionTypeListView';

export default function MyWithdrawalsScreen() {
  return <TransactionTypeListView title="Mes retraits" type="withdrawal" />;
}
