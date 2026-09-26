/**
 * ============================================================
 * ZENDER237 - PARTNER SERVICE
 * ============================================================
 *
 * RÈGLES DES RÔLES PARTENAIRES
 *
 * ------------------------------------------------------------
 * ROLE = partner
 * ------------------------------------------------------------
 * ✅ Consulter les transactions qui lui sont affectées
 * ✅ Confirmer une transaction
 * ❌ Rejeter une transaction
 * ❌ Approuver administrativement
 * ❌ Exécuter une transaction
 * ❌ Annuler une transaction
 * ❌ Gérer les règlements
 * ❌ Accéder à KmerDiaspora
 *
 * ------------------------------------------------------------
 * ROLE = kmerdiaspora
 * ------------------------------------------------------------
 * ❌ Opérations financières
 * ✅ Consulter KmerDiaspora
 * ✅ Consulter les demandes de poste
 * ✅ Consulter les demandes de chauffeurs
 * ✅ Consulter les quêtes
 * ✅ Consulter le matching
 * ❌ Créer
 * ❌ Modifier
 * ❌ Supprimer
 * ❌ Modifier le matching
 *
 * ------------------------------------------------------------
 * ROLE = admin
 * ------------------------------------------------------------
 * ✅ Toutes les opérations financières
 * ✅ Consulter KmerDiaspora
 * ❌ Modifier KmerDiaspora
 * ❌ Supprimer KmerDiaspora
 * ❌ Gérer le matching
 * ❌ Modérer KmerDiaspora
 *
 * IMPORTANT
 * ------------------------------------------------------------
 * Les permissions critiques doivent également être renforcées
 * côté Supabase avec RLS / RPC / policies.
 * ============================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  supabase,
} from '../lib/supabase';


/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Retourne le partenaire correspondant à la session courante.
 */
export async function getCurrentPartner() {

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

  const {
    data,
    error,
  } =
    await supabase
      .from('partners')
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
      'Compte partenaire introuvable.'
    );
  }

  if (data.active === false) {
    throw new Error(
      'Compte partenaire désactivé.'
    );
  }

  return data;
}


/**
 * Normalise un rôle provenant de :
 *
 * - string : "partner"
 * - "Partner"
 * - objet { code: "partner" }
 * - objet { role_code: "partner" }
 * - objet { name: "partner" }
 * - objet { label: "Partner" }
 */
function normalizeRoleCode(
  role
) {

  if (!role) {
    return '';
  }

  if (
    typeof role ===
    'string'
  ) {
    return role
      .trim()
      .toLowerCase();
  }

  if (
    Array.isArray(role)
  ) {
    return normalizeRoleCode(
      role[0]
    );
  }

  return String(
    role.code ??
      role.role_code ??
      role.name ??
      role.label ??
      ''
  )
    .trim()
    .toLowerCase();
}


/**
 * Récupère directement les rôles du partenaire depuis Supabase.
 *
 * IMPORTANT :
 * On évite volontairement le JOIN :
 *
 * partner_role_assignments(
 *   backoffice_roles(...)
 * )
 *
 * car le JOIN PostgREST peut devenir ambigu ou être affecté
 * par les policies/RLS.
 */
