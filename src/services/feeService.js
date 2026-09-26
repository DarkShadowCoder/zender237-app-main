// src/services/feeService.js

import { supabase } from '../lib/supabase';

/*
 * Les tarifs sont enregistrés dans transfer_fee_tariffs.
 *
 * IMPORTANT :
 * - un tarif peut être enregistré dans un seul sens (ex. mali -> cameroun) ;
 * - un transfert peut être demandé dans l'autre sens (ex. cameroun -> mali) ;
 * - les deux sens utilisent donc la même tranche tarifaire.
 *
 * Nous cherchons directement dans la table plutôt que d'appeler la RPC
 * get_transfer_fee. Cela évite notamment les erreurs liées à plusieurs
 * signatures PostgreSQL portant le même nom (text vs user_country) et rend
 * la recherche indépendante de l'ordre des pays dans la base.
 */


/* ============================================================
 * NORMALISATION PAYS
 * ============================================================ */

function normalizeCountry(value) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );

  const aliases = {
    cameroon:
      'cameroun',

    cameroun:
      'cameroun',

    guinea:
      'guinee',

    guinee:
      'guinee',

    mali:
      'mali',
  };

  return (
    aliases[normalized] ||
    normalized
  );
}


/* ============================================================
 * NORMALISATION MONTANT
 * ============================================================ */

function normalizeAmount(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  let raw =
    String(value)
      .trim()
      .replace(
        /\u00a0/g,
        ''
      )
      .replace(
        /FCFA|XAF|CFA|F[_ -]?CFA/gi,
        ''
      )
      .trim();

  if (!raw) {
    return null;
  }

  /*
   * Les montants saisis dans l'application
   * sont généralement du type :
   *
   * 100 000
   * 250 000
   * 1 000 000
   *
   * On supprime donc les espaces.
   */
  raw =
    raw.replace(
      /\s+/g,
      ''
    );

  /*
   * Supporte également :
   *
   * 100000,50
   *
   * sans casser les montants utilisant
   * la virgule comme séparateur de milliers.
   */
  if (
    /^-?\d+,\d{1,2}$/.test(
      raw
    )
  ) {
    raw =
      raw.replace(
        ',',
        '.'
      );
  } else {
    raw =
      raw.replace(
        /,/g,
        ''
      );
  }

  const number =
    Number(raw);

  return Number.isFinite(number)
    ? number
    : null;
}


/* ============================================================
 * VALIDATION PAYS
 * ============================================================ */

function validateCountries(
  fromCountry,
  toCountry
) {
  const from =
    normalizeCountry(
      fromCountry
    );

  const to =
    normalizeCountry(
      toCountry
    );

  if (
    !from ||
    !to
  ) {
    return {
      from: null,
      to: null,
    };
  }

  if (
    from === to
  ) {
    return {
      from,
      to,
    };
  }

  const supported = [
    'cameroun',
    'guinee',
    'mali',
  ];

  if (
    !supported.includes(
      from
    ) ||
    !supported.includes(
      to
    )
  ) {
    return {
      from: null,
      to: null,
    };
  }

  return {
    from,
    to,
  };
}


/* ============================================================
 * RECHERCHE D'UNE TRANCHE TARIFAIRE
 * ============================================================ */

async function findFeeForOrientation({
  countryA,
  countryB,
  amount,
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select(
        'id, country_a, country_b, min_amount, max_amount, fee_amount'
      )
      .eq(
        'country_a',
        countryA
      )
      .eq(
        'country_b',
        countryB
      )
      .lte(
        'min_amount',
        amount
      )
      .gte(
        'max_amount',
        amount
      )
      .order(
        'min_amount',
        {
          ascending:
            false,
        }
      )
      .limit(1);

  if (error) {
    throw error;
  }

  return (
    data?.[0] ||
    null
  );
}


/* ============================================================
 * CALCUL DES FRAIS
 * ============================================================ */

/**
 * Retourne les frais d'un transfert,
 * quel que soit le sens enregistré en base.
 *
 * Exemple :
 *
 * DB :
 *   mali -> cameroun
 *
 * Demande :
 *   cameroun -> mali
 *
 * Résultat :
 *   même tarif
 */
export async function getTransferFee({
  fromCountry,
  toCountry,
  amount,
}) {
  const {
    from,
    to,
  } =
    validateCountries(
      fromCountry,
      toCountry
    );

  if (
    !from ||
    !to ||
    from === to
  ) {
    return null;
  }

  const numericAmount =
    normalizeAmount(
      amount
    );

  if (
    numericAmount === null ||
    numericAmount <= 0
  ) {
    return null;
  }

  /*
   * 1. Recherche dans le sens demandé
   *
   * cameroun -> mali
   *
   * 2. Recherche dans le sens inverse
   *
   * mali -> cameroun
   *
   * Cela permet de fonctionner même si les anciennes
   * données ont été enregistrées dans un seul sens.
   */
  const [
    directTariff,
    reverseTariff,
  ] =
    await Promise.all([
      findFeeForOrientation({
        countryA:
          from,

        countryB:
          to,

        amount:
          numericAmount,
      }),

      findFeeForOrientation({
        countryA:
          to,

        countryB:
          from,

        amount:
          numericAmount,
      }),
    ]);

  const tariff =
    directTariff ||
    reverseTariff;

  if (!tariff) {
    return null;
  }

  const fee =
    Number(
      tariff.fee_amount
    );

  if (
    !Number.isFinite(
      fee
    ) ||
    fee < 0
  ) {
    return null;
  }

  return fee;
}


/* ============================================================
 * DESTINATIONS DISPONIBLES
 * ============================================================ */

/**
 * Retourne les destinations disponibles depuis
 * un pays, quelle que soit l'orientation enregistrée.
 */
export async function getAvailableDestinationCountries(
  fromCountry
) {
  const normalizedFrom =
    normalizeCountry(
      fromCountry
    );

  if (!normalizedFrom) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select(
        'country_a, country_b'
      )
      .or(
        `country_a.eq.${normalizedFrom},country_b.eq.${normalizedFrom}`
      );

  if (error) {
    throw error;
  }

  const destinations =
    new Set();

  for (
    const row of
      data ?? []
  ) {
    const a =
      normalizeCountry(
        row.country_a
      );

    const b =
      normalizeCountry(
        row.country_b
      );

    if (
      a === normalizedFrom &&
      b
    ) {
      destinations.add(
        b
      );

      continue;
    }

    if (
      b === normalizedFrom &&
      a
    ) {
      destinations.add(
        a
      );
    }
  }

  return [
    ...destinations,
  ];
}


/* ============================================================
 * PAYS DE L'UTILISATEUR
 * ============================================================ */

export async function getMyCountry() {
  const {
    data:
      authData,
    error:
      authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !authData?.user
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(
        'country'
      )
      .eq(
        'id',
        authData.user.id
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return (
    data?.country ??
    null
  );
}