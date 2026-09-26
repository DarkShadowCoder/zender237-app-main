import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { LOAN_TYPE, LOAN_STATUS, RANK_CODE } from '../constants';

const SUPABASE_URL = supabase.supabaseUrl;
const SUPABASE_ANON_KEY = supabase.supabaseKey;
const LOAN_ID_BUCKET = 'loan-identities';

const REQUEST_SELECT = '*';

function getErrorMessage(error, fallback = 'Une erreur est survenue.') {
  return error?.message || error?.details || fallback;
}

export function normalizeLoanType(type) {
  return String(type || '').toLowerCase() === LOAN_TYPE.FLIGHT
    ? LOAN_TYPE.FLIGHT
    : LOAN_TYPE.MONEY;
}

export function loanTypeLabel(type) {
  return normalizeLoanType(type) === LOAN_TYPE.FLIGHT
    ? "Prêt de billet d'avion"
    : "Prêt d'argent";
}

export function loanStatusLabel(status) {
  const labels = {
    [LOAN_STATUS.SUBMITTED]: 'Soumise',
    [LOAN_STATUS.CONTACTED]: 'Contacté',
    [LOAN_STATUS.PROCESSING]: 'En traitement',
    [LOAN_STATUS.APPROVED]: 'Approuvée',
    [LOAN_STATUS.REJECTED]: 'Rejetée',
    [LOAN_STATUS.COMPLETED]: 'Terminée',
    [LOAN_STATUS.CANCELLED]: 'Annulée',
    active: 'Actif',
    paid: 'Remboursé',
    defaulted: 'En défaut',
    written_off: 'Passé en perte',
  };
  return labels[status] || status || '—';
}

export function loanStatusTone(status) {
  if ([LOAN_STATUS.APPROVED, LOAN_STATUS.COMPLETED].includes(status)) return 'success';
  if ([LOAN_STATUS.SUBMITTED, LOAN_STATUS.CONTACTED].includes(status)) return 'info';
  if ([LOAN_STATUS.PROCESSING].includes(status)) return 'warning';
  if ([LOAN_STATUS.REJECTED, LOAN_STATUS.CANCELLED, 'defaulted', 'written_off'].includes(status)) return 'error';
  if (status === 'paid') return 'success';
  if (status === 'active') return 'warning';
  return 'neutral';
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('Utilisateur non authentifié.');
  return data.user.id;
}

async function uploadIdentityImage({ uri, userId, slot }) {
  if (!uri) throw new Error('Image manquante.');

  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data?.session?.access_token;
  if (sessionResult.error || !accessToken) {
    throw new Error('Session expirée, reconnectez-vous avant de continuer.');
  }

  const fileName = `${slot}-${Date.now()}.jpg`;
  const path = `${userId}/${fileName}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${LOAN_ID_BUCKET}/${path}`;

  const result = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    let message = `Échec de l'envoi de la pièce d'identité (code ${result.status}).`;
    try {
      const body = JSON.parse(result.body);
      message = body.message || body.error || message;
    } catch {
      // Keep the generic message when the Storage response isn't JSON.
    }
    throw new Error(message);
  }

  return path;
}

export async function uploadLoanIdentityImages({ userId, frontUri, backUri }) {
  if (!userId) throw new Error('userId est requis.');
  if (!frontUri || !backUri) throw new Error('Les deux faces de la pièce sont requises.');

  const [frontPath, backPath] = await Promise.all([
    uploadIdentityImage({ uri: frontUri, userId, slot: 'front' }),
    uploadIdentityImage({ uri: backUri, userId, slot: 'back' }),
  ]);

  return { frontPath, backPath };
}

export async function getLoanIdentitySignedUrl(path, expiresIn = 900) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(LOAN_ID_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function getMyLoanEligibility({ loanType, amount }) {
  normalizeLoanType(loanType);
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Le montant doit être supérieur à zéro.');
  }

  const { data, error } = await supabase.rpc('get_loan_eligibility', {
    p_loan_type: normalizeLoanType(loanType),
    p_amount: numericAmount,
  });

  if (error) throw error;
  return data || { eligible: false, reason: 'Aucune condition disponible.' };
}

export async function submitLoanRequest({
  loanType,
  amount,
  fullName,
  phoneNumber,
  whatsappNumber,
  idFrontPath,
  idBackPath,
  travelOrigin,
  travelDestination,
  travelDate,
  passengerName,
  accommodationRequested = false,
}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Le montant demandé est invalide.');
  }
  if (!fullName?.trim()) throw new Error('Le nom complet est requis.');
  if (!whatsappNumber?.trim()) throw new Error('Le numéro WhatsApp est requis.');
  if (!idFrontPath || !idBackPath) throw new Error("Ajoutez les deux faces de la pièce d'identité.");

  const { data, error } = await supabase.rpc('submit_loan_request', {
    p_loan_type: normalizeLoanType(loanType),
    p_amount: numericAmount,
    p_full_name: fullName.trim(),
    p_phone_number: phoneNumber?.trim() || null,
    p_whatsapp_number: whatsappNumber.trim(),
    p_id_front_path: idFrontPath,
    p_id_back_path: idBackPath,
    p_travel_origin: travelOrigin?.trim() || null,
    p_travel_destination: travelDestination?.trim() || null,
    p_travel_date: travelDate || null,
    p_passenger_name: passengerName?.trim() || null,
    p_accommodation_requested: Boolean(accommodationRequested),
  });

  if (error) throw error;
  return data;
}

