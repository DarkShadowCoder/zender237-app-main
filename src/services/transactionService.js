/**
 * Transactions — dépôt, transfert et retrait.
 *
 * RÈGLE DE SOLDE POUR LES TRANSFERTS :
 * - À la création du transfert (`under_review`), le montant + les frais
 *   sont immédiatement débités de `wallets.available_balance`.
 * - La confirmation ne recrédite ni ne redébite le wallet : le débit reste acquis.
 * - Le rejet ou l'annulation recrédite exactement le montant + les frais.
 *
 * La logique financière des transferts est exécutée côté PostgreSQL
 * par le trigger `trg_transfer_status`, afin d'être atomique et de protéger
 * le solde contre les courses concurrentes.
 */

import * as FileSystem from 'expo-file-system';

import {
  supabase,
} from '../lib/supabase';

import {
  TXN_TYPE,
  TXN_STATUS,
} from '../constants';

import {
  getCountryCodeFromPhone,
  normalizeInternationalPhone,
} from '../utils/phone';


/* ============================================================
 * SUPABASE CONFIGURATION
 * ============================================================ */

/*
 * Récupérées depuis l'instance Supabase déjà initialisée.
 */
const SUPABASE_URL =
  supabase.supabaseUrl;

const SUPABASE_ANON_KEY =
  supabase.supabaseKey;


/* ============================================================
 * MOBILE MONEY
 * ============================================================ */

/**
 * Liste les numéros Mobile Money actifs pouvant être utilisés
 * pour effectuer une recharge.
 *
 * Les numéros sont filtrés :
 * - par indicatif pays si fourni ;
 * - par plage de montant si fournie.
 */
