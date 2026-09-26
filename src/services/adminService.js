/**
 * ============================================================
 * ZENDER237 - ADMIN SERVICE
 * ============================================================
 *
 * Version complète du service administrateur.
 *
 * Correction principale :
 * - le téléversement des preuves d'exécution utilise désormais
 *   les colonnes réellement présentes dans
 *   `transaction_execution_proofs` :
 *
 *     transaction_id
 *     file_url
 *     uploaded_by_admin_id
 *     uploaded_by_partner_id
 *     description
 *     uploaded_at
 *     file_name
 *     mime_type
 *
 * - suppression de la colonne inexistante `storage_path`
 * - remplacement de `uploaded_by` par `uploaded_by_admin_id`
 *
 * ============================================================
 */

import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../lib/supabase';

import {
  getCountryCodeFromPhone,
  normalizeInternationalPhone,
} from '../utils/phone';


/* ============================================================
 * HELPERS
 * ============================================================ */

async function getCurrentAdmin() {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

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

  const {
    data,
    error,
  } =
    await supabase
      .from('admins')
      .select('*')
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


function buildPagination(
  limit = 20,
  offset = 0
) {
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

  return {
    limit:
      safeLimit,

    offset:
      safeOffset,
  };
}


/* ============================================================
 * EDGE FUNCTIONS ADMIN
 * ============================================================ */

async function invokeAdminFunction(
  functionName,
  body
) {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    functionName,
    { body }
  );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const message =
      serverData?.message ||
      error.message ||
      "Impossible d'exécuter l'opération administrateur.";

    const operationError = new Error(message);
    operationError.code =
      serverData?.code ||
      error.code ||
      'ADMIN_FUNCTION_ERROR';
    operationError.details =
      serverData?.details ||
      error.details ||
      null;

    throw operationError;
  }

  if (!data) {
    throw new Error(
      'Réponse Supabase invalide.'
    );
  }

  if (data.success === false) {
    const operationError = new Error(
      data.message ||
      "L'opération administrateur a échoué."
    );
    operationError.code =
      data.code ||
      'ADMIN_OPERATION_FAILED';
    operationError.details =
      data.details ||
      null;
    throw operationError;
  }

  return data;
}


/* ============================================================
 * DASHBOARD
 * ============================================================ */

export async function getAdminDashboard() {
  const admin =
    await getCurrentAdmin();

  const [
    pendingTransactions,
    processingSettlements,
    activeUsers,
    activePartners,
    activeQuests,
    openDriverRequests,
    pendingModeration,
  ] =
    await Promise.all([
      supabase
        .from('transactions')
        .select('id', {
          count:
            'exact',
          head:
            true,
        })
        .in(
          'workflow_stage',
          [
            'review',
            'approval',
            'execution',
          ]
        ),

      supabase
        .from('bank_settlements')
        .select('id', {
          count:
            'exact',
          head:
            true,
        })
        .in(
          'status',
          [
            'pending',
            'processing',
          ]
        ),

      supabase
        .from('profiles')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),

      supabase
        .from('partners')
        .select('id', {
          count:
            'exact',
          head:
            true,
        })
        .eq(
          'active',
          true
        ),

      supabase
        .from('kd_quests')
        .select('id', {
          count:
            'exact',
          head:
            true,
        })
        .in(
          'status',
          [
            'published',
            'active',
          ]
        ),

      supabase
        .from('kd_driver_requests')
        .select('id', {
          count:
            'exact',
          head:
            true,
        })
        .in(
          'status',
          [
            'open',
            'partially_matched',
          ]
        ),

      supabase
        .from('kd_moderation_actions')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),
    ]);

  return {
    admin,

    pendingTransactions:
      pendingTransactions.count ??
      0,

    processingSettlements:
      processingSettlements.count ??
      0,

    activeUsers:
      activeUsers.count ??
      0,

    activePartners:
      activePartners.count ??
      0,

    activeQuests:
      activeQuests.count ??
      0,

    openDriverRequests:
      openDriverRequests.count ??
      0,

    pendingModeration:
      pendingModeration.count ??
      0,
  };
}


/* ============================================================
 * USERS
 * ============================================================ */

