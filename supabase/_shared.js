/**
 * ============================================================
 * ZENDER237 - SHARED EDGE FUNCTIONS HELPERS
 * ============================================================
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};


/* ============================================================
 * JSON
 * ============================================================ */

export function json(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}


/* ============================================================
 * HTTP METHOD
 * ============================================================ */

export function methodGuard(req) {

  if (req.method === 'OPTIONS') {
    return new Response(
      'ok',
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }

  if (req.method !== 'POST') {
    return json(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message:
          'Méthode HTTP non autorisée.',
      },
      405
    );
  }

  return null;
}


/* ============================================================
 * WHATSAPP
 * ============================================================ */

export function normalizeWhatsApp(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  let normalized =
    String(value).trim();

  normalized =
    normalized.replace(
      /[\s().-]/g,
      ''
    );

  normalized =
    normalized.replace(
      /[^\d+]/g,
      ''
    );

  const hasPlus =
    normalized.includes('+');

  normalized =
    normalized.replace(
      /\+/g,
      ''
    );

  if (hasPlus) {
    normalized =
      `+${normalized}`;
  }

  return normalized;
}


/* ============================================================
 * PHONE VALIDATION
 * ============================================================ */

export function isValidWhatsApp(value) {

  const phone =
    normalizeWhatsApp(value);

  return /^\+\d{10,15}$/.test(phone);
}


/* ============================================================
 * SECRET CODE
 * ============================================================ */

export function normalizeSecretCode(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .replace(/\D/g, '')
    .slice(0, 6);
}


export function validSecret(value) {

  const code =
    normalizeSecretCode(value);

  return /^\d{6}$/.test(code);
}


/* ============================================================
 * SHA256
 * ============================================================ */

export async function sha256(value) {

  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(
      String(value)
    );

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      data
    );

  return Array
    .from(
      new Uint8Array(digest)
    )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, '0')
    )
    .join('');
}


/* ============================================================
 * BEARER TOKEN
 * ============================================================ */

export function getBearerToken(req) {

  const authorization =
    req.headers.get(
      'Authorization'
    );

  if (!authorization) {
    return null;
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith('bearer ')
  ) {
    return null;
  }

  const token =
    authorization
      .slice(7)
      .trim();

  return token || null;
}


/* ============================================================
 * STRING
 * ============================================================ */

export function isNonEmptyString(value) {

  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}


/* ============================================================
 * ERROR
 * ============================================================ */

export function safeErrorMessage(
  error,
  fallback = 'Une erreur est survenue.'
) {

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === 'string'
  ) {
    return error;
  }

  return fallback;
}