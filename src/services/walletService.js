/** Lecture du solde — table `wallets` (2.3.1/2.3.2 : solde disponible / en attente). */
import { supabase } from '../lib/supabase';

export async function getWallet(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('available_balance, pending_balance, updated_at')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

/** Abonnement realtime aux changements de solde (Supabase Realtime). */
export function subscribeToWallet(userId, onChange) {
  const channel = supabase
    .channel(`wallet-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