export async function listMomoNumbers({
  amount = null,
  countryCode = null,
} = {}) {
  let query =
    supabase
      .from(
        'momo_deposit_numbers'
      )
      .select('*')
      .eq(
        'active',
        true
      );

  if (countryCode) {
    query =
      query.eq(
        'country_code',
        countryCode
      );
  }

  if (
    amount !== null &&
    amount !== undefined
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      )
    ) {
      throw new Error(
        'Montant de dépôt invalide.'
      );
    }

    query =
      query
        .or(
          `min_amount.lte.${numericAmount},min_amount.is.null`
        )
        .or(
          `max_amount.gte.${numericAmount},max_amount.is.null`
        );
  }

  const {
    data,
    error,
  } =
    await query.order(
      'phone_number',
      {
        ascending: true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* ============================================================
 * DEPOT / RECHARGE
 * ============================================================ */

/**
 * Crée une transaction de dépôt dans l'état `pending_proof`.
 *
 * Correction :
 * `normalizeInternationalPhone` et `getCountryCodeFromPhone`
 * sont maintenant importés depuis `../utils/phone`.
 *
 * Cela corrige l'erreur :
 *
 * Property 'normalizeInternationalPhone' does not exist
 */
export async function createDeposit({
  userId,
  amount,
  momoDepositNumberId,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  if (!momoDepositNumberId) {
    throw new Error(
      'Numéro Mobile Money sélectionné manquant.'
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Le montant de la recharge doit être supérieur à zéro.'
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_deposit_for_current_user',
    {
      p_amount: numericAmount,
      p_momo_deposit_number_id:
        momoDepositNumberId,
    }
  );

  if (error) {
    const depositError = new Error(
      error.message ||
        'Impossible de créer la recharge.'
    );

    depositError.code =
      error.code ||
      'DEPOSIT_CREATION_FAILED';

    throw depositError;
  }

  if (!data?.id) {
    throw new Error(
      'La transaction de dépôt n’a pas pu être créée.'
    );
  }

  return data;
}

/**
 * Soumet une preuve de dépôt puis passe la transaction
 * en `under_review`.
 */
export async function submitDepositProof({
  transactionId,
  userId,
  fileUrl,
  referenceNote,
}) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  if (!fileUrl) {
    throw new Error(
      'La preuve de dépôt est obligatoire.'
    );
  }

  /*
   * Enregistrement de la preuve.
   */
  const {
    error: proofError,
  } =
    await supabase
      .from(
        'transaction_proofs'
      )
      .insert({
        transaction_id:
          transactionId,

        file_url:
          fileUrl,

        uploaded_by:
          userId,
      });

  if (proofError) {
    throw proofError;
  }

  /*
   * Passage en revue.
   */
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transactions'
      )
      .update({
        status:
          TXN_STATUS.UNDER_REVIEW,

        reference_note:
          referenceNote ||
          null,
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'user_id',
        userId
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * TRANSFERT
 * ============================================================ */

/**
 * Crée un transfert directement en `under_review`.
 *
 * Les frais peuvent être égaux à zéro.
 *
 * Exemple :
 *
 * amount = 100000
 * fee    = 0
 * total  = 100000
 */
export async function createTransfer({
  userId,
  amount,
  recipientName,
  recipientMobileNumber,
  recipientLocation,
  recipientCountry,
  recipientCountryCode,
  referenceNote,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Le montant du transfert doit être supérieur à zéro.'
    );
  }

  if (!recipientName?.trim()) {
    throw new Error(
      'Le nom du destinataire est requis.'
    );
  }

  if (!recipientCountry) {
    throw new Error(
      'Le pays de destination est requis.'
    );
  }

  const normalizedRecipientPhone =
    normalizeInternationalPhone(
      recipientMobileNumber
    );

  if (!normalizedRecipientPhone) {
    throw new Error(
      'Le numéro du destinataire est invalide.'
    );
  }

  const resolvedRecipientCountryCode =
    recipientCountryCode ||
    getCountryCodeFromPhone(
      normalizedRecipientPhone
    ) ||
    null;

  const {
    data,
    error,
  } = await supabase.rpc(
    'create_transfer_for_current_user',
    {
      p_amount: numericAmount,
      p_recipient_name:
        recipientName.trim(),
      p_recipient_mobile_number:
        normalizedRecipientPhone,
      p_recipient_country:
        String(recipientCountry)
          .trim()
          .toLowerCase(),
      p_recipient_country_code:
        resolvedRecipientCountryCode,
      p_recipient_location:
        recipientLocation?.trim() ||
        null,
      p_reference_note:
        referenceNote?.trim() ||
        null,
    }
  );

  if (error) {
    const transferError = new Error(
      error.message ||
        'Impossible de créer le transfert.'
    );

    transferError.code =
      error.code ||
      'TRANSFER_CREATION_FAILED';

    throw transferError;
  }

  if (!data?.id) {
    throw new Error(
      'La transaction de transfert n’a pas pu être créée.'
    );
  }

  return data;
}

/* ============================================================
 * RETRAIT
 * ============================================================ */

/**
 * Crée un retrait puis le passe immédiatement
 * en `under_review`.
 */
export async function createWithdrawal({
  userId,
  amount,
  feeAmount,
  recipientMobileNumber,
  recipientName,
  method,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const numericAmount =
    Number(
      amount
    );

  const numericFee =
    feeAmount === null ||
    feeAmount === undefined
      ? 0
      : Number(
          feeAmount
        );

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Le montant du retrait doit être supérieur à zéro.'
    );
  }

  if (
    !Number.isFinite(
      numericFee
    ) ||
    numericFee < 0
  ) {
    throw new Error(
      'Les frais du retrait sont invalides.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transactions'
      )
      .insert({
        type:
          TXN_TYPE.WITHDRAWAL,

        status:
          TXN_STATUS.PENDING_PROOF,

        user_id:
          userId,

        amount:
          numericAmount,

        fee_amount:
          numericFee,

        recipient_mobile_number:
          recipientMobileNumber,

        recipient_name:
          recipientName,

        reference_note:
          method ||
          null,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  /*
   * Passage en revue.
   */
  const {
    data: updated,
    error: updateError,
  } =
    await supabase
      .from(
        'transactions'
      )
      .update({
        status:
          TXN_STATUS.UNDER_REVIEW,
      })
      .eq(
        'id',
        data.id
      )
      .eq(
        'user_id',
        userId
      )
      .select()
      .single();

  if (updateError) {
    throw updateError;
  }

  return updated;
}


/* ============================================================
 * ANNULATION
 * ============================================================ */

/**
 * Annule une transaction appartenant à l'utilisateur
 * actuellement connecté.
 *
 * Pour un transfert :
 *
 * under_review -> cancelled
 *
 * Le trigger PostgreSQL se charge du remboursement
 * du montant réservé.
 */
export async function cancelTransaction(
  transactionId
) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const currentUserId =
    authData
      ?.user
      ?.id;

  if (!currentUserId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transactions'
      )
      .update({
        status:
          TXN_STATUS.CANCELLED,
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'user_id',
        currentUserId
      )
      .in(
        'status',
        [
          TXN_STATUS.PENDING_PROOF,
          TXN_STATUS.UNDER_REVIEW,
        ]
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * TRANSACTION DETAIL
 * ============================================================ */

/**
 * Récupère le détail d'une transaction.
 */
export async function getTransaction(
  transactionId
) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transactions'
      )
      .select(
        `
          *,
          transaction_proofs(*)
        `
      )
      .eq(
        'id',
        transactionId
      )
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * TRANSACTIONS UTILISATEUR
 * ============================================================ */

/**
 * Liste les transactions d'un utilisateur.
 */
export async function listTransactions({
  userId,
  type = null,
  status = null,
  limit = 20,
  offset = 0,
}) {
  if (!userId) {
    throw new Error(
      'userId est requis.'
    );
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) ||
          20,
        100
      )
    );

  const safeOffset =
    Math.max(
      0,
      Number(offset) ||
        0
    );

  let query =
    supabase
      .from(
        'transactions'
      )
      .select(
        '*',
        {
          count:
            'exact',
        }
      )
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
      .range(
        safeOffset,
        safeOffset +
          safeLimit -
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
      data || [],

    count:
      count || 0,
  };
}


/* ============================================================
 * REALTIME TRANSACTION
 * ============================================================ */

/**
 * S'abonne aux mises à jour d'une transaction.
 *
 * Retourne une fonction de désabonnement.
 */
export function subscribeToTransaction(
  transactionId,
  onChange
) {
  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  if (
    typeof onChange !==
    'function'
  ) {
    throw new Error(
      'onChange doit être une fonction.'
    );
  }

  const channel =
    supabase
      .channel(
        `txn-${transactionId}`
      )
      .on(
        'postgres_changes',
        {
          event:
            'UPDATE',

          schema:
            'public',

          table:
            'transactions',

          filter:
            `id=eq.${transactionId}`,
        },
        (payload) => {
          onChange(
            payload.new
          );
        }
      )
      .subscribe();

  return () =>
    supabase.removeChannel(
      channel
    );
}


/* ============================================================
 * UPLOAD DES PREUVES
 * ============================================================ */

/**
 * Upload d'une capture de preuve vers le bucket
 * `transaction-proofs`.
 */
export async function uploadProofImage({
  uri,
  fileName,
  contentType,
  transactionId,
}) {
  if (!uri) {
    throw new Error(
      'URI du fichier manquante.'
    );
  }

  if (!transactionId) {
    throw new Error(
      'transactionId est requis.'
    );
  }

  const safeFileName =
    String(
      fileName ||
        `proof-${Date.now()}.jpg`
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

  const safeContentType =
    contentType ||
    'image/jpeg';

  const path =
    `${transactionId}/${Date.now()}-${safeFileName}`;

  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase
      .auth
      .getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken =
    sessionData
      ?.session
      ?.access_token;

  if (!accessToken) {
    throw new Error(
      'Session expirée, reconnectez-vous avant de réessayer.'
    );
  }

  const uploadUrl =
    `${SUPABASE_URL}/storage/v1/object/transaction-proofs/${path}`;

  const result =
    await FileSystem.uploadAsync(
      uploadUrl,
      uri,
      {
        httpMethod:
          'POST',

        uploadType:
          FileSystem
            .FileSystemUploadType
            .BINARY_CONTENT,

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          apikey:
            SUPABASE_ANON_KEY,

          'Content-Type':
            safeContentType,

          'x-upsert':
            'true',
        },
      }
    );

  if (
    result.status < 200 ||
    result.status >= 300
  ) {
    let message =
      `Échec de l'envoi de la preuve (code ${result.status}).`;

    try {
      const body =
        JSON.parse(
          result.body
        );

      message =
        body?.message ||
        body?.error ||
        message;
    } catch {
      /*
       * La réponse n'est pas du JSON.
       * On conserve le message générique.
       */
    }

    throw new Error(
      message
    );
  }

  const {
    data,
  } =
    supabase.storage
      .from(
        'transaction-proofs'
      )
      .getPublicUrl(
        path
      );

  return (
    data?.publicUrl ||
    null
  );
}