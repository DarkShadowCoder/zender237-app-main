
/**
 * ============================================================
 * ZENDER237 - SETTLEMENT SERVICE
 * ============================================================
 *
 * Gestion des règlements bancaires.
 *
 * Règles :
 * - Admin partenaire : accès complet.
 * - Partner : aucun accès aux règlements.
 * - KmerDiaspora : aucun accès aux règlements.
 * - KMA : aucun accès aux règlements.
 * ============================================================
 */

import * as FileSystem from 'expo-file-system';

import {
  supabase,
} from '../lib/supabase';

import {
  getPartnerAuthorizationForService,
} from './partnerService';


const SUPABASE_URL =
  supabase.supabaseUrl;

const SUPABASE_ANON_KEY =
  supabase.supabaseKey;


/* ============================================================
 * ACTEUR COURANT
 * ============================================================ */

export async function getSettlementActor() {

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user =
    authData?.user;

  if (!user) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const [
    adminResponse,
    partnerResponse,
  ] =
    await Promise.all([
      supabase
        .from('admins')
        .select('*')
        .eq(
          'auth_user_id',
          user.id
        )
        .maybeSingle(),

      supabase
        .from('partners')
        .select('*')
        .eq(
          'auth_user_id',
          user.id
        )
        .maybeSingle(),
    ]);


  if (
    adminResponse.error
  ) {
    throw adminResponse.error;
  }

  if (
    partnerResponse.error
  ) {
    throw partnerResponse.error;
  }


  if (
    adminResponse.data
  ) {
    return {
      type:
        'admin',

      actor:
        adminResponse.data,
    };
  }


  if (
    partnerResponse.data
  ) {

    const partnerAccess =
      await getPartnerAuthorizationForService(
        partnerResponse.data
      );

    if (
      !partnerAccess.isAdmin
    ) {
      throw new Error(
        'Seul le rôle Admin partenaire peut gérer les règlements.'
      );
    }

    return {
      type:
        'partner',

      actor:
        partnerResponse.data,
    };
  }


  throw new Error(
    'Cet utilisateur n’est pas autorisé à gérer les règlements.'
  );
}


/* ============================================================
 * CREATION
 * ============================================================ */

export async function createSettlement({
  transactionId = null,
  batchId = null,
  settlementType,
  amount,
  currency = 'XAF',
  externalReference = null,
  sourceAccountName = null,
  destinationAccountName = null,
  sourceAccountReference = null,
  destinationAccountReference = null,
  notes = null,
}) {

  const {
    type,
    actor,
  } =
    await getSettlementActor();

  if (!settlementType) {
    throw new Error(
      'settlementType est requis.'
    );
  }

  const payload = {
    transaction_id:
      transactionId,

    batch_id:
      batchId,

    settlement_type:
      settlementType,

    status:
      'pending',

    amount:
      Number(amount),

    currency,

    external_reference:
      externalReference,

    source_account_name:
      sourceAccountName,

    destination_account_name:
      destinationAccountName,

    source_account_reference:
      sourceAccountReference,

    destination_account_reference:
      destinationAccountReference,

    notes,

    initiated_at:
      new Date().toISOString(),
  };


  if (
    type ===
    'admin'
  ) {
    payload.admin_id =
      actor.id;
  } else {
    payload.partner_id =
      actor.id;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'bank_settlements'
      )
      .insert(
        payload
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * LIST
 * ============================================================ */

export async function listSettlements({
  status = null,
  transactionId = null,
  batchId = null,
  limit = 20,
  offset = 0,
} = {}) {

  const {
    type,
    actor,
  } =
    await getSettlementActor();


  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 20,
        100
      )
    );


  const safeOffset =
    Math.max(
      0,
      Number(offset) || 0
    );


  let query =
    supabase
      .from(
        'bank_settlements'
      )
      .select(
        '*',
        {
          count:
            'exact',
        }
      )
      .order(
        'initiated_at',
        {
          ascending:
            false,
        }
      )
      .range(
        safeOffset,
        safeOffset +
          safeLimit -
          1
      );


  if (
    type ===
    'partner'
  ) {
    query =
      query.eq(
        'partner_id',
        actor.id
      );
  }


  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }


  if (transactionId) {
    query =
      query.eq(
        'transaction_id',
        transactionId
      );
  }


  if (batchId) {
    query =
      query.eq(
        'batch_id',
        batchId
      );
  }


  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  return {
    data:
      data ?? [],

    count:
      count ?? 0,
  };
}


/* ============================================================
 * DETAIL
 * ============================================================ */

