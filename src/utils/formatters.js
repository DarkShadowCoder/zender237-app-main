import { CURRENCY_SUFFIX } from '../constants';

/** Formate un montant en U : 150000 -> "150 000 U" */
export function formatAmount(value) {
  const n = Number(value) || 0;
  const formatted = n.toLocaleString('fr-FR').replace(/\u00A0/g, ' ');
  return `${formatted} ${CURRENCY_SUFFIX}`;
}

/** Formate un montant sans le suffixe devise : 150000 -> "150 000" */
export function formatNumber(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('fr-FR').replace(/\u00A0/g, ' ');
}

/** Formate une date ISO -> "12 Mar 2024, 16:30" */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart}, ${timePart}`;
}

/** "mm:ss" pour les comptes à rebours OTP */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Masque partiellement un numéro WhatsApp : +237612345678 -> +237 6* ** ** 78 */
export function maskPhoneNumber(phone) {
  if (!phone) return '';
  const visibleStart = phone.slice(0, 5);
  const visibleEnd = phone.slice(-2);
  return `${visibleStart}${'*'.repeat(Math.max(0, phone.length - 7))}${visibleEnd}`;
}
