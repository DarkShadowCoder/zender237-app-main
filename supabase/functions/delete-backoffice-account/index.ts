import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  corsHeaders,
  json,
} from '../../_shared.js';

class DomainError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(
    message: string,
    code = 'DELETE_FAILED',
    status = 400,
    details: unknown = null,
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function methodGuard(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Méthode HTTP non autorisée.',
      },
      405,
    );
  }

  return null;
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization');

  if (!authorization) {
    return null;
  }

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

async function ensureCurrentAdmin(
  service: ReturnType<typeof createClient>,
  req: Request,
) {
  const token = getBearerToken(req);

  if (!token) {
    throw new DomainError(
      'Session administrateur absente.',
      'UNAUTHENTICATED',
      401,
    );
  }

  const {
    data,
    error,
  } = await service.auth.getUser(token);

  if (error || !data?.user?.id) {
    throw new DomainError(
      'Session administrateur invalide ou expirée.',
      'UNAUTHENTICATED',
      401,
    );
  }

  const {
    data: admin,
    error: adminError,
  } = await service
    .from('admins')
    .select('id, active')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();

  if (adminError) {
    throw adminError;
  }

  if (!admin) {
    throw new DomainError(
      'Compte administrateur introuvable.',
      'ADMIN_REQUIRED',
      403,
    );
  }

  if (admin.active === false) {
    throw new DomainError(
      'Compte administrateur désactivé.',
      'ADMIN_DISABLED',
      403,
    );
  }

  return admin;
}