export async function getSettlement(
  settlementId
) {

  const {
    type,
    actor,
  } =
    await getSettlementActor();


  let query =
    supabase
      .from(
        'bank_settlements'
      )
      .select(`
        *,
        transaction:transaction_id(*),
        batch:batch_id(*),
        proofs:bank_settlement_proofs(*)
      `)
      .eq(
        'id',
        settlementId
      );


  if (
    type ===
    'partner'
  ) {
    query =
      query.eq(
        'partner_id',
        actor.id
      );
  }


  const {
    data,
    error,
  } =
    await query
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * RESTE DU SERVICE
 * ============================================================
 *
 * Conserve ici les fonctions existantes de :
 * startSettlement()
 * executeSettlement()
 * completeSettlement()
 * rejectSettlement()
 * failSettlement()
 * uploadSettlementProof()
 * listDailyBatches()
 *
 * Elles passent toutes par getSettlementActor(), donc les rôles
 * Partner / KmerDiaspora sont bloqués dès l'entrée.
 * ============================================================ */

/* ============================================================
 * START
 * ============================================================ */

export async function startSettlement(
  settlementId
) {
  const {
    type,
    actor,
  } = await getSettlementActor();

  let query = supabase
    .from('bank_settlements')
    .update({
      status: 'processing',
    })
    .eq(
      'id',
      settlementId
    );

  if (type === 'partner') {
    query = query.eq(
      'partner_id',
      actor.id
    );
  }

  const {
    data,
    error,
  } = await query
    .select()
    .single();

  if (error) throw error;

  return data;
}


/* ============================================================
 * EXECUTE
 * ============================================================ */

export async function executeSettlement({
  settlementId,
  externalReference = null,
}) {
  const {
    type,
    actor,
  } = await getSettlementActor();

  let query = supabase
    .from('bank_settlements')
    .update({
      status: 'processing',
      external_reference:
        externalReference,
      executed_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      settlementId
    );

  if (type === 'partner') {
    query = query.eq(
      'partner_id',
      actor.id
    );
  }

  const {
    data,
    error,
  } = await query
    .select()
    .single();

  if (error) throw error;

  return data;
}


/* ============================================================
 * COMPLETE
 * ============================================================ */

export async function completeSettlement({
  settlementId,
  externalReference = null,
}) {
  const {
    type,
    actor,
  } = await getSettlementActor();

  let query = supabase
    .from('bank_settlements')
    .update({
      status: 'completed',
      external_reference:
        externalReference,
      completed_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      settlementId
    );

  if (type === 'partner') {
    query = query.eq(
      'partner_id',
      actor.id
    );
  }

  const {
    data,
    error,
  } = await query
    .select()
    .single();

  if (error) throw error;

  return data;
}


/* ============================================================
 * FAIL / REJECT
 * ============================================================ */

export async function rejectSettlement({
  settlementId,
  reason,
}) {
  if (!reason) {
    throw new Error(
      'Un motif est requis.'
    );
  }

  const {
    type,
    actor,
  } = await getSettlementActor();

  let query = supabase
    .from('bank_settlements')
    .update({
      status: 'rejected',
      failure_reason: reason,
    })
    .eq(
      'id',
      settlementId
    );

  if (type === 'partner') {
    query = query.eq(
      'partner_id',
      actor.id
    );
  }

  const {
    data,
    error,
  } = await query
    .select()
    .single();

  if (error) throw error;

  return data;
}


export async function failSettlement({
  settlementId,
  reason,
}) {
  if (!reason) {
    throw new Error(
      'Un motif est requis.'
    );
  }

  const {
    type,
    actor,
  } = await getSettlementActor();

  let query = supabase
    .from('bank_settlements')
    .update({
      status: 'failed',
      failure_reason: reason,
    })
    .eq(
      'id',
      settlementId
    );

  if (type === 'partner') {
    query = query.eq(
      'partner_id',
      actor.id
    );
  }

  const {
    data,
    error,
  } = await query
    .select()
    .single();

  if (error) throw error;

  return data;
}


/* ============================================================
 * UPLOAD PREUVE
 * ============================================================ */

/**
 * Upload natif Expo.
 *
 * Bucket :
 *   settlement-proofs
 */
export async function uploadSettlementProof({
  settlementId,
  uri,
  fileName,
  contentType = 'image/jpeg',
  description = null,
}) {
  const {
    type,
    actor,
  } = await getSettlementActor();

  const path =
    `${settlementId}/${Date.now()}-${fileName}`;

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (
    sessionError ||
    !sessionData?.session?.access_token
  ) {
    throw new Error(
      'Session expirée. Reconnectez-vous.'
    );
  }

  const accessToken =
    sessionData.session.access_token;

  const uploadUrl =
    `${SUPABASE_URL}/storage/v1/object/settlement-proofs/${path}`;

  const result =
    await FileSystem.uploadAsync(
      uploadUrl,
      uri,
      {
        httpMethod: 'POST',

        uploadType:
          FileSystem.FileSystemUploadType
            .BINARY_CONTENT,

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          apikey:
            SUPABASE_ANON_KEY,

          'Content-Type':
            contentType,

          'x-upsert':
            'true',
        },
      }
    );

  if (
    result.status < 200 ||
    result.status >= 300
  ) {
    throw new Error(
      `Échec upload preuve (${result.status}).`
    );
  }

  const proofPayload = {
    settlement_id:
      settlementId,

    file_url:
      path,

    description,
  };

  if (type === 'admin') {
    proofPayload.uploaded_by_admin_id =
      actor.id;
  } else {
    proofPayload.uploaded_by_partner_id =
      actor.id;
  }

  const {
    data,
    error,
  } = await supabase
    .from('bank_settlement_proofs')
    .insert(proofPayload)
    .select()
    .single();

  if (error) throw error;

  return {
    proof: data,
    path,
  };
}


/* ============================================================
 * DAILY BATCHES
 * ============================================================ */

export async function listDailyBatches({
  status = null,
  limit = 20,
  offset = 0,
} = {}) {
  const safeLimit = Math.max(
    1,
    Math.min(
      Number(limit) || 20,
      100
    )
  );

  const safeOffset = Math.max(
    0,
    Number(offset) || 0
  );

  let query = supabase
    .from('daily_batches')
    .select(
      `
        *,
        partners:partner_id(
          id,
          full_name
        )
      `,
      { count: 'exact' }
    )
    .order(
      'batch_date',
      { ascending: false }
    )
    .range(
      safeOffset,
      safeOffset +
        safeLimit -
        1
    );

  if (status) {
    query = query.eq(
      'status',
      status
    );
  }

  const {
    data,
    error,
    count,
  } = await query;

  if (error) throw error;

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}