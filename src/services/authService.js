import {
  supabase,
} from '../lib/supabase';


/* ============================================================
 * LOGIN
 * ============================================================ */

export async function signIn({
  whatsappNumber,
  secretCode,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'login',
      {
        body: {
          whatsappNumber,
          secretCode,
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    console.error(
      '[authService] login Edge Function failed:',
      {
        message: error.message,
        serverData,
      }
    );

    const loginError =
      new Error(
        serverData?.message ||
        'Impossible de se connecter.'
      );

    loginError.code =
      serverData?.code ||
      'LOGIN_EDGE_FUNCTION_ERROR';

    loginError.attemptsRemaining =
      serverData?.attemptsRemaining;

    loginError.redirectToRecovery =
      serverData?.redirectToRecovery;

    throw loginError;
  }

  if (!data) {
    throw new Error(
      'Réponse de connexion invalide.'
    );
  }

  if (data.success === false) {
    const loginError =
      new Error(
        data.message ||
        'Numéro ou code secret incorrect.'
      );

    loginError.code =
      data.code ||
      'LOGIN_FAILED';

    loginError.attemptsRemaining =
      data.attemptsRemaining;

    loginError.redirectToRecovery =
      data.redirectToRecovery;

    throw loginError;
  }

  if (!data.session?.tokenHash) {
    throw new Error(
      'Jeton de session manquant.'
    );
  }

  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.verifyOtp({
      token_hash: data.session.tokenHash,
      type: 'email',
    });

  if (sessionError) {
    console.error(
      '[authService] verifyOtp failed:',
      sessionError
    );

    throw sessionError;
  }

  if (!sessionData?.session) {
    throw new Error(
      'Session Supabase introuvable après connexion.'
    );
  }

  return {
    session: sessionData.session,
    user: sessionData.session.user,
    accountType: data.accountType || null,
    accountId: data.accountId || null,
    authUserId:
      data.authUserId ||
      sessionData.session.user.id,
    roles: Array.isArray(data.roles) ? data.roles : [],
    permissions: Array.isArray(data.permissions)
      ? data.permissions
      : [],
    active: data.active !== false,
  };
}


/* ============================================================
 * LOGOUT
 * ============================================================ */

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export const login = signIn;
export const logout = signOut;


/* ============================================================
 * USER REGISTRATION — AVAILABILITY
 * ============================================================ */

export async function checkAvailability({
  whatsappNumber,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'check-availability',
      {
        body: {
          whatsappNumber,
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const availabilityError = new Error(
      serverData?.message ||
      'Impossible de vérifier la disponibilité du numéro.'
    );

    availabilityError.code =
      serverData?.code ||
      'AVAILABILITY_CHECK_FAILED';

    throw availabilityError;
  }

  if (!data || typeof data.available !== 'boolean') {
    throw new Error(
      'Réponse de disponibilité invalide.'
    );
  }

  return data;
}


/* ============================================================
 * OTP REGISTRATION
 * ============================================================ */

export async function requestRegistrationOtp({
  whatsappNumber,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'send-otp',
      {
        body: {
          whatsappNumber,
          purpose: 'registration',
        },
      }
    );

  if (error) {
    throw error;
  }

  return data;
}


/* ============================================================
 * OTP RECOVERY
 * ============================================================ */

export async function requestSecretCodeRecovery({
  whatsappNumber,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'send-otp',
      {
        body: {
          whatsappNumber,
          purpose: 'secret_code_recovery',
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const recoveryError = new Error(
      serverData?.message ||
      error.message ||
      'Impossible d’envoyer le code de récupération.'
    );

    recoveryError.code =
      serverData?.code ||
      'SECRET_CODE_RECOVERY_FAILED';

    recoveryError.retryAfterSeconds =
      serverData?.retryAfterSeconds;

    throw recoveryError;
  }

  if (!data?.success) {
    const recoveryError = new Error(
      data?.message ||
      'Impossible d’envoyer le code de récupération.'
    );

    recoveryError.code =
      data?.code ||
      'SECRET_CODE_RECOVERY_FAILED';

    recoveryError.retryAfterSeconds =
      data?.retryAfterSeconds;

    throw recoveryError;
  }

  return data;
}


/* ============================================================
 * VERIFY OTP
 * ============================================================ */

export async function verifyOtp({
  whatsappNumber,
  code,
  purpose,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'verify-otp',
      {
        body: {
          whatsappNumber,
          code,
          purpose,
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const otpError = new Error(
      serverData?.message ||
      error.message ||
      'Impossible de vérifier le code OTP.'
    );

    otpError.code =
      serverData?.code ||
      'OTP_VERIFICATION_ERROR';

    otpError.reason = serverData?.reason;

    otpError.attemptsRemaining =
      serverData?.attemptsRemaining;

    throw otpError;
  }

  return data;
}


/* ============================================================
 * USER REGISTRATION
 * ============================================================ */

export async function completeRegistration({
  username,
  whatsappNumber,
  country,
  secretCode,
  fullName,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'complete-registration',
      {
        body: {
          username,
          whatsappNumber,
          country,
          secretCode,
          fullName,
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const registrationError = new Error(
      serverData?.message ||
      error.message ||
      'Impossible de créer le compte.'
    );

    registrationError.code =
      serverData?.code ||
      'REGISTRATION_FAILED';

    throw registrationError;
  }

  if (!data?.success) {
    const registrationError = new Error(
      data?.message ||
      'Impossible de créer le compte.'
    );

    registrationError.code =
      data?.code ||
      'REGISTRATION_FAILED';

    throw registrationError;
  }

  return {
    ...data,
    accountType: data.accountType || 'user',
  };
}


/* ============================================================
 * RESET SECRET
 * ============================================================ */

export async function setNewSecretCode({
  whatsappNumber,
  otpId,
  newSecretCode,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      'reset-secret-code',
      {
        body: {
          whatsappNumber,
          otpId,
          newSecretCode,
        },
      }
    );

  if (error) {
    let serverData = null;

    try {
      if (
        error.context &&
        typeof error.context.json === 'function'
      ) {
        serverData = await error.context.json();
      }
    } catch {
      serverData = null;
    }

    const resetError = new Error(
      serverData?.message ||
      error.message ||
      'Impossible de réinitialiser le code secret.'
    );

    resetError.code =
      serverData?.code ||
      'RESET_SECRET_CODE_FAILED';

    throw resetError;
  }

  if (!data?.success) {
    const resetError = new Error(
      data?.message ||
      'Impossible de réinitialiser le code secret.'
    );

    resetError.code =
      data?.code ||
      'RESET_SECRET_CODE_FAILED';

    throw resetError;
  }

  return data;
}
