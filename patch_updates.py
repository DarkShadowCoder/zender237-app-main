from pathlib import Path
import json, re

root = Path('/mnt/data/zender237_work')

# 1) package.json
p = root / 'package.json'
data = json.loads(p.read_text())
data['dependencies']['expo-location'] = '~17.0.1'
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# 2) app.json
p = root / 'app.json'
data = json.loads(p.read_text())
plugins = data['expo'].get('plugins', [])
# remove pre-existing string entries if any
plugins = [x for x in plugins if x not in ('expo-notifications', 'expo-location')]
plugins.extend([
    [
        'expo-notifications',
        {
            'defaultChannel': 'transactions',
            'color': '#1F63F2',
        },
    ],
    [
        'expo-location',
        {
            'locationWhenInUsePermission': 'Zender237 utilise votre position uniquement pendant un transfert pour déterminer votre pays et appliquer le tarif correspondant.',
        },
    ],
])
data['expo']['plugins'] = plugins
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# 3) locationService.js
p = root / 'src/services/locationService.js'
p.write_text(r'''/**
 * Géolocalisation utilisée au démarrage d'un transfert.
 *
 * Le pays d'origine est déterminé à partir de la position actuelle
 * du téléphone, puis enregistré dans `profiles.country` via une RPC
 * SECURITY DEFINER. L'application limite cette fonctionnalité aux
 * trois pays pris en charge par Zender237 : Cameroun, Guinée et Mali.
 */

import * as Location from 'expo-location';

import { supabase } from '../lib/supabase';


const COUNTRY_BY_ISO = {
  CM: 'cameroun',
  GN: 'guinee',
  ML: 'mali',
};


const COUNTRY_ALIASES = {
  cameroun: 'cameroun',
  cameroon: 'cameroun',
  guinee: 'guinee',
  guinea: 'guinee',
  'guinée': 'guinee',
  mali: 'mali',
};


function normalizeCountryText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function buildLocationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}


/**
 * Détermine le pays à partir de la position actuelle.
 */
export async function detectCurrentCountry() {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw buildLocationError(
      'LOCATION_PERMISSION_REQUIRED',
      'La localisation est nécessaire pour déterminer votre pays de transfert. Autorisez l’accès à votre position puis réessayez.'
    );
  }

  let location = null;

  try {
    location = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 50000,
    });
  } catch (_) {
    location = null;
  }

  if (!location) {
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      throw buildLocationError(
        'LOCATION_UNAVAILABLE',
        error?.message ||
          'Impossible d’obtenir votre position actuelle.'
      );
    }
  }

  const latitude = location?.coords?.latitude;
  const longitude = location?.coords?.longitude;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw buildLocationError(
      'LOCATION_UNAVAILABLE',
      'La position actuelle du téléphone est invalide.'
    );
  }

  let addresses = [];

  try {
    addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
  } catch (error) {
    throw buildLocationError(
      'GEOCODING_FAILED',
      error?.message ||
        'Impossible de déterminer le pays à partir de votre position.'
    );
  }

  const address = addresses?.[0] || null;
  const isoCode = String(
    address?.countryCode || ''
  )
    .trim()
    .toUpperCase();

  let country =
    COUNTRY_BY_ISO[isoCode] || null;

  if (!country) {
    const normalizedCountry =
      normalizeCountryText(
        address?.country
      );

    country =
      COUNTRY_ALIASES[normalizedCountry] ||
      null;
  }

  if (!country) {
    throw buildLocationError(
      'LOCATION_COUNTRY_UNSUPPORTED',
      'Votre position actuelle se trouve en dehors des pays pris en charge (Cameroun, Guinée ou Mali).'
    );
  }

  return {
    country,
    countryCode: isoCode || null,
    latitude,
    longitude,
    city:
      address?.city ||
      address?.district ||
      address?.subregion ||
      null,
    region:
      address?.region ||
      null,
    accuracy:
      Number.isFinite(
        location?.coords?.accuracy
      )
        ? location.coords.accuracy
        : null,
  };
}


/**
 * Détecte puis enregistre le pays courant dans le profil utilisateur.
 */
export async function detectAndPersistCurrentCountry({
  userId,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const detected =
    await detectCurrentCountry();

  const {
    data,
    error,
  } = await supabase.rpc(
    'set_my_detected_country',
    {
      p_country:
        detected.country,
    }
  );

  if (error) {
    const rpcError = new Error(
      error.message ||
        'Impossible d’enregistrer votre pays de localisation.'
    );

    rpcError.code =
      error.code ||
      'COUNTRY_PERSIST_FAILED';

    throw rpcError;
  }

  return {
    ...detected,
    profile: data || null,
  };
}
''')

# 4) notificationService.js
p = root / 'src/services/notificationService.js'
p.write_text(r'''/**
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
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
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
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
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
''')

