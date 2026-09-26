/**
 * Service de géolocalisation utilisé pour les transferts.
 *
 * Principe :
 * 1. L'utilisateur choisit d'abord son pays dans l'application.
 * 2. Le téléphone vérifie ensuite ce choix avec sa position.
 * 3. Le pays n'est enregistré dans `profiles.country`
 *    que si le contrôle passe.
 *
 * IMPORTANT :
 * Aucun appel GPS / géocodage ne doit bloquer indéfiniment
 * l'interface. Tous les appels sensibles disposent donc
 * d'un délai maximum.
 */

import * as Location from 'expo-location';

import {
  supabase,
} from '../lib/supabase';


/*
 * ============================================================
 * PAYS
 * ============================================================
 */

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
  guine: 'guinee',
  'guinée': 'guinee',

  mali: 'mali',
};


/*
 * ============================================================
 * TEMPS MAXIMUM
 * ============================================================
 *
 * Ces limites empêchent un loader infini.
 */

const LOCATION_TIMEOUT_MS =
  12000;

const REVERSE_GEOCODE_TIMEOUT_MS =
  8000;

const LAST_KNOWN_MAX_AGE_MS =
  2 * 60 * 1000;

const LAST_KNOWN_MAX_ACCURACY_METERS =
  50000;


/*
 * ============================================================
 * OUTILS
 * ============================================================
 */

function normalizeCountryText(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}


function buildLocationError(
  code,
  message
) {
  const error =
    new Error(
      message
    );

  error.code =
    code;

  return error;
}


/**
 * Exécute une promesse avec une durée maximale.
 */
function withTimeout(
  promise,
  timeoutMs,
  code,
  message
) {
  let timeoutId =
    null;

  const timeoutPromise =
    new Promise(
      (_, reject) => {
        timeoutId =
          setTimeout(
            () => {
              reject(
                buildLocationError(
                  code,
                  message
                )
              );
            },
            timeoutMs
          );
      }
    );

  return Promise.race([
    promise.finally(
      () => {
        if (
          timeoutId
        ) {
          clearTimeout(
            timeoutId
          );
        }
      }
    ),

    timeoutPromise,
  ]);
}


/**
 * Transforme l'adresse Expo en pays supporté.
 */
function getCountryFromAddress(
  address
) {
  const isoCode =
    String(
      address?.countryCode ||
        ''
    )
      .trim()
      .toUpperCase();

  const isoCountry =
    COUNTRY_BY_ISO[
      isoCode
    ] || null;

  if (
    isoCountry
  ) {
    return {
      country:
        isoCountry,

      countryCode:
        isoCode,
    };
  }

  const normalizedCountry =
    normalizeCountryText(
      address?.country
    );

  return {
    country:
      COUNTRY_ALIASES[
        normalizedCountry
      ] || null,

    countryCode:
      isoCode || null,
  };
}


/**
 * Récupère une position utilisable.
 *
 * On utilise d'abord une dernière position connue
 * lorsqu'elle est récente et suffisamment précise.
 *
 * Sinon on demande une vraie position actuelle.
 */
async function getUsableLocation() {
  let lastKnown =
    null;

  try {
    lastKnown =
      await Location.getLastKnownPositionAsync({
        maxAge:
          LAST_KNOWN_MAX_AGE_MS,

        requiredAccuracy:
          LAST_KNOWN_MAX_ACCURACY_METERS,
      });
  } catch (_) {
    lastKnown =
      null;
  }


  const lastKnownTimestamp =
    Number(
      lastKnown?.timestamp
    );

  const lastKnownAccuracy =
    Number(
      lastKnown?.coords?.accuracy
    );


  const lastKnownIsUsable =
    !!lastKnown &&

    Number.isFinite(
      lastKnownTimestamp
    ) &&

    Date.now() -
      lastKnownTimestamp <=
      LAST_KNOWN_MAX_AGE_MS &&

    Number.isFinite(
      lastKnownAccuracy
    ) &&

    lastKnownAccuracy <=
      LAST_KNOWN_MAX_ACCURACY_METERS;


  if (
    lastKnownIsUsable
  ) {
    return lastKnown;
  }


  /*
   * Pas de position récente :
   * on demande la position actuelle.
   */

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy:
          Location.Accuracy.Balanced,

        mayShowUserSettingsDialog:
          true,
      }),

      LOCATION_TIMEOUT_MS,

      'LOCATION_TIMEOUT',

      'La localisation prend trop de temps. Activez le GPS et réessayez.'
    );
  } catch (
    error
  ) {
    if (
      error?.code
    ) {
      throw error;
    }

    throw buildLocationError(
      'LOCATION_UNAVAILABLE',

      error?.message ||
        'Impossible d’obtenir votre position.'
    );
  }
}


/*
 * ============================================================
 * DÉTECTION DU PAYS
 * ============================================================
 */

