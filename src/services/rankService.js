import { supabase } from '../lib/supabase';

export async function getMyRank(
  userId
) {
  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'rank_code, rank_updated_at'
    )
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listRankRules() {
  const {
    data,
    error,
  } = await supabase
    .from('rank_rules')
    .select('*')
    .eq('active', true)
    .order(
      'display_order',
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}