/**
 * Constantes métier — mappées sur les enums / valeurs du schéma.
 */

export const TXN_TYPE = {
  DEPOSIT: 'deposit',
  TRANSFER: 'transfer',
  WITHDRAWAL: 'withdrawal',
};

export const TXN_STATUS = {
  PENDING_PROOF: 'pending_proof',
  UNDER_REVIEW: 'under_review',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export const USER_COUNTRY = {
  MALI: 'mali',
  GUINEE: 'guinee',
  CAMEROUN: 'cameroun',
};

export const OTP_PURPOSE = {
  REGISTRATION: 'registration',
  SECRET_CODE_RECOVERY: 'secret_code_recovery',
};

export const NOTIF_CHANNEL = {
  WHATSAPP: 'whatsapp',
  PUSH: 'push',
};

export const RANK_CODE = {
  STANDARD: 'standard',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
};

export const LOAN_TYPE = {
  MONEY: 'money',
  FLIGHT: 'flight',
};

export const LOAN_STATUS = {
  SUBMITTED: 'submitted',
  CONTACTED: 'contacted',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const MAX_OTP_ATTEMPTS = 3;
export const MAX_LOGIN_ATTEMPTS = 5;
export const OTP_LENGTH = 6;
export const SECRET_CODE_LENGTH = 6;
export const OTP_RESEND_SECONDS = 41;
export const ADMIN_REVIEW_TIMEOUT_MINUTES = 10;
export const DAILY_BATCH_HOUR_LOCAL = 15;

export const CURRENCY_SUFFIX = 'U';

export const SECURE_STORE_KEYS = {
  SESSION_WHATSAPP: 'zender237_whatsapp_number',
  BIOMETRIC_ENABLED: 'zender237_biometric_enabled',
  APP_LOCALE: 'zender237_locale',
};