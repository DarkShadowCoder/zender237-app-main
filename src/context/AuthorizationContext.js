import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import {
  useAuth,
} from './AuthContext';


const AuthorizationContext =
  createContext(null);


function has(
  permissions = [],
  permission
) {
  return (
    permissions.includes('*') ||
    permissions.includes(
      permission
    )
  );
}


function any(
  permissions = [],
  list = []
) {
  return (
    permissions.includes('*') ||
    list.some(
      (permission) =>
        permissions.includes(
          permission
        )
    )
  );
}


export function AuthorizationProvider({
  children,
}) {

  const {
    accountType,
    permissions,

    isAuthenticated,

    isAdmin,
    isPartner,
    isKmerDiasporaAdmin,
    isUser,

    isPartnerAdmin,
    isPartnerOperator,
    isPartnerKmerDiaspora,

    hasRole,
  } = useAuth();


  const can =
    useCallback(
      (permission) =>
        has(
          permissions,
          permission
        ),
      [permissions]
    );


  const api =
    useMemo(
      () => ({

        permissions,

        can,

        hasRole,


        /* ==================================================
         * ROLE PARTNER
         * ================================================== */

        isPartnerAdmin:
          () =>
            !!isPartnerAdmin,

        isPartnerOperator:
          () =>
            !!isPartnerOperator,

        isPartnerKmerDiaspora:
          () =>
            !!isPartnerKmerDiaspora,


        /* ==================================================
         * NAVIGATION
         * ================================================== */

        canAccessUserApp:
          () =>
            !!isAuthenticated &&
            accountType ===
              'user',

        canAccessAdminApp:
          () =>
            !!isAuthenticated &&
            isAdmin,

        canAccessPartnerApp:
          () =>
            !!isAuthenticated &&
            isPartner,

        canAccessKmaApp:
          () =>
            !!isAuthenticated &&
            isKmerDiasporaAdmin,


        /* ==================================================
         * SETTLEMENTS
         * ================================================== */

        canViewSettlements:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'bank.settlement.view'
            );
          },

        canExecuteSettlement:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'bank.settlement.execute'
            );
          },

        canCreateSettlement:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'bank.settlement.create'
            );
          },


        /* ==================================================
         * ADMIN
         * ================================================== */

        canViewAudit:
          () =>
            can(
              'audit.view'
            ),

        canManagePartners:
          () =>
            can(
              'partner.manage'
            ),

        canManageMomo:
          () =>
            can(
              'config.momo.manage'
            ),

        canManageTariffs:
          () =>
            can(
              'config.tariff.manage'
            ),

        canManageBatches:
          () =>
            can(
              'bank.batch.manage'
            ),


        /* ==================================================
         * TRANSACTIONS
         * ================================================== */

        canViewTransactions:
          () => {

            /*
             * Un compte partenaire qui possède le rôle
             * backoffice `partner` est autorisé à consulter
             * ses transactions affectées.
             *
             * Le rôle `partner` est volontairement distinct des
             * permissions d'administration : il ne donne pas, à
             * lui seul, les droits approve/reject/execute/cancel.
             */
            if (isPartner) {
              return (
                isPartnerAdmin ||
                isPartnerOperator ||
                hasRole('partner')
              );
            }

            return (
              isAdmin ||
              any(
                permissions,
                [
                  'transaction.view',
                  'transaction.review',
                  'transaction.approve',
                  'transaction.execute',
                  'transaction.assign',
                ]
              )
            );
          },


        canReviewTransaction:
          () => {

            if (
              isPartnerOperator &&
              !isPartnerAdmin
            ) {
              return true;
            }

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return any(
              permissions,
              [
                'transaction.review',
                'transaction.approve',
                'transaction.reject',
              ]
            );
          },


        canConfirmTransaction:
          () => {

            if (
              isPartnerAdmin
            ) {
              return true;
            }

            if (
              isPartnerOperator
            ) {
              return true;
            }

            return (
              can(
                'transaction.approve'
              ) ||
              can(
                'transaction.confirm'
              )
            );
          },


        canApproveTransaction:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'transaction.approve'
            );
          },


        canRejectTransaction:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'transaction.reject'
            );
          },


        canExecuteTransaction:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'transaction.execute'
            );
          },


        canCancelTransaction:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return (
              can(
                'transaction.cancel'
              ) ||
              isPartnerAdmin
            );
          },


        canAssignTransaction:
          () => {

            if (
              isPartner &&
              !isPartnerAdmin
            ) {
              return false;
            }

            return can(
              'transaction.assign'
            );
          },


        /* ==================================================
         * KMERDIASPORA
         * ================================================== */

        canViewKmerDiaspora:
          () => {

            if (isPartner) {
              return (
                isPartnerAdmin ||
                isPartnerKmerDiaspora
              );
            }

            return any(
              permissions,
              [
                'kmer.view',
                'kmer.job.manage',
                'kmer.driver.manage',
                'kmer.quest.view',
                'kmer.quest.manage_all',
              ]
            );
          },


        canManageKmerDiaspora:
          () => {

            // Aucun partenaire ne possède
            // de droits de modification KMA.
            if (isPartner) {
              return false;
            }

            return any(
              permissions,
              [
                'kmer.job.manage',
                'kmer.driver.manage',
                'kmer.quest.manage_all',
                'kmer.match',
                'kmer.moderate',
              ]
            );
          },


        canManageMatching:
          () => {

            if (isPartner) {
              return false;
            }

            return can(
              'kmer.match'
            );
          },


        canViewKdReports:
          () => {

            if (isPartner) {
              return (
                isPartnerAdmin ||
                isPartnerKmerDiaspora
              );
            }

            return can(
              'kmer.report'
            );
          },


        canModerateKmerDiaspora:
          () => {

            if (isPartner) {
              return false;
            }

            return can(
              'kmer.moderate'
            );
          },


        /* ==================================================
         * USER KMERDIASPORA
         * ================================================== */

        canCreateJobRequest:
          () =>
            isUser &&
            can(
              'kmer.job.create'
            ),

        canEditJobRequest:
          (resource) =>
            isUser &&
            can(
              'kmer.job.manage_own'
            ) &&
            !!resource,

        canCreateDriverRequest:
          () =>
            isUser &&
            can(
              'kmer.driver.create'
            ),

        canEditDriverRequest:
          (resource) =>
            isUser &&
            can(
              'kmer.driver.manage_own'
            ) &&
            !!resource,

        canCreateQuest:
          () =>
            isUser &&
            can(
              'kmer.quest.create'
            ),

        canEditQuest:
          (resource) =>
            isUser &&
            can(
              'kmer.quest.manage_own'
            ) &&
            !!resource,

        canContributeToQuest:
          () =>
            isUser &&
            can(
              'kmer.quest.contribute'
            ),

        canViewOwnContributions:
          () =>
            isUser &&
            can(
              'kmer.quest.contribution.view_own'
            ),

        canViewOwnMatches:
          () =>
            isUser &&
            can(
              'kmer.match.view_own'
            ),

        canCreateKdProfile:
          () =>
            isUser &&
            can(
              'kmer.profile.create'
            ),

        canEditKdProfile:
          () =>
            isUser &&
            can(
              'kmer.profile.update_own'
            ),

      }),
      [
        permissions,
        can,
        hasRole,

        accountType,

        isAuthenticated,

        isAdmin,
        isPartner,
        isKmerDiasporaAdmin,
        isUser,

        isPartnerAdmin,
        isPartnerOperator,
        isPartnerKmerDiaspora,
      ]
    );


  return (
    <AuthorizationContext.Provider
      value={api}
    >
      {children}
    </AuthorizationContext.Provider>
  );
}


export function useAuthorization() {

  const context =
    useContext(
      AuthorizationContext
    );

  if (!context) {
    throw new Error(
      'useAuthorization doit être utilisé dans un <AuthorizationProvider>'
    );
  }

  return context;
}