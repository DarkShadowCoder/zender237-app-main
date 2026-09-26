import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  normalizeSecretCode,
  validSecret,
  sha256,
} from '../../_shared.js';


const MAX_LOGIN_ATTEMPTS = 5;


/* ============================================================
 * LOGIN
 * ============================================================ */

Deno.serve(
  async (req) => {

    const guarded =
      methodGuard(req);

    if (guarded) {
      return guarded;
    }


    const supabaseUrl =
      Deno.env.get(
        'SUPABASE_URL'
      );

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {

      console.error(
        '[login] missing Supabase environment variables'
      );

      return json(
        {
          success: false,
          code:
            'SERVER_CONFIGURATION_ERROR',
          message:
            'Configuration serveur invalide.',
        },
        500
      );
    }


    const service =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );


    try {

      const body =
        await req.json();


      const whatsappNumber =
        normalizeWhatsApp(
          body?.whatsappNumber
        );


      const secretCode =
        normalizeSecretCode(
          body?.secretCode
        );


      if (
        !whatsappNumber ||
        !validSecret(secretCode)
      ) {

        return json({
          success: false,
          code:
            'INVALID_CREDENTIALS',
          message:
            'Numéro ou code secret incorrect.',
        });
      }


      const submittedHash =
        await sha256(
          secretCode
        );


      /* ======================================================
       * ADMIN
       * ====================================================== */

      const {
        data: admin,
        error: adminError,
      } =
        await service
          .from('admins')
          .select(`
            id,
            auth_user_id,
            full_name,
            role,
            whatsapp_number,
            secret_code_hash,
            login_attempts,
            active
          `)
          .eq(
            'whatsapp_number',
            whatsappNumber
          )
          .maybeSingle();


      if (adminError) {

        console.error(
          '[login] admin lookup:',
          adminError
        );

        return json(
          {
            success: false,
            code:
              'LOGIN_DATABASE_ERROR',
            message:
              'Impossible de vérifier le compte.',
          },
          500
        );
      }


      if (admin) {

        if (!admin.active) {

          return json({
            success: false,
            code:
              'ACCOUNT_DISABLED',
            message:
              'Ce compte administrateur est désactivé.',
          });
        }


        const verification =
          await verifyStoredSecret({
            service,
            table: 'admins',
            accountId: admin.id,
            storedHash:
              admin.secret_code_hash,
            attempts:
              admin.login_attempts,
            submittedHash,
          });


        if (
          !verification.valid
        ) {
          return verification.response;
        }


        return createAuthSession({
          service,
          accountType: 'admin',
          accountId: admin.id,
          authUserId:
            admin.auth_user_id,
          roles: [
            {
              code:
                String(
                  admin.role
                ),
              label:
                String(
                  admin.role
                ),
            },
          ],
          permissions: ['*'],
        });
      }


      /* ======================================================
       * PARTNER
       * ====================================================== */

      const {
        data: partner,
        error: partnerError,
      } =
        await service
          .from('partners')
          .select(`
            id,
            auth_user_id,
            full_name,
            whatsapp_number,
            secret_code_hash,
            login_attempts,
            active
          `)
          .eq(
            'whatsapp_number',
            whatsappNumber
          )
          .maybeSingle();


      if (partnerError) {

        console.error(
          '[login] partner lookup:',
          partnerError
        );

        return json(
          {
            success: false,
            code:
              'LOGIN_DATABASE_ERROR',
            message:
              'Impossible de vérifier le compte.',
          },
          500
        );
      }


      if (partner) {

        if (!partner.active) {

          return json({
            success: false,
            code:
              'ACCOUNT_DISABLED',
            message:
              'Ce compte partenaire est désactivé.',
          });
        }


        const verification =
          await verifyStoredSecret({
            service,
            table: 'partners',
            accountId: partner.id,
            storedHash:
              partner.secret_code_hash,
            attempts:
              partner.login_attempts,
            submittedHash,
          });


        if (
          !verification.valid
        ) {
          return verification.response;
        }


        const authorization =
          await loadPartnerAuthorization(
            service,
            partner.id
          );


        return createAuthSession({
          service,
          accountType: 'partner',
          accountId: partner.id,
          authUserId:
            partner.auth_user_id,
          roles:
            authorization.roles,
          permissions:
            authorization.permissions,
        });
      }


      /* ======================================================
       * KMA
       * ====================================================== */

      const {
        data: kma,
        error: kmaError,
      } =
        await service
          .from(
            'kmerdiaspora_admins'
          )
          .select(`
            id,
            auth_user_id,
            full_name,
            whatsapp_number,
            role,
            secret_code_hash,
            login_attempts,
            active
          `)
          .eq(
            'whatsapp_number',
            whatsappNumber
          )
          .maybeSingle();


      if (kmaError) {

        console.error(
          '[login] KMA lookup:',
          kmaError
        );

        return json(
          {
            success: false,
            code:
              'LOGIN_DATABASE_ERROR',
            message:
              'Impossible de vérifier le compte.',
          },
          500
        );
      }


      if (kma) {

        if (!kma.active) {

          return json({
            success: false,
            code:
              'ACCOUNT_DISABLED',
            message:
              'Ce compte KmerDiaspora est désactivé.',
          });
        }


        const verification =
          await verifyStoredSecret({
            service,
            table:
              'kmerdiaspora_admins',
            accountId: kma.id,
            storedHash:
              kma.secret_code_hash,
            attempts:
              kma.login_attempts,
            submittedHash,
          });


        if (
          !verification.valid
        ) {
          return verification.response;
        }


        const role =
          String(
            kma.role || ''
          )
            .trim()
            .toLowerCase();


        return createAuthSession({
          service,
          accountType:
            'kmerdiaspora_admin',
          accountId: kma.id,
          authUserId:
            kma.auth_user_id,
          roles: [
            {
              code: role,
              label: role,
            },
          ],
          permissions:
            getKmaPermissions(
              role
            ),
        });
      }


      /* ======================================================
       * USER
       * ====================================================== */

      const {
        data: profile,
        error: profileError,
      } =
        await service
          .from('profiles')
          .select(`
            id,
            username,
            whatsapp_number,
            country,
            secret_code_hash,
            login_attempts
          `)
          .eq(
            'whatsapp_number',
            whatsappNumber
          )
          .maybeSingle();


      if (profileError) {

        console.error(
          '[login] profile lookup:',
          profileError
        );

        return json(
          {
            success: false,
            code:
              'LOGIN_DATABASE_ERROR',
            message:
              'Impossible de vérifier le compte.',
          },
          500
        );
      }


      if (!profile) {

        return json({
          success: false,
          code:
            'ACCOUNT_NOT_FOUND',
          message:
            'Numéro ou code secret incorrect.',
        });
      }


      const verification =
        await verifyStoredSecret({
          service,
          table: 'profiles',
          accountId: profile.id,
          storedHash:
            profile.secret_code_hash,
          attempts:
            profile.login_attempts,
          submittedHash,
        });


      if (
        !verification.valid
      ) {
        return verification.response;
      }


      return createAuthSession({
        service,
        accountType: 'user',
        accountId: profile.id,
        authUserId: profile.id,
        roles: [],
        permissions:
          getUserPermissions(),
      });

    } catch (error) {

      console.error(
        '[login] unexpected error:',
        error
      );

      return json(
        {
          success: false,
          code:
            'LOGIN_INTERNAL_ERROR',
          message:
            'Une erreur est survenue pendant la connexion.',
        },
        500
      );
    }
  }
);


