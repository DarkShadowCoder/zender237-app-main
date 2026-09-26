import { useCallback, useEffect, useState } from 'react';
import { listTransactions } from '../services/transactionService';
import { useAuth } from '../context/AuthContext';

/** Liste + filtre (type/statut) des transactions, avec pull-to-refresh. */
export function useTransactions({ type, status } = {}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const { data } = await listTransactions({ userId: user.id, type, status });
        setItems(data ?? []);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, type, status]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    loading,
    refreshing,
    error,
    refresh: () => load({ silent: true }),
    reload: load,
  };
}
