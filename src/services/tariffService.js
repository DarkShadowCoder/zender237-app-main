// src/services/tariffService.js

import { supabase } from '../lib/supabase';

const COUNTRY_ORDER = {
  cameroun: 1,
  guinee: 2,
  mali: 3,
};

function normalizeCountry(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeAmount(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  if (normalized === '') {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

/**
 * Transforme toujours une paire de pays en Frais canonique.
 *
 * Exemple :
 *   guinee + cameroun => cameroun / guinee
 *   cameroun + guinee => cameroun / guinee
 *
 * Le sens n'a donc plus d'importance.
 */
export function normalizeTariffRoute(
  countryA,
  countryB
) {
  const a = normalizeCountry(countryA);
  const b = normalizeCountry(countryB);

  if (!a || !b) {
    throw new Error(
      'Les pays du trajet sont obligatoires.'
    );
  }

  if (a === b) {
    throw new Error(
      'Le pays de départ et le pays de destination doivent être différents.'
    );
  }

  const rankA =
    COUNTRY_ORDER[a] ??
    999;

  const rankB =
    COUNTRY_ORDER[b] ??
    999;

  if (
    rankA < rankB ||
    (
      rankA === rankB &&
      a < b
    )
  ) {
    return {
      country_a: a,
      country_b: b,
    };
  }

  return {
    country_a: b,
    country_b: a,
  };
}

export function getTariffRouteKey(
  countryA,
  countryB
) {
  const route =
    normalizeTariffRoute(
      countryA,
      countryB
    );

  return `${route.country_a}|${route.country_b}`;
}

export function normalizeTariffPayload({
  countryA,
  countryB,
  minAmount,
  maxAmount,
  feeAmount,
}) {
  const route =
    normalizeTariffRoute(
      countryA,
      countryB
    );

  const min =
    normalizeAmount(
      minAmount
    );

  const max =
    normalizeAmount(
      maxAmount
    );

  const fee =
    normalizeAmount(
      feeAmount
    );

  if (
    min === null ||
    min < 0
  ) {
    throw new Error(
      'Le montant minimum est invalide.'
    );
  }

  if (
    max === null ||
    max <= min
  ) {
    throw new Error(
      'Le montant maximum doit être supérieur au montant minimum.'
    );
  }

  if (
    fee === null ||
    fee < 0
  ) {
    throw new Error(
      'Le montant des frais est invalide.'
    );
  }

  return {
    ...route,

    min_amount:
      min,

    max_amount:
      max,

    fee_amount:
      fee,
  };
}

function isSameTariff(
  row,
  tariff
) {
  try {
    const route =
      normalizeTariffRoute(
        row.country_a,
        row.country_b
      );

    return (
      route.country_a ===
        tariff.country_a &&
      route.country_b ===
        tariff.country_b &&
      Number(row.min_amount) ===
        Number(tariff.min_amount) &&
      Number(row.max_amount) ===
        Number(tariff.max_amount)
    );
  } catch (_) {
    return false;
  }
}

function createDuplicateTariffError({
  countryA,
  countryB,
  minAmount,
  maxAmount,
}) {
  const error =
    new Error(
      `Un tarif existe déjà pour ${countryA} ↔ ${countryB} sur la tranche ${minAmount} à ${maxAmount}.`
    );

  error.code =
    'TARIFF_ALREADY_EXISTS';

  return error;
}

/**
 * Recherche un conflit dans les DEUX orientations :
 *
 * A -> B
 * B -> A
 *
 * sont considérés comme exactement le même tarif.
 */
async function findConflictingTariff({
  tariff,
  tariffId = null,
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
      .or(
        `and(country_a.eq.${tariff.country_a},country_b.eq.${tariff.country_b}),and(country_a.eq.${tariff.country_b},country_b.eq.${tariff.country_a})`
      );

  if (error) {
    throw error;
  }

  return (
    (data ?? []).find(
      (row) =>
        row.id !== tariffId &&
        isSameTariff(
          row,
          tariff
        )
    ) ??
    null
  );
}

/**
 * Retourne les tarifs avec une seule représentation par Frais/tranche.
 *
 * Si une ancienne ligne existe encore sous la forme :
 *   Guinée -> Cameroun
 *
 * elle sera affichée comme :
 *   Cameroun ↔ Guinée
 */
export async function listTransferTariffs() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select('*')
      .order(
        'min_amount',
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw error;
  }

  const unique =
    new Map();

  for (
    const row of
      data ?? []
  ) {
    let normalizedRoute;

    try {
      normalizedRoute =
        normalizeTariffRoute(
          row.country_a,
          row.country_b
        );
    } catch (_) {
      continue;
    }

    const key = [
      normalizedRoute.country_a,
      normalizedRoute.country_b,
      row.min_amount,
      row.max_amount,
    ].join('|');

    if (
      !unique.has(key)
    ) {
      unique.set(
        key,
        {
          ...row,

          country_a:
            normalizedRoute.country_a,

          country_b:
            normalizedRoute.country_b,
        }
      );
    }
  }

  return [
    ...unique.values(),
  ].sort(
    (a, b) => {
      const routeA =
        `${a.country_a}|${a.country_b}`;

      const routeB =
        `${b.country_a}|${b.country_b}`;

      return (
        routeA.localeCompare(
          routeB
        ) ||
        Number(
          a.min_amount
        ) -
          Number(
            b.min_amount
          )
      );
    }
  );
}

export async function createTransferTariff({
  countryA,
  countryB,
  minAmount,
  maxAmount,
  feeAmount,
}) {
  const tariff =
    normalizeTariffPayload({
      countryA,
      countryB,
      minAmount,
      maxAmount,
      feeAmount,
    });

  const conflicting =
    await findConflictingTariff({
      tariff,
    });

  if (conflicting) {
    throw createDuplicateTariffError({
      countryA:
        tariff.country_a,

      countryB:
        tariff.country_b,

      minAmount:
        tariff.min_amount,

      maxAmount:
        tariff.max_amount,
    });
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .insert(
        tariff
      )
      .select()
      .single();

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw createDuplicateTariffError({
        countryA:
          tariff.country_a,

        countryB:
          tariff.country_b,

        minAmount:
          tariff.min_amount,

        maxAmount:
          tariff.max_amount,
      });
    }

    throw error;
  }

  return data;
}

export async function updateTransferTariff({
  tariffId,
  updates,
}) {
  if (!tariffId) {
    throw new Error(
      'Identifiant du tarif manquant.'
    );
  }

  const tariff =
    normalizeTariffPayload({
      countryA:
        updates?.country_a,

      countryB:
        updates?.country_b,

      minAmount:
        updates?.min_amount,

      maxAmount:
        updates?.max_amount,

      feeAmount:
        updates?.fee_amount,
    });

  const conflicting =
    await findConflictingTariff({
      tariff,
      tariffId,
    });

  if (conflicting) {
    throw createDuplicateTariffError({
      countryA:
        tariff.country_a,

      countryB:
        tariff.country_b,

      minAmount:
        tariff.min_amount,

      maxAmount:
        tariff.max_amount,
    });
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .update(
        tariff
      )
      .eq(
        'id',
        tariffId
      )
      .select()
      .single();

  if (error) {
    if (
      error.code ===
      '23505'
    ) {
      throw createDuplicateTariffError({
        countryA:
          tariff.country_a,

        countryB:
          tariff.country_b,

        minAmount:
          tariff.min_amount,

        maxAmount:
          tariff.max_amount,
      });
    }

    throw error;
  }

  return data;
}

export async function deleteTransferTariff({
  tariffId,
}) {
  if (!tariffId) {
    throw new Error(
      'Identifiant du tarif manquant.'
    );
  }

  const {
    data: existing,
    error: readError,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select(
        'id, country_a, country_b, min_amount, max_amount, fee_amount'
      )
      .eq(
        'id',
        tariffId
      )
      .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (!existing) {
    throw new Error(
      'Tarif introuvable.'
    );
  }

  const { error } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .delete()
      .eq(
        'id',
        tariffId
      );

  if (error) {
    throw error;
  }

  return existing;
}