/* ============================================================
 * VERIFY STORED SECRET
 * ============================================================ */

async function verifyStoredSecret({
  service,
  table,
  accountId,
  storedHash,
  attempts,
  submittedHash,
}) {

  const currentAttempts =
    Number(
      attempts || 0
    );


  if (
    currentAttempts >=
    MAX_LOGIN_ATTEMPTS
  ) {

    return {
      valid: false,

      response:
        json({
          success: false,
          code:
            'TOO_MANY_ATTEMPTS',
          message:
            'Trop de tentatives incorrectes.',
          redirectToRecovery:
            true,
          attemptsRemaining: 0,
        }),
    };
  }


  const normalizedStoredHash =
    String(
      storedHash || ''
    )
      .trim()
      .toLowerCase();


  if (
    normalizedStoredHash.length !== 64
  ) {

    console.error(
      '[login] invalid secret hash',
      {
        table,
        accountId,
        hashLength:
          normalizedStoredHash.length,
      }
    );

    return {
      valid: false,

      response:
        json(
          {
            success: false,
            code:
              'SECRET_CODE_NOT_CONFIGURED',
            message:
              'Le code secret de ce compte n’est pas configuré.',
          },
          500
        ),
    };
  }


  const valid =
    submittedHash ===
    normalizedStoredHash;


  if (!valid) {

    const nextAttempts =
      currentAttempts + 1;


    const {
      error,
    } =
      await service
        .from(table)
        .update({
          login_attempts:
            nextAttempts,
        })
        .eq(
          'id',
          accountId
        );


    if (error) {

      console.error(
        '[login] attempt update failed:',
        error
      );
    }


    const locked =
      nextAttempts >=
      MAX_LOGIN_ATTEMPTS;


    return {
      valid: false,

      response:
        json({
          success: false,

          code:
            locked
              ? 'TOO_MANY_ATTEMPTS'
              : 'INVALID_CREDENTIALS',

          message:
            locked
              ? 'Trop de tentatives incorrectes.'
              : 'Numéro ou code secret incorrect.',

          redirectToRecovery:
            locked,

          attemptsRemaining:
            Math.max(
              0,
              MAX_LOGIN_ATTEMPTS -
                nextAttempts
            ),
        }),
    };
  }


  const {
    error,
  } =
    await service
      .from(table)
      .update({
        login_attempts: 0,
      })
      .eq(
        'id',
        accountId
      );


  if (error) {

    console.error(
      '[login] reset attempts failed:',
      error
    );
  }


  return {
    valid: true,
    response: null,
  };
}


