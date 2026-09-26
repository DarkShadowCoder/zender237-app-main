
/**
 * ZENDER237 — KMERDIASPORA SERVICE
 *
 * Règles métier :
 * - numéros de téléphone hérités de profiles.whatsapp_number
 * - villes disponibles : chargées directement depuis Supabase
 * - demande de poste : une ville
 * - mission recruteur : plusieurs villes
 * - matching automatique par ville
 * - score de matching utilisé pour classer les profils
 * - seul le propriétaire peut modifier/supprimer sa publication
 * - seul le créateur d'une mission peut recruter un profil
 * - le recrutement informe KmAdministrateur
 * - les quêtes peuvent recevoir plusieurs contributions du même utilisateur
 * - le créateur d'une quête est automatiquement membre
 */

import { supabase } from '../lib/supabase';

let kmerDiasporaCitiesCache = null;

function uniqueCities(rows = []) {
  return Array.from(
    new Set(
      rows
        .map((row) => (typeof row === 'string' ? row : row?.city))
        .map((city) => String(city || '').trim())
        .filter(Boolean)
    )
  );
}

export async function loadKmerDiasporaCities({ forceRefresh = false } = {}) {
  if (kmerDiasporaCitiesCache && !forceRefresh) {
    return [...kmerDiasporaCitiesCache];
  }

  const [settingsResult, profilesResult, jobsResult, driverCitiesResult] =
    await Promise.all([
      supabase
        .from('kd_city_settings')
        .select('city, active, display_order')
        .eq('active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('kd_profiles')
        .select('city')
        .not('city', 'is', null),
      supabase
        .from('kd_job_requests')
        .select('city')
        .not('city', 'is', null),
      supabase
        .from('kd_driver_request_cities')
        .select('city')
        .not('city', 'is', null),
    ]);

  const dataCities = uniqueCities([
    ...(profilesResult.data || []),
    ...(jobsResult.data || []),
    ...(driverCitiesResult.data || []),
  ]);

  const configuredCities = uniqueCities(settingsResult.data || []);

  // La configuration active stockée dans Supabase est la source principale.
  // Les données métier servent uniquement de secours si cette configuration
  // n'est pas encore renseignée.
  const cities = configuredCities.length ? configuredCities : dataCities;

  kmerDiasporaCitiesCache = cities;
  return [...cities];
}

export async function isKmerDiasporaCityAvailable(city) {
  const cities = await loadKmerDiasporaCities();
  return cities.includes(String(city || '').trim());
}

export function getKmerDiasporaCities() {
  return kmerDiasporaCitiesCache ? [...kmerDiasporaCitiesCache] : [];
}


/* ============================================================
 * UTILITAIRES
 * ============================================================ */

async function getCurrentUser() {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error(
      'Utilisateur non authentifié.'
    );
  }

  return data.user;
}


function paginate(
  limit = 20,
  offset = 0
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 20,
        100
      )
    );

  const safeOffset =
    Math.max(
      0,
      Number(offset) || 0
    );

  return {
    limit:
      safeLimit,

    offset:
      safeOffset,
  };
}


function safeError(
  error,
  fallback
) {
  if (
    error?.message
  ) {
    return error.message;
  }

  return fallback;
}


async function logAction(
  action,
  resourceType,
  resourceId,
  oldValue = null,
  newValue = null
) {
  try {
    const user =
      await getCurrentUser();

    const {
      error,
    } = await supabase
      .from(
        'kd_action_logs'
      )
      .insert({
        user_id:
          user.id,

        action,

        resource_type:
          resourceType,

        resource_id:
          resourceId,

        old_value:
          oldValue,

        new_value:
          newValue,
      });

    if (error) {
      console.warn(
        '[KmerDiaspora] Audit log:',
        error.message
      );
    }

  } catch (error) {
    console.warn(
      '[KmerDiaspora] Audit log exception:',
      error?.message ||
        error
    );
  }
}


/* ============================================================
 * VILLES
 * ============================================================ */

async function assertKmerDiasporaCity(city) {
  const value = String(city || '').trim();
  const cities = await loadKmerDiasporaCities();
  if (!value || !cities.includes(value)) {
    throw new Error(`La ville « ${value || '—'} » n’est pas disponible.`);
  }
}

async function assertKmerDiasporaCities(cities = []) {
  const unique = Array.from(
    new Set(
      cities
        .map((city) => String(city || '').trim())
        .filter(Boolean)
    )
  );

  if (!unique.length) {
    throw new Error('Sélectionnez au moins une ville.');
  }

  const available = await loadKmerDiasporaCities();
  const invalid = unique.find((city) => !available.includes(city));

  if (invalid) {
    throw new Error(`La ville « ${invalid} » n’est pas disponible.`);
  }

  return unique;
}


/* ============================================================
 * RECHERCHE UTILISATEURS
 * ============================================================ */

