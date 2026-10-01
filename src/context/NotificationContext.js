import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useAuth,
} from './AuthContext';

import * as Notifications from 'expo-notifications';

import {
  listNotifications,
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  registerForPushNotifications,
  unregisterCurrentPushToken,
} from '../services/notificationService';


const NotificationContext =
  createContext(null);


function mergeById(items) {
  const map = new Map();

  for (const item of items || []) {
    if (!item?.id) {
      continue;
    }

    map.set(item.id, item);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(
        b.sent_at || 0
      ).getTime() -
      new Date(
        a.sent_at || 0
      ).getTime()
  );
}


export function NotificationProvider({
  children,
}) {
  const {
    user,
    accountType,
    accountId,
    isAuthenticated,
  } = useAuth();

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const pushTokenRef = useRef(null);

  const pushRegistrationKeyRef =
    useRef(null);


  const refresh = useCallback(
    async () => {
      if (
        !isAuthenticated ||
        !user?.id ||
        !accountType
      ) {
        setItems([]);
        setError(null);

        return [];
      }

      setLoading(true);

      try {
        const data =
          await listNotifications({
            userId:
              user.id,

            accountType,

            accountId,

            limit:
              100,
          });

        const next =
          mergeById(data);

        setItems(next);
        setError(null);

        return next;

      } catch (err) {
        console.error(
          '[NotificationContext] refresh failed:',
          err
        );

        setError(err);

        return [];

      } finally {
        setLoading(false);
      }
    },
    [
      isAuthenticated,
      user?.id,
      accountType,
      accountId,
    ]
  );


  const prepend =
    useCallback(
      (notification) => {
        setItems(
          (current) =>
            mergeById([
              notification,
              ...current,
            ])
        );
      },
      []
    );


  const markRead =
    useCallback(
      async (notificationId) => {
        if (!notificationId) {
          return;
        }

        await markNotificationRead(
          notificationId
        );

        setItems(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                notificationId
                  ? {
                      ...item,
                      read_at:
                        item.read_at ||
                        new Date().toISOString(),
                    }
                  : item
            )
        );
      },
      []
    );


  const markAllRead =
    useCallback(
      async () => {
        if (
          !isAuthenticated ||
          !user?.id ||
          !accountType
        ) {
          return;
        }

        await markAllNotificationsRead({
          userId:
            user.id,

          accountType,

          accountId,
        });

        const now =
          new Date().toISOString();

        setItems(
          (current) =>
            current.map(
              (item) => ({
                ...item,

                read_at:
                  item.read_at ||
                  now,
              })
            )
        );
      },
      [
        isAuthenticated,
        user?.id,
        accountType,
        accountId,
      ]
    );


  /*
   * ==========================================================
   * PUSH REGISTRATION - TOUS LES COMPTES
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    const register =
      async () => {
        if (
          !isAuthenticated ||
          !user?.id ||
          !accountType
        ) {
          pushTokenRef.current =
            null;

          pushRegistrationKeyRef.current =
            null;

          return;
        }

        const registrationKey =
          `${accountType}:${accountId || user.id}`;

        if (
          pushRegistrationKeyRef.current ===
          registrationKey
        ) {
          return;
        }

        try {
          const token =
            await registerForPushNotifications({
              accountType,

              accountId:
                accountId ||
                user.id,

              authUserId:
                user.id,
            });

          if (!cancelled) {
            pushTokenRef.current =
              token || null;

            pushRegistrationKeyRef.current =
              registrationKey;
          }

        } catch (err) {
          console.warn(
            `[NotificationContext] ${accountType} push registration failed:`,
            err?.message || err
          );
        }
      };

    register();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    accountType,
    accountId,
    user?.id,
  ]);


  /*
   * ==========================================================
   * TOKEN ROTATION
   * ==========================================================
   */

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user?.id ||
      !accountType
    ) {
      return undefined;
    }

    const subscription =
      Notifications.addPushTokenListener(
        async () => {
          try {
            const nextToken =
              await registerForPushNotifications({
                accountType,

                accountId:
                  accountId ||
                  user.id,

                authUserId:
                  user.id,
              });

            pushTokenRef.current =
              nextToken || null;

          } catch (err) {
            console.warn(
              '[NotificationContext] token rotation failed:',
              err?.message || err
            );
          }
        }
      );

    return () => {
      subscription?.remove?.();
    };

  }, [
    isAuthenticated,
    accountType,
    accountId,
    user?.id,
  ]);


  /*
   * ==========================================================
   * IN-APP NOTIFICATIONS - TOUS LES COMPTES
   * ==========================================================
   */

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user?.id ||
      !accountType
    ) {
      setItems([]);

      return undefined;
    }

    let active = true;

    const unsubscribe =
      subscribeToNotifications(
        {
          userId:
            user.id,

          accountType,

          accountId,
        },

        (notification) => {
          if (active) {
            prepend(
              notification
            );
          }
        }
      );

    refresh().catch(() => {});

    return () => {
      active = false;

      unsubscribe?.();
    };

  }, [
    isAuthenticated,
    user?.id,
    accountType,
    accountId,
    refresh,
    prepend,
  ]);


  /*
   * ==========================================================
   * TAP D'UNE NOTIFICATION
   * ==========================================================
   */

  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response?.notification
              ?.request
              ?.content
              ?.data;

          if (!data) {
            return;
          }

          console.log(
            '[NotificationContext] notification opened:',
            data
          );
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);


  /*
   * ==========================================================
   * RESET LOCAL STATE ON LOGOUT
   * ==========================================================
   */

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const oldToken =
      pushTokenRef.current;

    pushTokenRef.current = null;

    pushRegistrationKeyRef.current =
      null;

    setItems([]);

    setError(null);

    if (oldToken) {
      unregisterCurrentPushToken(
        oldToken
      ).catch(() => {});
    }

  }, [
    isAuthenticated,
  ]);


  const unreadCount =
    useMemo(
      () =>
        items.reduce(
          (
            count,
            item
          ) =>
            count +
            (
              item.read_at
                ? 0
                : 1
            ),
          0
        ),

      [items]
    );


  const value =
    useMemo(
      () => ({
        items,

        loading,

        error,

        unreadCount,

        refresh,

        markRead,

        markAllRead,

        pushToken:
          pushTokenRef.current,
      }),

      [
        items,
        loading,
        error,
        unreadCount,
        refresh,
        markRead,
        markAllRead,
      ]
    );


  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}


export function useNotifications() {
  const context =
    useContext(
      NotificationContext
    );

  if (!context) {
    throw new Error(
      'useNotifications doit être utilisé dans un <NotificationProvider>'
    );
  }

  return context;
}