async function getPartnerRoleCodesFromDatabase(
  partnerId
) {

  const {
    data: assignments,
    error: assignmentError,
  } =
    await supabase
      .from(
        'partner_role_assignments'
      )
      .select(
        'role_id'
      )
      .eq(
        'partner_id',
        partnerId
      );


  if (assignmentError) {

    return {
      roles: [],
      roleCodes: new Set(),
      error:
        assignmentError,
    };
  }


  const roleIds =
    [
      ...new Set(
        (
          assignments ??
          []
        )
          .map(
            (row) =>
              row?.role_id
          )
          .filter(
            Boolean
          )
          .map(
            String
          )
      ),
    ];


  if (
    roleIds.length ===
    0
  ) {

    return {
      roles: [],
      roleCodes: new Set(),
      error: null,
    };
  }


  const {
    data: roles,
    error: roleError,
  } =
    await supabase
      .from(
        'backoffice_roles'
      )
      .select(
        `
          id,
          code,
          label,
          scope,
          active
        `
      )
      .in(
        'id',
        roleIds
      );


  if (roleError) {

    return {
      roles: [],
      roleCodes: new Set(),
      error:
        roleError,
    };
  }


  /*
   * Un rôle désactivé ne doit jamais autoriser d'opération.
   *
   * Si active est absent dans une ancienne version du schéma,
   * role?.active !== false permet de conserver la compatibilité.
   */
  const activeRoles =
    (
      roles ??
      []
    ).filter(
      (role) =>
        role?.active !== false
    );


  const roleCodes =
    new Set(
      activeRoles
        .map(
          normalizeRoleCode
        )
        .filter(
          Boolean
        )
    );


  return {
    roles:
      activeRoles,

    roleCodes,

    error:
      null,
  };
}


/**
 * Récupère le snapshot RBAC sauvegardé au moment du login.
 *
 * AuthContext sauvegarde :
 *
 * @zender237/account_roles
 * @zender237/account_permissions
 *
 * Cette information permet au service de fonctionner même
 * lorsque les tables RBAC ne sont pas directement lisibles
 * depuis le client à cause de RLS.
 */
async function getStoredPartnerAuthorization() {

  try {

    const [
      storedRoles,
      storedPermissions,
    ] =
      await Promise.all([

        AsyncStorage.getItem(
          '@zender237/account_roles'
        ),

        AsyncStorage.getItem(
          '@zender237/account_permissions'
        ),

      ]);


    let roles = [];
    let permissions = [];


    /* --------------------------------------------------------
     * ROLES
     * ------------------------------------------------------ */

    try {

      const parsed =
        storedRoles
          ? JSON.parse(
              storedRoles
            )
          : [];


      roles =
        Array.isArray(
          parsed
        )
          ? parsed
          : [];

    } catch {

      roles = [];
    }


    /* --------------------------------------------------------
     * PERMISSIONS
     * ------------------------------------------------------ */

    try {

      const parsed =
        storedPermissions
          ? JSON.parse(
              storedPermissions
            )
          : [];


      permissions =
        Array.isArray(
          parsed
        )
          ? parsed
              .map(
                (
                  permission
                ) =>
                  String(
                    permission ||
                    ''
                  )
                    .trim()
                    .toLowerCase()
              )
              .filter(
                Boolean
              )
          : [];

    } catch {

      permissions = [];
    }


    const roleCodes =
      new Set(
        roles
          .map(
            normalizeRoleCode
          )
          .filter(
            Boolean
          )
      );


    return {
      roles,

      roleCodes,

      permissions,
    };

  } catch (error) {

    console.warn(
      '[partnerService] Impossible de lire le snapshot RBAC :',
      error
    );


    return {
      roles: [],

      roleCodes:
        new Set(),

      permissions: [],
    };
  }
}


/**
 * Retourne l'autorisation effective du partenaire.
 *
 * PRIORITÉ :
 *
 * 1. Les rôles réellement présents dans Supabase lorsque
 *    ceux-ci sont accessibles.
 *
 * 2. Sinon les rôles renvoyés par l'Edge Function login et
 *    sauvegardés par AuthContext.
 *
 * Cette stratégie corrige notamment le cas où :
 *
 * partner_role_assignments
 *        ↓
 *       RLS
 *        ↓
 * lecture vide / interdite
 *
 * alors que le partenaire a pourtant bien reçu le rôle
 * "partner" lors du login.
 */