/* ============================================================
 * CREATE AUTH SESSION
 * ============================================================ */

async function createAuthSession({
  service,
  accountType,
  accountId,
  authUserId,
  roles,
  permissions,
}) {

  if (!authUserId) {

    console.error(
      '[login] missing auth_user_id:',
      {
        accountType,
        accountId,
      }
    );

    return json(
      {
        success: false,
        code:
          'ACCOUNT_CONFIGURATION_ERROR',
        message:
          'Ce compte n’est pas correctement configuré.',
      },
      500
    );
  }


  /*
   * Vérification de l'identité Supabase.
   */

  const {
    data:
      authUserData,
    error:
      authUserError,
  } =
    await service.auth.admin.getUserById(
      authUserId
    );


  if (
    authUserError ||
    !authUserData?.user
  ) {

    console.error(
      '[login] auth user not found:',
      {
        accountType,
        accountId,
        authUserError,
      }
    );

    return json(
      {
        success: false,
        code:
          'AUTH_USER_NOT_FOUND',
        message:
          'Le compte d’authentification est introuvable.',
      },
      500
    );
  }


  const authUser =
    authUserData.user;


  /*
   * Email technique permanent.
   */

  let email =
    authUser.email;


  if (!email) {

    email =
      `${authUserId}@zender237.internal`;


    const {
      error:
        updateError,
    } =
      await service.auth.admin.updateUserById(
        authUserId,
        {
          email,
          email_confirm: true,
        }
      );


    if (updateError) {

      console.error(
        '[login] technical email creation failed:',
        {
          accountType,
          accountId,
          updateError,
        }
      );

      return json(
        {
          success: false,
          code:
            'SESSION_PREPARATION_FAILED',
          message:
            'Impossible de préparer la session.',
        },
        500
      );
    }
  }


  /*
   * Génération du magic link.
   *
   * Aucun email n'est envoyé par cette fonction.
   */

  const {
    data:
      linkData,
    error:
      linkError,
  } =
    await service.auth.admin.generateLink({
      type:
        'magiclink',
      email,
    });


  if (linkError) {

    console.error(
      '[login] generateLink failed:',
      {
        accountType,
        accountId,
        authUserId,
        email,
        message:
          linkError.message,
        code:
          linkError.code,
        status:
          linkError.status,
      }
    );

    return json(
      {
        success: false,
        code:
          'SESSION_CREATION_FAILED',
        message:
          'Impossible de créer la session.',
      },
      500
    );
  }


  const tokenHash =
    linkData?.properties?.hashed_token;


  if (!tokenHash) {

    console.error(
      '[login] missing generated token:',
      {
        accountType,
        accountId,
        authUserId,
        email,
      }
    );

    return json(
      {
        success: false,
        code:
          'SESSION_TOKEN_MISSING',
        message:
          'Le serveur n’a pas généré le jeton de session.',
      },
      500
    );
  }


  return json({
    success: true,

    accountType,

    accountId,

    authUserId,

    roles:
      Array.isArray(roles)
        ? roles
        : [],

    permissions:
      Array.isArray(permissions)
        ? permissions
        : [],

    active: true,

    session: {
      email,
      tokenHash,
    },
  });
}


