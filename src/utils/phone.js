import { countries } from '../theme/theme';

export const SUPPORTED_COUNTRY_KEYS = Object.keys(countries);

export function getCountryDialCode(countryKey) {
  return countries?.[countryKey]?.dialCode || '';
}

export function digitsOnlyPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizeInternationalPhone(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  const digits = digitsOnlyPhone(raw);

  if (!digits) {
    return '';
  }

  return raw.startsWith('+')
    ? `+${digits}`
    : digits;
}

export function buildInternationalPhone(
  value,
  countryKey
) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.startsWith('+')) {
    return normalizeInternationalPhone(raw);
  }

  const digits = digitsOnlyPhone(raw);

  const dialCode =
    getCountryDialCode(
      countryKey
    ).replace(
      /\D/g,
      ''
    );

  if (!digits || !dialCode) {
    return digits;
  }

  if (digits.startsWith(dialCode)) {
    return `+${digits}`;
  }

  return `+${dialCode}${digits}`;
}

export function getCountryCodeFromPhone(value) {
  const normalized =
    normalizeInternationalPhone(
      value
    );

  if (!normalized.startsWith('+')) {
    return null;
  }

  const match =
    SUPPORTED_COUNTRY_KEYS
      .map((key) =>
        getCountryDialCode(key)
      )
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.length - a.length
      )
      .find(
        (dialCode) =>
          normalized.startsWith(
            dialCode
          )
      );

  return match || null;
}

export function getCountryKeyFromPhone(
  value
) {
  const code =
    getCountryCodeFromPhone(
      value
    );

  if (!code) {
    return null;
  }

  return (
    SUPPORTED_COUNTRY_KEYS.find(
      (key) =>
        getCountryDialCode(key) ===
        code
    ) || null
  );
}

export function isInternationalPhone(
  value
) {
  return /^\+\d{8,15}$/.test(
    normalizeInternationalPhone(
      value
    )
  );
}