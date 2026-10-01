/**
 * Service de géolocalisation utilisé pour les transferts.
 *
 * Principe :
 *
 * 1. L'utilisateur choisit d'abord son pays.
 * 2. Le téléphone récupère sa position.
 * 3. Le pays est détecté depuis la position.
 * 4. Le profil est mis à jour uniquement si le pays choisi
 *    correspond au pays détecté.
 *
 * Correction Android :
 *
 * Certains appareils font planter `reverseGeocodeAsync`
 * avec :
 *
 *   NullPointerException:
 *   getCountryCode (...) must not be null
 *
 * Dans ce cas, un reverse-geocoding HTTP de secours est utilisé.
 */

import * as Location from 'expo-location';

import {
  supabase,
} from '../lib/supabase';


const COUNTRY_BY_ISO = {
  CM:
    'cameroun',

  GN:
    'guinee',

  ML:
    'mali',
};


const COUNTRY_ALIASES = {
  cameroun:
    'cameroun',

  cameroon:
    'cameroun',

  guinee:
    'guinee',

  guinea:
    'guinee',

  guine:
    'guinee',

  'guinée':
    'guinee',

  mali:
    'mali',
};


const LOCATION_TIMEOUT_MS =
  12000;

const REVERSE_GEOCODE_TIMEOUT_MS =
  8000;

const HTTP_REVERSE_GEOCODE_TIMEOUT_MS =
  10000;

const LAST_KNOWN_MAX_AGE_MS =
  2 * 60 * 1000;

const LAST_KNOWN_MAX_ACCURACY_METERS =
  50000;


function normalizeCountryText(
  value
) {
  return String(
    value ||
      ''
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
      (
        _,
        reject
      ) => {
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
    Promise.resolve(
      promise
    ).finally(
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


function getCountryFromAddress(
  address
) {
  const isoCode =
    String(
      address?.countryCode ||
      address?.country_code ||
      ''
    )
      .trim()
      .toUpperCase();


  const isoCountry =
    COUNTRY_BY_ISO[
      isoCode
    ] ||
    null;


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
      ] ||
      null,

    countryCode:
      isoCode ||
      null,
  };
}


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


/**
 * Fallback reverse-geocoding HTTP.
 *
 * Le résultat contient normalement :
 *
 * address.country_code
 * address.country
 */
async function reverseGeocodeWithHttp(
  latitude,
  longitude
) {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    `?format=jsonv2&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    '&zoom=3&addressdetails=1';


  let response;


  try {
    response =
      await withTimeout(
        fetch(
          url,
          {
            method:
              'GET',

            headers: {
              Accept:
                'application/json',

              'Accept-Language':
                'fr,en',

              'User-Agent':
                'Zender237/1.0 (mobile transfer country verification)',
            },
          }
        ),

        HTTP_REVERSE_GEOCODE_TIMEOUT_MS,

        'GEOCODING_HTTP_TIMEOUT',

        'La vérification du pays prend trop de temps. Vérifiez votre connexion puis réessayez.'
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
      'GEOCODING_HTTP_FAILED',

      error?.message ||
        'Impossible de vérifier le pays depuis votre position.'
    );
  }


  if (
    !response?.ok
  ) {
    throw buildLocationError(
      'GEOCODING_HTTP_STATUS',

      `Le service de vérification du pays a répondu avec le statut ${response?.status || 'inconnu'}.`
    );
  }


  let data;


  try {
    data =
      await response.json();

  } catch (_) {
    throw buildLocationError(
      'GEOCODING_HTTP_INVALID_RESPONSE',

      'Réponse invalide du service de vérification du pays.'
    );
  }


  return data ||
    null;
}


function isExpoReverseGeocodeNullPointer(
  error
) {
  const text =
    String(
      error?.message ||
      error ||
      ''
    ).toLowerCase();


  return (
    text.includes(
      'getcountrycode'
    ) ||
    text.includes(
      'nullpointerexception'
    ) ||
    text.includes(
      'must not be null'
    ) ||
    text.includes(
      'reversegeocodeasync'
    )
  );
}


export async function detectCurrentCountry() {
  let servicesEnabled =
    true;


  try {
    servicesEnabled =
      await Location.hasServicesEnabledAsync();

  } catch (_) {
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


  let address =
    null;

  let nativeError =
    null;


  /*
   * Tentative avec Expo Location.
   */

  try {
    const addresses =
      await withTimeout(
        Location.reverseGeocodeAsync({
          latitude,
          longitude,
        }),

        REVERSE_GEOCODE_TIMEOUT_MS,

        'GEOCODING_TIMEOUT',

        'La vérification du pays prend trop de temps. Réessayez.'
      );


    address =
      addresses?.[0] ||
      null;

  } catch (
    error
  ) {
    nativeError =
      error;
  }


  let detected =
    getCountryFromAddress(
      address
    );


  /*
   * Fallback HTTP.
   *
   * Utilisé :
   *
   * - si Android fait un NullPointerException ;
   * - si countryCode manque ;
   * - si le provider natif renvoie un pays inexploitable.
   */

  if (
    !detected.country ||
    nativeError
  ) {
    try {
      const httpAddress =
        await reverseGeocodeWithHttp(
          latitude,
          longitude
        );


      const httpDetected =
        getCountryFromAddress(
          httpAddress?.address ||
          httpAddress
        );


      if (
        httpDetected.country
      ) {
        detected =
          httpDetected;


        address = {
          ...(address ||
            {}),

          city:
            httpAddress?.address?.city ||
            httpAddress?.address?.town ||
            httpAddress?.address?.village ||
            httpAddress?.address?.municipality ||
            address?.city ||
            null,

          district:
            httpAddress?.address?.suburb ||
            httpAddress?.address?.district ||
            address?.district ||
            null,

          subregion:
            httpAddress?.address?.county ||
            address?.subregion ||
            null,

          region:
            httpAddress?.address?.state ||
            address?.region ||
            null,

          country:
            httpAddress?.address?.country ||
            address?.country ||
            null,

          countryCode:
            httpAddress?.address?.country_code ||
            address?.countryCode ||
            null,
        };
      }

    } catch (
      fallbackError
    ) {
      /*
       * Si Expo a quand même réussi à fournir
       * un pays valide, on le conserve.
       */

      if (
        !detected.country &&
        nativeError &&
        !isExpoReverseGeocodeNullPointer(
          nativeError
        ) &&
        fallbackError?.code ===
          'GEOCODING_HTTP_TIMEOUT'
      ) {
        throw nativeError;
      }
    }
  }


  /*
   * Pays non supporté.
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


  const detected =
    await detectCurrentCountry();


  const matches =
    detected.supported &&
    detected.country ===
      canonicalSelectedCountry;


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
      data ||
      null,
  };
}


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
      data ||
      null,
  };
}