/**
 * Zender237 - Service des demandes d'intégration au groupe WhatsApp.
 *
 * Règles :
 * - L'utilisateur ne saisit ni son nom ni son numéro.
 * - Les informations sont récupérées depuis profiles côté serveur.
 * - Une seule demande existe par utilisateur.
 * - Une demande refusée peut être soumise à nouveau.
 * - Les décisions administratives sont protégées par RLS.
 */

import { supabase } from '../lib/supabase';

async function getCurrentAuthUser() {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data?.user?.id) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  return data.user;
}

async function getCurrentAdmin() {
  const user =
    await getCurrentAuthUser();

  const {
    data,
    error,
  } = await supabase
    .from('admins')
    .select(
      'id, auth_user_id, full_name, active'
    )
    .eq(
      'auth_user_id',
      user.id
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Compte administrateur introuvable.'
    );
  }

  if (data.active === false) {
    throw new Error(
      'Compte administrateur désactivé.'
    );
  }

  return data;
}

export async function getMyWhatsappGroupRequest() {
  const user =
    await getCurrentAuthUser();

  const {
    data,
    error,
  } = await supabase
    .from(
      'whatsapp_group_join_requests'
    )
    .select(`
      id,
      user_id,
      full_name,
      whatsapp_number,
      status,
      admin_note,
      requested_at,
      reviewed_at
    `)
    .eq(
      'user_id',
      user.id
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

/**
 * Crée ou réactive la demande.
 *
 * Les valeurs full_name / whatsapp_number
 * sont récupérées directement depuis profiles
 * par la fonction PostgreSQL.
 */
export async function requestWhatsappGroupJoin() {
  await getCurrentAuthUser();

  const {
    data,
    error,
  } = await supabase.rpc(
    'request_whatsapp_group_join'
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function listWhatsappGroupRequests({
  search = '',
  status = 'all',
} = {}) {
  await getCurrentAdmin();

  let query = supabase
    .from(
      'whatsapp_group_join_requests'
    )
    .select(`
      id,
      user_id,
      full_name,
      whatsapp_number,
      status,
      admin_note,
      requested_at,
      reviewed_at,
      reviewed_by
    `)
    .order(
      'requested_at',
      {
        ascending: false,
      }
    )
    .limit(500);

  if (
    status &&
    status !== 'all'
  ) {
    query = query.eq(
      'status',
      status
    );
  }

  const normalizedSearch =
    String(search || '').trim();

  if (normalizedSearch) {
    const escaped =
      normalizedSearch.replace(
        /[%_]/g,
        '\\$&'
      );

    query = query.or(
      `full_name.ilike.%${escaped}%,whatsapp_number.ilike.%${escaped}%`
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function reviewWhatsappGroupRequest({
  requestId,
  status,
  adminNote = null,
}) {
  if (!requestId) {
    throw new Error(
      'Identifiant de demande manquant.'
    );
  }

  if (
    ![
      'approved',
      'rejected',
    ].includes(status)
  ) {
    throw new Error(
      'Statut de décision invalide.'
    );
  }

  const admin =
    await getCurrentAdmin();

  const {
    data,
    error,
  } = await supabase
    .from(
      'whatsapp_group_join_requests'
    )
    .update({
      status,
      admin_note: adminNote
        ? String(
            adminNote
          ).trim()
        : null,
      reviewed_at:
        new Date().toISOString(),
      reviewed_by:
        admin.id,
    })
    .eq(
      'id',
      requestId
    )
    .select(`
      id,
      user_id,
      full_name,
      whatsapp_number,
      status,
      admin_note,
      requested_at,
      reviewed_at,
      reviewed_by
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}