import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  isValidWhatsApp,
} from '../../_shared.js';

const MAX_OTP_ATTEMPTS = 3;

const ALLOWED_PURPOSES =
  new Set([
    'registration',
    'secret_code_recovery',
  ]);

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

  const supabase =
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

    const code =
      String(
        body?.code ||
        ''
      )
        .replace(
          /\D/g,
          ''
        )
        .slice(0, 6);

    const purpose =
      String(
        body?.purpose ||
        ''
      ).trim();

    if (
      !isValidWhatsApp(
        whatsappNumber
      ) ||
      !/^\d{6}$/.test(
        code
      ) ||
      !ALLOWED_PURPOSES.has(
        purpose
      )
    ) {
      return json(
        {
          verified: false,
          code:
            'INVALID_PAYLOAD',
          message:
            'Données OTP invalides.',
        },
        400
      );
    }

    const {
      data: otp,
      error: otpError,
    } =
      await supabase
        .from('otp_codes')
        .select(
          'id, code_hash, attempts_count, expires_at, verified'
        )
        .eq(
          'whatsapp_number',
          whatsappNumber
        )
        .eq(
          'purpose',
          purpose
        )
        .eq(
          'verified',
          false
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
      otpError
    ) {
      console.error(
        '[verify-otp] lookup:',
        otpError
      );

      return json(
        {
          verified: false,
          code:
            'OTP_DATABASE_ERROR',
          message:
            'Impossible de vérifier le code OTP.',
        },
        500
      );
    }

    if (!otp) {
      return json({
        verified: false,
        reason:
          'too_many_attempts',
        code:
          'OTP_TOO_MANY_ATTEMPTS',
        attemptsUsed:
          MAX_OTP_ATTEMPTS,
        attemptsRemaining: 0,
      });
    }

    if (
      new Date(
        otp.expires_at
      ) <= new Date()
    ) {
      return json({
        verified: false,
        reason:
          'expired',
        code:
          'OTP_EXPIRED',
        attemptsUsed:
          otp.attempts_count,
        attemptsRemaining:
          Math.max(
            0,
            MAX_OTP_ATTEMPTS -
              otp.attempts_count
          ),
      });
    }

    if (
      otp.attempts_count >=
      MAX_OTP_ATTEMPTS
    ) {
      return json({
        verified: false,
        reason:
          'too_many_attempts',
        code:
          'OTP_TOO_MANY_ATTEMPTS',
        attemptsUsed:
          otp.attempts_count,
        attemptsRemaining: 0,
      });
    }

    const codeHash =
      await hash(code);

    const isValid =
      codeHash ===
      otp.code_hash;

    const nextAttempts =
      otp.attempts_count +
      1;

    const reachedLimit =
      !isValid &&
      nextAttempts >=
        MAX_OTP_ATTEMPTS;

    const {
      error: updateError,
    } =
      await supabase
        .from('otp_codes')
        .update({
          attempts_count:
            nextAttempts,
          verified:
            isValid,
        })
        .eq(
          'id',
          otp.id
        )
        .eq(
          'verified',
          false
        )
        .is(
          'consumed_at',
          null
        )
        .lt(
          'attempts_count',
          MAX_OTP_ATTEMPTS
        );

    if (
      updateError
    ) {
      console.error(
        '[verify-otp] update:',
        updateError
      );

      return json(
        {
          verified: false,
          code:
            'OTP_DATABASE_ERROR',
          message:
            'Impossible de mettre à jour le statut du code OTP.',
        },
        500
      );
    }

    if (isValid) {
      return json({
        verified: true,
        otpId: otp.id,
        attemptsUsed:
          nextAttempts,
        attemptsRemaining:
          MAX_OTP_ATTEMPTS -
          nextAttempts,
      });
    }

    return json({
      verified: false,
      otpId: otp.id,
      reason:
        reachedLimit
          ? 'too_many_attempts'
          : 'invalid',
      code:
        reachedLimit
          ? 'OTP_TOO_MANY_ATTEMPTS'
          : 'OTP_INVALID',
      attemptsUsed:
        nextAttempts,
      attemptsRemaining:
        Math.max(
          0,
          MAX_OTP_ATTEMPTS -
            nextAttempts
        ),
    });
  } catch (error) {
    console.error(
      '[verify-otp]',
      error
    );

    return json(
      {
        verified: false,
        code:
          'OTP_VERIFICATION_ERROR',
        message:
          'Impossible de vérifier le code OTP.',
      },
      500
    );
  }
});

async function hash(
  value: string
) {
  const data =
    new TextEncoder()
      .encode(value);

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      data
    );

  return Array
    .from(
      new Uint8Array(
        digest
      )
    )
    .map(
      (b) =>
        b
          .toString(16)
          .padStart(2, '0')
    )
    .join('');
}