# 5) NotificationContext.js: replace full file
p = root / 'src/context/NotificationContext.js'
p.write_text(r'''import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth, ACCOUNT_TYPES } from './AuthContext';

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

    map.set(
      item.id,
      item
    );
  }

  return Array
    .from(map.values())
    .sort(
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

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const pushTokenRef =
    useRef(null);

  const staffAccount =
    accountType === ACCOUNT_TYPES.ADMIN ||
    accountType === ACCOUNT_TYPES.PARTNER ||
    accountType === ACCOUNT_TYPES.KMERDIASPORA_ADMIN;


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
      setItems((current) =>
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

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId
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

      setItems((current) =>
        current.map((item) => ({
          ...item,
          read_at:
            item.read_at || now,
        }))
      );
    },
    [
      user?.id,
      isUser,
    ]
  );


  /* ----------------------------------------------------------
   * Push token staff (admin / partner / KMA)
   * ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      if (
        !staffAccount ||
        !user?.id ||
        !accountId
      ) {
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
            token ||
            pushTokenRef.current;
        }
      } catch (err) {
        console.warn(
          '[NotificationContext] push registration failed:',
          err?.message || err
        );
      }
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [
    staffAccount,
    accountType,
    accountId,
    user?.id,
  ]);


  /* ----------------------------------------------------------
   * Clear token at logout/account switch while the old auth
   * session is still active. This avoids an old admin receiving
   * notifications on a shared device.
   * ---------------------------------------------------------- */
  useEffect(() => {
    return () => {};
  }, []);


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
            prepend(notification);
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
   * Notification response listener. No major frontend change:
   * the payload is logged and remains available for future deep link
   * navigation to a transaction screen.
   * ---------------------------------------------------------- */
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data =
            response?.notification?.request?.content?.data;

          if (data?.transactionId) {
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
            (item.read_at ? 0 : 1),
          0
        ),
      [items]
    );


  const value = useMemo(
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
      unregisterCurrentPushToken,
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
''')

# 6) transactionService.js patches
p = root / 'src/services/transactionService.js'
s = p.read_text()
# Patch createDeposit function signature/body up through transaction insert.
pattern = re.compile(r"export async function createDeposit\(\{.*?\n\}\n\n\n/\* ============================================================\n \* RETRAIT", re.S)
replacement = r'''export async function getMyDepositIdentity({
  userId,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'whatsapp_number, country'
    )
    .eq(
      'id',
      userId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.whatsapp_number) {
    throw new Error(
      'Le numéro WhatsApp associé à votre compte est introuvable.'
    );
  }

  const normalizedSenderPhone =
    normalizeInternationalPhone(
      data.whatsapp_number
    );

  const senderCountryCode =
    getCountryCodeFromPhone(
      normalizedSenderPhone
    );

  if (!senderCountryCode) {
    throw new Error(
      'Impossible de déterminer le pays du numéro WhatsApp associé à votre compte.'
    );
  }

  return {
    senderPhone:
      normalizedSenderPhone,
    senderCountry:
      data.country || null,
    senderCountryCode,
  };
}


export async function createDeposit({
  userId,
  amount,
  momoDepositNumberId,
}) {
  if (!userId) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  if (!momoDepositNumberId) {
    throw new Error(
      'Numéro Mobile Money sélectionné manquant.'
    );
  }

  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Le montant de la recharge doit être supérieur à zéro.'
    );
  }

  /*
   * Le numéro de l'expéditeur ne vient plus de l'interface.
   * Il provient exclusivement du profil associé à la session
   * authentifiée, donc du numéro utilisé avec le compte.
   */
  const identity =
    await getMyDepositIdentity({
      userId,
    });

  const normalizedSenderPhone =
    identity.senderPhone;

  const resolvedSenderCountryCode =
    identity.senderCountryCode;

  const {
    data: momoNumber,
    error: momoError,
  } = await supabase
    .from(
      'momo_deposit_numbers'
    )
    .select(
      `
        id,
        active,
        country_code,
        min_amount,
        max_amount,
        phone_number
      `
    )
    .eq(
      'id',
      momoDepositNumberId
    )
    .maybeSingle();

  if (momoError) {
    throw momoError;
  }

  if (
    !momoNumber ||
    momoNumber.active === false
  ) {
    throw new Error(
      'Le numéro Mobile Money sélectionné n’est plus disponible.'
    );
  }

  const minAmount =
    momoNumber.min_amount ===
      null ||
    momoNumber.min_amount ===
      undefined
      ? null
      : Number(
          momoNumber.min_amount
        );

  const maxAmount =
    momoNumber.max_amount ===
      null ||
    momoNumber.max_amount ===
      undefined
      ? null
      : Number(
          momoNumber.max_amount
        );

  if (
    momoNumber.country_code !==
    resolvedSenderCountryCode
  ) {
    throw new Error(
      'Le numéro Mobile Money sélectionné ne correspond pas au pays du numéro associé à votre compte.'
    );
  }

  if (
    (
      minAmount !== null &&
      numericAmount < minAmount
    ) ||
    (
      maxAmount !== null &&
      numericAmount > maxAmount
    )
  ) {
    throw new Error(
      'Le numéro Mobile Money sélectionné ne couvre pas le montant de la recharge.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('transactions')
    .insert({
      type:
        TXN_TYPE.DEPOSIT,
      status:
        TXN_STATUS.PENDING_PROOF,
      user_id:
        userId,
      amount:
        numericAmount,
      sender_phone_number:
        normalizedSenderPhone,
      sender_country_code:
        resolvedSenderCountryCode,
      momo_deposit_number_id:
        momoDepositNumberId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * RETRAIT'''