async function countRows(
  service: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  const {
    count,
    error,
  } = await service
    .from(table)
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq(column, value);

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

async function updateNull(
  service: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  const {
    error,
  } = await service
    .from(table)
    .update({
      [column]: null,
    })
    .eq(column, value);

  if (error) {
    throw error;
  }
}

async function deleteRows(
  service: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
) {
  const {
    error,
  } = await service
    .from(table)
    .delete()
    .eq(column, value);

  if (error) {
    throw error;
  }
}

async function deleteAuthUser(
  service: ReturnType<typeof createClient>,
  authUserId: string | null,
) {
  if (!authUserId) {
    return;
  }

  const {
    error,
  } = await service.auth.admin.deleteUser(
    authUserId,
  );

  if (error) {
    throw new DomainError(
      `Les données applicatives ont été supprimées, mais le compte Auth ${authUserId} n'a pas pu être supprimé : ${error.message}`,
      'AUTH_USER_DELETE_FAILED',
      500,
    );
  }
}

async function deletePartner(
  service: ReturnType<typeof createClient>,
  partnerId: string,
) {
  const {
    data: partner,
    error: partnerError,
  } = await service
    .from('partners')
    .select('id, auth_user_id, full_name')
    .eq('id', partnerId)
    .maybeSingle();

  if (partnerError) {
    throw partnerError;
  }

  if (!partner) {
    throw new DomainError(
      'Partenaire introuvable.',
      'PARTNER_NOT_FOUND',
      404,
    );
  }

  /*
   * Toutes ces références sont facultatives dans le schéma fourni.
   * On les détache pour préserver les transactions, règlements,
   * traces et données KmerDiaspora avant de supprimer le partenaire.
   */
  const nullableReferences: Array<[string, string]> = [
    ['transactions', 'partner_id'],
    ['daily_batches', 'partner_id'],
    ['audit_records', 'partner_id'],
    ['notifications_log', 'partner_id'],
    ['wallet_ledger_entries', 'created_by_partner_id'],
    ['transaction_status_history', 'changed_by_partner_id'],
    ['transaction_reviews', 'partner_id'],
    ['transaction_assignments', 'partner_id'],
    ['bank_settlements', 'partner_id'],
    ['bank_settlement_proofs', 'uploaded_by_partner_id'],
    ['transaction_execution_proofs', 'uploaded_by_partner_id'],
    ['kd_job_requests', 'managed_by_partner_id'],
    ['kd_driver_requests', 'managed_by_partner_id'],
    ['kd_driver_matches', 'created_by_partner_id'],
    ['kd_quests', 'managed_by_partner_id'],
    ['kd_quest_events', 'actor_partner_id'],
    ['kd_action_logs', 'partner_id'],
  ];

  for (const [table, column] of nullableReferences) {
    await updateNull(service, table, column, partnerId);
  }

  await deleteRows(
    service,
    'partner_role_assignments',
    'partner_id',
    partnerId,
  );

  const {
    error: deleteError,
  } = await service
    .from('partners')
    .delete()
    .eq('id', partnerId);

  if (deleteError) {
    throw deleteError;
  }

  await deleteAuthUser(
    service,
    partner.auth_user_id,
  );

  return {
    id: partner.id,
    name: partner.full_name,
    accountType: 'partner',
  };
}

async function deleteKmAdministrator(
  service: ReturnType<typeof createClient>,
  administratorId: string,
) {
  const {
    data: administrator,
    error: administratorError,
  } = await service
    .from('kmerdiaspora_admins')
    .select(
      'id, auth_user_id, full_name, whatsapp_number',
    )
    .eq('id', administratorId)
    .maybeSingle();

  if (administratorError) {
    throw administratorError;
  }

  if (!administrator) {
    throw new DomainError(
      'KmAdministrateur introuvable.',
      'KMA_NOT_FOUND',
      404,
    );
  }

  /* Détachement des références administratives facultatives. */
  const nullableReferences: Array<[string, string]> = [
    ['notifications_log', 'kmerdiaspora_admin_id'],
    ['push_tokens', 'kmerdiaspora_admin_id'],
    ['kd_job_requests', 'managed_by_kma_id'],
    ['kd_driver_requests', 'managed_by_kma_id'],
    ['kd_driver_matches', 'created_by_kma_id'],
    ['kd_quests', 'managed_by_kma_id'],
    ['kd_quests', 'moderated_by_kma_id'],
    ['kd_quest_events', 'actor_kma_id'],
    ['kd_moderation_actions', 'kma_id'],
    ['kd_reports', 'kma_id'],
    ['kd_action_logs', 'kma_id'],
  ];

  for (const [table, column] of nullableReferences) {
    await updateNull(service, table, column, administratorId);
  }

  const {
    data: settings,
    error: settingsError,
  } = await service
    .from('kd_settings')
    .select(
      'id, whatsapp_admin_number, whatsapp_admin_name',
    )
    .eq('id', 1)
    .maybeSingle();

  if (settingsError) {
    throw settingsError;
  }

  const normalize = (value: unknown) =>
    String(value || '').replace(/[\s-]/g, '');

  if (
    settings &&
    normalize(settings.whatsapp_admin_number) ===
      normalize(administrator.whatsapp_number)
  ) {
    const {
      error: settingsUpdateError,
    } = await service
      .from('kd_settings')
      .update({
        whatsapp_admin_number: null,
        whatsapp_admin_name: 'KmAdministrateur',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (settingsUpdateError) {
      throw settingsUpdateError;
    }
  }

  const {
    error: deleteError,
  } = await service
    .from('kmerdiaspora_admins')
    .delete()
    .eq('id', administratorId);

  if (deleteError) {
    throw deleteError;
  }

  await deleteAuthUser(
    service,
    administrator.auth_user_id,
  );

  return {
    id: administrator.id,
    name: administrator.full_name,
    accountType: 'kmerdiaspora_admin',
  };
}

async function deleteUser(
  service: ReturnType<typeof createClient>,
  userId: string,
) {
  const {
    data: profile,
    error: profileError,
  } = await service
    .from('profiles')
    .select('id, username, whatsapp_number')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new DomainError(
      'Utilisateur introuvable.',
      'USER_NOT_FOUND',
      404,
    );
  }

  /*
   * Les données financières et le ledger ne sont pas détruits.
   * Un historique présent signifie que le compte doit être désactivé.
   */
  const blockers: Array<[string, string, string]> = [
    ['transactions', 'user_id', 'Transaction(s)'],
    ['wallet_ledger_entries', 'user_id', 'écriture(s) de ledger'],
    ['loan_requests', 'user_id', 'demande(s) de prêt'],
    ['loans', 'user_id', 'prêt(s)'],
    [
      'kd_quest_contributions',
      'contributor_user_id',
      'contribution(s) KmerDiaspora',
    ],
    ['transaction_proofs', 'uploaded_by', 'preuve(s) de transaction'],
  ];

  const blockingItems: Array<{ table: string; count: number }> = [];

  for (const [table, column, label] of blockers) {
    const count = await countRows(
      service,
      table,
      column,
      userId,
    );

    if (count > 0) {
      blockingItems.push({
        table: label,
        count,
      });
    }
  }

  if (blockingItems.length > 0) {
    const details = blockingItems
      .map(
        (item) =>
          `${item.count} ${item.table}`,
      )
      .join(', ');

    throw new DomainError(
      `Impossible de supprimer ${profile.username || 'cet utilisateur'} : ${details} existent encore. Désactivez plutôt le compte afin de conserver l'historique financier et les traces associées.`,
      'USER_HAS_HISTORY',
      409,
      blockingItems,
    );
  }

  /* Références facultatives : on les détache. */
  const nullableReferences: Array<[string, string]> = [
    ['kd_driver_requests', 'requester_user_id'],
    ['kd_quests', 'creator_user_id'],
    ['kd_quests', 'beneficiary_user_id'],
    ['kd_quest_events', 'actor_user_id'],
    ['kd_action_logs', 'user_id'],
    ['notifications_log', 'user_id'],
    ['push_tokens', 'user_id'],
    ['kd_profiles', 'user_id'],
  ];

  for (const [table, column] of nullableReferences) {
    await updateNull(service, table, column, userId);
  }

  /* Les memberships WhatsApp / quest sont propres au compte. */
  await deleteRows(
    service,
    'whatsapp_group_join_requests',
    'user_id',
    userId,
  );

  await deleteRows(
    service,
    'kd_quest_members',
    'user_id',
    userId,
  );

  await deleteRows(
    service,
    'otp_codes',
    'whatsapp_number',
    profile.whatsapp_number,
  );

  /* Le wallet est supprimable seulement lorsqu'aucun ledger n'existe. */
  await deleteRows(
    service,
    'wallets',
    'user_id',
    userId,
  );

  const {
    error: deleteProfileError,
  } = await service
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (deleteProfileError) {
    throw deleteProfileError;
  }

  await deleteAuthUser(
    service,
    userId,
  );

  return {
    id: profile.id,
    username: profile.username,
    accountType: 'user',
  };
}

Deno.serve(async (req) => {
  const guarded = methodGuard(req);

  if (guarded) {
    return guarded;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get(
    'SUPABASE_SERVICE_ROLE_KEY',
  );

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        success: false,
        code: 'SERVER_CONFIGURATION_ERROR',
        message: 'Configuration Supabase serveur invalide.',
      },
      500,
    );
  }

  const service = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  try {
    await ensureCurrentAdmin(service, req);

    const body = await req.json();
    const accountType = String(
      body?.accountType || '',
    )
      .trim()
      .toLowerCase();
    const accountId = String(
      body?.accountId || '',
    ).trim();

    if (
      !['partner', 'kmerdiaspora_admin', 'user'].includes(
        accountType,
      )
    ) {
      throw new DomainError(
        'Type de compte invalide.',
        'INVALID_ACCOUNT_TYPE',
        400,
      );
    }

    if (!accountId) {
      throw new DomainError(
        'accountId est requis.',
        'ACCOUNT_ID_REQUIRED',
        400,
      );
    }

    let result;

    if (accountType === 'partner') {
      result = await deletePartner(
        service,
        accountId,
      );
    } else if (accountType === 'kmerdiaspora_admin') {
      result = await deleteKmAdministrator(
        service,
        accountId,
      );
    } else {
      result = await deleteUser(
        service,
        accountId,
      );
    }

    return json({
      success: true,
      ...result,
      message: 'Compte supprimé avec succès.',
    });
  } catch (error) {
    console.error(
      '[delete-backoffice-account]',
      error,
    );

    const status =
      error instanceof DomainError
        ? error.status
        : 500;

    return json(
      {
        success: false,
        code:
          error instanceof DomainError
            ? error.code
            : 'DELETE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de supprimer le compte.',
        details:
          error instanceof DomainError
            ? error.details
            : null,
      },
      status,
    );
  }
});