export async function listUsers({
  search = '',
  country = null,
  limit = 20,
  offset = 0,
} = {}) {
  const pagination =
    buildPagination(
      limit,
      offset
    );

  let query =
    supabase
      .from('profiles')
      .select(
        '*, wallets(*)',
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1
      );

  if (country) {
    query =
      query.eq(
        'country',
        country
      );
  }

  if (search) {
    query =
      query.or(
        `username.ilike.%${search}%,whatsapp_number.ilike.%${search}%`
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


export async function getUser(
  userId
) {
  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  const [
    profileResponse,
    walletResponse,
    transactionResponse,
    kdProfileResponse,
  ] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq(
          'id',
          userId
        )
        .single(),

      supabase
        .from('wallets')
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .maybeSingle(),

      supabase
        .from('transactions')
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(20),

      supabase
        .from('kd_profiles')
        .select('*')
        .eq(
          'user_id',
          userId
        )
        .maybeSingle(),
    ]);

  if (
    profileResponse.error
  ) {
    throw profileResponse.error;
  }

  if (
    walletResponse.error
  ) {
    throw walletResponse.error;
  }

  if (
    transactionResponse.error
  ) {
    throw transactionResponse.error;
  }

  if (
    kdProfileResponse.error
  ) {
    throw kdProfileResponse.error;
  }

  return {
    profile:
      profileResponse.data,

    wallet:
      walletResponse.data,

    transactions:
      transactionResponse.data ??
      [],

    kmerDiasporaProfile:
      kdProfileResponse.data,
  };
}


export async function adjustWallet({
  userId,
  amount,
  entryType,
  reason,
  sourceType =
    'admin_adjustment',
  sourceId = null,
}) {
  const admin =
    await getCurrentAdmin();

  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <=
      0
  ) {
    throw new Error(
      'Le montant doit être supérieur à zéro.'
    );
  }

  if (
    ![
      'credit',
      'debit',
      'adjustment',
    ].includes(
      entryType
    )
  ) {
    throw new Error(
      'Type de mouvement wallet invalide.'
    );
  }

  const {
    data: wallet,
    error:
      walletError,
  } =
    await supabase
      .from('wallets')
      .select('*')
      .eq(
        'user_id',
        userId
      )
      .single();

  if (walletError) {
    throw walletError;
  }

  const before =
    Number(
      wallet.available_balance
    ) || 0;

  let after =
    before;

  if (
    entryType ===
      'credit' ||
    entryType ===
      'adjustment'
  ) {
    after +=
      numericAmount;
  } else {
    after -=
      numericAmount;
  }

  if (after < 0) {
    throw new Error(
      'Le solde disponible ne peut pas devenir négatif.'
    );
  }

  const {
    data:
      updatedWallet,
    error:
      updateError,
  } =
    await supabase
      .from('wallets')
      .update({
        available_balance:
          after,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        wallet.id
      )
      .select()
      .single();

  if (updateError) {
    throw updateError;
  }

  const {
    data: ledger,
    error:
      ledgerError,
  } =
    await supabase
      .from(
        'wallet_ledger_entries'
      )
      .insert({
        wallet_id:
          wallet.id,

        user_id:
          userId,

        entry_type:
          entryType,

        amount:
          numericAmount,

        balance_before:
          before,

        balance_after:
          after,

        source_type:
          sourceType,

        source_id:
          sourceId,

        created_by_admin_id:
          admin.id,

        metadata: {
          reason:
            reason ??
            null,
        },
      })
      .select()
      .single();

  if (ledgerError) {
    throw ledgerError;
  }

  return {
    wallet:
      updatedWallet,

    ledger,
  };
}


/* ============================================================
 * TRANSACTIONS - LIST
 * ============================================================ */

export async function listTransactions({
  type = null,
  status = null,
  workflowStage = null,
  partnerId = null,
  limit = 20,
  offset = 0,
} = {}) {
  const pagination =
    buildPagination(
      limit,
      offset
    );

  let query =
    supabase
      .from('transactions')
      .select(
        `
          *,
          profiles:profiles!transactions_user_id_fkey(
            id,
            username,
            whatsapp_number,
            country
          ),
          partners:partners!transactions_partner_id_fkey(
            id,
            full_name
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1
      );

  if (type) {
    query =
      query.eq(
        'type',
        type
      );
  }

  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }

  if (
    workflowStage
  ) {
    query =
      query.eq(
        'workflow_stage',
        workflowStage
      );
  }

  if (partnerId) {
    query =
      query.eq(
        'partner_id',
        partnerId
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
 * TRANSACTIONS - DETAIL
 * ============================================================ */

export async function getTransaction(
  transactionId
) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  const [
    transactionResponse,
    reviewsResponse,
    assignmentsResponse,
    historyResponse,
    proofsResponse,
    executionProofsResponse,
    settlementsResponse,
  ] =
    await Promise.all([
      supabase
        .from('transactions')
        .select(
          `
            *,
            profiles:profiles!transactions_user_id_fkey(*),
            partners:partners!transactions_partner_id_fkey(*),
            momo:momo_deposit_numbers!transactions_momo_deposit_number_id_fkey(*)
          `
        )
        .eq(
          'id',
          transactionId
        )
        .single(),

      supabase
        .from('transaction_reviews')
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        ),

      supabase
        .from('transaction_assignments')
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'assigned_at',
          {
            ascending:
              false,
          }
        ),

      supabase
        .from('transaction_status_history')
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        ),

      supabase
        .from('transaction_proofs')
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'uploaded_at',
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          'transaction_execution_proofs'
        )
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'uploaded_at',
          {
            ascending:
              false,
          }
        ),

      supabase
        .from('bank_settlements')
        .select('*')
        .eq(
          'transaction_id',
          transactionId
        )
        .order(
          'initiated_at',
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    transactionResponse.error
  ) {
    throw transactionResponse.error;
  }

  if (
    reviewsResponse.error
  ) {
    throw reviewsResponse.error;
  }

  if (
    assignmentsResponse.error
  ) {
    throw assignmentsResponse.error;
  }

  if (
    historyResponse.error
  ) {
    throw historyResponse.error;
  }

  if (
    proofsResponse.error
  ) {
    throw proofsResponse.error;
  }

  if (
    executionProofsResponse.error
  ) {
    throw executionProofsResponse.error;
  }

  if (
    settlementsResponse.error
  ) {
    throw settlementsResponse.error;
  }

  const executionProofs =
    executionProofsResponse.data ??
    [];

  return {
    transaction:
      transactionResponse.data,

    reviews:
      reviewsResponse.data ??
      [],

    assignments:
      assignmentsResponse.data ??
      [],

    history:
      historyResponse.data ??
      [],

    proofs:
      proofsResponse.data ??
      [],

    executionProofs,

    hasExecutionProof:
      executionProofs.length >
      0,

    settlements:
      settlementsResponse.data ??
      [],
  };
}


/* ============================================================
 * TRANSACTION EXECUTION PROOFS
 * ============================================================ */

export async function listTransactionExecutionProofs(
  transactionId
) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  await getCurrentAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transaction_execution_proofs'
      )
      .select('*')
      .eq(
        'transaction_id',
        transactionId
      )
      .order(
        'uploaded_at',
        {
          ascending:
            false,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


/**
 * Téléverse une preuve de réussite
 * pour une transaction exécutée.
 *
 * IMPORTANT :
 *
 * D'après le schéma fourni, la table
 * `transaction_execution_proofs` possède :
 *
 * - transaction_id
 * - file_url
 * - uploaded_by_admin_id
 * - uploaded_by_partner_id
 * - description
 * - uploaded_at
 * - file_name
 * - mime_type
 *
 * Elle ne possède PAS :
 *
 * - storage_path
 * - uploaded_by
 */
export async function uploadTransactionExecutionProof({
  transactionId,
  file,
  description = null,
}) {
  const admin =
    await getCurrentAdmin();

  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (!file?.uri) {
    throw new Error(
      'Aucun fichier sélectionné.'
    );
  }

  /*
   * Vérifier que la transaction existe
   * avant de téléverser le fichier.
   */
  const {
    data: transaction,
    error:
      transactionError,
  } =
    await supabase
      .from('transactions')
      .select(
        'id, type, status'
      )
      .eq(
        'id',
        transactionId
      )
      .maybeSingle();

  if (transactionError) {
    throw transactionError;
  }

  if (!transaction) {
    throw new Error(
      'Transaction introuvable.'
    );
  }

  const originalName =
    String(
      file.name ||
      `transaction-${Date.now()}.jpg`
    ).trim();

  let extension =
    originalName
      .split('.')
      .pop() ||
    'jpg';

  extension =
    extension
      .replace(
        '.',
        ''
      )
      .toLowerCase();

  let mimeType =
    file.mimeType ||
    '';

  if (!mimeType) {
    switch (extension) {
      case 'pdf':
        mimeType =
          'application/pdf';
        break;

      case 'png':
        mimeType =
          'image/png';
        break;

      case 'webp':
        mimeType =
          'image/webp';
        break;

      case 'heic':
        mimeType =
          'image/heic';
        break;

      case 'heif':
        mimeType =
          'image/heif';
        break;

      case 'jpg':
      case 'jpeg':
      default:
        mimeType =
          'image/jpeg';
        break;
    }
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  if (
    !allowedMimeTypes.includes(
      mimeType
    )
  ) {
    throw new Error(
      'Format non pris en charge. Utilisez une image JPG, PNG, WEBP ou un fichier PDF.'
    );
  }

  const safeName =
    originalName.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );

  const storagePath =
    [
      'transaction-execution-proofs',
      transactionId,
      `${Date.now()}-${safeName}`,
    ].join('/');

  let base64;

  try {
    base64 =
      await FileSystem.readAsStringAsync(
        file.uri,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        }
      );
  } catch (readError) {
    console.error(
      '[ProofUpload] readAsStringAsync failed:',
      readError
    );

    throw new Error(
      'Impossible de lire le fichier sélectionné. Veuillez sélectionner à nouveau le fichier.'
    );
  }

  if (!base64) {
    throw new Error(
      'Le fichier sélectionné est vide.'
    );
  }

  let arrayBuffer;

  try {
    arrayBuffer =
      decode(base64);
  } catch (decodeError) {
    console.error(
      '[ProofUpload] decode failed:',
      decodeError
    );

    throw new Error(
      'Impossible de préparer le fichier pour son envoi.'
    );
  }

  if (
    !arrayBuffer ||
    arrayBuffer.byteLength <=
      0
  ) {
    throw new Error(
      'Le fichier sélectionné est vide ou invalide.'
    );
  }

  /*
   * Téléversement dans Supabase Storage.
   */
  const {
    data: uploadData,
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        'transaction-proofs'
      )
      .upload(
        storagePath,
        arrayBuffer,
        {
          contentType:
            mimeType,

          cacheControl:
            '3600',

          upsert:
            false,
        }
      );

  if (uploadError) {
    throw new Error(
      uploadError.message ||
      'Impossible de téléverser la preuve.'
    );
  }

  /*
   * Génération de l'URL publique du fichier.
   */
  const {
    data: publicData,
  } =
    supabase.storage
      .from(
        'transaction-proofs'
      )
      .getPublicUrl(
        storagePath
      );

  const fileUrl =
    publicData?.publicUrl ||
    null;

  if (!fileUrl) {
    /*
     * Nettoyage si l'URL n'a pas pu
     * être générée.
     */
    await supabase.storage
      .from(
        'transaction-proofs'
      )
      .remove([
        storagePath,
      ]);

    throw new Error(
      'Impossible de générer l’URL de la preuve.'
    );
  }

  /*
   * ==========================================================
   * IMPORTANT
   * ==========================================================
   *
   * Le schéma SQL indique :
   *
   * transaction_execution_proofs
   * ├── transaction_id
   * ├── file_url
   * ├── uploaded_by_admin_id
   * ├── uploaded_by_partner_id
   * ├── description
   * ├── uploaded_at
   * ├── file_name
   * └── mime_type
   *
   * Il n'existe PAS de :
   *
   * - storage_path
   * - uploaded_by
   *
   * Le payload ci-dessous respecte donc
   * exactement le schéma.
   */
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transaction_execution_proofs'
      )
      .insert({
        transaction_id:
          transactionId,

        file_url:
          fileUrl,

        file_name:
          originalName,

        mime_type:
          mimeType,

        description:
          description ??
          null,

        uploaded_by_admin_id:
          admin.id,

        /*
         * Aucun `uploaded_by_partner_id`
         * car cette preuve est ajoutée
         * par l'administrateur.
         */

        uploaded_at:
          new Date().toISOString(),
      })
      .select()
      .single();

  if (error) {
    /*
     * Si l'INSERT échoue après le téléversement,
     * supprimer le fichier Storage pour éviter
     * un fichier orphelin.
     */
    await supabase.storage
      .from(
        'transaction-proofs'
      )
      .remove([
        storagePath,
      ]);

    throw error;
  }

  return {
    ...data,

    /*
     * Conservé uniquement côté JavaScript.
     * Il n'est PAS envoyé à PostgreSQL.
     */
    storagePath,

    fileUrl,

    uploadData,
  };
}


/* ============================================================
 * TRANSACTION REVIEWS
 * ============================================================ */

export async function createTransactionReview({
  transactionId,
  decision,
  comment = null,
}) {
  const admin =
    await getCurrentAdmin();

  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (
    ![
      'approved',
      'rejected',
      'pending',
    ].includes(
      decision
    )
  ) {
    throw new Error(
      'Décision de review invalide.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transaction_reviews'
      )
      .insert({
        transaction_id:
          transactionId,

        reviewer_id:
          admin.id,

        decision,

        comment:
          comment ??
          null,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * TRANSACTION ASSIGNMENT
 * ============================================================ */

export async function assignTransaction({
  transactionId,
  partnerId,
}) {
  const admin =
    await getCurrentAdmin();

  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transaction_assignments'
      )
      .insert({
        transaction_id:
          transactionId,

        partner_id:
          partnerId,

        assigned_by:
          admin.id,

        assigned_at:
          new Date().toISOString(),
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * CRÉATION — PARTENAIRE
 * ============================================================ */

export async function createPartner({
  fullName,
  phoneNumber = null,
  whatsappNumber,
  secretCode,
  notes = null,
  partnerRoleIds = [],
}) {
  await getCurrentAdmin();

  if (!String(fullName || '').trim()) {
    throw new Error(
      'Le nom complet est obligatoire.'
    );
  }

  const cleanWhatsapp = String(
    whatsappNumber || ''
  )
    .replace(/[\s-]/g, '')
    .trim();

  const cleanPhone = phoneNumber
    ? String(phoneNumber)
        .replace(/\D/g, '')
        .trim()
    : null;

  const data = await invokeAdminFunction(
    'provision-backoffice-account',
    {
      accountType: 'partner',
      fullName: String(fullName).trim(),
      phoneNumber: cleanPhone || null,
      whatsappNumber: cleanWhatsapp,
      secretCode: String(secretCode || ''),
      notes: notes ? String(notes).trim() : null,
      partnerRoleIds: Array.isArray(partnerRoleIds)
        ? partnerRoleIds.filter(Boolean)
        : [],
    }
  );

  return data;
}


/* ============================================================
 * CRÉATION — KMERDIASPORA ADMIN
 * ============================================================ */

export async function createKmAdministrator({
  fullName,
  whatsappNumber,
  secretCode,
  notes = null,
}) {
  await getCurrentAdmin();

  if (!String(fullName || '').trim()) {
    throw new Error(
      'Le nom complet est obligatoire.'
    );
  }

  const cleanWhatsapp = String(
    whatsappNumber || ''
  )
    .replace(/[\s-]/g, '')
    .trim();

  const data = await invokeAdminFunction(
    'provision-backoffice-account',
    {
      accountType: 'kmerdiaspora_admin',
      fullName: String(fullName).trim(),
      whatsappNumber: cleanWhatsapp,
      secretCode: String(secretCode || ''),
      notes: notes ? String(notes).trim() : null,
    }
  );

  return data;
}


/* ============================================================
 * KMERDIASPORA ADMIN — MISE À JOUR
 * ============================================================ */

export async function updateKmAdministrator({
  kmAdministratorId,
  updates = {},
}) {
  await getCurrentAdmin();

  if (!kmAdministratorId) {
    throw new Error(
      'kmAdministratorId est requis.'
    );
  }

  const allowedFields = [
    'full_name',
    'whatsapp_number',
    'phone_number',
    'active',
    'notes',
    'role',
  ];

  const payload = {};

  for (const field of allowedFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        field
      )
    ) {
      payload[field] = updates[field];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      'full_name'
    )
  ) {
    payload.full_name = String(
      payload.full_name || ''
    ).trim();

    if (!payload.full_name) {
      throw new Error(
        'Le nom complet est obligatoire.'
      );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      'whatsapp_number'
    )
  ) {
    payload.whatsapp_number = String(
      payload.whatsapp_number || ''
    )
      .replace(/[\s-]/g, '')
      .trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      payload,
      'phone_number'
    )
  ) {
    payload.phone_number = payload.phone_number
      ? String(payload.phone_number)
          .replace(/\D/g, '')
          .trim()
      : null;
  }

  payload.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from('kmerdiaspora_admins')
    .update(payload)
    .eq('id', kmAdministratorId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * KMERDIASPORA ADMIN — CONTACT WHATSAPP
 * ============================================================
 */

export async function configureKmAdministratorWhatsApp({
  fullName,
  whatsappNumber,
}) {
  await getCurrentAdmin();

  const cleanFullName = String(
    fullName || ''
  ).trim();

  const cleanWhatsapp = String(
    whatsappNumber || ''
  )
    .replace(/[\s-]/g, '')
    .trim();

  if (!cleanFullName) {
    throw new Error(
      'Le nom du contact WhatsApp est obligatoire.'
    );
  }

  if (!/^\+\d{10,15}$/.test(cleanWhatsapp)) {
    throw new Error(
      'Numéro WhatsApp invalide.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('kd_settings')
    .upsert(
      {
        id: 1,
        whatsapp_admin_number: cleanWhatsapp,
        whatsapp_admin_name: cleanFullName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * PARTNERS
 * ============================================================ */

export async function listPartners({
  search = '',
  active = null,
  limit = 50,
  offset = 0,
} = {}) {
  await getCurrentAdmin();

  const pagination =
    buildPagination(
      limit,
      offset
    );

  let query =
    supabase
      .from('partners')
      .select(
        `
          *,
          partner_role_assignments(
            *
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1
      );

  if (
    typeof active ===
    'boolean'
  ) {
    query =
      query.eq(
        'active',
        active
      );
  }

  if (search) {
    const safeSearch = String(search).replace(/[%_,]/g, ' ').trim();

    if (safeSearch) {
      query =
        query.or(
          `full_name.ilike.%${safeSearch}%,phone_number.ilike.%${safeSearch}%,whatsapp_number.ilike.%${safeSearch}%`
        );
    }
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
 * PARTNER DETAIL
 * ============================================================ */

export async function getPartner(
  partnerId
) {
  await getCurrentAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const [
    partnerResponse,
    rolesResponse,
    transactionsResponse,
    settlementsResponse,
  ] =
    await Promise.all([
      supabase
        .from('partners')
        .select('*')
        .eq(
          'id',
          partnerId
        )
        .single(),

      supabase
        .from(
          'partner_role_assignments'
        )
        .select(
          `
            *,
            role:backoffice_roles(*)
          `
        )
        .eq(
          'partner_id',
          partnerId
        ),

      supabase
        .from('transactions')
        .select('*')
        .eq(
          'partner_id',
          partnerId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(50),

      /*
       * IMPORTANT :
       * bank_settlements ne possède pas created_at.
       * La date d'initiation du settlement est stockée
       * dans initiated_at.
       */
      supabase
        .from('bank_settlements')
        .select('*')
        .eq(
          'partner_id',
          partnerId
        )
        .order(
          'initiated_at',
          {
            ascending:
              false,
          }
        )
        .limit(50),
    ]);


  if (
    partnerResponse.error
  ) {
    throw partnerResponse.error;
  }

  if (
    rolesResponse.error
  ) {
    throw rolesResponse.error;
  }

  if (
    transactionsResponse.error
  ) {
    throw transactionsResponse.error;
  }

  if (
    settlementsResponse.error
  ) {
    throw settlementsResponse.error;
  }


  return {
    partner:
      partnerResponse.data,

    roles:
      rolesResponse.data ??
      [],

    transactions:
      transactionsResponse.data ??
      [],

    settlements:
      settlementsResponse.data ??
      [],
  };
}


/* ============================================================
 * PARTNER UPDATE
 * ============================================================ */

export async function updatePartner({
  partnerId,
  updates,
}) {
  await getCurrentAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const allowedFields = [
    'full_name',
    'phone_number',
    'whatsapp_number',
    'active',
    'notes',
  ];

  const payload = {};

  for (
    const field of allowedFields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates ?? {},
        field
      )
    ) {
      payload[field] =
        updates[field];
    }
  }

  payload.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from('partners')
      .update(
        payload
      )
      .eq(
        'id',
        partnerId
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * PARTNER ROLES
 * ============================================================ */

export async function updatePartnerRoles({
  partnerId,
  roleIds = [],
}) {
  const admin =
    await getCurrentAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const normalizedRoleIds =
    Array.from(
      new Set(
        (roleIds ?? [])
          .filter(Boolean)
          .map(
            (id) =>
              String(id)
          )
      )
    );

  const {
    error:
      deleteError,
  } =
    await supabase
      .from(
        'partner_role_assignments'
      )
      .delete()
      .eq(
        'partner_id',
        partnerId
      );

  if (deleteError) {
    throw deleteError;
  }

  if (
    normalizedRoleIds.length ===
    0
  ) {
    return [];
  }

  const rows =
    normalizedRoleIds.map(
      (roleId) => ({
        partner_id:
          partnerId,

        role_id:
          roleId,

        assigned_by:
          admin.id,

        assigned_at:
          new Date().toISOString(),
      })
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'partner_role_assignments'
      )
      .insert(rows)
      .select();

  if (error) {
    throw error;
  }

  return data ?? [];
}


/* ============================================================
 * BACKOFFICE ROLES
 * ============================================================ */

export async function listBackofficeRoles() {
  await getCurrentAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'backoffice_roles'
      )
      .select(
        `
          *,
          backoffice_role_permissions(
            permission_id,
            backoffice_permissions(*)
          )
        `
      )
      .order(
        'name',
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


export async function listBackofficePermissions() {
  await getCurrentAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'backoffice_permissions'
      )
      .select('*')
      .order(
        'code',
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


/* ============================================================
 * KMERDIASPORA
 * ============================================================ */

export async function getKmerDiasporaAdminDashboard() {
  await getCurrentAdmin();

  const [
    profiles,
    jobs,
    drivers,
    quests,
    moderation,
  ] =
    await Promise.all([
      supabase
        .from('kd_profiles')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),

      supabase
        .from('kd_job_requests')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),

      supabase
        .from('kd_driver_requests')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),

      supabase
        .from('kd_quests')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),

      supabase
        .from('kd_moderation_actions')
        .select('id', {
          count:
            'exact',
          head:
            true,
        }),
    ]);

  return {
    profiles:
      profiles.count ??
      0,

    jobs:
      jobs.count ??
      0,

    drivers:
      drivers.count ??
      0,

    quests:
      quests.count ??
      0,

    moderation:
      moderation.count ??
      0,
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
  const pagination =
    buildPagination(
      limit,
      offset
    );

  let query =
    supabase
      .from('daily_batches')
      .select(
        `
          *,
          partners:partner_id(
            id,
            full_name
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'batch_date',
        {
          ascending:
            false,
        }
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1
      );

  if (status) {
    query =
      query.eq(
        'status',
        status
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


export async function processDailyBatch({
  batchId,
  partnerId = null,
  transferReference =
    null,
  bankProofUrl =
    null,
}) {
  const admin =
    await getCurrentAdmin();

  if (!batchId) {
    throw new Error(
      'batchId est requis.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('daily_batches')
      .update({
        status:
          'processed',

        processed_by:
          admin.id,

        processed_at:
          new Date().toISOString(),

        partner_id:
          partnerId,

        transfer_reference:
          transferReference,

        bank_proof_url:
          bankProofUrl,
      })
      .eq(
        'id',
        batchId
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * AUDIT
 * ============================================================ */

export async function listAuditRecords({
  transactionId =
    null,
  limit = 50,
  offset = 0,
} = {}) {
  const pagination =
    buildPagination(
      limit,
      offset
    );

  let query =
    supabase
      .from('audit_records')
      .select(
        `
          *,
          transactions:transaction_id(*)
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'recorded_at',
        {
          ascending:
            false,
        }
      )
      .range(
        pagination.offset,
        pagination.offset +
          pagination.limit -
          1
      );

  if (transactionId) {
    query =
      query.eq(
        'transaction_id',
        transactionId
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
 * MOBILE MONEY
 * ============================================================ */

export async function listMomoDepositNumbers({
  active = null,
} = {}) {
  await getCurrentAdmin();

  let query = supabase
    .from('momo_deposit_numbers')
    .select('*');

  if (typeof active === 'boolean') {
    query = query.eq('active', active);
  }

  // `momo_deposit_numbers` ne possède pas de created_at dans le schéma réel.
  // On utilise l'UUID comme ordre de repli stable.
  const { data, error } = await query.order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}


export async function createMomoDepositNumber({
  phoneNumber,
  holderName,
  minAmount = null,
  maxAmount = null,
  active = true,
}) {
  await getCurrentAdmin();

  if (!phoneNumber) {
    throw new Error('Numéro Mobile Money requis.');
  }

  if (!holderName || !String(holderName).trim()) {
    throw new Error('Nom du titulaire requis.');
  }

  const normalizedNumber = normalizeInternationalPhone(phoneNumber);
  const normalizedMin = minAmount === null || minAmount === '' || minAmount === undefined ? null : Number(minAmount);
  const normalizedMax = maxAmount === null || maxAmount === '' || maxAmount === undefined ? null : Number(maxAmount);

  if (normalizedMin !== null && (!Number.isFinite(normalizedMin) || normalizedMin < 0)) {
    throw new Error('Montant minimum invalide.');
  }

  if (normalizedMax !== null && (!Number.isFinite(normalizedMax) || normalizedMax < 0)) {
    throw new Error('Montant maximum invalide.');
  }

  if (normalizedMin !== null && normalizedMax !== null && normalizedMax < normalizedMin) {
    throw new Error('Le montant maximal doit être supérieur ou égal au montant minimal.');
  }

  const { data, error } = await supabase
    .from('momo_deposit_numbers')
    .insert({
      phone_number: normalizedNumber,
      holder_name: String(holderName).trim(),
      min_amount: normalizedMin,
      max_amount: normalizedMax,
      active: Boolean(active),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function updateMomoDepositNumber({
  id,
  updates = {},
}) {
  await getCurrentAdmin();

  if (!id) {
    throw new Error('ID du numéro Mobile Money requis.');
  }

  const payload = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'phone_number')) {
    payload.phone_number = normalizeInternationalPhone(updates.phone_number);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'holder_name')) {
    payload.holder_name = String(updates.holder_name ?? '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'min_amount')) {
    payload.min_amount = updates.min_amount === null || updates.min_amount === '' ? null : Number(updates.min_amount);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'max_amount')) {
    payload.max_amount = updates.max_amount === null || updates.max_amount === '' ? null : Number(updates.max_amount);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'active')) {
    payload.active = Boolean(updates.active);
  }

  if (payload.holder_name === '') {
    throw new Error('Nom du titulaire requis.');
  }
  if (payload.min_amount !== undefined && payload.min_amount !== null && (!Number.isFinite(payload.min_amount) || payload.min_amount < 0)) {
    throw new Error('Montant minimum invalide.');
  }
  if (payload.max_amount !== undefined && payload.max_amount !== null && (!Number.isFinite(payload.max_amount) || payload.max_amount < 0)) {
    throw new Error('Montant maximum invalide.');
  }

  if (payload.min_amount !== undefined && payload.max_amount !== undefined && payload.min_amount !== null && payload.max_amount !== null && payload.max_amount < payload.min_amount) {
    throw new Error('Le montant maximal doit être supérieur ou égal au montant minimal.');
  }

  const { data, error } = await supabase
    .from('momo_deposit_numbers')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function deleteMomoDepositNumber({
  id,
}) {
  await getCurrentAdmin();

  if (!id) {
    throw new Error(
      'ID du numéro Mobile Money requis.'
    );
  }

  const {
    data: references,
    error:
      referenceError,
  } =
    await supabase
      .from('transactions')
      .select('id')
      .eq(
        'momo_deposit_number_id',
        id
      )
      .limit(1);

  if (referenceError) {
    throw referenceError;
  }

  if (
    references &&
    references.length >
      0
  ) {
    throw new Error(
      'Ce numéro Mobile Money ne peut pas être supprimé car il est déjà associé à une transaction.'
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        'momo_deposit_numbers'
      )
      .delete()
      .eq(
        'id',
        id
      );

  if (error) {
    throw error;
  }

  return true;
}


/* ============================================================
 * TARIFFS
 * ============================================================ */

/**
 * Normalise le code pays du tarif.
 *
 * Exemple :
 *   "Cameroun" -> "cameroun"
 *   " CAMEROUN " -> "cameroun"
 */
function normalizeTariffCountry(
  value
) {
  return String(
    value ?? ''
  )
    .trim()
    .toLowerCase();
}


/**
 * Normalise un montant de tarif.
 *
 * Accepte notamment :
 *   100000
 *   "100000"
 *   "100 000"
 *   "100000,50"
 */
function normalizeTariffAmount(
  value
) {
  const normalized =
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /\s/g,
        ''
      )
      .replace(
        ',',
        '.'
      );

  if (
    normalized === ''
  ) {
    return null;
  }

  const number =
    Number(
      normalized
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}


/**
 * Construit et valide le payload d'un tarif.
 */
function normalizeTariffPayload({
  countryA,
  countryB,
  minAmount,
  maxAmount,
  feeAmount,
}) {
  const normalizedCountryA =
    normalizeTariffCountry(
      countryA
    );

  const normalizedCountryB =
    normalizeTariffCountry(
      countryB
    );

  const normalizedMinAmount =
    normalizeTariffAmount(
      minAmount
    );

  const normalizedMaxAmount =
    normalizeTariffAmount(
      maxAmount
    );

  const normalizedFeeAmount =
    normalizeTariffAmount(
      feeAmount
    );

  if (
    !normalizedCountryA ||
    !normalizedCountryB
  ) {
    throw new Error(
      'Les pays du trajet sont obligatoires.'
    );
  }

  if (
    normalizedCountryA ===
    normalizedCountryB
  ) {
    throw new Error(
      'Le pays de départ et le pays de destination doivent être différents.'
    );
  }

  if (
    normalizedMinAmount ===
      null ||
    normalizedMinAmount <
      0
  ) {
    throw new Error(
      'Le montant minimum est invalide.'
    );
  }

  if (
    normalizedMaxAmount ===
      null ||
    normalizedMaxAmount <=
      normalizedMinAmount
  ) {
    throw new Error(
      'Le montant maximum doit être supérieur au montant minimum.'
    );
  }

  if (
    normalizedFeeAmount ===
      null ||
    normalizedFeeAmount <
      0
  ) {
    throw new Error(
      'Le montant des frais est invalide.'
    );
  }

  return {
    country_a:
      normalizedCountryA,

    country_b:
      normalizedCountryB,

    min_amount:
      normalizedMinAmount,

    max_amount:
      normalizedMaxAmount,

    fee_amount:
      normalizedFeeAmount,
  };
}


/**
 * Détermine si une erreur Supabase/PostgreSQL provient
 * directement de la contrainte UNIQUE du tarif.
 */
function isDuplicateTariffError(
  error
) {
  const message =
    String(
      error?.message ??
        ''
    ).toLowerCase();

  const details =
    String(
      error?.details ??
        ''
    ).toLowerCase();

  const hint =
    String(
      error?.hint ??
        ''
    ).toLowerCase();

  return (
    error?.code ===
      '23505' &&
    (
      message.includes(
        'uq_transfer_fee_tariff_range'
      ) ||
      details.includes(
        'uq_transfer_fee_tariff_range'
      ) ||
      hint.includes(
        'uq_transfer_fee_tariff_range'
      )
    )
  );
}


/**
 * Crée une erreur métier propre pour l'interface.
 */
function createDuplicateTariffError({
  countryA,
  countryB,
  minAmount,
  maxAmount,
}) {
  const error =
    new Error(
      `Un tarif existe déjà pour ${countryA} → ${countryB} sur la tranche ${minAmount} à ${maxAmount}.`
    );

  error.code =
    'TARIFF_ALREADY_EXISTS';

  return error;
}


export async function listTransferTariffs() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select('*')
      .order(
        'country_a',
        {
          ascending:
            true,
        }
      )
      .order(
        'country_b',
        {
          ascending:
            true,
        }
      )
      .order(
        'min_amount',
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


export async function createTransferTariff({
  countryA,
  countryB,
  minAmount,
  maxAmount,
  feeAmount,
}) {
  const tariff =
    normalizeTariffPayload({
      countryA,
      countryB,
      minAmount,
      maxAmount,
      feeAmount,
    });

  /*
   * Première vérification du doublon.
   *
   * On vérifie exactement la combinaison utilisée
   * par la contrainte UNIQUE :
   *
   * country_a
   * country_b
   * min_amount
   * max_amount
   */
  const {
    data:
      existingTariff,
    error:
      existingTariffError,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select('id')
      .eq(
        'country_a',
        tariff.country_a
      )
      .eq(
        'country_b',
        tariff.country_b
      )
      .eq(
        'min_amount',
        tariff.min_amount
      )
      .eq(
        'max_amount',
        tariff.max_amount
      )
      .limit(1)
      .maybeSingle();

  if (
    existingTariffError
  ) {
    throw existingTariffError;
  }

  if (existingTariff) {
    throw createDuplicateTariffError({
      countryA:
        tariff.country_a,

      countryB:
        tariff.country_b,

      minAmount:
        tariff.min_amount,

      maxAmount:
        tariff.max_amount,
    });
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .insert(
        tariff
      )
      .select()
      .single();

  if (error) {
    /*
     * Deuxième protection contre une concurrence
     * entre deux insertions simultanées.
     */
    if (
      isDuplicateTariffError(
        error
      )
    ) {
      throw createDuplicateTariffError({
        countryA:
          tariff.country_a,

        countryB:
          tariff.country_b,

        minAmount:
          tariff.min_amount,

        maxAmount:
          tariff.max_amount,
      });
    }

    throw error;
  }

  return data;
}


export async function updateTransferTariff({
  tariffId,
  updates,
}) {
  if (!tariffId) {
    throw new Error(
      'Identifiant du tarif manquant.'
    );
  }

  const tariff =
    normalizeTariffPayload({
      countryA:
        updates?.country_a,

      countryB:
        updates?.country_b,

      minAmount:
        updates?.min_amount,

      maxAmount:
        updates?.max_amount,

      feeAmount:
        updates?.fee_amount,
    });

  /*
   * IMPORTANT :
   *
   * Pour un UPDATE, il ne suffit pas de vérifier si le
   * nouveau tarif existe.
   *
   * Il faut exclure le tarif actuellement modifié.
   *
   * Exemple :
   *
   * ID 1 :
   *   mali -> cameroun
   *   0 -> 100000
   *
   * ID 2 :
   *   mali -> guinee
   *   0 -> 100000
   *
   * Si l'ID 2 devient :
   *
   *   mali -> cameroun
   *   0 -> 100000
   *
   * ID 1 existe déjà.
   *
   * Le SELECT ci-dessous détecte le conflit AVANT
   * l'UPDATE et permet d'afficher une vraie erreur métier.
   */
  const {
    data:
      conflictingTariff,
    error:
      conflictError,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select(
        `
          id,
          country_a,
          country_b,
          min_amount,
          max_amount,
          fee_amount
        `
      )
      .eq(
        'country_a',
        tariff.country_a
      )
      .eq(
        'country_b',
        tariff.country_b
      )
      .eq(
        'min_amount',
        tariff.min_amount
      )
      .eq(
        'max_amount',
        tariff.max_amount
      )
      .neq(
        'id',
        tariffId
      )
      .limit(1)
      .maybeSingle();

  if (conflictError) {
    throw conflictError;
  }

  if (conflictingTariff) {
    throw createDuplicateTariffError({
      countryA:
        tariff.country_a,

      countryB:
        tariff.country_b,

      minAmount:
        tariff.min_amount,

      maxAmount:
        tariff.max_amount,
    });
  }

  /*
   * Important :
   * on ne transmet pas directement "updates".
   *
   * On reconstruit un payload propre afin de ne modifier
   * que les colonnes autorisées.
   */
  const safeUpdates = {
    country_a:
      tariff.country_a,

    country_b:
      tariff.country_b,

    min_amount:
      tariff.min_amount,

    max_amount:
      tariff.max_amount,

    fee_amount:
      tariff.fee_amount,
  };

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .update(
        safeUpdates
      )
      .eq(
        'id',
        tariffId
      )
      .select()
      .single();

  if (error) {
    /*
     * La contrainte PostgreSQL reste la dernière
     * protection contre une modification concurrente.
     */
    if (
      isDuplicateTariffError(
        error
      )
    ) {
      throw createDuplicateTariffError({
        countryA:
          tariff.country_a,

        countryB:
          tariff.country_b,

        minAmount:
          tariff.min_amount,

        maxAmount:
          tariff.max_amount,
      });
    }

    throw error;
  }

  return data;
}


/* ============================================================
 * RANK RULES
 * ============================================================ */

export async function deleteTransferTariff({
  tariffId,
}) {
  await getCurrentAdmin();

  if (!tariffId) {
    throw new Error('Identifiant du tarif manquant.');
  }

  const { data: existing, error: readError } = await supabase
    .from('transfer_fee_tariffs')
    .select('id, country_a, country_b, min_amount, max_amount, fee_amount')
    .eq('id', tariffId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    throw new Error('Tarif introuvable.');
  }

  const { error } = await supabase
    .from('transfer_fee_tariffs')
    .delete()
    .eq('id', tariffId);

  if (error) {
    throw error;
  }

  return existing;
}


export async function listRankRules() {
  await getCurrentAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'rank_rules'
      )
      .select('*')
      .order(
        'display_order',
        {
          ascending:
            true,
        }
      )
      .order(
        'min_transaction_volume',
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


export async function getRankRule(
  rankRuleId
) {
  await getCurrentAdmin();

  if (!rankRuleId) {
    throw new Error(
      'rankRuleId est requis.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'rank_rules'
      )
      .select('*')
      .eq(
        'id',
        rankRuleId
      )
      .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function listLoanRules() {
  return listRankRules();
}


export async function updateLoanRule({
  rankRuleId,
  updates,
}) {
  return updateRankRule({
    rankRuleId,
    updates: {
      money_loan_repayment_months:
        updates?.money_loan_repayment_months,

      flight_loan_repayment_months:
        updates?.flight_loan_repayment_months,

      flight_accommodation_months:
        updates?.flight_accommodation_months,

      max_money_loan_amount:
        updates?.max_money_loan_amount,

      max_flight_loan_amount:
        updates?.max_flight_loan_amount,

      money_loan_enabled:
        updates?.money_loan_enabled,

      flight_loan_enabled:
        updates?.flight_loan_enabled,
    },
  });
}


export async function updateRankRule({
  rankRuleId,
  updates,
}) {
  await getCurrentAdmin();

  if (!rankRuleId) {
    throw new Error(
      'rankRuleId est requis.'
    );
  }

  const allowedFields = [
    'label',
    'min_transaction_volume',
    'max_transaction_volume',
    'money_loan_repayment_months',
    'flight_loan_repayment_months',
    'flight_accommodation_months',
    'max_money_loan_amount',
    'max_flight_loan_amount',
    'money_loan_enabled',
    'flight_loan_enabled',
    'active',
    'display_order',
  ];

  const payload = {};

  for (
    const field of allowedFields
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        updates ?? {},
        field
      )
    ) {
      payload[field] =
        updates[field];
    }
  }

  payload.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'rank_rules'
      )
      .update(
        payload
      )
      .eq(
        'id',
        rankRuleId
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function recalculateUserRank(
  userId
) {
  await getCurrentAdmin();

  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'recalculate_user_rank',
      {
        p_user_id:
          userId,
      }
    );

  if (error) {
    throw error;
  }

  return data;
}

/* ============================================================
 * SUPPRESSION — PARTENAIRES
 * ============================================================ */


export async function deletePartner(
  partnerId
) {
  await getCurrentAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  return invokeAdminFunction(
    'delete-backoffice-account',
    {
      accountType: 'partner',
      accountId: partnerId,
    }
  );
}


/* ============================================================
 * SUPPRESSION — UTILISATEUR
 * ============================================================ */

export async function deleteUser(
  userId
) {
  await getCurrentAdmin();

  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  return invokeAdminFunction(
    'delete-backoffice-account',
    {
      accountType: 'user',
      accountId: userId,
    }
  );
}


/* ============================================================
 * SUPPRESSION — KMADMINISTRATEUR
 * ============================================================ */

export async function deleteKmAdministrator(
  kmAdministratorId
) {
  await getCurrentAdmin();

  if (!kmAdministratorId) {
    throw new Error(
      'kmAdministratorId est requis.'
    );
  }

  return invokeAdminFunction(
    'delete-backoffice-account',
    {
      accountType: 'kmerdiaspora_admin',
      accountId: kmAdministratorId,
    }
  );
}