if not pattern.search(s):
    raise SystemExit('createDeposit block not found')
s = pattern.sub(replacement, s, count=1)

# Patch createTransfer signature + insert block
old_sig = """export async function createTransfer({\n  userId,\n  amount,\n  feeAmount,\n  recipientName,\n  recipientMobileNumber,\n  recipientLocation,\n  referenceNote,\n}) {"""
new_sig = """export async function createTransfer({\n  userId,\n  amount,\n  feeAmount,\n  senderCountry,\n  senderCountryCode,\n  recipientName,\n  recipientMobileNumber,\n  recipientLocation,\n  recipientCountry,\n  recipientCountryCode,\n  referenceNote,\n}) {"""
if old_sig not in s:
    raise SystemExit('createTransfer signature not found')
s = s.replace(old_sig, new_sig, 1)
needle = """  const numericAmount =\n    Number(\n      amount\n    );\n"""
# only within createTransfer, use scoped slice
start = s.index('export async function createTransfer({')
end = s.index('/* ============================================================\n * RETRAIT', start)
block = s[start:end]
insert_after = """  if (!userId) {\n    throw new Error(\n      'Utilisateur non authentifié.'\n    );\n  }\n\n"""
extra = """  if (!senderCountry) {\n    throw new Error(\n      'Le pays de localisation de l’expéditeur est requis.'\n    );\n  }\n\n  if (!recipientCountry) {\n    throw new Error(\n      'Le pays du destinataire est requis.'\n    );\n  }\n\n  if (\n    senderCountry ===\n    recipientCountry\n  ) {\n    throw new Error(\n      'Le pays de départ et le pays de destination doivent être différents.'\n    );\n  }\n\n  if (!senderCountryCode) {\n    throw new Error(\n      'L’indicatif du pays de localisation est requis.'\n    );\n  }\n\n  if (!recipientCountryCode) {\n    throw new Error(\n      'L’indicatif du pays destinataire est requis.'\n    );\n  }\n\n"""
if extra not in block:
    if insert_after in block:
        block = block.replace(insert_after, insert_after + extra, 1)
    else:
        raise SystemExit('createTransfer insert anchor not found')
insert_old = """        recipient_location:\n          recipientLocation,\n\n        reference_note:\n          referenceNote ||\n          null,\n"""
insert_new = """        recipient_location:\n          recipientLocation,\n\n        sender_country_code:\n          senderCountryCode,\n\n        recipient_country_code:\n          recipientCountryCode,\n\n        recipient_country:\n          recipientCountry,\n\n        reference_note:\n          referenceNote ||\n          null,\n"""
if insert_old not in block:
    raise SystemExit('createTransfer insert object not found')
block = block.replace(insert_old, insert_new, 1)
s = s[:start] + block + s[end:]
p.write_text(s)

