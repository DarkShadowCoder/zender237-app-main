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
  ACCOUNT_TYPES,
} from './AuthContext';

import * as Notifications from 'expo-notifications';

import {
  listNotifications,
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  registerForPushNotifications,
} from '../services/notificationService';


const NotificationContext =
  createContext(null);


function mergeById(items) {
  const map = new Map();

  for (const item of items || []) {
    if (!item?.id) {
      continue;
    }

    map.set(
      item.id,
      item
    );
  }

  return Array.from(
    map.values()
  ).sort(
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
    isUser,
    accountType,
    accountId,
  } = useAuth();

  const [
    items,
    setItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const pushTokenRef =
    useRef(null);

  /*
   * Les push demandés ici concernent les administrateurs.
   * Les partenaires/KmAdministrateurs peuvent réutiliser le même
   * service plus tard sans modifier le mécanisme serveur.
   */
  const isAdminAccount =
    accountType ===
    ACCOUNT_TYPES.ADMIN;


  const refresh = useCallback(
    async () => {
      if (
        !user?.id ||
        !isUser
      ) {
        setItems([]);
        setError(null);
        return [];
      }

      setLoading(true);

      try {
        const data =
          await listNotifications({
            userId: user.id,
            limit: 100,
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
      user?.id,
      isUser,
    ]
  );


  const prepend = useCallback(
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


  const markRead = useCallback(
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


  const markAllRead = useCallback(
    async () => {
      if (
        !user?.id ||
        !isUser
      ) {
        return;
      }

      await markAllNotificationsRead(
        user.id
      );

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
      user?.id,
      isUser,
    ]
  );


  /* ----------------------------------------------------------
   * Push token ADMIN
   * ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    const register =
      async () => {
        if (
          !isAdminAccount ||
          !user?.id ||
          !accountId
        ) {
          pushTokenRef.current =
            null;
          return;
        }

        try {
          const token =
            await registerForPushNotifications({
              accountType,
              accountId,
              authUserId:
                user.id,
            });

          if (!cancelled) {
            pushTokenRef.current =
              token || null;
          }
        } catch (err) {
          console.warn(
            '[NotificationContext] admin push registration failed:',
            err?.message || err
          );
        }
      };

    register();

    return () => {
      cancelled = true;
    };
  }, [
    isAdminAccount,
    accountType,
    accountId,
    user?.id,
  ]);


  /* ----------------------------------------------------------
   * In-app notifications for normal users
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (
      !user?.id ||
      !isUser
    ) {
      setItems([]);
      return undefined;
    }

    let active = true;

    const unsubscribe =
      subscribeToNotifications(
        user.id,
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
    user?.id,
    isUser,
    refresh,
    prepend,
  ]);


  /* ----------------------------------------------------------
   * Tap notification
   * ---------------------------------------------------------- */
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response?.notification
              ?.request
              ?.content
              ?.data;

          if (
            data?.transactionId
          ) {
            console.log(
              '[NotificationContext] transaction notification opened:',
              data.transactionId
            );
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, []);


  const unreadCount =
    useMemo(
      () =>
        items.reduce(
          (count, item) =>
            count +
            (item.read_at
              ? 0
              : 1),
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
