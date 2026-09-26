/**
 * ============================================================
 * ZENDER237 - TRANSACTION ASSIGNMENT SERVICE
 * ============================================================
 *
 * Attribution groupée des transactions aux partenaires.
 *
 * Principes :
 * - seules les transactions "under_review" peuvent être attribuées ;
 * - les transactions déjà attribuées ne sont pas éligibles ;
 * - un partenaire n'est proposé que s'il possède les permissions
 *   nécessaires pour traiter TOUTES les transactions sélectionnées ;
 * - une responsabilité est calculée automatiquement par transaction ;
 * - l'admin courant est enregistré sur chaque assignment ;
 * - en cas d'échec de la mise à jour des transactions, les assignments
 *   créés sont supprimés pour limiter les écritures partielles.
 *
 * La sécurité serveur doit continuer à être assurée par Supabase/RLS.
 * ============================================================
 */

import { supabase } from '../lib/supabase';


const REVIEW_PERMISSIONS = [
  'transaction.review',
  'transaction.approve',
];

const EXECUTE_PERMISSIONS = [
  'transaction.execute',
];


const RESPONSIBILITY_BY_TYPE = {
  deposit: 'deposit_review',
  transfer: 'transfer_review',
  withdrawal: 'withdrawal_review',
  withdraw: 'withdrawal_review',
};


async function getCurrentAdmin() {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user = authData?.user;

  if (!user) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('admins')
    .select('id, active')
    .eq('auth_user_id', user.id)
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


function getRequirements(transaction) {
  if (
    transaction?.workflow_stage ===
    'execution'
  ) {
    return {
      responsibility: 'bank_execution',
      permissions:
        EXECUTE_PERMISSIONS,
    };
  }

  return {
    responsibility:
      RESPONSIBILITY_BY_TYPE[
        transaction?.type
      ] ||
      'proof_verification',

    permissions:
      REVIEW_PERMISSIONS,
  };
}


function canHandleAllTransactions(
  partner,
  transactions
) {
  const permissions =
    new Set(
      partner.permissions || []
    );

  if (
    permissions.has('*')
  ) {
    return true;
  }

  return transactions.every(
    (transaction) => {
      const requirements =
        getRequirements(
          transaction
        );

      return requirements.permissions.some(
        (permission) =>
          permissions.has(
            permission
          )
      );
    }
  );
}


async function loadActivePartnersWithPermissions() {
  const {
    data: partners,
    error: partnersError,
  } =
    await supabase
      .from('partners')
      .select(`
        id,
        full_name,
        phone_number,
        whatsapp_number,
        active
      `)
      .eq(
        'active',
        true
      )
      .order(
        'full_name',
        {
          ascending:
            true,
        }
      );

  if (partnersError) {
    throw partnersError;
  }

  if (
    !partners?.length
  ) {
    return [];
  }

  const partnerIds =
    partners.map(
      (partner) =>
        partner.id
    );

  const {
    data: assignments,
    error: assignmentsError,
  } =
    await supabase
      .from(
        'partner_role_assignments'
      )
      .select(
        'partner_id, role_id'
      )
      .in(
        'partner_id',
        partnerIds
      );

  if (assignmentsError) {
    throw assignmentsError;
  }

  const roleIds = [
    ...new Set(
      (assignments || [])
        .map(
          (assignment) =>
            assignment.role_id
        )
        .filter(Boolean)
    ),
  ];

  if (!roleIds.length) {
    return partners.map(
      (partner) => ({
        ...partner,
        roles: [],
        permissions: [],
      })
    );
  }

  const [
    rolesResponse,
    rolePermissionsResponse,
  ] =
    await Promise.all([
      supabase
        .from(
          'backoffice_roles'
        )
        .select(
          'id, code, label, scope, active'
        )
        .in(
          'id',
          roleIds
        )
        .eq(
          'active',
          true
        ),

      supabase
        .from(
          'backoffice_role_permissions'
        )
        .select(
          'role_id, permission_id'
        )
        .in(
          'role_id',
          roleIds
        ),
    ]);

  if (
    rolesResponse.error
  ) {
    throw rolesResponse.error;
  }

  if (
    rolePermissionsResponse.error
  ) {
    throw (
      rolePermissionsResponse.error
    );
  }

  const permissionIds = [
    ...new Set(
      (
        rolePermissionsResponse.data ||
        []
      )
        .map(
          (row) =>
            row.permission_id
        )
        .filter(Boolean)
    ),
  ];

  let permissionRows = [];

  if (
    permissionIds.length
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          'backoffice_permissions'
        )
        .select(
          'id, code'
        )
        .in(
          'id',
          permissionIds
        );

    if (error) {
      throw error;
    }

    permissionRows =
      data || [];
  }

  const roleMap =
    new Map(
      (
        rolesResponse.data ||
        []
      ).map(
        (role) => [
          role.id,
          role,
        ]
      )
    );

  const permissionMap =
    new Map(
      permissionRows.map(
        (permission) => [
          permission.id,
          permission.code,
        ]
      )
    );

  const rolesByPartner =
    new Map();

  const permissionsByPartner =
    new Map();

  for (
    const assignment
    of assignments || []
  ) {
    const role =
      roleMap.get(
        assignment.role_id
      );

    if (!role) {
      continue;
    }

    if (
      !rolesByPartner.has(
        assignment.partner_id
      )
    ) {
      rolesByPartner.set(
        assignment.partner_id,
        []
      );
    }

    rolesByPartner
      .get(
        assignment.partner_id
      )
      .push(role);

    if (
      !permissionsByPartner.has(
        assignment.partner_id
      )
    ) {
      permissionsByPartner.set(
        assignment.partner_id,
        new Set()
      );
    }

    for (
      const rolePermission
      of rolePermissionsResponse.data ||
      []
    ) {
      if (
        rolePermission.role_id !==
        assignment.role_id
      ) {
        continue;
      }

      const code =
        permissionMap.get(
          rolePermission.permission_id
        );

      if (code) {
        permissionsByPartner
          .get(
            assignment.partner_id
          )
          .add(code);
      }
    }
  }

  return partners.map(
    (partner) => ({
      ...partner,

      roles:
        rolesByPartner.get(
          partner.id
        ) || [],

      permissions: [
        ...(
          permissionsByPartner.get(
            partner.id
          ) ||
          new Set()
        ),
      ],
    })
  );
}


