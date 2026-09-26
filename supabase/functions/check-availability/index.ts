import {
  createClient,
} from 'https://esm.sh/@supabase/supabase-js@2';

import {
  json,
  methodGuard,
  normalizeWhatsApp,
  isValidWhatsApp,
} from '../../_shared.js';

/**
 * Tables réellement présentes dans le schéma actuel.
 *
 * L'inscription utilisateur doit seulement empêcher
 * l'utilisation d'un numéro déjà présent dans :
 *
 * - profiles  : comptes utilisateurs
 * - admins    : comptes administrateurs / partenaires
 *
 * Les anciennes références à :
 * - partners
 * - kmerdiaspora_admins
 *
 * provoquaient une erreur 500 lorsque ces tables
 * n'existaient pas dans la base Supabase.
 */
const ACCOUNT_TABLES = [
  'profiles',
  'admins',
];

Deno.serve(async (req) => {
  const guarded = methodGuard(req);

  if (guarded) {
    return guarded;
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL');

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
        available: false,
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

    /*
     * Validation du numéro.
     */
    if (
      !isValidWhatsApp(
        whatsappNumber
      )
    ) {
      return json(
        {
          available: false,
          code:
            'INVALID_WHATSAPP_NUMBER',
          message:
            'Numéro WhatsApp invalide.',
        },
        400
      );
    }

    /*
     * Vérification du numéro dans les tables
     * réellement utilisées par l'architecture actuelle.
     */
    const results =
      await Promise.all(
        ACCOUNT_TABLES.map(
          async (table) => {
            const result =
              await service
                .from(table)
                .select('id')
                .eq(
                  'whatsapp_number',
                  whatsappNumber
                )
                .limit(1)
                .maybeSingle();

            return {
              table,
              ...result,
            };
          }
        )
      );

    /*
     * Une erreur de base de données sur une table
     * existante doit être remontée proprement.
     */
    const firstError =
      results.find(
        (result) =>
          result.error
      );

    if (firstError) {
      console.error(
        '[check-availability] lookup failed:',
        {
          table:
            firstError.table,
          error:
            firstError.error,
        }
      );

      return json(
        {
          available: false,
          code:
            'AVAILABILITY_CHECK_FAILED',
          message:
            'Impossible de vérifier la disponibilité du numéro.',
        },
        500
      );
    }

    /*
     * Le numéro existe-t-il déjà ?
     */
    const exists =
      results.some(
        (result) =>
          Boolean(result.data)
      );

    /*
     * Réponse normale.
     */
    return json({
      available: !exists,
      whatsappNumber,
    });

  } catch (error) {
    console.error(
      '[check-availability]',
      error
    );

    return json(
      {
        available: false,
        code:
          'AVAILABILITY_CHECK_FAILED',
        message:
          'Impossible de vérifier la disponibilité du numéro.',
      },
      500
    );
  }
});