/* ============================================================
 * PARTNER AUTHORIZATION
 * ============================================================ */

async function loadPartnerAuthorization(
  service,
  partnerId
) {

  const {
    data: assignments,
    error:
      assignmentError,
  } =
    await service
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

    console.error(
      '[login] partner assignments:',
      assignmentError
    );

    return {
      roles: [],
      permissions: [],
    };
  }


  const roleIds =
    (
      assignments || []
    )
      .map(
        (item) =>
          item.role_id
      )
      .filter(Boolean);


  if (
    roleIds.length === 0
  ) {

    return {
      roles: [],
      permissions: [],
    };
  }


  const {
    data: roleRows,
    error:
      roleError,
  } =
    await service
      .from(
        'backoffice_roles'
      )
      .select(`
        id,
        code,
        label,
        scope
      `)
      .in(
        'id',
        roleIds
      )
      .eq(
        'active',
        true
      );


  if (roleError) {

    console.error(
      '[login] partner roles:',
      roleError
    );

    return {
      roles: [],
      permissions: [],
    };
  }


  const {
    data:
      rolePermissionRows,
    error:
      rolePermissionError,
  } =
    await service
      .from(
        'backoffice_role_permissions'
      )
      .select(`
        role_id,
        permission_id
      `)
      .in(
        'role_id',
        roleIds
      );


  if (rolePermissionError) {

    console.error(
      '[login] partner permissions mapping:',
      rolePermissionError
    );

    return {
      roles:
        roleRows || [],
      permissions: [],
    };
  }


  const permissionIds =
    [
      ...new Set(
        (
          rolePermissionRows ||
          []
        )
          .map(
            (row) =>
              row.permission_id
          )
          .filter(Boolean)
      ),
    ];


  if (
    permissionIds.length === 0
  ) {

    return {
      roles:
        roleRows || [],
      permissions: [],
    };
  }


  const {
    data:
      permissionRows,
    error:
      permissionError,
  } =
    await service
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


  if (permissionError) {

    console.error(
      '[login] partner permission lookup:',
      permissionError
    );

    return {
      roles:
        roleRows || [],
      permissions: [],
    };
  }


  return {
    roles:
      roleRows || [],

    permissions:
      [
        ...new Set(
          (
            permissionRows ||
            []
          )
            .map(
              (row) =>
                row.code
            )
            .filter(Boolean)
        ),
      ],
  };
}


/* ============================================================
 * KMA PERMISSIONS
 * ============================================================ */

function getKmaPermissions(
  role
) {

  switch (
    String(
      role || ''
    )
      .trim()
      .toLowerCase()
  ) {

    case 'kmerdiaspora_admin':

      return [
        'kmer.view',
        'kmer.job.manage',
        'kmer.driver.manage',
        'kmer.match',
        'kmer.quest.view',
        'kmer.quest.create',
        'kmer.quest.manage_all',
        'kmer.quest.contribution.view',
        'kmer.quest.contribution.manage',
        'kmer.moderate',
        'kmer.report',
      ];


    case 'kmerdiaspora_manager':

      return [
        'kmer.view',
        'kmer.job.manage',
        'kmer.driver.manage',
        'kmer.match',
        'kmer.quest.view',
        'kmer.quest.create',
        'kmer.quest.manage_all',
        'kmer.quest.contribution.view',
        'kmer.quest.contribution.manage',
      ];


    case 'kmerdiaspora_moderator':

      return [
        'kmer.view',
        'kmer.moderate',
      ];


    default:

      return [
        'kmer.view',
      ];
  }
}


/* ============================================================
 * USER PERMISSIONS
 * ============================================================ */

function getUserPermissions() {

  return [
    'kmer.view',
    'kmer.job.create',
    'kmer.job.manage_own',
    'kmer.driver.create',
    'kmer.driver.manage_own',
    'kmer.match.view',
    'kmer.quest.view',
    'kmer.quest.create',
    'kmer.quest.manage_own',
    'kmer.quest.contribution.view',
    'kmer.quest.contribution.manage',
  ];
}