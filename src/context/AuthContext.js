
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';

import {
  signIn as signInService,
  signOut as signOutService,
} from '../services/authService';

const AuthContext = createContext(null);

export const ACCOUNT_TYPES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  PARTNER: 'partner',
  KMERDIASPORA_ADMIN: 'kmerdiaspora_admin',
});

const STORAGE_ACCOUNT_TYPE = '@zender237/account_type';
const STORAGE_ACCOUNT_ID = '@zender237/account_id';
const STORAGE_ROLES = '@zender237/account_roles';
const STORAGE_PERMISSIONS = '@zender237/account_permissions';

function normalizeRoleCode(role) {
  if (!role) return '';

  if (typeof role === 'string') {
    return role.trim().toLowerCase();
  }

  return String(
    role.code ||
      role.label ||
      ''
  )
    .trim()
    .toLowerCase();
}

export function AuthProvider({ children }) {
  const [session, setSession] =
    useState(null);

  const [accountType, setAccountType] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [partner, setPartner] =
    useState(null);

  const [accountId, setAccountId] =
    useState(null);

  const [roles, setRoles] =
    useState([]);

  const [permissions, setPermissions] =
    useState([]);

  const [accountActive, setAccountActive] =
    useState(true);

  const [initializing, setInitializing] =
    useState(true);

  const [signingIn, setSigningIn] =
    useState(false);

  const [authError, setAuthError] =
    useState(null);


  const loadProfile =
    useCallback(
      async (
        userId,
        type
      ) => {
        if (
          !userId ||
          type !==
            ACCOUNT_TYPES.USER
        ) {
          setProfile(null);
          return null;
        }

        const {
          data,
          error,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            whatsapp_number,
            country,
            rank_code,
            rank_updated_at,
            created_at
          `)
          .eq(
            'id',
            userId
          )
          .maybeSingle();

        if (error) {
          console.error(
            '[AuthContext] profile loading failed:',
            error
          );

          setProfile(null);
          return null;
        }

        setProfile(
          data || null
        );

        return data || null;
      },
      []
    );


  const loadPartner =
    useCallback(
      async (
        userId,
        type
      ) => {
        if (
          !userId ||
          type !==
            ACCOUNT_TYPES.PARTNER
        ) {
          setPartner(null);
          return null;
        }

        const {
          data,
          error,
        } = await supabase
          .from('partners')
          .select('*')
          .eq(
            'auth_user_id',
            userId
          )
          .maybeSingle();

        if (error) {
          console.error(
            '[AuthContext] partner loading failed:',
            error
          );

          setPartner(null);
          return null;
        }

        setPartner(
          data || null
        );

        setAccountActive(
          data?.active !== false
        );

        return data || null;
      },
      []
    );


  const refreshProfile =
    useCallback(
      async () => {
        const userId =
          session?.user?.id;

        if (
          !userId ||
          accountType !==
            ACCOUNT_TYPES.USER
        ) {
          setProfile(null);
          return null;
        }

        return loadProfile(
          userId,
          accountType
        );
      },
      [
        session,
        accountType,
        loadProfile,
      ]
    );


  const refreshPartner =
    useCallback(
      async () => {
        const userId =
          session?.user?.id;

        if (
          !userId ||
          accountType !==
            ACCOUNT_TYPES.PARTNER
        ) {
          setPartner(null);
          return null;
        }

        return loadPartner(
          userId,
          accountType
        );
      },
      [
        session,
        accountType,
        loadPartner,
      ]
    );


  const restoreRole =
    useCallback(
      async () => {
        try {
          const [
            savedType,
            savedId,
            savedRoles,
            savedPermissions,
          ] =
            await Promise.all([
              AsyncStorage.getItem(
                STORAGE_ACCOUNT_TYPE
              ),
              AsyncStorage.getItem(
                STORAGE_ACCOUNT_ID
              ),
              AsyncStorage.getItem(
                STORAGE_ROLES
              ),
              AsyncStorage.getItem(
                STORAGE_PERMISSIONS
              ),
            ]);

          setAccountType(
            savedType || null
          );

          setAccountId(
            savedId || null
          );


          try {
            const parsed =
              savedRoles
                ? JSON.parse(
                    savedRoles
                  )
                : [];

            setRoles(
              Array.isArray(
                parsed
              )
                ? parsed
                : []
            );
          } catch {
            setRoles([]);
          }


          try {
            const parsed =
              savedPermissions
                ? JSON.parse(
                    savedPermissions
                  )
                : [];

            setPermissions(
              Array.isArray(
                parsed
              )
                ? parsed
                : []
            );
          } catch {
            setPermissions([]);
          }

        } catch (error) {
          console.error(
            '[AuthContext] restore failed:',
            error
          );

          setAccountType(null);
          setAccountId(null);
          setRoles([]);
          setPermissions([]);
        }
      },
      []
    );


  const persistRole =
    useCallback(
      async ({
        type,
        id,
        roles:
          nextRoles,
        permissions:
          nextPermissions,
      }) => {

        await Promise.all([
          AsyncStorage.setItem(
            STORAGE_ACCOUNT_TYPE,
            type || ''
          ),

          AsyncStorage.setItem(
            STORAGE_ACCOUNT_ID,
            id || ''
          ),

          AsyncStorage.setItem(
            STORAGE_ROLES,
            JSON.stringify(
              nextRoles || []
            )
          ),

          AsyncStorage.setItem(
            STORAGE_PERMISSIONS,
            JSON.stringify(
              nextPermissions || []
            )
          ),
        ]);
      },
      []
    );


  const clearRole =
    useCallback(
      async () => {
        setAccountType(null);
        setAccountId(null);
        setRoles([]);
        setPermissions([]);
        setProfile(null);
        setPartner(null);
        setAccountActive(true);
        setAuthError(null);

        try {
          await AsyncStorage.multiRemove([
            STORAGE_ACCOUNT_TYPE,
            STORAGE_ACCOUNT_ID,
            STORAGE_ROLES,
            STORAGE_PERMISSIONS,
          ]);
        } catch (error) {
          console.warn(
            '[AuthContext] storage cleanup failed:',
            error
          );
        }
      },
      []
    );


  useEffect(
    () => {
      let mounted = true;

      const initialize =
        async () => {
          try {
            await restoreRole();

            const {
              data,
              error,
            } =
              await supabase.auth.getSession();

            if (error) {
              throw error;
            }

            if (!mounted) {
              return;
            }

            const currentSession =
              data?.session ||
              null;

            setSession(
              currentSession
            );

            if (
              currentSession?.user
            ) {
              const savedType =
                await AsyncStorage.getItem(
                  STORAGE_ACCOUNT_TYPE
                );

              if (
                savedType ===
                ACCOUNT_TYPES.USER
              ) {
                await loadProfile(
                  currentSession.user.id,
                  savedType
                );

                setPartner(null);

              } else if (
                savedType ===
                ACCOUNT_TYPES.PARTNER
              ) {
                setProfile(null);

                const loadedPartner =
                  await loadPartner(
                    currentSession.user.id,
                    savedType
                  );

                if (
                  loadedPartner?.active === false
                ) {
                  await clearRole();
                }

              } else {
                setProfile(null);
                setPartner(null);
              }

            } else {
              setProfile(null);
              setPartner(null);

              await clearRole();
            }

          } catch (error) {
            console.error(
              '[AuthContext] initialization failed:',
              error
            );

            setSession(null);
            setProfile(null);
            setPartner(null);

          } finally {
            if (mounted) {
              setInitializing(false);
            }
          }
        };

      initialize();

      const {
        data: listener,
      } =
        supabase.auth.onAuthStateChange(
          (
            _event,
            nextSession
          ) => {
            setSession(
              nextSession || null
            );

            if (!nextSession) {
              void clearRole();
            }
          }
        );

      return () => {
        mounted = false;

        listener?.subscription?.unsubscribe();
      };
    },
    [
      restoreRole,
      clearRole,
      loadProfile,
      loadPartner,
    ]
  );


  const signIn =
    useCallback(
      async ({
        whatsappNumber,
        secretCode,
      }) => {

        setSigningIn(true);
        setAuthError(null);

        try {
          const result =
            await signInService({
              whatsappNumber,
              secretCode,
            });

          if (
            !result?.session
          ) {
            throw new Error(
              'La session n’a pas été créée.'
            );
          }

          const supported =
            Object.values(
              ACCOUNT_TYPES
            );

          if (
            !supported.includes(
              result.accountType
            )
          ) {
            throw new Error(
              'Type de compte invalide.'
            );
          }

          const nextRoles =
            Array.isArray(
              result.roles
            )
              ? result.roles
              : [];

          const nextPermissions =
            Array.isArray(
              result.permissions
            )
              ? result.permissions
              : [];

          const authUserId =
            result.authUserId ||
            result.session?.user?.id;

          setSession(
            result.session
          );

          setAccountType(
            result.accountType
          );

          setAccountId(
            result.accountId ||
              null
          );

          setRoles(
            nextRoles
          );

          setPermissions(
            nextPermissions
          );

          setAccountActive(
            result.active !== false
          );


          if (
            result.accountType ===
            ACCOUNT_TYPES.USER
          ) {
            setPartner(null);

            await loadProfile(
              authUserId,
              result.accountType
            );

          } else if (
            result.accountType ===
            ACCOUNT_TYPES.PARTNER
          ) {
            setProfile(null);

            const loadedPartner =
              await loadPartner(
                authUserId,
                result.accountType
              );

            if (!loadedPartner) {
              throw new Error(
                'Compte partenaire introuvable dans la base de données.'
              );
            }

            if (
              loadedPartner.active ===
              false
            ) {
              throw new Error(
                'Ce compte partenaire est désactivé.'
              );
            }

          } else {
            setProfile(null);
            setPartner(null);
          }


          await persistRole({
            type:
              result.accountType,

            id:
              result.accountId,

            roles:
              nextRoles,

            permissions:
              nextPermissions,
          });

          return result;

        } catch (error) {
          setAuthError(error);
          throw error;

        } finally {
          setSigningIn(false);
        }
      },
      [
        loadProfile,
        loadPartner,
        persistRole,
      ]
    );


  const logout =
    useCallback(
      async () => {
        try {
          await signOutService();

        } finally {
          setSession(null);
          await clearRole();
        }
      },
      [clearRole]
    );


  const roleCodes =
    useMemo(
      () =>
        roles
          .map(
            normalizeRoleCode
          )
          .filter(Boolean),
      [roles]
    );


  const hasRole =
    useCallback(
      (roleCode) =>
        roleCodes.includes(
          String(
            roleCode || ''
          )
            .trim()
            .toLowerCase()
        ),
      [roleCodes]
    );


  const isPartnerAdmin =
    accountType ===
      ACCOUNT_TYPES.PARTNER &&
    hasRole('admin');


  const isPartnerOperator =
    accountType ===
      ACCOUNT_TYPES.PARTNER &&
    hasRole('partner');


  const isPartnerKmerDiaspora =
    accountType ===
      ACCOUNT_TYPES.PARTNER &&
    hasRole('kmerdiaspora');


  const value =
    useMemo(
      () => ({
        session,

        user:
          session?.user ||
          null,

        profile,

        partner,

        refreshProfile,

        refreshPartner,

        isAuthenticated:
          !!session,

        accountType,

        accountId,

        roles,

        roleCodes,

        permissions,

        accountActive,

        hasRole,

        isUser:
          accountType ===
          ACCOUNT_TYPES.USER,

        isAdmin:
          accountType ===
          ACCOUNT_TYPES.ADMIN,

        isPartner:
          accountType ===
          ACCOUNT_TYPES.PARTNER,

        isKmerDiasporaAdmin:
          accountType ===
          ACCOUNT_TYPES.KMERDIASPORA_ADMIN,

        isPartnerAdmin,

        isPartnerOperator,

        isPartnerKmerDiaspora,

        initializing,

        signingIn,

        authError,

        signIn,

        logout,

        clearRole,
      }),
      [
        session,
        profile,
        partner,
        refreshProfile,
        refreshPartner,
        accountType,
        accountId,
        roles,
        roleCodes,
        permissions,
        accountActive,
        hasRole,
        initializing,
        signingIn,
        authError,
        signIn,
        logout,
        clearRole,
        isPartnerAdmin,
        isPartnerOperator,
        isPartnerKmerDiaspora,
      ]
    );


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth doit être utilisé dans un <AuthProvider>'
    );
  }

  return context;
}