export async function getPartnerAuthorization() {

  const partner =
    await getCurrentPartner();


  const databaseAuthorization =
    await getPartnerRoleCodesFromDatabase(
      partner.id
    );


  const storedAuthorization =
    await getStoredPartnerAuthorization();


  /*
   * Si la base renvoie des rôles, ils sont la source
   * de vérité.
   *
   * Si la base ne renvoie rien, on utilise le snapshot
   * du login.
   */
  const useDatabaseRoles =
    databaseAuthorization
      .roleCodes
      .size > 0;


  const roles =
    useDatabaseRoles
      ? databaseAuthorization.roles
      : storedAuthorization.roles;


  const roleCodes =
    useDatabaseRoles
      ? databaseAuthorization.roleCodes
      : storedAuthorization.roleCodes;


  const permissions =
    storedAuthorization.permissions;


  if (
    databaseAuthorization.error &&
    !useDatabaseRoles
  ) {

    console.warn(
      '[partnerService] RBAC Supabase inaccessible, utilisation du snapshot du login.',
      databaseAuthorization.error
    );
  }


  return {

    partner,

    roles,

    roleCodes,

    permissions,

    isAdmin:
      roleCodes.has(
        'admin'
      ),

    isPartner:
      roleCodes.has(
        'partner'
      ),

    isKmerDiaspora:
      roleCodes.has(
        'kmerdiaspora'
      ),

  };
}


/* ============================================================
 * TRANSACTION AUTHORIZATION
 * ============================================================ */

/**
 * Partner + Admin peuvent consulter les transactions.
 *
 * ROLE partner
 * ✅ view
 *
 * ROLE admin
 * ✅ view
 */
async function assertTransactionAccess() {

  const access =
    await getPartnerAuthorization();


  if (
    access.isAdmin ||
    access.isPartner ||
    access.permissions.includes(
      'transaction.view'
    ) ||
    access.permissions.includes(
      'transaction.review'
    ) ||
    access.permissions.includes(
      'transaction.confirm'
    )
  ) {

    return access;
  }


  throw new Error(
    'Ce rôle ne dispose pas des accès aux transactions.'
  );
}


/**
 * Confirmation :
 *
 * partner ✅
 * admin ✅
 */
async function assertTransactionConfirmationAccess() {

  const access =
    await getPartnerAuthorization();


  if (
    access.isAdmin ||
    access.isPartner ||
    access.permissions.includes(
      'transaction.confirm'
    )
  ) {

    return access;
  }


  throw new Error(
    'Ce rôle ne peut pas confirmer une transaction.'
  );
}


/**
 * Actions administratives :
 *
 * - approve
 * - reject
 * - execute
 * - cancel
 *
 * réservées à l'Admin.
 */
async function assertTransactionAdminActionAccess(
  action
) {

  const access =
    await getPartnerAuthorization();


  if (
    access.isAdmin
  ) {

    return access;
  }


  throw new Error(
    `Seul le rôle Admin partenaire peut ${action} une transaction.`
  );
}


/* ============================================================
 * KMERDIASPORA AUTHORIZATION
 * ============================================================ */

/**
 * Consultation KmerDiaspora :
 *
 * admin ✅
 * kmerdiaspora ✅
 * partner ❌
 */
async function assertKmerDiasporaViewAccess() {

  const access =
    await getPartnerAuthorization();


  if (
    access.isAdmin ||
    access.isKmerDiaspora
  ) {

    return access;
  }


  throw new Error(
    'Ce partenaire ne dispose pas des accès à KmerDiaspora.'
  );
}


/**
 * Aucun rôle partenaire ne peut modifier KmerDiaspora.
 */
async function assertKmerDiasporaMutationDenied() {

  throw new Error(
    'Les partenaires ne peuvent pas modifier ou supprimer les données KmerDiaspora.'
  );
}


/* ============================================================
 * PAGINATION
 * ============================================================ */

function paginate(
  limit = 20,
  offset = 0
) {

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


  return {

    limit:
      safeLimit,

    offset:
      safeOffset,

  };
}


/* ============================================================
 * DASHBOARD
 * ============================================================ */

