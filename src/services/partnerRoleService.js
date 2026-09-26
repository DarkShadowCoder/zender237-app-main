
/**
 * ============================================================
 * ZENDER237 - PARTNER ROLE SERVICE
 * ============================================================
 *
 * Gestion des rôles attribuables aux partenaires.
 *
 * Tables utilisées :
 *   - backoffice_roles
 *   - partner_role_assignments
 *
 * Les rôles déterminent les permissions du partenaire.
 * ============================================================
 */

import {
  supabase,
} from '../lib/supabase';


/* ============================================================
 * ADMIN AUTH
 * ============================================================ */

async function requireAdmin() {
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
    data: admin,
    error: adminError,
  } = await supabase
    .from('admins')
    .select(
      'id, active'
    )
    .eq(
      'auth_user_id',
      user.id
    )
    .maybeSingle();

  if (adminError) {
    throw adminError;
  }

  if (!admin) {
    throw new Error(
      'Accès administrateur requis.'
    );
  }

  if (
    admin.active === false
  ) {
    throw new Error(
      'Compte administrateur désactivé.'
    );
  }

  return admin;
}


/* ============================================================
 * LISTE DES RÔLES DISPONIBLES
 * ============================================================ */

export async function listPartnerAssignableRoles() {
  await requireAdmin();

  const {
    data,
    error,
  } = await supabase
    .from(
      'backoffice_roles'
    )
    .select(`
      id,
      code,
      label,
      scope,
      active
    `)
    .eq(
      'active',
      true
    )
    .order(
      'scope',
      {
        ascending:
          true,
      }
    )
    .order(
      'label',
      {
        ascending:
          true,
      }
    );

  if (error) {
    throw error;
  }

  return (
    data || []
  );
}


/* ============================================================
 * RÔLES ACTUELLEMENT ATTRIBUÉS
 * ============================================================ */

export async function getPartnerRoleIds(
  partnerId
) {
  await requireAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const {
    data,
    error,
  } = await supabase
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

  if (error) {
    throw error;
  }

  return (
    data || []
  )
    .map(
      (item) =>
        item.role_id
    )
    .filter(Boolean);
}


/* ============================================================
 * REMPLACER LES RÔLES D'UN PARTENAIRE
 * ============================================================ */

export async function setPartnerRoles({
  partnerId,
  roleIds = [],
}) {
  await requireAdmin();

  if (!partnerId) {
    throw new Error(
      'partnerId est requis.'
    );
  }

  const normalizedRoleIds =
    [
      ...new Set(
        (
          Array.isArray(
            roleIds
          )
            ? roleIds
            : []
        )
          .map(
            String
          )
          .filter(Boolean)
      ),
    ];


  /* ----------------------------------------------------------
   * Vérification des rôles
   * ---------------------------------------------------------- */

  if (
    normalizedRoleIds.length >
    0
  ) {
    const {
      data:
        activeRoles,
      error:
        roleError,
    } = await supabase
      .from(
        'backoffice_roles'
      )
      .select(
        'id'
      )
      .in(
        'id',
        normalizedRoleIds
      )
      .eq(
        'active',
        true
      );

    if (roleError) {
      throw roleError;
    }

    const activeRoleIds =
      new Set(
        (
          activeRoles ||
          []
        ).map(
          (role) =>
            String(
              role.id
            )
        )
      );

    const invalidRoleIds =
      normalizedRoleIds.filter(
        (roleId) =>
          !activeRoleIds.has(
            String(
              roleId
            )
          )
      );

    if (
      invalidRoleIds.length >
      0
    ) {
      throw new Error(
        'Un ou plusieurs rôles sélectionnés ne sont plus disponibles.'
      );
    }
  }


  /* ----------------------------------------------------------
   * Sauvegarde de l'état précédent
   * ---------------------------------------------------------- */

  const previousRoleIds =
    await getPartnerRoleIds(
      partnerId
    );


  /* ----------------------------------------------------------
   * Suppression des anciennes affectations
   * ---------------------------------------------------------- */

  const {
    error:
      deleteError,
  } = await supabase
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


  /* ----------------------------------------------------------
   * Aucun rôle
   * ---------------------------------------------------------- */

  if (
    normalizedRoleIds.length ===
    0
  ) {
    return [];
  }


  /* ----------------------------------------------------------
   * Nouvelles affectations
   * ---------------------------------------------------------- */

  const rows =
    normalizedRoleIds.map(
      (roleId) => ({
        partner_id:
          partnerId,

        role_id:
          roleId,
      })
    );


  const {
    data,
    error,
  } = await supabase
    .from(
      'partner_role_assignments'
    )
    .insert(
      rows
    )
    .select(`
      partner_id,
      role_id,
      assigned_at,
      backoffice_roles:role_id(
        id,
        code,
        label,
        scope
      )
    `);

  if (error) {

    /* --------------------------------------------------------
     * Rollback best effort
     * -------------------------------------------------------- */

    if (
      previousRoleIds.length >
      0
    ) {
      await supabase
        .from(
          'partner_role_assignments'
        )
        .insert(
          previousRoleIds.map(
            (roleId) => ({
              partner_id:
                partnerId,

              role_id:
                roleId,
            })
          )
        );
    }

    throw error;
  }

  return data || [];
}
