/**
 * Numéros Mobile Money pour dépôt
 * — filtrage par montant et indicatif pays.
 */

import {
  supabase,
} from '../lib/supabase';

export async function listActiveDepositNumbers({
  amount = null,
  countryCode = null,
} = {}) {
  let query =
    supabase
      .from(
        'momo_deposit_numbers'
      )
      .select('*')
      .eq(
        'active',
        true
      );

  if (
    countryCode
  ) {
    query =
      query.eq(
        'country_code',
        countryCode
      );
  }

  if (
    amount !== null &&
    amount !== undefined
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      )
    ) {
      throw new Error(
        'Montant de dépôt invalide.'
      );
    }

    query =
      query
        .or(
          `min_amount.lte.${numericAmount},min_amount.is.null`
        )
        .or(
          `max_amount.gte.${numericAmount},max_amount.is.null`
        );
  }

  const {
    data,
    error,
  } =
    await query.order(
      'phone_number',
      {
        ascending:
          true,
      }
    );

  if (error) {
    throw error;
  }

  return data || [];
}