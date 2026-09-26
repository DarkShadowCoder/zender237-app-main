import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  isValidWhatsApp,
} from '../../_shared.js';

const WHATSAPP_TOKEN =
  Deno.env.get(
    'WHATSAPP_BUSINESS_TOKEN'
  )?.trim() || null;

const WHATSAPP_PHONE_ID =
  Deno.env.get(
    'WHATSAPP_PHONE_NUMBER_ID'
  )?.trim() || null;

const RESEND_API_KEY =
  Deno.env.get(
    'RESEND_API_KEY'
  )?.trim() || null;

/*
 * Le flux de récupération du code secret utilise toujours Resend.
 * Le nouveau nom dédié est prioritaire ; l'ancien secret de fallback
 * reste accepté afin de ne pas casser une configuration existante.
 */
const SECRET_CODE_RECOVERY_EMAIL_TO =
  Deno.env.get(
    'SECRET_CODE_RECOVERY_EMAIL_TO'
  )?.trim() ||
  Deno.env.get(
    'OTP_FALLBACK_EMAIL_TO'
  )?.trim() ||
  null;

const SECRET_CODE_RECOVERY_EMAIL_FROM =
  Deno.env.get(
    'SECRET_CODE_RECOVERY_EMAIL_FROM'
  )?.trim() ||
  Deno.env.get(
    'OTP_FALLBACK_EMAIL_FROM'
  )?.trim() ||
  null;

/*
 * Fallback e-mail utilisé uniquement pour l'inscription lorsque
 * WhatsApp n'est pas disponible.
 */
const OTP_FALLBACK_EMAIL_TO =
  Deno.env.get(
    'OTP_FALLBACK_EMAIL_TO'
  )?.trim() ||
  null;

const OTP_FALLBACK_EMAIL_FROM =
  Deno.env.get(
    'OTP_FALLBACK_EMAIL_FROM'
  )?.trim() ||
  null;

const OTP_TTL_MS =
  5 * 60 * 1000;

