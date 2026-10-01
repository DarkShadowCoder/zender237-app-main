/**
 * Notifications in-app + notifications push Expo.
 *
 * Les notifications métier sont créées côté PostgreSQL dans
 * `notifications_log`.
 *
 * Un token push peut appartenir à :
 *
 * - user
 * - admin
 * - partner
 * - kmerdiaspora_admin
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  supabase,
} from '../lib/supabase';


export const TRANSACTION_NOTIFICATION_CHANNEL =
  'transactions';

export const GENERAL_NOTIFICATION_CHANNEL =
  'default';


Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldShowAlert:
        true,

      shouldPlaySound:
        true,

      shouldSetBadge:
        false,
    }),
});


function getExpoProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
}


export async function configureNotificationChannels() {
  if (
    Platform.OS !==
    'android'
  ) {
    return;
  }


  await Notifications.setNotificationChannelAsync(
    TRANSACTION_NOTIFICATION_CHANNEL,
    {
      name:
        'Transactions',

      description:
        'Notifications concernant les dépôts, transferts, retraits et leur traitement.',

      importance:
        Notifications.AndroidImportance.MAX,

      vibrationPattern:
        [
          0,
          250,
          250,
          250,
        ],

      sound:
        'default',

      enableVibrate:
        true,

      enableLights:
        true,
    }
  );


  await Notifications.setNotificationChannelAsync(
    GENERAL_NOTIFICATION_CHANNEL,
    {
      name:
        'Notifications Zender237',

      description:
        'Notifications générales de Zender237 et KmerDiaspora.',

      importance:
        Notifications.AndroidImportance.DEFAULT,

      vibrationPattern:
        [
          0,
          200,
        ],

      sound:
        'default',
    }
  );
}


/**
 * Enregistre le token Expo Push
 * pour le compte authentifié.
 */
export async function registerForPushNotifications({
  accountType,
  accountId,
  authUserId,
}) {
  if (
    !Device.isDevice ||
    !authUserId ||
    !accountType
  ) {
    return null;
  }


  await configureNotificationChannels();


  const {
    status:
      existingStatus,
  } =
    await Notifications.getPermissionsAsync();


  let finalStatus =
    existingStatus;


  if (
    existingStatus !==
    'granted'
  ) {
    const {
      status,
    } =
      await Notifications.requestPermissionsAsync();

    finalStatus =
      status;
  }


  if (
    finalStatus !==
    'granted'
  ) {
    const error =
      new Error(
        'Permission de notification refusée sur cet appareil.'
      );

    error.code =
      'PUSH_PERMISSION_DENIED';

    throw error;
  }


  const projectId =
    getExpoProjectId();


  if (!projectId) {
    const error =
      new Error(
        'Project ID Expo/EAS introuvable. Vérifiez extra.eas.projectId dans app.json.'
      );

    error.code =
      'EXPO_PROJECT_ID_MISSING';

    throw error;
  }


  let token;


  try {
    token =
      (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

  } catch (error) {
    const wrapped =
      new Error(
        error?.message ||
        'Impossible d’obtenir le token Expo Push.'
      );

    wrapped.code =
      error?.code ||
      'EXPO_PUSH_TOKEN_FAILED';

    throw wrapped;
  }


  if (!token) {
    throw new Error(
      'Impossible d’obtenir le token Expo Push.'
    );
  }


  await savePushToken({
    expoPushToken:
      token,

    accountType,

    accountId,

    authUserId,
  });


  return token;
}


/**
 * Persiste le token via une RPC SECURITY DEFINER.
 */
export async function savePushToken({
  expoPushToken,
  accountType,
  accountId,
  authUserId,
}) {
  if (
    !expoPushToken ||
    !authUserId ||
    !accountType
  ) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'register_push_token',
      {
        p_expo_push_token:
          expoPushToken,

        p_account_type:
          accountType,

        p_account_id:
          accountId ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data ||
    null;
}


/**
 * Désactive le token courant.
 */
export async function unregisterCurrentPushToken(
  expoPushToken
) {
  if (!expoPushToken) {
    return;
  }


  const {
    error,
  } =
    await supabase.rpc(
      'unregister_push_token',
      {
        p_expo_push_token:
          expoPushToken,
      }
    );


  if (error) {
    console.warn(
      '[notificationService] unregister token failed:',
      error
    );
  }
}


function getNotificationRecipientConfig({
  accountType,
  userId,
  accountId,
}) {
  switch (
    accountType
  ) {
    case 'admin':
      return {
        column:
          'admin_id',

        id:
          accountId,
      };

    case 'partner':
      return {
        column:
          'partner_id',

        id:
          accountId,
      };

    case 'kmerdiaspora_admin':
      return {
        column:
          'kmerdiaspora_admin_id',

        id:
          accountId,
      };

    case 'user':
    default:
      return {
        column:
          'user_id',

        id:
          userId ||
          accountId,
      };
  }
}


const NOTIFICATION_SELECT = `
  id,
  user_id,
  admin_id,
  partner_id,
  kmerdiaspora_admin_id,
  transaction_id,
  channel,
  title,
  message,
  sent_at,
  read_at,
  event_type,
  status,
  failure_reason,
  metadata,
  resource_type,
  resource_id
`;


export async function listNotifications({
  userId,
  accountType,
  accountId,
  limit = 100,
}) {
  const recipient =
    getNotificationRecipientConfig({
      accountType,
      userId,
      accountId,
    });


  if (
    !recipient?.id
  ) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'notifications_log'
      )
      .select(
        NOTIFICATION_SELECT
      )
      .eq(
        recipient.column,
        recipient.id
      )
      .order(
        'sent_at',
        {
          ascending:
            false,
        }
      )
      .limit(
        limit
      );


  if (error) {
    throw error;
  }


  return data ||
    [];
}


export function subscribeToNotifications(
  {
    userId,
    accountType,
    accountId,
  },
  onInsert
) {
  const recipient =
    getNotificationRecipientConfig({
      accountType,
      userId,
      accountId,
    });


  if (
    !recipient?.id
  ) {
    return () => {};
  }


  const channel =
    supabase
      .channel(
        `notifications-${recipient.column}-${recipient.id}`
      )
      .on(
        'postgres_changes',
        {
          event:
            'INSERT',

          schema:
            'public',

          table:
            'notifications_log',

          filter:
            `${recipient.column}=eq.${recipient.id}`,
        },

        (payload) => {
          if (
            payload?.new
          ) {
            onInsert?.(
              payload.new
            );
          }
        }
      )
      .subscribe();


  return () => {
    supabase.removeChannel(
      channel
    );
  };
}


export async function markNotificationRead(
  notificationId
) {
  if (!notificationId) {
    return;
  }


  const {
    error,
  } =
    await supabase
      .from(
        'notifications_log'
      )
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        notificationId
      );


  if (error) {
    throw error;
  }
}


export async function markAllNotificationsRead({
  userId,
  accountType,
  accountId,
}) {
  const recipient =
    getNotificationRecipientConfig({
      accountType,
      userId,
      accountId,
    });


  if (
    !recipient?.id
  ) {
    return;
  }


  const {
    error,
  } =
    await supabase
      .from(
        'notifications_log'
      )
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        recipient.column,
        recipient.id
      )
      .is(
        'read_at',
        null
      );


  if (error) {
    throw error;
  }
}