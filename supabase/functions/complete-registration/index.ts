import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  normalizeSecretCode,
  isValidWhatsApp,
  sha256,
  validSecret,
  isNonEmptyString,
} from '../../_shared.js';

const ALLOWED_COUNTRIES =
  new Set([
    'cameroun',
    'mali',
    'guinee',
  ]);

const USERNAME_REGEX =
  /^[a-zA-Z0-9_.]{3,20}$/;

Deno.serve(async (req) => {
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
    return json(
      {
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

  let userId =
    null;

  let otpId =
    null;

  try {
    const body =
      await req.json();

    const username =
      String(
        body?.username ||
        ''
      ).trim();

    const whatsappNumber =
      normalizeWhatsApp(
        body?.whatsappNumber
      );

    const country =
      String(
        body?.country ||
        ''
      )
        .trim()
        .toLowerCase();

    const secretCode =
      normalizeSecretCode(
        body?.secretCode
      );

    const fullName =
      String(
        body?.fullName ||
        ''
      ).trim();

    /*
     * =========================================================
     * 1. VALIDATION DES DONNÉES
     * =========================================================
     */

    if (
      !USERNAME_REGEX.test(
        username
      )
    ) {
      return json(
        {
          code:
            'INVALID_USERNAME',
          message:
            'Nom d’utilisateur invalide.',
        },
        400
      );
    }

    if (
      !isValidWhatsApp(
        whatsappNumber
      )
    ) {
      return json(
        {
          code:
            'INVALID_WHATSAPP_NUMBER',
          message:
            'Numéro WhatsApp invalide.',
        },
        400
      );
    }

    if (
      !ALLOWED_COUNTRIES.has(
        country
      )
    ) {
      return json(
        {
          code:
            'INVALID_COUNTRY',
          message:
            'Pays non pris en charge.',
        },
        400
      );
    }

    if (
      !isNonEmptyString(
        fullName
      ) ||
      fullName.length > 120
    ) {
      return json(
        {
          code:
            'INVALID_FULL_NAME',
          message:
            'Nom complet invalide.',
        },
        400
      );
    }

    if (
      !validSecret(
        secretCode
      )
    ) {
      return json(
        {
          code:
            'INVALID_SECRET_CODE',
          message:
            'Le code secret doit contenir 6 chiffres.',
        },
        400
      );
    }

    /*
     * =========================================================
     * 2. RÉCUPÉRATION DE L'OTP
     *
     * IMPORTANT :
     *
     * À ce stade, l'utilisateur a déjà saisi le bon OTP
     * dans verify-otp.
     *
     * verify-otp a alors marqué :
     *
     *   verified = true
     *
     * L'expiration du code n'a PLUS aucune importance ici.
     *
     * On vérifie UNIQUEMENT :
     *
     *   verified = true
     *   consumed_at IS NULL
     *
     * NE PAS ajouter :
     *
     *   expires_at > now()
     *
     * =========================================================
     */

    const {
      data: otp,
      error:
        otpLookupError,
    } =
      await service
        .from('otp_codes')
        .select(
          'id, verified, consumed_at, created_at'
        )
        .eq(
          'whatsapp_number',
          whatsappNumber
        )
        .eq(
          'purpose',
          'registration'
        )
        .eq(
          'verified',
          true
        )
        .is(
          'consumed_at',
          null
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      otpLookupError
    ) {
      console.error(
        '[complete-registration] OTP lookup:',
        otpLookupError
      );

      return json(
        {
          code:
            'OTP_DATABASE_ERROR',
          message:
            'Impossible de vérifier la validation du numéro.',
        },
        500
      );
    }

    /*
     * Si aucun OTP vérifié et non consommé
     * n'existe, l'utilisateur doit repasser
     * par l'étape de vérification.
     */
    if (!otp) {
      return json(
        {
          code:
            'OTP_NOT_VERIFIED',
          message:
            'Veuillez d’abord vérifier votre numéro WhatsApp.',
        },
        400
      );
    }

    otpId =
      otp.id;

    /*
     * IMPORTANT :
     *
     * AUCUN contrôle de expires_at ici.
     *
     * Même si :
     *
     *   now() > expires_at
     *
     * l'inscription peut continuer puisque
     * l'OTP avait déjà été validé correctement.
     */

    /*
     * =========================================================
     * 3. VÉRIFICATION FINALE DU NUMÉRO
     * =========================================================
     */

    const accountTables =
      [
        'profiles',
        'admins',
        'partners',
        'kmerdiaspora_admins',
      ];

    const accountLookups =
      await Promise.all(
        accountTables.map(
          (table) =>
            service
              .from(table)
              .select('id')
              .eq(
                'whatsapp_number',
                whatsappNumber
              )
              .maybeSingle()
        )
      );

    const lookupError =
      accountLookups.find(
        (result) =>
          result.error
      )?.error;

    if (lookupError) {
      console.error(
        '[complete-registration] account lookup:',
        lookupError
      );

      return json(
        {
          code:
            'ACCOUNT_LOOKUP_FAILED',
          message:
            'Impossible de vérifier le numéro.',
        },
        500
      );
    }

    if (
      accountLookups.some(
        (result) =>
          Boolean(result.data)
      )
    ) {
      return json(
        {
          code:
            'ACCOUNT_ALREADY_EXISTS',
          message:
            'Ce numéro est déjà associé à un compte.',
        },
        409
      );
    }

    /*
     * =========================================================
     * 4. VÉRIFICATION DU USERNAME
     * =========================================================
     */

    const {
      data: existingUsername,
      error:
        usernameLookupError,
    } =
      await service
        .from('profiles')
        .select('id')
        .eq(
          'username',
          username
        )
        .maybeSingle();

    if (
      usernameLookupError
    ) {
      console.error(
        '[complete-registration] username lookup:',
        usernameLookupError
      );

      return json(
        {
          code:
            'USERNAME_LOOKUP_FAILED',
          message:
            'Impossible de vérifier le nom d’utilisateur.',
        },
        500
      );
    }

    if (
      existingUsername
    ) {
      return json(
        {
          code:
            'USERNAME_ALREADY_EXISTS',
          message:
            'Ce nom d’utilisateur est déjà utilisé.',
        },
        409
      );
    }

    /*
     * =========================================================
     * 5. CRÉATION DU COMPTE AUTH
     * =========================================================
     */

    const {
      data: authData,
      error: authError,
    } =
      await service.auth.admin.createUser({
        phone:
          whatsappNumber,

        phone_confirm:
          true,

        password:
          secretCode,

        user_metadata: {
          account_type:
            'user',

          full_name:
            fullName,

          username,
        },
      });

    if (
      authError ||
      !authData?.user
    ) {
      console.error(
        '[complete-registration] auth user creation:',
        authError
      );

      return json(
        {
          code:
            'USER_CREATION_FAILED',
          message:
            authError?.message ||
            'Impossible de créer le compte utilisateur.',
        },
        400
      );
    }

    userId =
      authData.user.id;

    /*
     * =========================================================
     * 6. HASH DU CODE SECRET
     * =========================================================
     */

    const secretHash =
      await sha256(
        secretCode
      );

    /*
     * =========================================================
     * 7. CRÉATION DU PROFIL
     * =========================================================
     */

    const {
      error: profileError,
    } =
      await service
        .from('profiles')
        .insert({
          id:
            userId,

          username,

          whatsapp_number:
            whatsappNumber,

          country,

          secret_code_hash:
            secretHash,
        });

    if (
      profileError
    ) {
      throw profileError;
    }

    /*
     * =========================================================
     * 8. WALLET
     *
     * On vérifie d'abord si un wallet existe déjà.
     * Cela évite :
     *
     * Duplicate key value violates unique constraint
     * =========================================================
     */

    const {
      data: existingWallet,
      error:
        walletLookupError,
    } =
      await service
        .from('wallets')
        .select(
          'id, user_id'
        )
        .eq(
          'user_id',
          userId
        )
        .maybeSingle();

    if (
      walletLookupError
    ) {
      console.error(
        '[complete-registration] wallet lookup:',
        walletLookupError
      );

      throw walletLookupError;
    }

    /*
     * Si le wallet n'existe pas encore,
     * on le crée.
     */
    if (!existingWallet) {
      const {
        error:
          walletInsertError,
      } =
        await service
          .from('wallets')
          .insert({
            user_id:
              userId,
          });

      if (
        walletInsertError
      ) {
        /*
         * 23505 = unique_violation
         *
         * Cela peut arriver si un trigger ou un autre
         * processus a créé le wallet entre notre SELECT
         * et notre INSERT.
         *
         * Dans ce cas, le wallet existe déjà :
         * on considère l'étape comme réussie.
         */
        if (
          walletInsertError.code !==
          '23505'
        ) {
          console.error(
            '[complete-registration] wallet insert:',
            walletInsertError
          );

          throw walletInsertError;
        }

        console.log(
          '[complete-registration] Wallet déjà créé.'
        );
      }
    }

    /*
     * =========================================================
     * 9. CONSOMMATION DE L'OTP
     *
     * C'est ici que le code OTP devient définitivement
     * inutilisable.
     *
     * L'expiration n'est toujours PAS vérifiée.
     * =========================================================
     */

    const {
      data: consumedOtp,
      error:
        consumeError,
    } =
      await service
        .from('otp_codes')
        .update({
          consumed_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          otpId
        )
        .eq(
          'verified',
          true
        )
        .is(
          'consumed_at',
          null
        )
        .select('id')
        .maybeSingle();

    if (
      consumeError
    ) {
      console.error(
        '[complete-registration] OTP consumption:',
        consumeError
      );

      throw consumeError;
    }

    /*
     * Si aucun enregistrement n'a été mis à jour,
     * l'OTP a probablement déjà été consommé.
     */
    if (!consumedOtp) {
      throw new Error(
        'OTP déjà consommé ou devenu invalide.'
      );
    }

    /*
     * =========================================================
     * 10. SUCCÈS
     * =========================================================
     */

    return json({
      success:
        true,

      accountType:
        'user',

      accountId:
        userId,

      authUserId:
        userId,

      active:
        true,

      roles:
        [],

      permissions:
        [],
    });
  } catch (error) {
    console.error(
      '[complete-registration]',
      error
    );

    /*
     * =========================================================
     * 11. ROLLBACK
     * =========================================================
     */

    if (userId) {
      /*
       * Wallet
       */
      try {
        await service
          .from('wallets')
          .delete()
          .eq(
            'user_id',
            userId
          );
      } catch (
        walletRollbackError
      ) {
        console.error(
          '[complete-registration] wallet rollback:',
          walletRollbackError
        );
      }

      /*
       * Profile
       */
      try {
        await service
          .from('profiles')
          .delete()
          .eq(
            'id',
            userId
          );
      } catch (
        profileRollbackError
      ) {
        console.error(
          '[complete-registration] profile rollback:',
          profileRollbackError
        );
      }

      /*
       * Auth user
       */
      try {
        await service.auth.admin.deleteUser(
          userId
        );
      } catch (
        authRollbackError
      ) {
        console.error(
          '[complete-registration] auth rollback:',
          authRollbackError
        );
      }
    }

    return json(
      {
        code:
          'REGISTRATION_FAILED',
        message:
          error?.message ||
          'Impossible de créer le compte.',
      },
      400
    );
  }
});