export async function detectCurrentCountry() {
  /*
   * ----------------------------------------------------------
   * Vérifier que le GPS est activé
   * ----------------------------------------------------------
   */

  let servicesEnabled =
    true;

  try {
    servicesEnabled =
      await Location.hasServicesEnabledAsync();
  } catch (_) {
    /*
     * Dans certains environnements Expo,
     * cet appel peut être indisponible.
     * On laisse alors l'appel GPS gérer le cas.
     */

    servicesEnabled =
      true;
  }


  if (
    !servicesEnabled
  ) {
    throw buildLocationError(
      'LOCATION_SERVICES_DISABLED',

      'La localisation du téléphone est désactivée. Activez le GPS puis réessayez.'
    );
  }


  /*
   * ----------------------------------------------------------
   * Permission
   * ----------------------------------------------------------
   */

  let permission;

  try {
    permission =
      await Location.requestForegroundPermissionsAsync();
  } catch (
    error
  ) {
    throw buildLocationError(
      'LOCATION_PERMISSION_ERROR',

      error?.message ||
        'Impossible de demander l’accès à la localisation.'
    );
  }


  if (
    permission.status !==
    'granted'
  ) {
    throw buildLocationError(
      'LOCATION_PERMISSION_REQUIRED',

      'Autorisez la localisation du téléphone pour vérifier votre pays.'
    );
  }


  /*
   * ----------------------------------------------------------
   * Position
   * ----------------------------------------------------------
   */

  const location =
    await getUsableLocation();


  const latitude =
    location?.coords?.latitude;

  const longitude =
    location?.coords?.longitude;


  if (
    !Number.isFinite(
      latitude
    ) ||
    !Number.isFinite(
      longitude
    )
  ) {
    throw buildLocationError(
      'LOCATION_INVALID',

      'La position reçue du téléphone est invalide.'
    );
  }


  /*
   * ----------------------------------------------------------
   * REVERSE GEOCODING
   * ----------------------------------------------------------
   */

  let addresses =
    [];


  try {
    addresses =
      await withTimeout(
        Location.reverseGeocodeAsync({
          latitude,
          longitude,
        }),

        REVERSE_GEOCODE_TIMEOUT_MS,

        'GEOCODING_TIMEOUT',

        'La vérification du pays prend trop de temps. Réessayez.'
      );
  } catch (
    error
  ) {
    if (
      error?.code
    ) {
      throw error;
    }

    throw buildLocationError(
      'GEOCODING_FAILED',

      error?.message ||
        'Impossible de lire le pays depuis votre position.'
    );
  }


  const address =
    addresses?.[0] ||
    null;


  const detected =
    getCountryFromAddress(
      address
    );


  /*
   * ----------------------------------------------------------
   * PAYS NON SUPPORTÉ
   * ----------------------------------------------------------
   *
   * On ne lance pas d'erreur ici.
   * On retourne simplement supported=false.
   *
   * Cela permet à l'écran d'afficher un message clair.
   */

  if (
    !detected.country
  ) {
    return {
      country:
        null,

      countryCode:
        detected.countryCode,

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

      supported:
        false,
    };
  }


  /*
   * ----------------------------------------------------------
   * SUCCÈS
   * ----------------------------------------------------------
   */

  return {
    country:
      detected.country,

    countryCode:
      detected.countryCode,

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

    supported:
      true,
  };
}


/*
 * ============================================================
 * VÉRIFICATION DU CHOIX UTILISATEUR
 * ============================================================
 *
 * L'utilisateur choisit d'abord son pays.
 *
 * Ensuite :
 *
 *     pays choisi
 *          ↓
 *        GPS
 *          ↓
 *   pays détecté
 *          ↓
 *   correspondance ?
 *
 * Oui  → on enregistre le pays
 * Non  → on bloque et on demande de corriger
 */

export async function verifySelectedCountry({
  userId,
  selectedCountry,
}) {
  if (
    !userId
  ) {
    throw buildLocationError(
      'AUTH_REQUIRED',

      'Utilisateur non authentifié.'
    );
  }


  if (
    !selectedCountry
  ) {
    throw buildLocationError(
      'COUNTRY_REQUIRED',

      'Choisissez votre pays.'
    );
  }


  const normalizedSelectedCountry =
    normalizeCountryText(
      selectedCountry
    );


  const canonicalSelectedCountry =
    COUNTRY_ALIASES[
      normalizedSelectedCountry
    ];


  if (
    !canonicalSelectedCountry
  ) {
    throw buildLocationError(
      'COUNTRY_UNSUPPORTED',

      'Ce pays n’est pas pris en charge.'
    );
  }


  /*
   * Détection réelle.
   */

  const detected =
    await detectCurrentCountry();


  /*
   * Comparaison.
   */

  const matches =
    detected.supported &&
    detected.country ===
      canonicalSelectedCountry;


  /*
   * Pays différent :
   * surtout NE PAS mettre à jour le profil.
   */

  if (
    !matches
  ) {
    return {
      verified:
        false,

      selectedCountry:
        canonicalSelectedCountry,

      detectedCountry:
        detected.country ||
        null,

      detectedCountryCode:
        detected.countryCode ||
        null,

      location:
        detected,
    };
  }


  /*
   * ----------------------------------------------------------
   * PAYS CONFIRMÉ
   * ----------------------------------------------------------
   *
   * Maintenant seulement, on met à jour profiles.country.
   */

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'set_my_detected_country',
      {
        p_country:
          detected.country,
      }
    );


  if (
    error
  ) {
    const rpcError =
      new Error(
        error.message ||
          'Impossible d’enregistrer votre pays.'
      );

    rpcError.code =
      error.code ||
      'COUNTRY_PERSIST_FAILED';

    throw rpcError;
  }


  return {
    verified:
      true,

    selectedCountry:
      canonicalSelectedCountry,

    detectedCountry:
      detected.country,

    detectedCountryCode:
      detected.countryCode,

    location:
      detected,

    profile:
      data || null,
  };
}


/*
 * ============================================================
 * ANCIENNE FONCTION
 * ============================================================
 *
 * Conservée pour les autres parties du projet.
 */

export async function detectAndPersistCurrentCountry({
  userId,
}) {
  if (
    !userId
  ) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }


  const detected =
    await detectCurrentCountry();


  if (
    !detected.country
  ) {
    throw buildLocationError(
      'LOCATION_COUNTRY_UNSUPPORTED',

      'Votre position actuelle ne correspond pas à un pays pris en charge.'
    );
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      'set_my_detected_country',
      {
        p_country:
          detected.country,
      }
    );


  if (
    error
  ) {
    const rpcError =
      new Error(
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

    profile:
      data || null,
  };
}