# 7) DepositAmountScreen.js
p = root / 'src/screens/deposit/DepositAmountScreen.js'
p.write_text(r'''import React, {
  useState,
} from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';

import {
  isValidAmount,
} from '../../utils/validators';


function formatAmount(value) {
  const digits =
    String(value || '')
      .replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ' '
  );
}


function normalizeAmount(value) {
  const digits =
    String(value || '')
      .replace(/\D/g, '');

  return digits
    ? Number(digits)
    : 0;
}


export default function DepositAmountScreen({
  navigation,
}) {
  const [amount, setAmount] =
    useState('');

  const [errors, setErrors] =
    useState({});

  const clearError =
    (field) => {
      if (!errors[field]) {
        return;
      }

      setErrors((current) => ({
        ...current,
        [field]: null,
      }));
    };

  const handleContinue = () => {
    const nextErrors = {};

    if (!isValidAmount(amount)) {
      nextErrors.amount =
        'Montant invalide.';
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
    ) {
      return;
    }

    navigation.navigate(
      'DepositNumber',
      {
        amount:
          normalizeAmount(amount),
      }
    );
  };

  return (
    <ScrollView
      style={styles.wrapper}
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,
      }}
    >
      <Header
        title="Nouveau dépôt"
      />

      <Text
        style={[
          typography.body,
          {
            marginTop:
              spacing.lg,
            marginBottom:
              spacing.sm,
          },
        ]}
      >
        Entrez les informations
        du dépôt
      </Text>

      <Text
        style={styles.helper}
      >
        Le numéro de l’expéditeur sera
        automatiquement celui associé à
        votre compte Zender237.
      </Text>

      <View
        style={{
          marginTop:
            spacing.lg,
        }}
      >
        <Input
          label="Montant"
          value={amount}
          onChangeText={(value) => {
            setAmount(
              formatAmount(value)
            );

            clearError('amount');
          }}
          keyboardType="number-pad"
          placeholder="50 000"
          rightAdornment={
            <Text
              style={
                typography.caption
              }
            >
              U
            </Text>
          }
          error={errors.amount}
        />
      </View>

      <View
        style={{
          marginTop:
            spacing.giant,
        }}
      >
        <Button
          title="Continuer"
          onPress={handleContinue}
        />
      </View>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor:
        colors.background
          .default,
    },

    helper: {
      ...typography.caption,
      color:
        colors.text.secondary,
      lineHeight:
        spacing.md * 1.5,
    },
  });
''')

# 8) DepositNumberScreen.js
p = root / 'src/screens/deposit/DepositNumberScreen.js'
s = p.read_text()
s = s.replace("import {\n  getCountryCodeFromPhone,\n} from '../../utils/phone';\n", "")
s = s.replace("""  const {\n    amount,\n    senderPhone,\n    senderCountryCode,\n  } =\n    route.params || {};\n""", """  const {\n    amount,\n  } = route.params || {};\n""")
s = s.replace("""  const resolvedCountryCode =\n    getCountryCodeFromPhone(\n      senderPhone\n    ) ||\n    senderCountryCode ||\n    null;\n""", """  const [\n    resolvedCountryCode,\n    setResolvedCountryCode,\n  ] = useState(null);\n""")
old_effect = """  useEffect(() => {\n    let active = true;\n\n    const load =\n      async () => {\n        if (\n          !resolvedCountryCode\n        ) {\n          if (active) {\n            setNumbers([]);\n            setLoading(false);\n          }\n\n          return;\n        }\n\n        try {\n          setLoading(true);\n\n          const available =\n            await listMomoNumbers({\n              amount:\n                amountValue,\n\n              countryCode:\n                resolvedCountryCode,\n            });\n"""
new_effect = """  useEffect(() => {\n    let active = true;\n\n    const load =\n      async () => {\n        try {\n          setLoading(true);\n\n          const identity =\n            await getMyDepositIdentity({\n              userId: user.id,\n            });\n\n          if (!active) {\n            return;\n          }\n\n          setResolvedCountryCode(\n            identity.senderCountryCode\n          );\n\n          const available =\n            await listMomoNumbers({\n              amount:\n                amountValue,\n\n              countryCode:\n                identity.senderCountryCode,\n            });\n"""
if old_effect not in s:
    raise SystemExit('DepositNumber effect anchor not found')
s = s.replace(old_effect, new_effect, 1)
s = s.replace("import {\n  createDeposit,\n  listMomoNumbers,\n} from '../../services/transactionService';", "import {\n  createDeposit,\n  getMyDepositIdentity,\n  listMomoNumbers,\n} from '../../services/transactionService';")
s = s.replace("""            senderPhone,\n\n            senderCountryCode:\n              resolvedCountryCode,\n\n            momoDepositNumberId:\n              selectedId,\n""", """            momoDepositNumberId:\n              selectedId,\n""")
s = s.replace("""          'Numéro du payeur doit contenir un indicatif pays.',\n""", """          'Le numéro associé à votre compte doit contenir un indicatif pays.',\n""")
# update empty country messages
s = s.replace("""          Impossible de déterminer\n          l'indicatif du numéro du\n          payeur. Revenez à l'étape\n          précédente et sélectionnez\n          un pays.\n""", """          Impossible de déterminer\n          le pays du numéro associé à\n          votre compte. Vérifiez votre\n          profil puis réessayez.\n""")
p.write_text(s)

