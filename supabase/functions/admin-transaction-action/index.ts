import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ACTIONS = new Set([
  'approve',
  'reject',
  'cancel',
]);

const ACTIVE_STATUSES = new Set([
  'pending_proof',
  'under_review',
]);

function json(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    }
  );
}

function getBearerToken(
  req
) {
  const header =
    req.headers.get(
      'Authorization'
    ) || '';

  if (
    !header
      .toLowerCase()
      .startsWith(
        'bearer '
      )
  ) {
    return null;
  }

  return (
    header
      .slice(7)
      .trim() || null
  );
}

Deno.serve(
  async (
    req
  ) => {
    if (
      req.method !==
      'POST'
    ) {
      return json(
        {
          success:
            false,

          code:
            'METHOD_NOT_ALLOWED',

          message:
            'Méthode non autorisée.',
        },
        405
      );
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
          success:
            false,

          code:
            'SERVER_CONFIGURATION_ERROR',

          message:
            'Configuration Supabase serveur invalide.',
        },
        500
      );
    }

    const token =
      getBearerToken(
        req
      );

    if (!token) {
      return json(
        {
          success:
            false,

          code:
            'UNAUTHORIZED',

          message:
            'Authentification requise.',
        },
        401
      );
    }

    const service =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    try {
      const {
        data:
          authData,
        error:
          authError,
      } =
        await service.auth.getUser(
          token
        );

      if (
        authError ||
        !authData?.user
      ) {
        return json(
          {
            success:
              false,

            code:
              'UNAUTHORIZED',

            message:
              'Session utilisateur invalide ou expirée.',
          },
          401
        );
      }

      const {
        data:
          admin,
        error:
          adminError,
      } =
        await service
          .from('admins')
          .select(
            'id, full_name, active'
          )
          .eq(
            'auth_user_id',
            authData.user.id
          )
          .maybeSingle();

      if (
        adminError
      ) {
        console.error(
          '[admin-transaction-action] admin lookup:',
          adminError
        );

        return json(
          {
            success:
              false,

            code:
              'DATABASE_ERROR',

            message:
              'Impossible de vérifier les droits administrateur.',
          },
          500
        );
      }

      if (!admin) {
        return json(
          {
            success:
              false,

            code:
              'ADMIN_ACCOUNT_NOT_FOUND',

            message:
              'Compte administrateur introuvable.',
          },
          403
        );
      }

      if (
        admin.active ===
        false
      ) {
        return json(
          {
            success:
              false,

            code:
              'ACCOUNT_DISABLED',

            message:
              'Compte administrateur désactivé.',
          },
          403
        );
      }

      const body =
        await req
          .json()
          .catch(
            () =>
              null
          );

      const transactionId =
        String(
          body?.transactionId ||
            ''
        ).trim();

      const action =
        String(
          body?.action ||
            ''
        )
          .trim()
          .toLowerCase();

      const reason =
        body?.reason
          ? String(
              body.reason
            ).trim()
          : null;

      if (
        !transactionId
      ) {
        return json(
          {
            success:
              false,

            code:
              'TRANSACTION_ID_REQUIRED',

            message:
              'transactionId est requis.',
          },
          400
        );
      }

      if (
        !ALLOWED_ACTIONS.has(
          action
        )
      ) {
        return json(
          {
            success:
              false,

            code:
              'INVALID_ACTION',

            message:
              'Action de transaction invalide.',
          },
          400
        );
      }

      if (
        (
          action ===
            'reject' ||
          action ===
            'cancel'
        ) &&
        !reason
      ) {
        return json(
          {
            success:
              false,

            code:
              'REASON_REQUIRED',

            message:
              'Un motif est requis pour cette action.',
          },
          400
        );
      }

      const {
        data:
          transaction,
        error:
          transactionError,
      } =
        await service
          .from('transactions')
          .select(`
            id,
            type,
            status,
            workflow_stage,
            user_id,
            amount,
            fee_amount,
            partner_id,
            admin_id,
            created_at,
            first_reviewed_at,
            executed_at,
            settled_at,
            confirmed_at,
            rejected_at,
            cancelled_at,
            last_action_at
          `)
          .eq(
            'id',
            transactionId
          )
          .maybeSingle();

      if (
        transactionError
      ) {
        console.error(
          '[admin-transaction-action] transaction lookup:',
          transactionError
        );

        return json(
          {
            success:
              false,

            code:
              'DATABASE_ERROR',

            message:
              'Impossible de charger la transaction.',
          },
          500
        );
      }

      if (
        !transaction
      ) {
        return json(
          {
            success:
              false,

            code:
              'TRANSACTION_NOT_FOUND',

            message:
              'Transaction introuvable.',
          },
          404
        );
      }

      if (
        !ACTIVE_STATUSES.has(
          transaction.status
        )
      ) {
        return json(
          {
            success:
              false,

            code:
              'INVALID_TRANSACTION_STATUS',

            message:
              `Cette transaction ne peut plus être ${action === 'approve' ? 'confirmée' : action === 'reject' ? 'rejetée' : 'annulée'} depuis son statut actuel (${transaction.status}).`,
          },
          409
        );
      }

      /*
       * IMPORTANT :
       * La preuve d'exécution est désormais FACULTATIVE.
       *
       * Une transaction peut donc être confirmée même si aucune
       * ligne n'existe dans `transaction_execution_proofs`.
       */

      const now =
        new Date().toISOString();

      const updatePayload = {
        status:
          action ===
          'approve'
            ? 'confirmed'
            : action ===
                'reject'
              ? 'rejected'
              : 'cancelled',

        admin_id:
          admin.id,

        last_action_at:
          now,

        ...(action ===
        'approve'
          ? {
              confirmed_at:
                now,

              settled_at:
                now,

              first_reviewed_at:
                transaction.first_reviewed_at ||
                now,
            }
          : {}),

        ...(action ===
        'reject'
          ? {
              rejected_at:
                now,

              rejection_reason:
                reason,

              first_reviewed_at:
                transaction.first_reviewed_at ||
                now,
            }
          : {}),

        ...(action ===
        'cancel'
          ? {
              cancelled_at:
                now,

              rejection_reason:
                reason,
            }
          : {}),
      };

      const {
        data:
          updatedTransaction,
        error:
          updateError,
      } =
        await service
          .from('transactions')
          .update(
            updatePayload
          )
          .eq(
            'id',
            transactionId
          )
          .eq(
            'status',
            transaction.status
          )
          .select('*')
          .maybeSingle();

      if (
        updateError
      ) {
        console.error(
          '[admin-transaction-action] transaction update:',
          updateError
        );

        return json(
          {
            success:
              false,

            code:
              'TRANSACTION_UPDATE_FAILED',

            message:
              updateError.message ||
              'Impossible de mettre à jour la transaction.',
          },
          500
        );
      }

      if (
        !updatedTransaction
      ) {
        return json(
          {
            success:
              false,

            code:
              'TRANSACTION_ALREADY_CHANGED',

            message:
              'La transaction a été modifiée par une autre opération. Rechargez la page.',
          },
          409
        );
      }

      const reviewDecision =
        action ===
        'approve'
          ? 'approve'
          : action ===
              'reject'
            ? 'reject'
            : 'cancel';

      const {
        error:
          reviewError,
      } =
        await service
          .from(
            'transaction_reviews'
          )
          .insert({
            transaction_id:
              transactionId,

            admin_id:
              admin.id,

            decision:
              reviewDecision,

            reason,

            proof_url:
              null,

            metadata: {
              source:
                'admin_backoffice',

              action,
            },
          });

      if (
        reviewError
      ) {
        console.error(
          '[admin-transaction-action] review insert:',
          reviewError
        );

        await service
          .from('transactions')
          .update({
            status:
              transaction.status,

            admin_id:
              transaction.admin_id,

            confirmed_at:
              transaction.confirmed_at,

            rejected_at:
              transaction.rejected_at,

            cancelled_at:
              transaction.cancelled_at,

            rejection_reason:
              null,

            first_reviewed_at:
              transaction.first_reviewed_at,

            settled_at:
              transaction.settled_at,

            last_action_at:
              transaction.last_action_at,
          })
          .eq(
            'id',
            transactionId
          );

        return json(
          {
            success:
              false,

            code:
              'REVIEW_RECORD_FAILED',

            message:
              'La décision n’a pas pu être enregistrée.',
          },
          500
        );
      }

      const {
        error:
          historyError,
      } =
        await service
          .from(
            'transaction_status_history'
          )
          .insert({
            transaction_id:
              transactionId,

            previous_status:
              transaction.status,

            new_status:
              updatedTransaction.status,

            previous_stage:
              transaction.workflow_stage ||
              null,

            new_stage:
              updatedTransaction.workflow_stage ||
              null,

            changed_by_admin_id:
              admin.id,

            reason,

            metadata: {
              source:
                'admin_backoffice',

              action,
            },
          });

      if (
        historyError
      ) {
        console.error(
          '[admin-transaction-action] status history insert:',
          historyError
        );

        /*
         * La transaction et la review restent valides ;
         * l'historique est secondaire.
         */
      }

      return json({
        success:
          true,

        action,

        transaction:
          updatedTransaction,

        message:
          action ===
          'approve'
            ? 'Transaction confirmée avec succès.'
            : action ===
                'reject'
              ? 'Transaction rejetée avec succès.'
              : 'Transaction annulée avec succès.',
      });
    } catch (
      error
    ) {
      console.error(
        '[admin-transaction-action] unexpected error:',
        error
      );

      return json(
        {
          success:
            false,

          code:
            'ADMIN_TRANSACTION_ACTION_FAILED',

          message:
            error instanceof
            Error
              ? error.message
              : 'Impossible de traiter la transaction.',
        },
        500
      );
    }
  }
);