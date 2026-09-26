/**
 * Notifications in-app + notifications push Expo.
 *
 * Les notifications métier sont créées côté PostgreSQL dans
 * `notifications_log`. Une table `push_tokens` associe chaque
 * appareil à son compte (utilisateur, administrateur, partenaire
 * ou KmAdministrateur). PostgreSQL envoie ensuite le push à Expo.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';


export const TRANSACTION_NOTIFICATION_CHANNEL =
  'transactions';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    TRANSACTION_NOTIFICATION_CHANNEL,
    {
      name: 'Transactions',
      description:
        'Notifications concernant les dépôts, transferts et retraits.',
      importance:
        Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    }
  );

  await Notifications.setNotificationChannelAsync(
    'default',
    {
      name: 'Notifications Zender237',
      importance:
        Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      sound: 'default',
    }
  );
}


/**
 * Enregistre un token Expo Push pour le compte authentifié.
 *
 * accountType : user | admin | partner | kmerdiaspora_admin
 * accountId   : id dans la table métier correspondante
 * authUserId  : id de auth.users
 */
export async function registerForPushNotifications({
  accountType,
  accountId,
  authUserId,
}) {
  if (!Device.isDevice || !authUserId) {
    return null;
  }

  await configureNotificationChannels();

  const {
    status: existingStatus,
  } = await Notifications.getPermissionsAsync();

  let finalStatus =
    existingStatus;

  if (existingStatus !== 'granted') {
    const {
      status,
    } = await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    getExpoProjectId();

  if (!projectId) {
    const error = new Error(
      'Project ID Expo/EAS introuvable. Vérifiez extra.eas.projectId dans app.json.'
    );
    error.code =
      'EXPO_PROJECT_ID_MISSING';
    throw error;
  }

  const token =
    (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

  if (!token) {
    throw new Error(
      'Impossible d’obtenir le token Expo Push.'
    );
  }

  await savePushToken({
    expoPushToken: token,
    accountType,
    accountId,
    authUserId,
  });

  return token;
}


/**
 * Persiste le token via une RPC SECURITY DEFINER.
 * La RPC vérifie elle-même que accountId correspond bien
 * au compte de auth.uid().
 */
export async function savePushToken({
  expoPushToken,
  accountType,
  accountId,
  authUserId,
}) {
  if (!expoPushToken || !authUserId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'register_push_token',
    {
      p_expo_push_token:
        expoPushToken,
      p_account_type:
        accountType || null,
      p_account_id:
        accountId || null,
    }
  );

  if (error) {
    throw error;
  }

  return data || null;
}


/**
 * Désactive le token courant pour éviter qu'un appareil partagé
 * continue à recevoir les notifications de l'ancien compte.
 */
export async function unregisterCurrentPushToken(
  expoPushToken
) {
  if (!expoPushToken) {
    return;
  }

  const {
    error,
  } = await supabase.rpc(
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


const NOTIFICATION_SELECT = `
  id,
  user_id,
  admin_id,
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
  limit = 100,
}) {
  if (!userId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('notifications_log')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .order('sent_at', {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}


export function subscribeToNotifications(
  userId,
  onInsert
) {
  if (!userId) {
    return () => {};
  }

  const channel =
    supabase
      .channel(
        `notifications-${userId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications_log',
          filter:
            `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload?.new) {
            onInsert(
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
  } = await supabase
    .from('notifications_log')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) {
    throw error;
  }
}


export async function markAllNotificationsRead(
  userId
) {
  if (!userId) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('notifications_log')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw error;
  }
}