# 9) TransferDestinationScreen.js
p = root / 'src/screens/transfer/TransferDestinationScreen.js'
s = p.read_text()
s = s.replace("import {\n  getMyCountry,\n} from '../../services/feeService';", "import {\n  detectAndPersistCurrentCountry,\n} from '../../services/locationService';")
old_load = """          const fromCountry =\n            user?.country ||\n            (await getMyCountry());\n\n          if (!fromCountry) {\n            throw new Error(\n              \"Impossible de déterminer votre pays. Vérifiez que votre profil est complet.\"\n            );\n          }\n\n          if (cancelled) {\n            return;\n          }\n\n          setSenderCountry(\n            fromCountry\n          );\n"""
new_load = """          const detected =\n            await detectAndPersistCurrentCountry({\n              userId: user?.id,\n            });\n\n          const fromCountry =\n            detected.country;\n\n          if (!fromCountry) {\n            throw new Error(\n              'Impossible de déterminer votre pays actuel.'\n            );\n          }\n\n          if (cancelled) {\n            return;\n          }\n\n          setSenderCountry(\n            fromCountry\n          );\n\n          setCountry((current) => {\n            if (current !== fromCountry) {\n              return current;\n            }\n\n            return DESTINATION_COUNTRIES.find(\n              (item) => item !== fromCountry\n            ) || current;\n          });\n"""
if old_load not in s:
    raise SystemExit('TransferDestination load block not found')
s = s.replace(old_load, new_load, 1)
s = s.replace("""                country,\n                method,\n                fromCountry:\n                  senderCountry,\n""", """                country,\n                method,\n                fromCountry:\n                  senderCountry,\n""", 1)
# add disabled when sender country missing
s = s.replace("""            loading ||\n            !country\n""", """            loading ||\n            !country ||\n            !senderCountry\n""")
p.write_text(s)

# 10) TransferRecipientScreen route navigation add fromCountry in summary (already available)
p = root / 'src/screens/transfer/TransferRecipientScreen.js'
s = p.read_text()
old = """        {\n          country,\n          method,\n\n          amount:"""
new = """        {\n          country,\n          method,\n          fromCountry,\n\n          amount:"""
if old not in s:
    raise SystemExit('TransferRecipient summary params not found')
s = s.replace(old, new, 1)
p.write_text(s)

# 11) TransferSummaryScreen rewrite
p = root / 'src/screens/transfer/TransferSummaryScreen.js'
s = p.read_text()
s = s.replace("""    country,\n    method,\n    amount,""", """    country,\n    method,\n    fromCountry,\n    amount,""")
s = s.replace("""            amount:\n              numericAmount,\n\n            feeAmount:\n              numericFeeAmount,\n\n            recipientName,""", """            amount:\n              numericAmount,\n\n            feeAmount:\n              numericFeeAmount,\n\n            senderCountry:\n              fromCountry,\n\n            senderCountryCode:\n              countries[fromCountry].dialCode,\n\n            recipientName,""")
s = s.replace("""            recipientCountryCode:\n              recipientCountryCode ||\n              getCountryCodeFromPhone(\n                recipientMobileNumber\n              ),\n\n            recipientLocation,""", """            recipientCountryCode:\n              recipientCountryCode ||\n              getCountryCodeFromPhone(\n                recipientMobileNumber\n              ),\n\n            recipientCountry:\n              recipientCountry ??\n              country,\n\n            recipientLocation:""")
# add origin row
s = s.replace("""        <Row\n          label=\"Pays\"\n          value={`${countries[country].flag} ${countries[country].label}`}\n        />\n""", """        <Row\n          label=\"Pays de départ\"\n          value={`${countries[fromCountry].flag} ${countries[fromCountry].label}`}\n        />\n\n        <Row\n          label=\"Pays de destination\"\n          value={`${countries[country].flag} ${countries[country].label}`}\n        />\n""")
p.write_text(s)

# 12) AuthContext: unregister push token before signout, minimal
p = root / 'src/context/AuthContext.js'
s = p.read_text()
imp = "import { supabase } from '../lib/supabase';\n"
if "unregisterCurrentPushToken" not in s:
    s = s.replace(imp, imp + "\nimport { unregisterCurrentPushToken } from '../services/notificationService';\n", 1)
# add ref import + state token? We can skip client token is not accessible. Instead use getStoredPush token? Not available. Leave function imported but unused bad.
# Undo unused import: actual unregister will be handled by provider during active auth in future. Remove.
s = s.replace("\nimport { unregisterCurrentPushToken } from '../services/notificationService';\n", "\n")
p.write_text(s)

