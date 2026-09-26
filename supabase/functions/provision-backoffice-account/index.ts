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
  getBearerToken,
} from '../../_shared.js';

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
      return json(
        {
          success: false,
          code:
            'SERVER_CONFIGURATION_ERROR',
          message:
            'Configuration Supabase serveur invalide.',
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

      /* ======================================================
       * SÉCURITÉ — SEUL UN ADMIN ACTIF PEUT PROVISIONNER
       * ====================================================== */

      const bearerToken =
        getBearerToken(req);

      if (!bearerToken) {
        return json(
          {
            success: false,
            code: 'UNAUTHENTICATED',
            message: 'Session administrateur absente.',
          },
          401
        );
      }

      const {
        data: authData,
        error: authError,
      } = await service.auth.getUser(
        bearerToken
      );

      if (
        authError ||
        !authData?.user?.id
      ) {
        return json(
          {
            success: false,
            code: 'UNAUTHENTICATED',
            message: 'Session administrateur invalide ou expirée.',
          },
          401
        );
      }

      const {
        data: currentAdmin,
        error: currentAdminError,
      } = await service
        .from('admins')
        .select('id, active')
        .eq(
          'auth_user_id',
          authData.user.id
        )
        .maybeSingle();

      if (currentAdminError) {
        throw currentAdminError;
      }

      if (!currentAdmin) {
        return json(
          {
            success: false,
            code: 'ADMIN_REQUIRED',
            message: 'Accès administrateur requis.',
          },
          403
        );
      }

      if (currentAdmin.active === false) {
        return json(
          {
            success: false,
            code: 'ADMIN_DISABLED',
            message: 'Compte administrateur désactivé.',
          },
          403
        );
      }

      const body =
        await req.json();

      /* ======================================================
       * INPUT
       * ====================================================== */

      const accountType =
        String(
          body?.accountType ||
          ''
        )
          .trim()
          .toLowerCase();

      const fullName =
        String(
          body?.fullName ||
          ''
        ).trim();

      const phoneNumber =
        body?.phoneNumber
          ? String(
              body.phoneNumber
            ).trim()
          : null;

      const whatsappNumber =
        normalizeWhatsApp(
          body?.whatsappNumber
        );

      const secretCode =
        normalizeSecretCode(
          body?.secretCode
        );

      const role =
        String(
          body?.role ||
          ''
        )
          .trim()
          .toLowerCase();

      const notes =
        body?.notes
          ? String(
              body.notes
            )
          : null;

      const partnerRoleIds =
        Array.isArray(
          body?.partnerRoleIds
        )
          ? body.partnerRoleIds
          : [];

      /* ======================================================
       * VALIDATION
       * ====================================================== */

      if (
        ![
          'admin',
          'partner',
          'kmerdiaspora_admin',
        ].includes(
          accountType
        )
      ) {
        return json({
          success: false,
          code:
            'INVALID_ACCOUNT_TYPE',
          message:
            'Type de compte invalide.',
        });
      }

      if (
        !fullName
      ) {
        return json({
          success: false,
          code:
            'INVALID_FULL_NAME',
          message:
            'Le nom complet est obligatoire.',
        });
      }

      if (
        !/^\+\d{10,15}$/.test(
          whatsappNumber
        )
      ) {
        return json({
          success: false,
          code:
            'INVALID_WHATSAPP',
          message:
            'Numéro WhatsApp invalide.',
        });
      }

      if (
        phoneNumber &&
        phoneNumber
          .replace(
            /\D/g,
            ''
          )
          .length <
          8
      ) {
        return json({
          success: false,
          code:
            'INVALID_PHONE_NUMBER',
          message:
            'Numéro de téléphone invalide.',
        });
      }

      if (
        !validSecret(
          secretCode
        )
      ) {
        return json({
          success: false,
          code:
            'INVALID_SECRET_CODE',
          message:
            'Le code secret doit contenir exactement 6 chiffres.',
        });
      }

      /* ======================================================
       * GLOBAL DUPLICATE CHECK
       * ====================================================== */

      const [
        adminResult,
        partnerResult,
        kmaResult,
        profileResult,
      ] =
        await Promise.all([

          service
            .from('admins')
            .select('id')
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from('partners')
            .select('id')
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from(
              'kmerdiaspora_admins'
            )
            .select('id')
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from('profiles')
            .select('id')
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),
        ]);

      if (
        adminResult.error ||
        partnerResult.error ||
        kmaResult.error ||
        profileResult.error
      ) {
        console.error(
          '[provision] duplicate check failed:',
          {
            admin:
              adminResult.error,

            partner:
              partnerResult.error,

            kma:
              kmaResult.error,

            profile:
              profileResult.error,
          }
        );

        return json(
          {
            success: false,
            code:
              'DATABASE_ERROR',
            message:
              'Impossible de vérifier le numéro.',
          },
          500
        );
      }

      if (
        adminResult.data ||
        partnerResult.data ||
        kmaResult.data ||
        profileResult.data
      ) {
        return json({
          success: false,
          code:
            'WHATSAPP_ALREADY_USED',
          message:
            'Ce numéro WhatsApp est déjà associé à un compte.',
        });
      }

      /* ======================================================
       * HASH SECRET
       * ====================================================== */

      const secretCodeHash =
        await sha256(
          secretCode
        );

      /* ======================================================
       * AUTH USER
       * ====================================================== */

      const authUserId =
        crypto.randomUUID();

      const technicalEmail =
        `${authUserId}@zender237.internal`;

      const {
        data:
          authUserData,
        error:
          authUserError,
      } =
        await service.auth.admin.createUser({
          email:
            technicalEmail,

          email_confirm:
            true,

          user_metadata: {
            account_type:
              accountType,

            full_name:
              fullName,

            whatsapp_number:
              whatsappNumber,
          },
        });

      if (
        authUserError ||
        !authUserData?.user
      ) {
        console.error(
          '[provision] auth create failed:',
          authUserError
        );

        return json(
          {
            success: false,
            code:
              'AUTH_USER_CREATION_FAILED',
            message:
              'Impossible de créer le compte Auth.',
          },
          500
        );
      }

      const createdAuthUserId =
        authUserData.user.id;

      /* ======================================================
       * ADMIN
       * ====================================================== */

      if (
        accountType ===
        'admin'
      ) {

        if (
          !role
        ) {
          await service.auth.admin.deleteUser(
            createdAuthUserId
          );

          return json({
            success: false,
            code:
              'ADMIN_ROLE_REQUIRED',
            message:
              'Le rôle administrateur est obligatoire.',
          });
        }

        const {
          data,
          error,
        } =
          await service
            .from('admins')
            .insert({
              auth_user_id:
                createdAuthUserId,

              full_name:
                fullName,

              role,

              whatsapp_number:
                whatsappNumber,

              secret_code_hash:
                secretCodeHash,

              login_attempts:
                0,

              active:
                true,
            })
            .select(
              'id'
            )
            .single();

        if (
          error
        ) {
          await service.auth.admin.deleteUser(
            createdAuthUserId
          );

          throw error;
        }

        return json({
          success: true,

          accountType:
            'admin',

          accountId:
            data.id,

          authUserId:
            createdAuthUserId,

          email:
            technicalEmail,

          message:
            'Compte administrateur créé avec succès.',
        });
      }

      /* ======================================================
       * PARTNER
       * ====================================================== */

      if (
        accountType ===
        'partner'
      ) {

        const {
          data,
          error,
        } =
          await service
            .from('partners')
            .insert({
              auth_user_id:
                createdAuthUserId,

              full_name:
                fullName,

              /*
               * Le téléphone du partenaire
               * est maintenant enregistré.
               */
              phone_number:
                phoneNumber,

              whatsapp_number:
                whatsappNumber,

              /*
               * IMPORTANT :
               * seul le hash est stocké.
               */
              secret_code_hash:
                secretCodeHash,

              login_attempts:
                0,

              active:
                true,

              notes,
            })
            .select(
              'id'
            )
            .single();

        if (
          error
        ) {
          await service.auth.admin.deleteUser(
            createdAuthUserId
          );

          throw error;
        }

        /*
         * Attribution éventuelle des rôles
         * du partenaire.
         */
        if (
          partnerRoleIds.length >
          0
        ) {

          const rows =
            partnerRoleIds.map(
              (
                roleId
              ) => ({
                partner_id:
                  data.id,

                role_id:
                  roleId,
              })
            );

          const {
            error:
              assignmentError,
          } =
            await service
              .from(
                'partner_role_assignments'
              )
              .insert(
                rows
              );

          if (
            assignmentError
          ) {
            await service
              .from(
                'partners'
              )
              .delete()
              .eq(
                'id',
                data.id
              );

            await service.auth.admin.deleteUser(
              createdAuthUserId
            );

            throw assignmentError;
          }
        }

        return json({
          success: true,

          accountType:
            'partner',

          accountId:
            data.id,

          authUserId:
            createdAuthUserId,

          email:
            technicalEmail,

          message:
            'Compte partenaire créé avec succès.',
        });
      }

      /* ======================================================
       * KMERDIASPORA ADMIN
       * ====================================================== */

      if (
        accountType ===
        'kmerdiaspora_admin'
      ) {

        const {
          data,
          error,
        } =
          await service
            .from(
              'kmerdiaspora_admins'
            )
            .insert({
              auth_user_id:
                createdAuthUserId,

              full_name:
                fullName,

              whatsapp_number:
                whatsappNumber,

              secret_code_hash:
                secretCodeHash,

              login_attempts:
                0,

              active:
                true,

              notes,
            })
            .select(
              'id'
            )
            .single();

        if (
          error
        ) {
          await service.auth.admin.deleteUser(
            createdAuthUserId
          );

          throw error;
        }

        return json({
          success: true,

          accountType:
            'kmerdiaspora_admin',

          accountId:
            data.id,

          authUserId:
            createdAuthUserId,

          email:
            technicalEmail,

          message:
            'Compte administrateur KmerDiaspora créé avec succès.',
        });
      }

      /*
       * Sécurité :
       * aucune branche valide n'a été trouvée.
       */
      await service.auth.admin.deleteUser(
        createdAuthUserId
      );

      return json(
        {
          success: false,
          code:
            'INVALID_ACCOUNT_TYPE',
          message:
            'Type de compte invalide.',
        },
        400
      );

    } catch (error) {

      console.error(
        '[provision-backoffice-account]',
        error
      );

      return json(
        {
          success: false,
          code:
            'PROVISION_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Impossible de créer le compte.',
        },
        500
      );
    }
  }
);