export async function getPartnerDashboard() {

  const access =
    await getPartnerAuthorization();


  const partner =
    access.partner;


  const [
    assignedTransactions,
    pendingReviews,
    pendingSettlements,
    activeQuests,
    openDriverRequests,
  ] =
    await Promise.all([

      /*
       * Partner + Admin
       */
      access.isAdmin ||
      access.isPartner

        ? supabase
            .from(
              'transactions'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .eq(
              'partner_id',
              partner.id
            )
            .not(
              'status',
              'in',
              '(completed,cancelled,rejected)'
            )

        : Promise.resolve({
            count:
              0,

            error:
              null,
          }),


      /*
       * Partner + Admin
       */
      access.isAdmin ||
      access.isPartner

        ? supabase
            .from(
              'transaction_assignments'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .eq(
              'partner_id',
              partner.id
            )
            .in(
              'status',
              [
                'assigned',
                'acknowledged',
                'in_progress',
              ]
            )

        : Promise.resolve({
            count:
              0,

            error:
              null,
          }),


      /*
       * Seulement Admin
       */
      access.isAdmin

        ? supabase
            .from(
              'bank_settlements'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .eq(
              'partner_id',
              partner.id
            )
            .in(
              'status',
              [
                'pending',
                'processing',
              ]
            )

        : Promise.resolve({
            count:
              0,

            error:
              null,
          }),


      /*
       * Admin + KmerDiaspora
       */
      access.isAdmin ||
      access.isKmerDiaspora

        ? supabase
            .from(
              'kd_quests'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .in(
              'status',
              [
                'published',
                'active',
              ]
            )

        : Promise.resolve({
            count:
              0,

            error:
              null,
          }),


      /*
       * Admin + KmerDiaspora
       */
      access.isAdmin ||
      access.isKmerDiaspora

        ? supabase
            .from(
              'kd_driver_requests'
            )
            .select(
              'id',
              {
                count:
                  'exact',

                head:
                  true,
              }
            )
            .in(
              'status',
              [
                'open',
                'partially_matched',
              ]
            )

        : Promise.resolve({
            count:
              0,

            error:
              null,
          }),

    ]);


  const firstError =
    [
      assignedTransactions,
      pendingReviews,
      pendingSettlements,
      activeQuests,
      openDriverRequests,
    ].find(
      (
        result
      ) =>
        result?.error
    )?.error;


  if (
    firstError
  ) {

    throw firstError;
  }


  return {

    partner,

    assignedTransactions:
      assignedTransactions.count ??
      0,

    pendingReviews:
      pendingReviews.count ??
      0,

    pendingSettlements:
      pendingSettlements.count ??
      0,

    activeQuests:
      activeQuests.count ??
      0,

    openDriverRequests:
      openDriverRequests.count ??
      0,

    roles:
      access.roles,

    roleCodes:
      [
        ...access.roleCodes,
      ],

  };
}


/* ============================================================
 * TRANSACTIONS
 * ============================================================ */

/**
 * Retourne les transactions attribuées au partenaire.
 *
 * Partner ✅
 * Admin ✅
 * KmerDiaspora ❌
 */
export async function listAssignedTransactions({

  type = null,

  status = null,

  workflowStage = null,

  limit = 20,

  offset = 0,

} = {}) {

  const access =
    await assertTransactionAccess();


  const partner =
    access.partner;


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'transactions'
      )
      .select(
        `
          *,
          profiles:user_id(
            id,
            username,
            whatsapp_number,
            country
          )
        `,
        {
          count:
            'exact',
        }
      )
      .eq(
        'partner_id',
        partner.id
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
    type
  ) {

    query =
      query.eq(
        'type',
        type
      );
  }


  if (
    status
  ) {

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


  const {
    data,
    error,
    count,
  } =
    await query;


  if (
    error
  ) {

    throw error;
  }


  return {

    data:
      data ?? [],

    count:
      count ?? 0,

  };
}


/**
 * Détail transaction.
 */
export async function getTransaction(
  transactionId
) {

  const access =
    await assertTransactionAccess();


  const partner =
    access.partner;


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
          profiles:user_id(*),
          partners:partner_id(*),
          transaction_reviews(*),
          transaction_assignments(*),
          transaction_proofs(*),
          transaction_status_history(*),
          bank_settlements(*)
        `
      )
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * TRANSACTION REVIEWS
 * ============================================================ */

async function createReview({

  transactionId,

  decision,

  reason =
    null,

  proofUrl =
    null,

}) {

  const partner =
    await getCurrentPartner();


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

        partner_id:
          partner.id,

        decision,

        reason,

        proof_url:
          proofUrl,

      })
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/**
 * Crée un review confirmé.
 */
export async function reviewTransaction({

  transactionId,

  decision,

  reason =
    null,

  proofUrl =
    null,

} = {}) {

  await assertTransactionConfirmationAccess();


  if (
    !transactionId
  ) {

    throw new Error(
      'transactionId est requis.'
    );
  }


  if (
    !decision
  ) {

    throw new Error(
      'La décision est requise.'
    );
  }


  return createReview({

    transactionId,

    decision,

    reason,

    proofUrl,

  });
}


/* ============================================================
 * CONFIRMATION TRANSACTION
 * ============================================================ */

/**
 * Confirme une transaction.
 *
 * Partner ✅
 * Admin ✅
 */
export async function confirmTransaction(
  transactionId
) {

  const access =
    await assertTransactionConfirmationAccess();


  const partner =
    access.partner;


  if (
    !transactionId
  ) {

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
      .update({
        status:
          'confirmed',
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * APPROVAL
 * ============================================================ */

/**
 * Approuve une transaction.
 *
 * Admin uniquement.
 */
export async function approveTransaction(
  transactionId
) {

  const access =
    await assertTransactionAdminActionAccess(
      'approuver'
    );


  const partner =
    access.partner;


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
          'approved',
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * REJECT
 * ============================================================ */

/**
 * Rejette une transaction.
 *
 * Admin uniquement.
 */
export async function rejectTransaction({

  transactionId,

  reason =
    null,

} = {}) {

  const access =
    await assertTransactionAdminActionAccess(
      'rejeter'
    );


  const partner =
    access.partner;


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
          'rejected',

        rejection_reason:
          reason,
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * EXECUTE
 * ============================================================ */

/**
 * Exécute une transaction.
 *
 * Admin uniquement.
 */
export async function executeTransaction(
  transactionId
) {

  const access =
    await assertTransactionAdminActionAccess(
      'exécuter'
    );


  const partner =
    access.partner;


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
          'processing',
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * CANCEL
 * ============================================================ */

/**
 * Annule une transaction.
 *
 * Admin uniquement.
 */
export async function cancelTransaction(
  transactionId
) {

  const access =
    await assertTransactionAdminActionAccess(
      'annuler'
    );


  const partner =
    access.partner;


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
          'cancelled',
      })
      .eq(
        'id',
        transactionId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .select()
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * ASSIGNMENTS
 * ============================================================ */

/**
 * Liste des affectations du partenaire.
 */
export async function listAssignments({

  status =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  const access =
    await assertTransactionAccess();


  const partner =
    access.partner;


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'transaction_assignments'
      )
      .select(
        `
          *,
          transactions(*)
        `,
        {
          count:
            'exact',
        }
      )
      .eq(
        'partner_id',
        partner.id
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
    status
  ) {

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


  if (
    error
  ) {

    throw error;
  }


  return {

    data:
      data ?? [],

    count:
      count ?? 0,

  };
}


/**
 * Retourne une affectation précise.
 */
export async function getAssignment(
  assignmentId
) {

  const access =
    await assertTransactionAccess();


  const partner =
    access.partner;


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transaction_assignments'
      )
      .select(
        `
          *,
          transactions(*)
        `
      )
      .eq(
        'id',
        assignmentId
      )
      .eq(
        'partner_id',
        partner.id
      )
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * SETTLEMENTS
 * ============================================================ */

/**
 * Les partenaires simples n'ont PAS accès aux settlements.
 *
 * Cette fonction est conservée pour les écrans admin partenaire.
 */
async function assertSettlementAdminAccess() {

  const access =
    await getPartnerAuthorization();


  if (
    !access.isAdmin
  ) {

    throw new Error(
      'Ce rôle ne dispose pas des accès aux règlements.'
    );
  }


  return access;
}


/**
 * Liste les règlements.
 */
export async function listPartnerSettlements({

  status =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  const access =
    await assertSettlementAdminAccess();


  const partner =
    access.partner;


  const pagination =
    paginate(
      limit,
      offset
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
      .eq(
        'partner_id',
        partner.id
      )
      .order(
        'initiated_at',
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
    status
  ) {

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


  if (
    error
  ) {

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
 * KMERDIASPORA - READ ONLY
 * ============================================================ */

/**
 * Liste les demandes d'emploi KmerDiaspora.
 */
export async function listJobRequests({

  city =
    null,

  status =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  await assertKmerDiasporaViewAccess();


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'kd_job_requests'
      )
      .select(
        `
          *,
          kd_profiles(*)
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
    city
  ) {

    query =
      query.eq(
        'city',
        city
      );
  }


  if (
    status
  ) {

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


  if (
    error
  ) {

    throw error;
  }


  return {

    data:
      data ?? [],

    count:
      count ?? 0,

  };
}


/**
 * Liste les demandes de chauffeurs.
 */
export async function listDriverRequests({

  city =
    null,

  status =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  await assertKmerDiasporaViewAccess();


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'kd_driver_requests'
      )
      .select(
        `
          *,
          cities:kd_driver_request_cities(*)
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
    status
  ) {

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


  if (
    error
  ) {

    throw error;
  }


  let filtered =
    data ?? [];


  if (
    city
  ) {

    filtered =
      filtered.filter(
        (
          request
        ) =>
          (
            request.cities ??
            []
          ).some(
            (
              item
            ) =>
              item.city ===
              city
          )
      );
  }


  return {

    data:
      filtered,

    count:
      city
        ? filtered.length
        : count ?? 0,

  };
}


/**
 * Liste les matches chauffeur.
 */
export async function listDriverMatches({

  driverRequestId =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  await assertKmerDiasporaViewAccess();


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'kd_driver_matches'
      )
      .select(
        `
          *,
          kd_profiles(*)
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'score',
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
    driverRequestId
  ) {

    query =
      query.eq(
        'driver_request_id',
        driverRequestId
      );
  }


  const {
    data,
    error,
    count,
  } =
    await query;


  if (
    error
  ) {

    throw error;
  }


  return {

    data:
      data ?? [],

    count:
      count ?? 0,

  };
}


/**
 * Liste les quêtes.
 */
export async function listQuests({

  status =
    null,

  limit =
    20,

  offset =
    0,

} = {}) {

  await assertKmerDiasporaViewAccess();


  const pagination =
    paginate(
      limit,
      offset
    );


  let query =
    supabase
      .from(
        'kd_quests'
      )
      .select(
        `
          *,
          creator:creator_user_id(*),
          beneficiary:beneficiary_user_id(*)
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
    status
  ) {

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


  if (
    error
  ) {

    throw error;
  }


  return {

    data:
      data ?? [],

    count:
      count ?? 0,

  };
}


/**
 * Détail d'une quête.
 */
export async function getQuest(
  questId
) {

  await assertKmerDiasporaViewAccess();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'kd_quests'
      )
      .select(
        `
          *,
          contributions:kd_quest_contributions(*),
          events:kd_quest_events(*)
        `
      )
      .eq(
        'id',
        questId
      )
      .single();


  if (
    error
  ) {

    throw error;
  }


  return data;
}


/* ============================================================
 * KMERDIASPORA MUTATIONS
 * ============================================================ */

/**
 * Toutes les mutations KmerDiaspora sont interdites aux
 * partenaires selon les règles métier actuelles.
 */
export async function createJobRequest(
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function updateJobRequest(
  jobRequestId,
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function deleteJobRequest(
  jobRequestId
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function createDriverRequest(
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function updateDriverRequest(
  driverRequestId,
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function deleteDriverRequest(
  driverRequestId
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function createQuest(
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function updateQuest(
  questId,
  payload
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


export async function deleteQuest(
  questId
) {

  await assertKmerDiasporaMutationDenied();

  return null;
}


/* ============================================================
 * EXPORTS UTILITAIRES
 * ============================================================ */

export {
  normalizeRoleCode,
};