export async function listMyLoanRequests() {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('loan_requests')
    .select(REQUEST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMyLoanRequest(requestId) {
  if (!requestId) throw new Error('requestId est requis.');

  const { data, error } = await supabase
    .from('loan_requests')
    .select(REQUEST_SELECT)
    .eq('id', requestId)
    .single();

  if (error) throw error;

  let loan = null;
  let installments = [];
  let repayments = [];
  let disbursement = null;
  let history = [];
  let events = [];

  const loanResult = await supabase
    .from('loans')
    .select('*')
    .eq('loan_request_id', requestId)
    .maybeSingle();
  if (loanResult.error) throw loanResult.error;
  loan = loanResult.data;

  if (loan) {
    const [installmentsResult, repaymentsResult, disbursementResult, historyResult, eventsResult] = await Promise.all([
      supabase.from('loan_installments').select('*').eq('loan_id', loan.id).order('installment_number'),
      supabase.from('loan_repayments').select('*').eq('loan_id', loan.id).order('paid_at', { ascending: false }),
      supabase.from('loan_disbursements').select('*').eq('loan_id', loan.id).maybeSingle(),
      supabase.from('loan_status_history').select('*').eq('loan_request_id', requestId).order('created_at', { ascending: false }),
      supabase.from('loan_events').select('*').eq('loan_id', loan.id).order('created_at', { ascending: false }),
    ]);

    if (installmentsResult.error) throw installmentsResult.error;
    if (repaymentsResult.error) throw repaymentsResult.error;
    if (disbursementResult.error) throw disbursementResult.error;
    if (historyResult.error) throw historyResult.error;
    if (eventsResult.error) throw eventsResult.error;

    installments = installmentsResult.data || [];
    repayments = repaymentsResult.data || [];
    disbursement = disbursementResult.data || null;
    history = historyResult.data || [];
    events = eventsResult.data || [];
  } else {
    const historyResult = await supabase
      .from('loan_status_history')
      .select('*')
      .eq('loan_request_id', requestId)
      .order('created_at', { ascending: false });
    if (historyResult.error) throw historyResult.error;
    history = historyResult.data || [];
  }

  return { ...data, loan, installments, repayments, disbursement, history, events };
}

export async function cancelMyLoanRequest(requestId) {
  if (!requestId) throw new Error('requestId est requis.');
  const { data, error } = await supabase.rpc('cancel_my_loan_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function listAdminLoanRequests({ status = null, search = '' } = {}) {
  let query = supabase
    .from('loan_requests')
    .select(REQUEST_SELECT)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  const needle = search?.trim().toLowerCase();
  if (!needle) return data || [];

  return (data || []).filter((item) => [
    item.full_name,
    item.phone_number,
    item.whatsapp_number,
    item.id,
    item.loan_type,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
}

export async function getAdminLoanRequest(requestId) {
  return getMyLoanRequest(requestId);
}

export async function updateAdminLoanRequestStatus({ requestId, status, reason }) {
  const { data, error } = await supabase.rpc('admin_update_loan_request_status', {
    p_request_id: requestId,
    p_new_status: status,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

export async function rejectAdminLoanRequest({ requestId, reason }) {
  const { data, error } = await supabase.rpc('admin_reject_loan_request', {
    p_request_id: requestId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function approveAdminLoanRequest({ requestId, approvedAmount, serviceFee = 0, notes = null }) {
  const { data, error } = await supabase.rpc('admin_approve_loan_request', {
    p_request_id: requestId,
    p_approved_amount: Number(approvedAmount),
    p_service_fee: Number(serviceFee) || 0,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function disburseAdminLoan({ loanId, externalReference = null }) {
  const { data, error } = await supabase.rpc('admin_disburse_loan', {
    p_loan_id: loanId,
    p_external_reference: externalReference || null,
  });
  if (error) throw error;
  return data;
}

export async function recordAdminLoanRepayment({
  loanId,
  amount,
  paymentMethod = 'manual',
  externalReference = null,
  proofUrl = null,
  note = null,
}) {
  const { data, error } = await supabase.rpc('admin_record_loan_repayment', {
    p_loan_id: loanId,
    p_amount: Number(amount),
    p_payment_method: paymentMethod,
    p_external_reference: externalReference || null,
    p_proof_url: proofUrl || null,
    p_note: note || null,
  });
  if (error) throw error;
  return data;
}


export async function refreshLoanOverdues() {
  const { data, error } = await supabase.rpc('refresh_loan_overdues');
  if (error) throw error;
  return Number(data) || 0;
}

export async function markLoanDefaulted(loanId) {
  const { data, error } = await supabase.rpc('admin_mark_loan_defaulted', { p_loan_id: loanId });
  if (error) throw error;
  return data;
}

export function getRankDisplay(rankCode) {
  const normalized = String(rankCode || RANK_CODE.STANDARD).toLowerCase();
  const labels = {
    [RANK_CODE.STANDARD]: 'Standard',
    [RANK_CODE.BRONZE]: 'Bronze',
    [RANK_CODE.SILVER]: 'Silver',
    [RANK_CODE.GOLD]: 'Gold',
  };
  return labels[normalized] || 'Standard';
}

export function formatLoanInstallmentSummary(loan) {
  if (!loan) return null;
  return {
    total: Number(loan.total_due || 0),
    paid: Number(loan.amount_repaid || 0),
    outstanding: Number(loan.outstanding_amount || 0),
    progress: Number(loan.total_due) > 0
      ? Math.min(1, Number(loan.amount_repaid || 0) / Number(loan.total_due))
      : 0,
  };
}

export function loanErrorMessage(error) {
  const message = getErrorMessage(error);
  if (message.includes('plafond')) return message;
  if (message.includes('règle active')) return 'Les conditions de votre rang ne sont pas encore configurées.';
  if (message.includes('administrateur')) return 'Cette action est réservée à l’administration.';
  return message;
}
