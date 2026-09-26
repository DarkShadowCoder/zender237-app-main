/** Validation minimale d'un numéro WhatsApp international (+indicatif + chiffres) */
export function isValidWhatsAppNumber(value) {
  if (!value) return false;

  const cleaned =
    value.replace(
      /[\s-]/g,
      ''
    );

  return /^\+\d{8,15}$/.test(
    cleaned
  );
}

export function isValidUsername(value) {
  if (!value) return false;

  return /^[a-zA-Z0-9_.]{3,20}$/.test(
    value.trim()
  );
}

/**
 * Valide un montant.
 *
 * Les espaces de milliers sont acceptés :
 *
 * 50000
 * 50 000
 * 1 250 000
 */
export function isValidAmount(
  value,
  {
    min = 100,
    max = 5000000,
  } = {}
) {
  const normalized =
    typeof value === 'string'
      ? value.replace(
          /[^0-9.-]/g,
          ''
        )
      : value;

  const n =
    Number(normalized);

  if (
    Number.isNaN(n)
  ) {
    return false;
  }

  return (
    n >= min &&
    n <= max
  );
}

export function isCompleteCode(
  digits,
  length
) {
  return (
    Array.isArray(
      digits
    ) &&
    digits.filter(
      Boolean
    ).length === length
  );
}

export function isValidRecipientName(
  value
) {
  return (
    !!value &&
    value.trim().length >= 2
  );
}

// ============================================================
// Transfert international
// ============================================================

export const TRANSFER_MAX_AMOUNT =
  1000000;

export function isValidTransferAmount(
  value
) {
  return isValidAmount(
    value,
    {
      max:
        TRANSFER_MAX_AMOUNT,
    }
  );
}