# 13) SQL migration
migrations = root / 'supabase/migrations'
migrations.mkdir(parents=True, exist_ok=True)
mp = migrations / '20260922000000_transaction_push_location.sql'
mp.write_text(r'''-- ============================================================
-- Zender237 — Notifications push administrateur + pays GPS
-- + dépôt utilisant automatiquement le numéro du compte
-- ============================================================
--
-- Cette migration complète le schéma existant sans supprimer les
-- tables/contraintes déjà présentes.
--
-- 1) Ajoute les colonnes nécessaires à notifications_log si une
--    ancienne version de la base ne les possède pas encore.
-- 2) Sécurise l'enregistrement des Expo Push Tokens.
-- 3) Permet à l'utilisateur d'enregistrer son pays détecté.
-- 4) Crée des notifications admin sur INSERT/UPDATE des transactions.
-- 5) Envoie ces notifications à Expo Push Service via pg_net.
--
-- IMPORTANT : le projet Expo/EAS doit disposer des credentials push
-- Android/iOS. Le push distant nécessite une vraie build native.
-- ============================================================

create extension if not exists pg_net;


-- ------------------------------------------------------------
-- 1. COLONNES DE NOTIFICATION
-- ------------------------------------------------------------

alter table public.notifications_log
  add column if not exists title text not null default 'Notification',
  add column if not exists read_at timestamptz,
  add column if not exists event_type text,
  add column if not exists status text not null default 'queued',
  add column if not exists failure_reason text,
  add column if not exists metadata jsonb,
  add column if not exists resource_type text,
  add column if not exists resource_id uuid;


create index if not exists idx_notifications_admin_created
  on public.notifications_log(admin_id, sent_at desc)
  where admin_id is not null;

create index if not exists idx_notifications_transaction
  on public.notifications_log(transaction_id, sent_at desc)
  where transaction_id is not null;


-- ------------------------------------------------------------
-- 2. PUSH TOKENS — RLS
-- ------------------------------------------------------------

alter table public.push_tokens enable row level security;


drop policy if exists "push_tokens_select_own_account" on public.push_tokens;
create policy "push_tokens_select_own_account"
on public.push_tokens
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.admins a
    where a.id = push_tokens.admin_id
      and a.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.partners p
    where p.id = push_tokens.partner_id
      and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.kmerdiaspora_admins k
    where k.id = push_tokens.kmerdiaspora_admin_id
      and k.auth_user_id = auth.uid()
  )
);


drop policy if exists "push_tokens_insert_own_account" on public.push_tokens;
create policy "push_tokens_insert_own_account"
on public.push_tokens
for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.admins a
    where a.id = push_tokens.admin_id
      and a.auth_user_id = auth.uid()
      and a.active = true
  )
  or exists (
    select 1
    from public.partners p
    where p.id = push_tokens.partner_id
      and p.auth_user_id = auth.uid()
      and p.active = true
  )
  or exists (
    select 1
    from public.kmerdiaspora_admins k
    where k.id = push_tokens.kmerdiaspora_admin_id
      and k.auth_user_id = auth.uid()
      and k.active = true
  )
);


drop policy if exists "push_tokens_update_own_account" on public.push_tokens;
create policy "push_tokens_update_own_account"
on public.push_tokens
for update
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.admins a
    where a.id = push_tokens.admin_id
      and a.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.partners p
    where p.id = push_tokens.partner_id
      and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.kmerdiaspora_admins k
    where k.id = push_tokens.kmerdiaspora_admin_id
      and k.auth_user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.admins a
    where a.id = push_tokens.admin_id
      and a.auth_user_id = auth.uid()
      and a.active = true
  )
  or exists (
    select 1
    from public.partners p
    where p.id = push_tokens.partner_id
      and p.auth_user_id = auth.uid()
      and p.active = true
  )
  or exists (
    select 1
    from public.kmerdiaspora_admins k
    where k.id = push_tokens.kmerdiaspora_admin_id
      and k.auth_user_id = auth.uid()
      and k.active = true
  )
);


-- ------------------------------------------------------------
-- 3. NOTIFICATIONS LOG — LECTURE PAR COMPTE
-- ------------------------------------------------------------

alter table public.notifications_log enable row level security;


drop policy if exists "notifications_select_own_account" on public.notifications_log;
create policy "notifications_select_own_account"
on public.notifications_log
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.admins a
    where a.id = notifications_log.admin_id
      and a.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.partners p
    where p.id = notifications_log.partner_id
      and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.kmerdiaspora_admins k
    where k.id = notifications_log.kmerdiaspora_admin_id
      and k.auth_user_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- 4. RPC — ENREGISTRER LE PAYS DÉTECTÉ
-- ------------------------------------------------------------

create or replace function public.set_my_detected_country(
  p_country public.user_country
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if p_country not in ('mali'::public.user_country, 'guinee'::public.user_country, 'cameroun'::public.user_country) then
    raise exception 'Pays non pris en charge';
  end if;

  update public.profiles
     set country = p_country
   where id = auth.uid()
   returning * into v_profile;

  if not found then
    raise exception 'Profil utilisateur introuvable';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.set_my_detected_country(public.user_country) from public;
grant execute on function public.set_my_detected_country(public.user_country) to authenticated;


-- ------------------------------------------------------------
-- 5. RPC — ENREGISTRER / RÉASSIGNER UN TOKEN EXPO
-- ------------------------------------------------------------

create or replace function public.register_push_token(
  p_expo_push_token text,
  p_account_type text,
  p_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_auth_id uuid := auth.uid();
  v_user_id uuid := null;
  v_admin_id uuid := null;
  v_partner_id uuid := null;
  v_kma_id uuid := null;
  v_active boolean := true;
begin
  if v_auth_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if nullif(trim(p_expo_push_token), '') is null then
    raise exception 'Token Expo Push requis';
  end if;

  case lower(trim(coalesce(p_account_type, '')))
    when 'user' then
      if p_account_id is distinct from v_auth_id then
        raise exception 'Compte utilisateur invalide';
      end if;
      if not exists (
        select 1 from public.profiles
        where id = v_auth_id
      ) then
        raise exception 'Profil utilisateur introuvable';
      end if;
      v_user_id := v_auth_id;

    when 'admin' then
      select a.id, a.active
        into v_admin_id, v_active
      from public.admins a
      where a.id = p_account_id
        and a.auth_user_id = v_auth_id
      limit 1;

      if v_admin_id is null or v_active is false then
        raise exception 'Compte administrateur invalide ou désactivé';
      end if;

    when 'partner' then
      select p.id, p.active
        into v_partner_id, v_active
      from public.partners p
      where p.id = p_account_id
        and p.auth_user_id = v_auth_id
      limit 1;

      if v_partner_id is null or v_active is false then
        raise exception 'Compte partenaire invalide ou désactivé';
      end if;

    when 'kmerdiaspora_admin' then
      select k.id, k.active
        into v_kma_id, v_active
      from public.kmerdiaspora_admins k
      where k.id = p_account_id
        and k.auth_user_id = v_auth_id
      limit 1;

      if v_kma_id is null or v_active is false then
        raise exception 'Compte KmAdministrateur invalide ou désactivé';
      end if;

    else
      raise exception 'Type de compte invalide';
  end case;

  select id into v_id
  from public.push_tokens
  where expo_push_token = trim(p_expo_push_token)
  limit 1
  for update;

  if v_id is null then
    insert into public.push_tokens (
      admin_id,
      user_id,
      partner_id,
      kmerdiaspora_admin_id,
      expo_push_token,
      active
    ) values (
      v_admin_id,
      v_user_id,
      v_partner_id,
      v_kma_id,
      trim(p_expo_push_token),
      true
    ) returning id into v_id;
  else
    update public.push_tokens
       set admin_id = v_admin_id,
           user_id = v_user_id,
           partner_id = v_partner_id,
           kmerdiaspora_admin_id = v_kma_id,
           active = true
     where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.register_push_token(text, text, uuid) from public;
grant execute on function public.register_push_token(text, text, uuid) to authenticated;


create or replace function public.unregister_push_token(
  p_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_id uuid := auth.uid();
begin
  if v_auth_id is null then
    return;
  end if;

  update public.push_tokens pt
     set active = false
   where pt.expo_push_token = trim(p_expo_push_token)
     and (
       pt.user_id = v_auth_id
       or exists (
         select 1 from public.admins a
         where a.id = pt.admin_id
           and a.auth_user_id = v_auth_id
       )
       or exists (
         select 1 from public.partners p
         where p.id = pt.partner_id
           and p.auth_user_id = v_auth_id
       )
       or exists (
         select 1 from public.kmerdiaspora_admins k
         where k.id = pt.kmerdiaspora_admin_id
           and k.auth_user_id = v_auth_id
       )
     );
end;
$$;

revoke all on function public.unregister_push_token(text) from public;
grant execute on function public.unregister_push_token(text) to authenticated;


-- ------------------------------------------------------------
-- 6. NOTIFICATION MÉTIER — TRANSACTIONS -> ADMINS
-- ------------------------------------------------------------

create or replace function public.queue_transaction_admin_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_type text;
  v_status text;
  v_title text;
  v_message text;
  v_reference text;
  v_admin record;
  v_event_type text;
begin
  v_transaction_type := coalesce(NEW.type::text, 'transaction');
  v_status := coalesce(NEW.status::text, 'unknown');
  v_reference := upper(left(replace(NEW.id::text, '-', ''), 8));

  if TG_OP = 'INSERT' then
    v_event_type := 'transaction_created';

    v_title := 'Nouvelle transaction';

    v_message := case v_transaction_type
      when 'deposit' then 'Nouveau dépôt à traiter.'
      when 'transfer' then 'Nouveau transfert à traiter.'
      when 'withdrawal' then 'Nouveau retrait à traiter.'
      else 'Nouvelle transaction à traiter.'
    end;

  else
    if not (
      OLD.status is distinct from NEW.status
      or OLD.workflow_stage is distinct from NEW.workflow_stage
      or OLD.partner_id is distinct from NEW.partner_id
      or OLD.admin_id is distinct from NEW.admin_id
      or OLD.review_deadline is distinct from NEW.review_deadline
      or OLD.first_reviewed_at is distinct from NEW.first_reviewed_at
      or OLD.executed_at is distinct from NEW.executed_at
      or OLD.settled_at is distinct from NEW.settled_at
      or OLD.confirmed_at is distinct from NEW.confirmed_at
      or OLD.rejected_at is distinct from NEW.rejected_at
      or OLD.cancelled_at is distinct from NEW.cancelled_at
      or OLD.expired_at is distinct from NEW.expired_at
      or OLD.rejection_reason is distinct from NEW.rejection_reason
    ) then
      return NEW;
    end if;

    v_event_type := 'transaction_updated';

    v_title := case v_status
      when 'confirmed' then 'Transaction confirmée'
      when 'completed' then 'Transaction terminée'
      when 'rejected' then 'Transaction rejetée'
      when 'cancelled' then 'Transaction annulée'
      when 'under_review' then 'Transaction à traiter'
      when 'pending_proof' then 'Preuve de transaction en attente'
      else 'Mise à jour transaction'
    end;

    v_message := case v_status
      when 'confirmed' then 'Une transaction vient d’être confirmée.'
      when 'completed' then 'Une transaction vient d’être finalisée.'
      when 'rejected' then 'Une transaction vient d’être rejetée.'
      when 'cancelled' then 'Une transaction vient d’être annulée.'
      when 'under_review' then 'Une transaction est en attente de traitement.'
      when 'pending_proof' then 'Une transaction attend une preuve.'
      else 'Une transaction a été mise à jour.'
    end;
  end if;

  v_message := v_message || ' Réf. ' || v_reference || '.';

  for v_admin in
    select id
    from public.admins
    where active = true
  loop
    insert into public.notifications_log (
      user_id,
      admin_id,
      transaction_id,
      channel,
      title,
      message,
      sent_at,
      event_type,
      status,
      metadata,
      resource_type,
      resource_id
    ) values (
      null,
      v_admin.id,
      NEW.id,
      'push'::public.notif_channel,
      v_title,
      v_message,
      now(),
      v_event_type,
      'queued',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'transaction_type', v_transaction_type,
        'status', v_status,
        'workflow_stage', NEW.workflow_stage,
        'reference', v_reference
      ),
      'transaction',
      NEW.id
    );
  end loop;

  return NEW;
end;
$$;


drop trigger if exists trg_transaction_admin_notifications
  on public.transactions;

create trigger trg_transaction_admin_notifications
after insert or update on public.transactions
for each row
execute function public.queue_transaction_admin_notifications();


-- ------------------------------------------------------------
-- 7. ENVOI DES PUSH — notifications_log -> Expo Push API
-- ------------------------------------------------------------

create or replace function public.send_expo_push_from_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tokens jsonb;
  v_request_id bigint;
  v_payload jsonb;
begin
  if NEW.channel::text <> 'push' then
    return NEW;
  end if;

  if NEW.admin_id is null then
    return NEW;
  end if;

  select jsonb_agg(pt.expo_push_token)
    into v_tokens
  from public.push_tokens pt
  where pt.admin_id = NEW.admin_id
    and pt.active = true;

  if v_tokens is null or jsonb_array_length(v_tokens) = 0 then
    return NEW;
  end if;

  v_payload := jsonb_build_object(
    'to', v_tokens,
    'title', coalesce(NEW.title, 'Zender237'),
    'body', NEW.message,
    'sound', 'default',
    'channelId', 'transactions',
    'priority', 'high',
    'data', jsonb_build_object(
      'notificationId', NEW.id,
      'transactionId', NEW.transaction_id,
      'eventType', NEW.event_type,
      'resourceType', NEW.resource_type,
      'resourceId', NEW.resource_id
    )
  );

  select net.http_post(
    'https://exp.host/--/api/v2/push/send'::text,
    v_payload,
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type', 'application/json'
    )::jsonb,
    5000
  ) into v_request_id;

  return NEW;
exception when others then
  -- Le push ne doit jamais bloquer la transaction métier.
  raise warning '[Zender237] push enqueue failed: %', SQLERRM;
  return NEW;
end;
$$;


drop trigger if exists trg_send_expo_push_from_notification
  on public.notifications_log;

create trigger trg_send_expo_push_from_notification
after insert on public.notifications_log
for each row
execute function public.send_expo_push_from_notification();


-- ------------------------------------------------------------
-- 8. RAPPEL : RLS notifications/push
--    Les fonctions SECURITY DEFINER gardent le workflow métier
--    accessible tout en protégeant les tables côté client.
-- ------------------------------------------------------------
''')

print('patch done')
