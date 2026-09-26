import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  sha256,
  validSecret,
  isValidWhatsApp,
} from '../../_shared.js';

Deno.serve(
  async (req) => {
    const guarded =
      methodGuard(req);

    if (guarded) {
      return guarded;
    }

    const service =
      createClient(
        Deno.env.get(
          'SUPABASE_URL'
        )!,
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY'
        )!
      );

    try {
      const body =
        await req.json();

      const whatsappNumber =
        normalizeWhatsApp(
          body?.whatsappNumber
        );

      const otpId =
        String(
          body?.otpId ||
          ''
        );

      const newSecretCode =
        String(
          body?.newSecretCode ||
          ''
        );

      if (
        !isValidWhatsApp(
          whatsappNumber
        ) ||
        !otpId ||
        !validSecret(
          newSecretCode
        )
      ) {
        return json(
          {
            code:
              'INVALID_PAYLOAD',
            message:
              'Données de récupération invalides.',
          },
          400
        );
      }

      const {
        data: otp,
        error: otpError,
      } =
        await service
          .from('otp_codes')
          .select(
            'id, expires_at'
          )
          .eq(
            'id',
            otpId
          )
          .eq(
            'whatsapp_number',
            whatsappNumber
          )
          .eq(
            'purpose',
            'secret_code_recovery'
          )
          .eq(
            'verified',
            true
          )
          .is(
            'consumed_at',
            null
          )
          .maybeSingle();

      if (
        otpError
      ) {
        console.error(
          '[reset-secret-code] OTP lookup:',
          otpError
        );

        return json(
          {
            code:
              'OTP_DATABASE_ERROR',
            message:
              'Impossible de vérifier le code de récupération.',
          },
          500
        );
      }

      if (
        !otp ||
        new Date(
          otp.expires_at
        ) <= new Date()
      ) {
        return json(
          {
            code:
              'OTP_INVALID_OR_EXPIRED',
            message:
              'Le code de récupération est invalide ou expiré.',
          },
          400
        );
      }

      const [
        adminResult,
        partnerResult,
        kmaResult,
        profileResult,
      ] =
        await Promise.all([
          service
            .from('admins')
            .select(
              'auth_user_id'
            )
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from('partners')
            .select(
              'auth_user_id'
            )
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from(
              'kmerdiaspora_admins'
            )
            .select(
              'auth_user_id'
            )
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),

          service
            .from('profiles')
            .select(
              'id'
            )
            .eq(
              'whatsapp_number',
              whatsappNumber
            )
            .maybeSingle(),
        ]);

      const lookupError =
        [
          adminResult,
          partnerResult,
          kmaResult,
          profileResult,
        ].find(
          (result) =>
            result.error
        )?.error;

      if (
        lookupError
      ) {
        console.error(
          '[reset-secret-code] account lookup:',
          lookupError
        );

        return json(
          {
            code:
              'ACCOUNT_LOOKUP_FAILED',
            message:
              'Impossible de retrouver le compte.',
          },
          500
        );
      }

      const authUserId =
        adminResult.data
          ?.auth_user_id ||
        partnerResult.data
          ?.auth_user_id ||
        kmaResult.data
          ?.auth_user_id ||
        profileResult.data?.id ||
        null;

      if (
        !authUserId
      ) {
        return json(
          {
            code:
              'ACCOUNT_NOT_FOUND',
            message:
              'Compte introuvable.',
          },
          404
        );
      }

      const {
        error:
          updateError,
      } =
        await service.auth.admin.updateUserById(
          authUserId,
          {
            password:
              newSecretCode,
          }
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      if (
        profileResult.data
      ) {
        const hash =
          await sha256(
            newSecretCode
          );

        const {
          error:
            profileUpdateError,
        } =
          await service
            .from('profiles')
            .update({
              secret_code_hash:
                hash,

              login_attempts:
                0,
            })
            .eq(
              'id',
              authUserId
            );

        if (
          profileUpdateError
        ) {
          throw profileUpdateError;
        }
      }

      const {
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
            otp.id
          )
          .eq(
            'verified',
            true
          )
          .is(
            'consumed_at',
            null
          );

      if (
        consumeError
      ) {
        throw consumeError;
      }

      return json({
        success: true,
      });
    } catch (error) {
      console.error(
        '[reset-secret-code]',
        error
      );

      return json(
        {
          code:
            'RESET_SECRET_CODE_FAILED',
          message:
            error?.message ||
            'Impossible de réinitialiser le code secret.',
        },
        500
      );
    }
  }
);