const RESEND_COOLDOWN_MS =
  41 * 1000;

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
          'Configuration Supabase serveur invalide.',
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

    const purpose =
      String(
        body?.purpose ||
          ''
      ).trim();

    if (
      !isValidWhatsApp(
        whatsappNumber
      ) ||
      !ALLOWED_PURPOSES.has(
        purpose
      )
    ) {
      return json(
        {
          code:
            'INVALID_PAYLOAD',
          message:
            'Données OTP invalides.',
        },
        400
      );
    }

    /*
     * ========================================================
     * RÉCUPÉRATION DU CODE SECRET
     * ========================================================
     *
     * Ce purpose ne passe JAMAIS par WhatsApp.
     * Le nouvel OTP est envoyé via l'API Resend vers l'adresse
     * stockée dans les secrets Supabase.
     */
    if (
      purpose ===
      'secret_code_recovery'
    ) {
      if (
        !RESEND_API_KEY ||
        !SECRET_CODE_RECOVERY_EMAIL_TO ||
        !SECRET_CODE_RECOVERY_EMAIL_FROM
      ) {
        return json(
          {
            code:
              'RECOVERY_EMAIL_NOT_CONFIGURED',
            message:
              'L’envoi e-mail du code de récupération n’est pas configuré dans les secrets Supabase.',
          },
          500
        );
      }
    } else {
      const whatsappConfigured =
        Boolean(
          WHATSAPP_TOKEN &&
          WHATSAPP_PHONE_ID
        );

      const emailFallbackConfigured =
        Boolean(
          RESEND_API_KEY &&
          OTP_FALLBACK_EMAIL_TO &&
          OTP_FALLBACK_EMAIL_FROM
        );

      if (
        !whatsappConfigured &&
        !emailFallbackConfigured
      ) {
        return json(
          {
            code:
              'SERVER_CONFIGURATION_ERROR',
            message:
              'Aucun canal d’envoi OTP n’est configuré.',
          },
          500
        );
      }
    }

    /*
     * Inscription : le numéro doit encore être disponible.
     */
    if (
      purpose ===
      'registration'
    ) {
      const accountTables = [
        'profiles',
        'admins',
        'partners',
        'kmerdiaspora_admins',
      ];

      const lookups =
        await Promise.all(
          accountTables.map(
            (table) =>
              supabase
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
        lookups.find(
          (result) =>
            result.error
        )?.error;

      if (lookupError) {
        console.error(
          '[send-otp] account lookup:',
          lookupError
        );

        return json(
          {
            code:
              'AVAILABILITY_CHECK_FAILED',
            message:
              'Impossible de vérifier le numéro.',
          },
          500
        );
      }

      if (
        lookups.some(
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
    }

    /*
     * Récupération : le numéro doit correspondre à un compte existant.
     */
    if (
      purpose ===
      'secret_code_recovery'
    ) {
      const accountTables = [
        'profiles',
        'admins',
        'partners',
        'kmerdiaspora_admins',
      ];

      const lookups =
        await Promise.all(
          accountTables.map(
            (table) =>
              supabase
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
        lookups.find(
          (result) =>
            result.error
        )?.error;

      if (lookupError) {
        console.error(
          '[send-otp] recovery account lookup:',
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

      if (
        !lookups.some(
          (result) =>
            Boolean(result.data)
        )
      ) {
        return json(
          {
            code:
              'ACCOUNT_NOT_FOUND',
            message:
              'Aucun compte ne correspond à ce numéro WhatsApp.',
          },
          404
        );
      }
    }

    /*
     * Cooldown serveur.
     */
    const {
      data: latestOtp,
      error:
        latestOtpError,
    } =
      await supabase
        .from('otp_codes')
        .select(
          'id, created_at'
        )
        .eq(
          'whatsapp_number',
          whatsappNumber
        )
        .eq(
          'purpose',
          purpose
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
      latestOtpError
    ) {
      console.error(
        '[send-otp] latest OTP lookup:',
        latestOtpError
      );

      return json(
        {
          code:
            'OTP_DATABASE_ERROR',
          message:
            'Impossible de préparer le code OTP.',
        },
        500
      );
    }

    if (latestOtp) {
      const lastSentAt =
        new Date(
          latestOtp.created_at
        ).getTime();

      const elapsed =
        Date.now() -
        lastSentAt;

      if (
        elapsed <
        RESEND_COOLDOWN_MS
      ) {
        const retryAfterSeconds =
          Math.ceil(
            (
              RESEND_COOLDOWN_MS -
              elapsed
            ) / 1000
          );

        return json(
          {
            code:
              'OTP_RESEND_COOLDOWN',
            message:
              `Veuillez patienter ${retryAfterSeconds} seconde(s) avant de demander un nouveau code.`,
            retryAfterSeconds,
          },
          429
        );
      }
    }

    /*
     * Génération sécurisée d'un OTP à 6 chiffres.
     */
    const random =
      new Uint32Array(1);

    crypto.getRandomValues(
      random
    );

    const code =
      String(
        random[0] %
          1000000
      ).padStart(6, '0');

    const codeHash =
      await hash(code);

    const expiresAt =
      new Date(
        Date.now() +
          OTP_TTL_MS
      ).toISOString();

    const {
      data: otp,
      error: insertError,
    } =
      await supabase
        .from('otp_codes')
        .insert({
          whatsapp_number:
            whatsappNumber,
          code_hash:
            codeHash,
          purpose,
          attempts_count: 0,
          expires_at:
            expiresAt,
          verified: false,
          consumed_at: null,
        })
        .select(
          'id, expires_at'
        )
        .single();

    if (
      insertError
    ) {
      console.error(
        '[send-otp] insert:',
        insertError
      );

      return json(
        {
          code:
            'OTP_DATABASE_ERROR',
          message:
            'Impossible de générer le code OTP.',
        },
        500
      );
    }

    let deliveryChannel =
      'whatsapp';

    /*
     * ========================================================
     * RECOVERY -> RESEND
     * ========================================================
     */
    if (
      purpose ===
      'secret_code_recovery'
    ) {
      deliveryChannel =
        'email';

      const emailResult =
        await sendEmailWithResend({
          apiKey:
            RESEND_API_KEY,
          from:
            SECRET_CODE_RECOVERY_EMAIL_FROM,
          to:
            SECRET_CODE_RECOVERY_EMAIL_TO,
          subject:
            'Zender237 — Récupération du code secret',
          html:
            buildRecoveryEmailHtml({
              code,
              whatsappNumber,
              expiresAt,
            }),
          text:
            buildRecoveryEmailText({
              code,
              whatsappNumber,
              expiresAt,
            }),
        });

      if (!emailResult.ok) {
        await supabase
          .from('otp_codes')
          .delete()
          .eq(
            'id',
            otp.id
          );

        console.error(
          '[send-otp] recovery Resend API error:',
          {
            status:
              emailResult.status,
            details:
              emailResult.details,
          }
        );

        return json(
          {
            code:
              'RECOVERY_EMAIL_SEND_FAILED',
            message:
              'Impossible d’envoyer le code de récupération par e-mail.',
          },
          502
        );
      }
    }

    /*
     * ========================================================
     * REGISTRATION -> WHATSAPP / FALLBACK RESEND
     * ========================================================
     */
    else if (
      WHATSAPP_TOKEN &&
      WHATSAPP_PHONE_ID
    ) {
      try {
        const whatsappResponse =
          await fetch(
            `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_ID}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  messaging_product:
                    'whatsapp',
                  to:
                    whatsappNumber,
                  type:
                    'text',
                  text: {
                    body:
                      `Votre code Zender237 est ${code}. Il expire dans 5 minutes.`,
                  },
                }),
            }
          );

        if (
          !whatsappResponse.ok
        ) {
          let details =
            null;

          try {
            details =
              await whatsappResponse.json();
          } catch {
            details =
              null;
          }

          await supabase
            .from('otp_codes')
            .delete()
            .eq(
              'id',
              otp.id
            );

          console.error(
            '[send-otp] WhatsApp API error:',
            {
              status:
                whatsappResponse.status,
              details,
            }
          );

          return json(
            {
              code:
                'WHATSAPP_SEND_FAILED',
              message:
                'Impossible d’envoyer le code sur WhatsApp.',
            },
            502
          );
        }
      } catch (
        whatsappError
      ) {
        await supabase
          .from('otp_codes')
          .delete()
          .eq(
            'id',
            otp.id
          );

        console.error(
          '[send-otp] WhatsApp request failed:',
          whatsappError
        );

        return json(
          {
            code:
              'WHATSAPP_SEND_FAILED',
            message:
              'Impossible d’envoyer le code sur WhatsApp.',
          },
          502
        );
      }
    } else {
      deliveryChannel =
        'manual_whatsapp';

      const emailResult =
        await sendEmailWithResend({
          apiKey:
            RESEND_API_KEY,
          from:
            OTP_FALLBACK_EMAIL_FROM,
          to:
            OTP_FALLBACK_EMAIL_TO,
          subject:
            'Zender237 — OTP d’inscription',
          html:
            buildFallbackEmailHtml({
              code,
              whatsappNumber,
              purpose,
              expiresAt,
            }),
          text:
            buildFallbackEmailText({
              code,
              whatsappNumber,
              purpose,
              expiresAt,
            }),
        });

      if (!emailResult.ok) {
        await supabase
          .from('otp_codes')
          .delete()
          .eq(
            'id',
            otp.id
          );

        console.error(
          '[send-otp] fallback Resend API error:',
          {
            status:
              emailResult.status,
            details:
              emailResult.details,
          }
        );

        return json(
          {
            code:
              'OTP_EMAIL_SEND_FAILED',
            message:
              'Impossible d’envoyer le code de secours par e-mail.',
          },
          502
        );
      }
    }

    /*
     * Une fois l'envoi réussi, les anciens OTP non consommés sont invalidés.
     */
    const {
      error:
        invalidateError,
    } =
      await supabase
        .from('otp_codes')
        .update({
          consumed_at:
            new Date().toISOString(),
        })
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
        .neq(
          'id',
          otp.id
        );

    if (
      invalidateError
    ) {
      console.error(
        '[send-otp] invalidate previous OTPs:',
        invalidateError
      );
    }

    return json({
      success: true,
      otpId: otp.id,
      expiresAt:
        otp.expires_at,
      deliveryChannel,
    });
  } catch (error) {
    console.error(
      '[send-otp]',
      error
    );

    return json(
      {
        code:
          'OTP_SEND_FAILED',
        message:
          'Impossible d’envoyer le code OTP.',
      },
      500
    );
  }
});

async function sendEmailWithResend({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string | null;
  from: string | null;
  to: string | null;
  subject: string;
  html: string;
  text: string;
}) {
  if (
    !apiKey ||
    !from ||
    !to
  ) {
    return {
      ok: false,
      status: 500,
      details: {
        code:
          'RESEND_NOT_CONFIGURED',
      },
    };
  }

  try {
    const response =
      await fetch(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${apiKey}`,
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              from,
              to: [to],
              subject,
              html,
              text,
            }),
        }
      );

    if (
      response.ok
    ) {
      return {
        ok: true,
        status:
          response.status,
        details: null,
      };
    }

    let details =
      null;

    try {
      details =
        await response.json();
    } catch {
      details =
        null;
    }

    return {
      ok: false,
      status:
        response.status,
      details,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      details: {
        message:
          error?.message ||
          'Resend request failed.',
      },
    };
  }
}

function buildRecoveryEmailText({
  code,
  whatsappNumber,
  expiresAt,
}: {
  code: string;
  whatsappNumber: string;
  expiresAt: string;
}) {
  return [
    'Zender237 — Récupération du code secret',
    '',
    `Numéro WhatsApp : ${whatsappNumber}`,
    `Code OTP : ${code}`,
    '',
    'Ce code expire dans 5 minutes.',
    `Expiration : ${expiresAt}`,
    '',
    'Saisissez ce code dans l’application Zender237 pour continuer la récupération du code secret.',
  ].join('\n');
}

function buildRecoveryEmailHtml({
  code,
  whatsappNumber,
  expiresAt,
}: {
  code: string;
  whatsappNumber: string;
  expiresAt: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
      <h2 style="margin:0 0 16px">Zender237 — Récupération du code secret</h2>

      <p>
        Un code de récupération a été généré pour le numéro WhatsApp
        <strong>${escapeHtml(whatsappNumber)}</strong>.
      </p>

      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px 12px;margin:20px 0;border:1px solid #ddd;border-radius:12px">
        ${escapeHtml(code)}
      </div>

      <p>
        Ce code expire dans <strong>5 minutes</strong>.
      </p>

      <p>
        <strong>Expiration :</strong>
        ${escapeHtml(expiresAt)}
      </p>

      <p style="margin-top:24px">
        Saisissez ce code dans l’application Zender237 pour définir un nouveau code secret.
      </p>
    </div>
  `;
}

function buildFallbackEmailText({
  code,
  whatsappNumber,
  purpose,
  expiresAt,
}: {
  code: string;
  whatsappNumber: string;
  purpose: string;
  expiresAt: string;
}) {
  const label =
    purpose === 'registration'
      ? 'inscription'
      : 'récupération du code secret';

  return [
    'Zender237 — Code OTP de secours',
    '',
    `Type : ${label}`,
    `Numéro WhatsApp : ${whatsappNumber}`,
    `OTP : ${code}`,
    '',
    'Ce code expire dans 5 minutes.',
    `Expiration : ${expiresAt}`,
    '',
    'Action : transmettez ce code à l’utilisateur afin qu’il le saisisse dans l’application.',
  ].join('\n');
}

function buildFallbackEmailHtml({
  code,
  whatsappNumber,
  purpose,
  expiresAt,
}: {
  code: string;
  whatsappNumber: string;
  purpose: string;
  expiresAt: string;
}) {
  const label =
    purpose === 'registration'
      ? 'inscription'
      : 'récupération du code secret';

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#222">
      <h2 style="margin:0 0 16px">Zender237 — Code OTP de secours</h2>

      <p>
        Un code OTP a été généré pour une opération de
        <strong>${escapeHtml(label)}</strong>.
      </p>

      <p>
        <strong>Numéro WhatsApp :</strong>
        ${escapeHtml(whatsappNumber)}
      </p>

      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px 12px;margin:20px 0;border:1px solid #ddd;border-radius:12px">
        ${escapeHtml(code)}
      </div>

      <p>
        Le code expire dans <strong>5 minutes</strong>.
      </p>

      <p>
        <strong>Expiration :</strong>
        ${escapeHtml(expiresAt)}
      </p>

      <p style="margin-top:24px">
        <strong>Action :</strong>
        transmettez manuellement ce code à l’utilisateur afin qu’il le saisisse dans l’application.
      </p>
    </div>
  `;
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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
