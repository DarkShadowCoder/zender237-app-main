// src/services/tariffImportService.js

import { supabase } from '../lib/supabase';
import { normalizeTariffRoute } from './tariffService';

const IMPORT_BATCH_LIMIT =
  2000;

function normalizeNumber(
  value
) {
  const normalized =
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /\s/g,
        ''
      )
      .replace(
        ',',
        '.'
      );

  if (!normalized) {
    return null;
  }

  const number =
    Number(
      normalized
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function buildKey(
  row
) {
  return [
    row.country_a,
    row.country_b,
    row.min_amount,
    row.max_amount,
  ].join('|');
}

export async function importTransferTariffs(
  rows
) {
  if (
    !Array.isArray(
      rows
    ) ||
    rows.length === 0
  ) {
    throw new Error(
      'Aucune ligne tarifaire à importer.'
    );
  }

  if (
    rows.length >
    IMPORT_BATCH_LIMIT
  ) {
    throw new Error(
      `Le fichier contient ${rows.length} lignes. La limite est de ${IMPORT_BATCH_LIMIT}.`
    );
  }

  /**
   * Toutes les lignes du CSV sont transformées en
   * Frais canonique.
   *
   * Exemple :
   *
   * guinee,cameroun
   *
   * devient :
   *
   * cameroun,guinee
   */
  const payload =
    rows.map(
      (
        row,
        index
      ) => {
        const route =
          normalizeTariffRoute(
            row?.country_a,
            row?.country_b
          );

        const minAmount =
          normalizeNumber(
            row?.min_amount
          );

        const maxAmount =
          normalizeNumber(
            row?.max_amount
          );

        const feeAmount =
          normalizeNumber(
            row?.fee_amount
          );

        if (
          minAmount === null ||
          minAmount < 0
        ) {
          throw new Error(
            `Ligne ${index + 1} : minimum invalide.`
          );
        }

        if (
          maxAmount === null ||
          maxAmount <=
            minAmount
        ) {
          throw new Error(
            `Ligne ${index + 1} : maximum invalide.`
          );
        }

        if (
          feeAmount === null ||
          feeAmount < 0
        ) {
          throw new Error(
            `Ligne ${index + 1} : frais invalides.`
          );
        }

        return {
          ...route,

          min_amount:
            minAmount,

          max_amount:
            maxAmount,

          fee_amount:
            feeAmount,
        };
      }
    );

  /**
   * A ↔ B et B ↔ A représentent
   * exactement la même tranche.
   */
  const keys =
    new Set();

  for (
    const row of
      payload
  ) {
    const key =
      buildKey(
        row
      );

    if (
      keys.has(key)
    ) {
      throw new Error(
        `Doublon détecté : ${row.country_a} ↔ ${row.country_b}, ${row.min_amount}–${row.max_amount}.`
      );
    }

    keys.add(key);
  }

  /**
   * On recherche les anciennes lignes pour pouvoir
   * réutiliser une ligne existante même si elle avait
   * été enregistrée dans l'autre sens.
   */
  const {
    data:
      existingRows,
    error:
      readError,
  } =
    await supabase
      .from(
        'transfer_fee_tariffs'
      )
      .select(
        'id, country_a, country_b, min_amount, max_amount'
      );

  if (readError) {
    throw readError;
  }

  const existingByKey =
    new Map();

  for (
    const row of
      existingRows ?? []
  ) {
    try {
      const route =
        normalizeTariffRoute(
          row.country_a,
          row.country_b
        );

      const key =
        buildKey({
          country_a:
            route.country_a,

          country_b:
            route.country_b,

          min_amount:
            row.min_amount,

          max_amount:
            row.max_amount,
        });

      if (
        !existingByKey.has(
          key
        )
      ) {
        existingByKey.set(
          key,
          row
        );
      }
    } catch (_) {
      // Ignore les anciennes lignes mal formées.
    }
  }

  const operations =
    [];

  for (
    const row of
      payload
  ) {
    const key =
      buildKey(
        row
      );

    const existing =
      existingByKey.get(
        key
      );

    if (existing) {
      /**
       * On réutilise la ligne existante.
       * Si elle était B -> A, elle est automatiquement
       * normalisée vers A ↔ B.
       */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'transfer_fee_tariffs'
          )
          .update(
            row
          )
          .eq(
            'id',
            existing.id
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      operations.push(
        data
      );
    } else {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'transfer_fee_tariffs'
          )
          .insert(
            row
          )
          .select('*')
          .single();

      if (error) {
        throw error;
      }

      operations.push(
        data
      );
    }
  }

  return {
    count:
      operations.length,

    data:
      operations,
  };
}