async function loadTransactions(
  transactionIds
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transactions'
      )
      .select(`
        id,
        type,
        status,
        workflow_stage,
        partner_id
      `)
      .in(
        'id',
        transactionIds
      );

  if (error) {
    throw error;
  }

  if (
    (data || []).length !==
    transactionIds.length
  ) {
    throw new Error(
      'Une ou plusieurs transactions sélectionnées sont introuvables.'
    );
  }

  return data || [];
}


export async function listAssignableTransactionPartners({
  transactionIds = [],
} = {}) {
  const uniqueIds = [
    ...new Set(
      (
        Array.isArray(
          transactionIds
        )
          ? transactionIds
          : []
      )
        .filter(Boolean)
    ),
  ];

  if (!uniqueIds.length) {
    return [];
  }

  const transactions =
    await loadTransactions(
      uniqueIds
    );

  const invalidStatus =
    transactions.find(
      (transaction) =>
        transaction.status !==
        'under_review'
    );

  if (invalidStatus) {
    throw new Error(
      'Seules les transactions en attente peuvent être attribuées en lot.'
    );
  }

  const alreadyAssigned =
    transactions.find(
      (transaction) =>
        transaction.partner_id
    );

  if (alreadyAssigned) {
    throw new Error(
      'Une ou plusieurs transactions sélectionnées sont déjà attribuées à un partenaire.'
    );
  }

  const partners =
    await loadActivePartnersWithPermissions();

  return partners.filter(
    (partner) =>
      canHandleAllTransactions(
        partner,
        transactions
      )
  );
}


export async function assignTransactionsBulk({
  transactionIds = [],
  partnerId,
  notes = null,
} = {}) {
  const uniqueIds = [
    ...new Set(
      (
        Array.isArray(
          transactionIds
        )
          ? transactionIds
          : []
      )
        .filter(Boolean)
    ),
  ];

  if (!uniqueIds.length) {
    throw new Error(
      'Aucune transaction sélectionnée.'
    );
  }

  if (!partnerId) {
    throw new Error(
      'Un partenaire est requis.'
    );
  }

  const admin =
    await getCurrentAdmin();

  const transactions =
    await loadTransactions(
      uniqueIds
    );

  const invalidStatus =
    transactions.find(
      (transaction) =>
        transaction.status !==
        'under_review'
    );

  if (invalidStatus) {
    throw new Error(
      'Toutes les transactions sélectionnées doivent être en attente.'
    );
  }

  const alreadyAssigned =
    transactions.find(
      (transaction) =>
        transaction.partner_id
    );

  if (alreadyAssigned) {
    throw new Error(
      'Une ou plusieurs transactions sélectionnées sont déjà attribuées à un partenaire.'
    );
  }

  const partners =
    await loadActivePartnersWithPermissions();

  const partner =
    partners.find(
      (item) =>
        item.id ===
        partnerId
    );

  if (!partner) {
    throw new Error(
      'Partenaire actif introuvable.'
    );
  }

  if (
    !canHandleAllTransactions(
      partner,
      transactions
    )
  ) {
    throw new Error(
      'Ce partenaire ne possède pas les permissions nécessaires pour gérer toutes les transactions sélectionnées.'
    );
  }

  const now =
    new Date()
      .toISOString();

  const assignmentRows =
    transactions.map(
      (transaction) => ({
        transaction_id:
          transaction.id,

        admin_id:
          admin.id,

        partner_id:
          partnerId,

        responsibility:
          getRequirements(
            transaction
          ).responsibility,

        notes,

        status:
          'assigned',

        assigned_at:
          now,
      })
    );

  const {
    data: assignments,
    error: assignmentError,
  } =
    await supabase
      .from(
        'transaction_assignments'
      )
      .insert(
        assignmentRows
      )
      .select();

  if (assignmentError) {
    throw assignmentError;
  }

  const {
    error: transactionError,
  } =
    await supabase
      .from(
        'transactions'
      )
      .update({
        partner_id:
          partnerId,

        assigned_at:
          now,

        last_action_at:
          now,
      })
      .in(
        'id',
        uniqueIds
      );

  if (transactionError) {
    if (
      assignments?.length
    ) {
      await supabase
        .from(
          'transaction_assignments'
        )
        .delete()
        .in(
          'id',
          assignments.map(
            (assignment) =>
              assignment.id
          )
        );
    }

    throw transactionError;
  }

  return {
    count:
      uniqueIds.length,

    assignments:
      assignments || [],

    partner,
  };
}