export async function searchZenderUsers(
  query = '',
  limit = 8
) {
  const clean =
    String(
      query || ''
    ).trim();

  if (
    clean.length < 2
  ) {
    return [];
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number(limit) || 8,
        20
      )
    );

  const currentUser =
    await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(
      'id, username, country'
    )
    .ilike(
      'username',
      `%${clean}%`
    )
    .neq(
      'id',
      currentUser.id
    )
    .order(
      'username',
      {
        ascending:
          true,
      }
    )
    .limit(
      safeLimit
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/* ============================================================
 * PROFIL KMERDIASPORA
 * ============================================================ */

export async function getMyKdProfile() {
  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_profiles'
    )
    .select('*')
    .eq(
      'user_id',
      user.id
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


export async function createKdProfile({
  profileType = 'driver',
  fullName,
  residenceCountry,
  region = null,
  city = null,
  neighborhood = null,
  mobilityArea = null,
  bio = null,
}) {
  const user =
    await getCurrentUser();

  if (city) {
    await assertKmerDiasporaCity(city);
  }

  if (
    !fullName?.trim()
  ) {
    throw new Error(
      'Le nom complet est obligatoire.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_profiles'
    )
    .insert({
      user_id:
        user.id,

      profile_type:
        profileType,

      full_name:
        fullName.trim(),

      residence_country:
        residenceCountry,

      region,

      city,

      neighborhood,

      phone_number:
        null,

      mobility_area:
        mobilityArea,

      bio,

      active:
        true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function updateKdProfile(
  updates = {}
) {
  const user =
    await getCurrentUser();

  const payload = {
    ...updates,
  };

  delete payload.phone_number;

  if (payload.city) {
    await assertKmerDiasporaCity(payload.city);
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_profiles'
    )
    .update(
      payload
    )
    .eq(
      'user_id',
      user.id
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * DEMANDES DE POSTE
 * ============================================================ */

export async function createJobRequest({
  profileId = null,
  country,
  fullName,
  city,
  mobilityArea = null,
  title = null,
  description = null,
}) {
  const user =
    await getCurrentUser();

  await assertKmerDiasporaCity(city);

  let resolvedProfileId =
    profileId;

  if (
    !resolvedProfileId
  ) {
    const profile =
      await getMyKdProfile();

    if (!profile) {
      throw new Error(
        'Créez d’abord votre profil KmerDiaspora.'
      );
    }

    resolvedProfileId =
      profile.id;
  }

  const {
    data:
      ownerProfile,
    error:
      ownerProfileError,
  } = await supabase
    .from(
      'kd_profiles'
    )
    .select(
      'id, user_id'
    )
    .eq(
      'id',
      resolvedProfileId
    )
    .eq(
      'user_id',
      user.id
    )
    .maybeSingle();

  if (
    ownerProfileError
  ) {
    throw ownerProfileError;
  }

  if (
    !ownerProfile
  ) {
    throw new Error(
      'Vous ne pouvez publier qu’une demande liée à votre propre profil.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .insert({
      profile_id:
        resolvedProfileId,

      country,

      full_name:
        fullName?.trim(),

      phone_number:
        null,

      city,

      mobility_area:
        mobilityArea,

      title,

      description,

      status:
        'published',

      published_at:
        new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logAction(
    'create_job_request',
    'job_request',
    data.id,
    null,
    data
  );

  /*
   * Actualiser les missions correspondant à la même ville.
   */
  try {
    const {
      data:
        missions,
      error:
        missionsError,
    } = await supabase
      .from(
        'kd_driver_request_cities'
      )
      .select(
        'driver_request_id'
      )
      .eq(
        'city',
        data.city
      );

    if (!missionsError) {
      const missionIds =
        [
          ...new Set(
            (
              missions ||
              []
            ).map(
              (row) =>
                row.driver_request_id
            )
          ),
        ];

      for (
        const missionId of missionIds
      ) {
        const {
          error:
            matchingError,
        } = await supabase.rpc(
          'kd_generate_driver_matches',
          {
            p_driver_request_id:
              missionId,
          }
        );

        if (
          matchingError
        ) {
          console.warn(
            '[KmerDiaspora] Automatic matching:',
            matchingError.message
          );
        }
      }
    }

  } catch (error) {
    console.warn(
      '[KmerDiaspora] Matching trigger:',
      error?.message ||
        error
    );
  }

  return data;
}


export async function listJobRequests({
  status = null,
  country = null,
  city = null,
  region = null,
  mine = false,
  limit = 20,
  offset = 0,
} = {}) {
  const user =
    await getCurrentUser();

  const p =
    paginate(
      limit,
      offset
    );

  let query =
    supabase
      .from(
        'kd_job_requests'
      )
      .select(
        `
          *,
          profile:kd_profiles!kd_job_requests_profile_fk(*)
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }

  if (country) {
    query =
      query.eq(
        'country',
        country
      );
  }

  if (city) {
    query =
      query.eq(
        'city',
        city
      );
  }

  if (region) {
    query =
      query.eq(
        'region',
        region
      );
  }

  if (mine) {
    const {
      data:
        myProfile,
      error:
        profileError,
    } = await supabase
      .from(
        'kd_profiles'
      )
      .select(
        'id'
      )
      .eq(
        'user_id',
        user.id
      )
      .maybeSingle();

    if (
      profileError
    ) {
      throw profileError;
    }

    if (
      !myProfile?.id
    ) {
      return {
        data: [],
        count: 0,
      };
    }

    query =
      query.eq(
        'profile_id',
        myProfile.id
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  return {
    data:
      data || [],

    count:
      count || 0,
  };
}


export async function getJobRequest(
  requestId
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .select(
      `
        *,
        profile:kd_profiles!kd_job_requests_profile_fk(*)
      `
    )
    .eq(
      'id',
      requestId
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function updateMyJobRequest({
  requestId,
  updates = {},
}) {
  const user =
    await getCurrentUser();

  const {
    data:
      currentRequest,
    error:
      requestError,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .select(`
      *,
      profile:kd_profiles!kd_job_requests_profile_fk(
        id,
        user_id
      )
    `)
    .eq(
      'id',
      requestId
    )
    .maybeSingle();

  if (
    requestError
  ) {
    throw requestError;
  }

  if (
    !currentRequest
  ) {
    throw new Error(
      'Demande de poste introuvable.'
    );
  }

  if (
    currentRequest?.profile?.user_id !==
    user.id
  ) {
    throw new Error(
      'Vous ne pouvez modifier que votre propre demande.'
    );
  }

  const payload = {
    ...updates,
  };

  delete payload.phone_number;

  if (payload.city) {
    await assertKmerDiasporaCity(payload.city);
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .update(
      payload
    )
    .eq(
      'id',
      requestId
    )
    .eq(
      'profile_id',
      currentRequest.profile_id
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logAction(
    'update_job_request',
    'job_request',
    requestId,
    currentRequest,
    data
  );

  return data;
}


export async function deleteMyJobRequest(
  requestId
) {
  const user =
    await getCurrentUser();

  const {
    data:
      request,
    error:
      requestError,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .select(`
      id,
      profile_id,
      profile:kd_profiles!kd_job_requests_profile_fk(
        id,
        user_id
      )
    `)
    .eq(
      'id',
      requestId
    )
    .maybeSingle();

  if (
    requestError
  ) {
    throw requestError;
  }

  if (
    !request
  ) {
    throw new Error(
      'Demande de poste introuvable.'
    );
  }

  if (
    request?.profile?.user_id !==
    user.id
  ) {
    throw new Error(
      'Vous ne pouvez supprimer que votre propre demande.'
    );
  }

  const {
    error,
  } = await supabase
    .from(
      'kd_job_requests'
    )
    .delete()
    .eq(
      'id',
      requestId
    )
    .eq(
      'profile_id',
      request.profile_id
    );

  if (error) {
    throw error;
  }

  await logAction(
    'delete_job_request',
    'job_request',
    requestId,
    request,
    null
  );

  return true;
}


export async function closeJobRequest(
  requestId
) {
  return updateMyJobRequest({
    requestId,
    updates: {
      status:
        'closed',

      closed_at:
        new Date().toISOString(),
    },
  });
}


/* ============================================================
 * MISSIONS CONDUCTEURS
 * ============================================================ */

export async function createDriverRequest({
  country,
  cities = [],
  city = null,
  neighborhood = null,
  latitude = null,
  longitude = null,
  driversNeeded,
  description = null,
}) {
  const user =
    await getCurrentUser();

  const resolvedCities = Array.from(
    new Set((cities.length ? cities : city ? [city] : []).filter(Boolean))
  );

  const validatedCities = await assertKmerDiasporaCities(resolvedCities);

  const needed =
    Number(
      driversNeeded
    );

  if (
    !Number.isInteger(
      needed
    ) ||
    needed < 1
  ) {
    throw new Error(
      'Le nombre de chauffeurs est invalide.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .insert({
      requester_user_id:
        user.id,

      country,

      city:
        validatedCities[0],

      neighborhood,

      latitude,

      longitude,

      drivers_needed:
        needed,

      contact_phone:
        null,

      description,

      status:
        'open',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const {
    error:
      citiesError,
  } = await supabase
    .from(
      'kd_driver_request_cities'
    )
    .insert(
      validatedCities.map(
        (c) => ({
          driver_request_id:
            data.id,

          city:
            c,
        })
      )
    );

  if (
    citiesError
  ) {
    await supabase
      .from(
        'kd_driver_requests'
      )
      .delete()
      .eq(
        'id',
        data.id
      );

    throw citiesError;
  }

  await logAction(
    'create_driver_request',
    'driver_request',
    data.id,
    null,
    {
      ...data,
      cities:
        resolvedCities,
    }
  );

  return {
    ...data,

    cities:
      resolvedCities,
  };
}


export async function listDriverRequests({
  status = null,
  country = null,
  city = null,
  mine = false,
  limit = 20,
  offset = 0,
} = {}) {
  const user =
    await getCurrentUser();

  const p =
    paginate(
      limit,
      offset
    );

  let query =
    supabase
      .from(
        'kd_driver_requests'
      )
      .select(
        `
          *,
          cities:kd_driver_request_cities(city)
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }

  if (country) {
    query =
      query.eq(
        'country',
        country
      );
  }

  if (mine) {
    query =
      query.eq(
        'requester_user_id',
        user.id
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  let rows =
    data || [];

  if (city) {
    rows =
      rows.filter(
        (row) =>
          (
            row.cities ||
            []
          ).some(
            (entry) =>
              entry.city ===
              city
          ) ||
          row.city ===
          city
      );
  }

  return {
    data:
      rows,

    count:
      city
        ? rows.length
        : count || 0,
  };
}


export async function getDriverRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      'Identifiant de mission manquant.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .select(
      `
        *,
        cities:kd_driver_request_cities(city)
      `
    )
    .eq(
      'id',
      requestId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Mission introuvable.'
    );
  }

  return {
    ...data,

    cities:
      (
        data.cities ||
        []
      )
        .map(
          (entry) =>
            typeof entry ===
            'string'
              ? entry
              : entry?.city
        )
        .filter(Boolean),
  };
}


export async function updateMyDriverRequest({
  requestId,
  updates = {},
}) {
  const user =
    await getCurrentUser();

  const {
    data:
      currentRequest,
    error,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .select('*')
    .eq(
      'id',
      requestId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!currentRequest) {
    throw new Error(
      'Mission introuvable.'
    );
  }

  if (
    currentRequest.requester_user_id !==
    user.id
  ) {
    throw new Error(
      'Vous ne pouvez modifier que votre propre mission.'
    );
  }

  const {
    cities,
    ...mainUpdates
  } = {
    ...updates,
  };

  delete mainUpdates.contact_phone;

  if (mainUpdates.city) {
    await assertKmerDiasporaCity(mainUpdates.city);
  }

  const {
    data,
    error:
      updateError,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .update(
      mainUpdates
    )
    .eq(
      'id',
      requestId
    )
    .eq(
      'requester_user_id',
      user.id
    )
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  if (
    Array.isArray(
      cities
    )
  ) {
    const normalized =
      Array.from(
        new Set(
          cities.filter(
            Boolean
          )
        )
      );

    if (
      !normalized.length
    ) {
      throw new Error(
        'Sélectionnez au moins une ville.'
      );
    }

    const validatedCities = await assertKmerDiasporaCities(normalized);

    const {
      error:
        deleteCitiesError,
    } = await supabase
      .from(
        'kd_driver_request_cities'
      )
      .delete()
      .eq(
        'driver_request_id',
        requestId
      );

    if (
      deleteCitiesError
    ) {
      throw deleteCitiesError;
    }

    const {
      error:
        insertCitiesError,
    } = await supabase
      .from(
        'kd_driver_request_cities'
      )
      .insert(
        validatedCities.map(
          (c) => ({
            driver_request_id:
              requestId,

            city:
              c,
          })
        )
      );

    if (
      insertCitiesError
    ) {
      throw insertCitiesError;
    }
  }

  await logAction(
    'update_driver_request',
    'driver_request',
    requestId,
    currentRequest,
    data
  );

  return {
    ...data,

    cities:
      Array.isArray(
        cities
      )
        ? cities
        : undefined,
  };
}


export async function deleteMyDriverRequest(
  requestId
) {
  const user =
    await getCurrentUser();

  const {
    data:
      request,
    error,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .select('*')
    .eq(
      'id',
      requestId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!request) {
    throw new Error(
      'Mission introuvable.'
    );
  }

  if (
    request.requester_user_id !==
    user.id
  ) {
    throw new Error(
      'Vous ne pouvez supprimer que votre propre mission.'
    );
  }

  const {
    error:
      deleteError,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .delete()
    .eq(
      'id',
      requestId
    )
    .eq(
      'requester_user_id',
      user.id
    );

  if (deleteError) {
    throw deleteError;
  }

  await logAction(
    'delete_driver_request',
    'driver_request',
    requestId,
    request,
    null
  );

  return true;
}


/* ============================================================
 * MATCHING
 * ============================================================ */

export async function listMatches({
  status = null,
  driverRequestId = null,
  limit = 30,
  offset = 0,
} = {}) {
  const p =
    paginate(
      limit,
      offset
    );

  /*
   * Générer/actualiser les correspondances avant lecture.
   */
  if (
    driverRequestId
  ) {
    const {
      error:
        matchingError,
    } = await supabase.rpc(
      'kd_generate_driver_matches',
      {
        p_driver_request_id:
          driverRequestId,
      }
    );

    if (
      matchingError
    ) {
      console.warn(
        '[KmerDiaspora] Automatic matching:',
        matchingError.message
      );
    }
  }

  let query =
    supabase
      .from(
        'kd_driver_matches'
      )
      .select(
        `
          *,
          driver_request:driver_request_id(
            *,
            cities:kd_driver_request_cities(city)
          ),
          job_request:job_request_id(
            *,
            profile:kd_profiles!kd_job_requests_profile_fk(*)
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'score',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }

  if (
    driverRequestId
  ) {
    query =
      query.eq(
        'driver_request_id',
        driverRequestId
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  return {
    data:
      data || [],

    count:
      count || 0,
  };
}


export async function getMatch(
  matchId
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_driver_matches'
    )
    .select(
      `
        *,
        driver_request:driver_request_id(
          *,
          cities:kd_driver_request_cities(city)
        ),
        job_request:job_request_id(
          *,
          profile:kd_profiles!kd_job_requests_profile_fk(*)
        )
      `
    )
    .eq(
      'id',
      matchId
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function selectMatch({
  matchId,
}) {
  const user =
    await getCurrentUser();

  const match =
    await getMatch(
      matchId
    );

  if (
    match?.driver_request
      ?.requester_user_id !==
    user.id
  ) {
    throw new Error(
      'Seul le recruteur propriétaire de la mission peut sélectionner ce profil.'
    );
  }

  if (
    [
      'closed',
      'cancelled',
      'suspended',
    ].includes(
      match.driver_request.status
    )
  ) {
    throw new Error(
      'Cette mission est fermée.'
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_driver_matches'
    )
    .update({
      status:
        'selected',

      selected_at:
        now,
    })
    .eq(
      'id',
      matchId
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  const {
    error:
      missionError,
  } = await supabase
    .from(
      'kd_driver_requests'
    )
    .update({
      selected_job_request_id:
        match.job_request_id,

      selected_at:
        now,

      status:
        'profile_selected',

      updated_at:
        now,
    })
    .eq(
      'id',
      match.driver_request_id
    )
    .eq(
      'requester_user_id',
      user.id
    );

  if (
    missionError
  ) {
    throw missionError;
  }

  await logAction(
    'select_match',
    'driver_match',
    matchId,
    match,
    data
  );

  return {
    ...data,

    driverRequestId:
      match.driver_request_id,

    jobRequestId:
      match.job_request_id,
  };
}


/* ============================================================
 * RECRUTER UN PROFIL MATCHÉ
 * ============================================================ */

export async function recruitMatchedProfile({
  matchId,
}) {
  const user =
    await getCurrentUser();

  if (!matchId) {
    throw new Error(
      'Correspondance introuvable.'
    );
  }

  const {
    data:
      match,
    error:
      matchError,
  } = await supabase
    .from(
      'kd_driver_matches'
    )
    .select(
      `
        *,
        driver_request:driver_request_id(
          *,
          cities:kd_driver_request_cities(city)
        ),
        job_request:job_request_id(
          *,
          profile:kd_profiles!kd_job_requests_profile_fk(*)
        )
      `
    )
    .eq(
      'id',
      matchId
    )
    .single();

  if (
    matchError
  ) {
    throw matchError;
  }

  if (
    !match
  ) {
    throw new Error(
      'Correspondance introuvable.'
    );
  }

  if (
    match?.driver_request
      ?.requester_user_id !==
    user.id
  ) {
    throw new Error(
      'Seul le créateur de la mission peut recruter un profil.'
    );
  }

  if (
    [
      'closed',
      'cancelled',
      'suspended',
    ].includes(
      match.driver_request.status
    )
  ) {
    throw new Error(
      'Cette mission n’accepte plus de recrutement.'
    );
  }

  const {
    data:
      recruiter,
    error:
      recruiterError,
  } = await supabase
    .from(
      'profiles'
    )
    .select(
      `
        id,
        username,
        country,
        whatsapp_number
      `
    )
    .eq(
      'id',
      user.id
    )
    .single();

  if (
    recruiterError
  ) {
    throw recruiterError;
  }

  const candidate =
    match.job_request ||
    {};

  const candidateProfile =
    candidate.profile ||
    {};

  const payload = {
    match_id:
      match.id,

    driver_request_id:
      match.driver_request_id,

    job_request_id:
      match.job_request_id,

    recruiter_user_id:
      user.id,

    candidate_user_id:
      candidateProfile.user_id ||
      null,

    recruiter: {
      id:
        recruiter.id,

      username:
        recruiter.username,

      country:
        recruiter.country,

      whatsapp_number:
        recruiter.whatsapp_number,
    },

    candidate: {
      user_id:
        candidateProfile.user_id ||
        null,

      username:
        candidateProfile.username ||
        null,

      full_name:
        candidate.full_name ||
        candidateProfile.full_name ||
        null,

      country:
        candidate.country ||
        candidateProfile.residence_country ||
        null,

      region:
        candidate.region ||
        candidateProfile.region ||
        null,

      city:
        candidate.city ||
        candidateProfile.city ||
        null,

      neighborhood:
        candidate.neighborhood ||
        candidateProfile.neighborhood ||
        null,

      mobility_area:
        candidate.mobility_area ||
        candidateProfile.mobility_area ||
        null,

      whatsapp_number:
        candidateProfile.whatsapp_number ||
        null,
    },

    mission: {
      id:
        match.driver_request.id,

      country:
        match.driver_request.country,

      cities:
        (
          match.driver_request.cities ||
          []
        )
          .map(
            (row) =>
              typeof row ===
              'string'
                ? row
                : row?.city
          )
          .filter(
            Boolean
          ),

      neighborhood:
        match.driver_request
          .neighborhood,

      drivers_needed:
        match.driver_request
          .drivers_needed,

      description:
        match.driver_request
          .description,

      status:
        match.driver_request
          .status,
    },

    match: {
      score:
        match.score ??
        match.match_score ??
        0,

      status:
        match.status,
    },
  };

  /*
   * Notification persistante destinée au traitement
   * de KmAdministrateur.
   */
  await logAction(
    'recruit_matched_profile',
    'recruitment_request',
    match.id,
    null,
    payload
  );

  const {
    data:
      updatedMatch,
    error:
      updateError,
  } = await supabase
    .from(
      'kd_driver_matches'
    )
    .update({
      status:
        'recruitment_requested',

      recruited_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      match.id
    )
    .select()
    .single();

  if (
    updateError
  ) {
    throw updateError;
  }

  return {
    success:
      true,

    match:
      updatedMatch,

    recruitment:
      payload,
  };
}

export async function markMatchContactInitiated(
  matchId
) {
  const user =
    await getCurrentUser();

  if (!matchId) {
    throw new Error(
      'Identifiant de correspondance manquant.'
    );
  }

  const match =
    await getMatch(
      matchId
    );

  if (!match) {
    throw new Error(
      'Correspondance introuvable.'
    );
  }

  const isOwner =
    match?.driver_request
      ?.requester_user_id ===
    user.id;


  /* ==========================================================
   * VÉRIFICATION KM ADMINISTRATEUR
   * ========================================================== */

  const {
    data:
      kmaData,
    error:
      kmaError,
  } = await supabase
    .from(
      'kmerdiaspora_admins'
    )
    .select(
      'id'
    )
    .eq(
      'auth_user_id',
      user.id
    )
    .eq(
      'active',
      true
    )
    .maybeSingle();

  if (kmaError) {
    throw kmaError;
  }

  const isKma =
    !!kmaData;


  if (
    !isOwner &&
    !isKma
  ) {
    throw new Error(
      'Accès non autorisé.'
    );
  }


  /* ==========================================================
   * TIMESTAMP DE PRISE DE CONTACT
   * ========================================================== */

  const now =
    new Date().toISOString();


  /*
   * IMPORTANT :
   *
   * Ne PAS modifier kd_driver_matches.status.
   *
   * Le statut `contact_initiated` n'est pas autorisé
   * par la contrainte `kd_driver_matches_status_check`.
   *
   * La prise de contact est donc enregistrée via
   * `whatsapp_initiated_at`.
   */

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_driver_matches'
    )
    .update({
      whatsapp_initiated_at:
        now,
    })
    .eq(
      'id',
      matchId
    )
    .select()
    .single();


  if (error) {
    throw error;
  }


  /* ==========================================================
   * MISSION / DEMANDE CONDUCTEUR
   * ========================================================== */

  /*
   * Même principe pour kd_driver_requests :
   * nous ne forçons pas un statut qui pourrait être interdit
   * par sa propre contrainte SQL.
   *
   * Le timestamp reste la source de vérité pour indiquer
   * que la prise de contact a été effectuée.
   */

  if (
    match.driver_request_id
  ) {
    const {
      error:
        missionError,
    } = await supabase
      .from(
        'kd_driver_requests'
      )
      .update({
        whatsapp_initiated_at:
          now,

        updated_at:
          now,
      })
      .eq(
        'id',
        match.driver_request_id
      );

    if (
      missionError
    ) {
      throw missionError;
    }
  }


  /* ==========================================================
   * RETOUR
   * ========================================================== */

  return {
    ...data,

    contact_initiated:
      true,

    whatsapp_initiated_at:
      now,
  };
}



/* ============================================================
 * KM ADMINISTRATEUR
 * ============================================================ */

export async function getKmAdministrator() {
  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_settings'
    )
    .select(
      'whatsapp_admin_number, whatsapp_admin_name'
    )
    .eq(
      'id',
      1
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !data?.whatsapp_admin_number
  ) {
    throw new Error(
      'Le numéro WhatsApp de KmAdministrateur n’est pas encore configuré.'
    );
  }

  return data;
}


/* ============================================================
 * QUETES
 * ============================================================ */

export async function createQuest({
  beneficiaryUserId = null,
  title,
  description = null,
  targetAmount = null,
  currency = 'XAF',
  durationEnd,
  initialContribution,
  secretCode,
}) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'kd_create_quest',
      {
        p_beneficiary_user_id:
          beneficiaryUserId ||
          null,

        p_title:
          title,

        p_description:
          description,

        p_target_amount:
          targetAmount === '' ||
          targetAmount == null
            ? null
            : Number(
                targetAmount
              ),

        p_duration_end:
          durationEnd,

        p_initial_contribution:
          Number(
            initialContribution
          ),

        p_secret_code:
          secretCode,

        p_currency:
          currency ||
          'XAF',
      }
    );

  if (error) {
    throw new Error(
      safeError(
        error,
        'Impossible de créer la quête.'
      )
    );
  }

  return data;
}


export async function listQuests({
  status = null,
  mine = false,
  forApproval = false,
  limit = 20,
  offset = 0,
} = {}) {
  const user =
    await getCurrentUser();

  const p =
    paginate(
      limit,
      offset
    );

  let query =
    supabase
      .from(
        'kd_quests'
      )
      .select(
        `
          *,
          creator:profiles!kd_quests_creator_fk(
            id,
            username
          ),
          beneficiary:profiles!kd_quests_beneficiary_fk(
            id,
            username
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (status) {
    query =
      query.eq(
        'status',
        status
      );
  }

  if (mine) {
    query =
      query.eq(
        'creator_user_id',
        user.id
      );
  }

  if (forApproval) {
    query =
      query
        .eq(
          'beneficiary_user_id',
          user.id
        )
        .eq(
          'status',
          'pending_beneficiary_approval'
        );
  }

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  return {
    data:
      data || [],

    count:
      count || 0,
  };
}


/*
 * IMPORTANT :
 * Cette fonction doit rester exportée.
 * Elle est utilisée par plusieurs écrans de l'application.
 */
export async function listMyQuests({
  status = null,
  limit = 50,
  offset = 0,
} = {}) {
  return listQuests({
    status,

    mine:
      true,

    limit,

    offset,
  });
}


export async function getQuest(
  questId
) {
  if (!questId) {
    throw new Error(
      'Identifiant de quête manquant.'
    );
  }

  /*
   * 1. Charger la quête sans embed.
   * Cela empêche les relations FK ambiguës de rendre
   * la quête elle-même introuvable.
   */
  const {
    data:
      quest,
    error:
      questError,
  } = await supabase
    .from(
      'kd_quests'
    )
    .select('*')
    .eq(
      'id',
      questId
    )
    .maybeSingle();

  if (
    questError
  ) {
    throw questError;
  }

  if (
    !quest
  ) {
    throw new Error(
      'Quête introuvable.'
    );
  }


  /* ==========================================================
     PROFILS
     ========================================================== */

  const profileIds =
    [
      quest.creator_user_id,

      quest.beneficiary_user_id,
    ]
      .filter(
        Boolean
      );

  let profiles =
    [];

  if (
    profileIds.length
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        'profiles'
      )
      .select(
        `
          id,
          username,
          whatsapp_number,
          country
        `
      )
      .in(
        'id',
        [
          ...new Set(
            profileIds
          ),
        ]
      );

    if (!error) {
      profiles =
        data || [];
    }
  }


  const creator =
    profiles.find(
      (profile) =>
        profile.id ===
        quest.creator_user_id
    ) ||
    null;


  const beneficiary =
    profiles.find(
      (profile) =>
        profile.id ===
        quest.beneficiary_user_id
    ) ||
    null;


  /* ==========================================================
     CONTRIBUTIONS
     ========================================================== */

  let contributions =
    [];

  const {
    data:
      contributionData,
    error:
      contributionError,
  } = await supabase
    .from(
      'kd_quest_contributions'
    )
    .select(
      `
        *,
        contributor:profiles!kd_contributions_user_fk(
          id,
          username,
          whatsapp_number,
          country
        )
      `
    )
    .eq(
      'quest_id',
      questId
    )
    .order(
      'contributed_at',
      {
        ascending:
          false,
      }
    );

  if (
    !contributionError
  ) {
    contributions =
      contributionData ||
      [];
  }


  /* ==========================================================
     MEMBRES
     ========================================================== */

  let members =
    [];

  const {
    data:
      memberData,
    error:
      memberError,
  } = await supabase
    .from(
      'kd_quest_members'
    )
    .select('*')
    .eq(
      'quest_id',
      questId
    );

  if (
    !memberError
  ) {
    members =
      memberData ||
      [];
  }


  /*
   * Le créateur est toujours membre.
   * Pour une ancienne quête où la ligne n'existe pas encore,
   * on le considère quand même comme membre côté application.
   */
  if (
    quest.creator_user_id
  ) {
    const hasCreator =
      members.some(
        (member) =>
          member.user_id ===
            quest.creator_user_id &&
          member.status ===
            'active'
      );

    if (
      !hasCreator
    ) {
      members.unshift({
        quest_id:
          quest.id,

        user_id:
          quest.creator_user_id,

        status:
          'active',

        is_creator:
          true,
      });
    }
  }


  /* ==========================================================
     EVENEMENTS
     ========================================================== */

  let events =
    [];

  const {
    data:
      eventData,
    error:
      eventError,
  } = await supabase
    .from(
      'kd_quest_events'
    )
    .select('*')
    .eq(
      'quest_id',
      questId
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    );

  if (
    !eventError
  ) {
    events =
      eventData ||
      [];
  }


  return {
    ...quest,

    creator,

    beneficiary,

    contributions,

    members,

    events,
  };
}


export async function updateQuest({
  questId,
  updates = {},
}) {
  const user =
    await getCurrentUser();

  const payload = {
    ...updates,
  };

  delete payload.creator_user_id;
  delete payload.beneficiary_user_id;
  delete payload.current_amount;
  delete payload.settlement_transaction_id;


  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_quests'
    )
    .update(
      payload
    )
    .eq(
      'id',
      questId
    )
    .eq(
      'creator_user_id',
      user.id
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function cancelQuest(
  questId
) {
  const user =
    await getCurrentUser();

  const quest =
    await getQuest(
      questId
    );

  if (
    quest.creator_user_id !==
    user.id
  ) {
    throw new Error(
      'Vous ne pouvez pas annuler cette quête.'
    );
  }

  if (
    Number(
      quest.current_amount ||
      0
    ) > 0
  ) {
    throw new Error(
      'Une quête ayant reçu une contribution ne peut plus être annulée manuellement.'
    );
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_quests'
    )
    .update({
      status:
        'cancelled',

      cancelled_at:
        now,

      closed_at:
        now,
    })
    .eq(
      'id',
      questId
    )
    .eq(
      'creator_user_id',
      user.id
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export async function joinQuest(
  questId
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'kd_join_quest',
      {
        p_quest_id:
          questId,
      }
    );

  if (error) {
    throw new Error(
      safeError(
        error,
        'Impossible de rejoindre cette quête.'
      )
    );
  }

  return data;
}


export async function respondQuestApproval(
  questId,
  approved
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'kd_respond_quest_approval',
      {
        p_quest_id:
          questId,

        p_approved:
          !!approved,
      }
    );

  if (error) {
    throw new Error(
      safeError(
        error,
        'Impossible de traiter la demande.'
      )
    );
  }

  return data;
}


/* ============================================================
 * CONTRIBUTION A UNE QUETE
 * ============================================================ */

export async function contributeToQuest({
  questId,
  amount,
  secretCode,
}) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      'kd_contribute_to_quest',
      {
        p_quest_id:
          questId,

        p_amount:
          Number(
            amount
          ),

        p_secret_code:
          secretCode,
      }
    );

  if (error) {
    throw new Error(
      safeError(
        error,
        'Contribution impossible.'
      )
    );
  }

  return data;
}


/* ============================================================
 * CONTRIBUTIONS
 * ============================================================ */

export async function listQuestContributions({
  questId = null,
  mine = false,
  limit = 50,
  offset = 0,
} = {}) {
  const user =
    await getCurrentUser();

  const p =
    paginate(
      limit,
      offset
    );

  let query =
    supabase
      .from(
        'kd_quest_contributions'
      )
      .select(
        `
          *,
          contributor:profiles!kd_contributions_user_fk(
            id,
            username,
            whatsapp_number,
            country
          )
        `,
        {
          count:
            'exact',
        }
      )
      .order(
        'contributed_at',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (questId) {
    query =
      query.eq(
        'quest_id',
        questId
      );
  }

  if (mine) {
    query =
      query.eq(
        'contributor_user_id',
        user.id
      );
  }

  const {
    data,
    error,
    count,
  } =
    await query;

  if (error) {
    throw error;
  }

  return {
    data:
      data || [],

    count:
      count || 0,
  };
}


/* ============================================================
 * MEMBRES QUETES
 * ============================================================ */

export async function listMyMemberships({
  limit = 50,
} = {}) {
  const user =
    await getCurrentUser();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'kd_quest_members'
      )
      .select(
        `
          *,
          quest:quest_id(*)
        `
      )
      .eq(
        'user_id',
        user.id
      )
      .eq(
        'status',
        'active'
      )
      .order(
        'joined_at',
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

  return data || [];
}


/* ============================================================
 * MODERATION
 * ============================================================ */

export async function moderateContent({
  contentType,
  contentId,
  action,
  reason = null,
  oldStatus = null,
  newStatus = null,
}) {
  const user =
    await getCurrentUser();

  const [
    a,
    k,
  ] =
    await Promise.all([
      supabase
        .from('admins')
        .select(
          'id, active'
        )
        .eq(
          'auth_user_id',
          user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle(),

      supabase
        .from(
          'kmerdiaspora_admins'
        )
        .select(
          'id, active'
        )
        .eq(
          'auth_user_id',
          user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle(),
    ]);

  if (a.error) {
    throw a.error;
  }

  if (k.error) {
    throw k.error;
  }

  if (
    !a.data &&
    !k.data
  ) {
    throw new Error(
      'Accès non autorisé.'
    );
  }

  const payload = {
    content_type:
      contentType,

    content_id:
      contentId,

    action,

    reason,

    old_status:
      oldStatus,

    new_status:
      newStatus,
  };

  if (a.data) {
    payload.admin_id =
      a.data.id;
  } else {
    payload.kma_id =
      k.data.id;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_moderation_actions'
    )
    .insert(
      payload
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * RAPPORTS
 * ============================================================ */

export async function listReports({
  reportType = null,
  limit = 50,
  offset = 0,
} = {}) {
  const p =
    paginate(
      limit,
      offset
    );

  let q =
    supabase
      .from(
        'kd_reports'
      )
      .select(
        '*',
        {
          count:
            'exact',
        }
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      )
      .range(
        p.offset,
        p.offset +
          p.limit -
          1
      );

  if (
    reportType
  ) {
    q =
      q.eq(
        'report_type',
        reportType
      );
  }

  const {
    data,
    error,
    count,
  } =
    await q;

  if (error) {
    throw error;
  }

  return {
    data:
      data || [],

    count:
      count || 0,
  };
}


export async function createReport({
  reportType,
  title,
  content,
  fileUrl = null,
  reportDate = null,
}) {
  const user =
    await getCurrentUser();

  const [
    a,
    k,
  ] =
    await Promise.all([
      supabase
        .from('admins')
        .select(
          'id, active'
        )
        .eq(
          'auth_user_id',
          user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle(),

      supabase
        .from(
          'kmerdiaspora_admins'
        )
        .select(
          'id, active'
        )
        .eq(
          'auth_user_id',
          user.id
        )
        .eq(
          'active',
          true
        )
        .maybeSingle(),
    ]);

  if (a.error) {
    throw a.error;
  }

  if (k.error) {
    throw k.error;
  }

  const payload = {
    report_type:
      reportType,

    title,

    content,

    file_url:
      fileUrl,

    report_date:
      reportDate ||
      new Date()
        .toISOString()
        .slice(
          0,
          10
        ),
  };

  if (a.data) {
    payload.admin_id =
      a.data.id;

  } else if (
    k.data
  ) {
    payload.kma_id =
      k.data.id;

  } else {
    throw new Error(
      'Accès non autorisé.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'kd_reports'
    )
    .insert(
      payload
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
