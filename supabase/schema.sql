-- ============================================================
-- Zender237 — Schéma base de données (Supabase/Postgres)
-- Strictement basé sur le cahier des charges v0.2.
-- Correction appliquée : le retrait utilise désormais un solde
-- en attente (pending_balance), comme le dépôt et le transfert,
-- pour empêcher un double retrait pendant qu'un premier est en
-- cours de traitement.
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

create type user_country as enum ('mali', 'guinee', 'cameroun');

create type otp_purpose as enum ('registration', 'secret_code_recovery');
-- registration : section 2.2.1
-- secret_code_recovery : "page de récupération du code secret"

create type txn_type as enum ('deposit', 'transfer', 'withdrawal');

create type txn_status as enum (
  'pending_proof',   -- dépôt : en attente d'upload de preuve
  'under_review',    -- 2.3.1/2.3.2/2.3.3 étape 3-4 : en attente de confirmation admin/partenaire
  'confirmed',
  'rejected',        -- admin coche "Aucune transaction effectuée"
  'cancelled'         -- l'utilisateur annule (mentionné pour le dépôt)
);

create type admin_role as enum ('admin', 'partner');
-- admin : Courtier/Administrateur
-- partner : Associé — exécute le virement bancaire, confirme les transactions,
--   et gère la communauté KamerDiaspora (un seul et même rôle, tableau 1.3).
--   Note : le document mentionne que ce rôle "rédige des rapports", mais n'en décrit
--   ni le contenu ni la structure — donc aucune table "rapports" n'est créée ici.

create type notif_channel as enum ('whatsapp', 'push');


-- ============================================================
-- 2. ADMIN / PARTENAIRE (section 1.3)
-- ============================================================

create table admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  full_name text not null,
  role admin_role not null,
  whatsapp_number text,
  active boolean not null default true
);


-- ============================================================
-- 3. COMPTES (section 2.2)
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,             -- "nom d'utilisateur souhaité"
  whatsapp_number text unique not null,
  country user_country not null,              -- "pays actuel"
  secret_code_hash text,                      -- défini après vérification du 1er OTP ; null tant que non défini
  otp_attempts int not null default 0,        -- "après trois tentatives supplémentaires, rediriger vers l'étape 1"
  login_attempts int not null default 0,      -- "il reste 5 tentatives"
  created_at timestamptz not null default now()
);

create or replace table otp_codes (
  id uuid primary key default gen_random_uuid(),
  whatsapp_number text not null,
  code_hash text not null,
  purpose otp_purpose not null,
  attempts_count int not null default 0,
  expires_at timestamptz not null,
  verified boolean not null default false,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_otp_lookup on otp_codes(whatsapp_number, purpose, verified);


-- ============================================================
-- 4. SOLDE (2.3.1 et 2.3.2 : "solde disponible" et "solde en attente")
-- ============================================================

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 5. NUMÉROS MOBILE MONEY POUR DÉPÔT
-- (2.3.1 étape 2 : "indique un numéro et un nom, ou plusieurs, selon le montant")
-- ============================================================

create table momo_deposit_numbers (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  holder_name text not null,
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  active boolean not null default true
);


-- ============================================================
-- 6. TRAITEMENT GROUPÉ QUOTIDIEN
-- (2.3.1/2.3.2 étape 7-8 : "à 15h00... transférer l'argent à la banque partenaire")
-- ============================================================

create table daily_batches (
  id uuid primary key default gen_random_uuid(),
  batch_date date not null,
  status text not null default 'pending' check (status in ('pending', 'processed')),
  processed_by uuid references admins(id),
  processed_at timestamptz,
  bank_proof_url text                -- "téléverse les justificatifs"
);


-- ============================================================
-- 7. TRANSACTIONS (dépôt / transfert / retrait — sections 2.3.1, 2.3.2, 2.3.3)
-- ============================================================

create table transactions (
  id uuid primary key default gen_random_uuid(),
  type txn_type not null,
  status txn_status not null default 'pending_proof',

  user_id uuid not null references profiles(id),

  -- Recharge (2.3.1)
  sender_name text,
  sender_phone_number text,
  momo_deposit_number_id uuid references momo_deposit_numbers(id),

  -- Transfert (2.3.2) / Retrait (2.3.3)
  recipient_name text,
  recipient_mobile_number text,
  recipient_location text,

  amount numeric(14,2) not null,
  fee_amount numeric(14,2) not null default 0, -- "mettre à jour le tableau des frais"
  reference_note text,                          -- "référence de transaction (facultative)"
  rejection_reason text,                        -- case "Aucune transaction effectuée"

  admin_id uuid references admins(id),
  batch_id uuid references daily_batches(id),

  created_at timestamptz not null default now(),
  review_deadline timestamptz,                  -- "après 10 minutes" → relance
  confirmed_at timestamptz
);
create index idx_txn_user on transactions(user_id);
create index idx_txn_status on transactions(status);

create table transaction_proofs (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  file_url text not null,           -- capture d'écran / image de la transaction
  uploaded_by uuid not null references profiles(id),
  uploaded_at timestamptz not null default now()
);


-- ============================================================
-- 8. BASE DE DONNÉES D'AUDIT
-- (mentionnée explicitement 3 fois : "enregistrer les transactions
-- réussies dans la base de données d'audit")
-- ============================================================

create table audit_records (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id),
  admin_id uuid not null references admins(id),
  proof_url text,
  recorded_at timestamptz not null default now()
);


-- ============================================================
-- 9. NOTIFICATIONS (WhatsApp + push, tous deux mentionnés)
-- ============================================================

create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  admin_id uuid references admins(id),         -- "notification push à l'administrateur"
  transaction_id uuid references transactions(id),
  channel notif_channel not null,
  message text not null,
  sent_at timestamptz not null default now()
);

-- Nécessaire pour pouvoir techniquement envoyer les "notifications push"
-- mentionnées : sans stocker de token, aucun push n'est possible.
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id),
  user_id uuid references profiles(id),
  expo_push_token text unique not null,
  active boolean not null default true
);


-- ============================================================
-- 10. TRIGGERS — application réelle des règles du document
-- ============================================================

-- --- Recharge (2.3.1) ---
-- Soumission : montant ajouté au solde en attente (étape 4).
-- Confirmation : passe du solde en attente au solde disponible (étape 5).
-- Rejet/annulation : retiré du solde en attente (étape 6).

create or replace function handle_deposit_status_change()
returns trigger as $$
begin
  if OLD.status = 'pending_proof' and NEW.status = 'under_review' then
    update wallets set pending_balance = pending_balance + NEW.amount, updated_at = now()
    where user_id = NEW.user_id;
  elsif OLD.status = 'under_review' and NEW.status = 'confirmed' then
    update wallets set pending_balance = pending_balance - NEW.amount,
                        available_balance = available_balance + NEW.amount,
                        updated_at = now()
    where user_id = NEW.user_id;
  elsif OLD.status = 'under_review' and NEW.status in ('rejected', 'cancelled') then
    update wallets set pending_balance = pending_balance - NEW.amount, updated_at = now()
    where user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_deposit_status
after update of status on transactions
for each row when (NEW.type = 'deposit')
execute function handle_deposit_status_change();


-- --- Transfert (2.3.2) ---
-- Soumission : montant + frais réservés au solde en attente.
-- Confirmation : débité du solde disponible (étape 5).
-- Rejet : relâché du solde en attente (étape 6).

create or replace function handle_transfer_status_change()
returns trigger as $$
begin
  if OLD.status = 'pending_proof' and NEW.status = 'under_review' then
    update wallets set pending_balance = pending_balance + NEW.amount + NEW.fee_amount, updated_at = now()
    where user_id = NEW.user_id;
  elsif OLD.status = 'under_review' and NEW.status = 'confirmed' then
    update wallets set pending_balance = pending_balance - NEW.amount - NEW.fee_amount,
                        available_balance = available_balance - NEW.amount - NEW.fee_amount,
                        updated_at = now()
    where user_id = NEW.user_id;
  elsif OLD.status = 'under_review' and NEW.status = 'rejected' then
    update wallets set pending_balance = pending_balance - NEW.amount - NEW.fee_amount, updated_at = now()
    where user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_transfer_status
after update of status on transactions
for each row when (NEW.type = 'transfer')
execute function handle_transfer_status_change();


-- --- Retrait (2.3.3) — CORRIGÉ ---
-- Le document ne décrit une mise à jour du solde qu'à l'étape 5 (confirmation),
-- mais sans réservation intermédiaire, un utilisateur pourrait soumettre deux
-- retraits qui dépassent son solde disponible pendant que le premier est encore
-- en traitement. On applique donc le même mécanisme de solde en attente que
-- pour le dépôt et le transfert, avec un blocage si le solde disponible
-- (après réservations déjà en cours) est insuffisant.

create or replace function handle_withdrawal_status_change()
returns trigger as $$
declare
  v_available numeric(14,2);
begin
  if OLD.status = 'pending_proof' and NEW.status = 'under_review' then
    select available_balance into v_available from wallets where user_id = NEW.user_id;
    if v_available < (NEW.amount + NEW.fee_amount) then
      raise exception 'Solde disponible insuffisant pour ce retrait';
    end if;
    update wallets set available_balance = available_balance - (NEW.amount + NEW.fee_amount),
                        pending_balance = pending_balance + NEW.amount + NEW.fee_amount,
                        updated_at = now()
    where user_id = NEW.user_id;

  elsif OLD.status = 'under_review' and NEW.status = 'confirmed' then
    update wallets set pending_balance = pending_balance - NEW.amount - NEW.fee_amount, updated_at = now()
    where user_id = NEW.user_id;

  elsif OLD.status = 'under_review' and NEW.status = 'rejected' then
    -- Le retrait échoue : l'argent réservé retourne au solde disponible.
    update wallets set pending_balance = pending_balance - NEW.amount - NEW.fee_amount,
                        available_balance = available_balance + NEW.amount + NEW.fee_amount,
                        updated_at = now()
    where user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_withdrawal_status
after update of status on transactions
for each row when (NEW.type = 'withdrawal')
execute function handle_withdrawal_status_change();


-- ============================================================
-- 11. ROW LEVEL SECURITY — minimum pour que l'app fonctionne
-- sans fuite de données entre abonnés
-- ============================================================

alter table profiles enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;

create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own wallet" on wallets for select using (auth.uid() = user_id);
create policy "own transactions" on transactions for select using (auth.uid() = user_id);

-- Les changements de statut (confirmation, rejet) ne doivent être possibles
-- que depuis le backend (service_role / edge functions), jamais depuis
-- l'app cliente directement.


-- ============================================================
-- ZENDER237 - MODULE PRETS (additif, non destructif)
--
-- Cette migration est conçue pour fonctionner aussi bien avec :
--   1) l'ancien schema.sql du dépôt ;
--   2) le schéma mis à jour contenant déjà rank_rules/loan_requests.
--
-- Elle n'altère pas les workflows transactions existants.
-- ============================================================

-- ------------------------------------------------------------
-- 0. TABLES DE BASE DU MODULE SI ELLES N'EXISTENT PAS ENCORE
-- ------------------------------------------------------------

create table if not exists public.rank_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('standard', 'bronze', 'silver', 'gold')),
  label text not null,
  min_transaction_volume numeric(14,2) not null default 0 check (min_transaction_volume >= 0),
  max_transaction_volume numeric(14,2),
  money_loan_repayment_months integer not null default 1 check (money_loan_repayment_months > 0),
  flight_loan_repayment_months integer not null default 1 check (flight_loan_repayment_months > 0),
  flight_accommodation_months integer not null default 0 check (flight_accommodation_months >= 0),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loan_type text not null check (loan_type in ('money', 'flight')),
  amount numeric(14,2) not null check (amount > 0),
  rank_at_request text not null check (rank_at_request in ('standard', 'bronze', 'silver', 'gold')),
  rank_rule_id uuid references public.rank_rules(id),
  repayment_months integer not null check (repayment_months > 0),
  accommodation_months integer not null default 0 check (accommodation_months >= 0),
  full_name text not null,
  phone_number text,
  whatsapp_number text not null,
  id_front_path text not null,
  id_back_path text not null,
  status text not null default 'submitted' check (status in ('submitted', 'contacted', 'processing', 'approved', 'rejected', 'completed', 'cancelled')),
  admin_id uuid references public.admins(id),
  admin_notes text,
  submitted_at timestamptz not null default now(),
  contacted_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 1. RANGS : colonnes métier complémentaires pour les plafonds
-- ------------------------------------------------------------

alter table public.profiles
  add column if not exists rank_code text not null default 'standard',
  add column if not exists rank_updated_at timestamptz;

alter table public.rank_rules
  add column if not exists max_money_loan_amount numeric(14,2),
  add column if not exists max_flight_loan_amount numeric(14,2),
  add column if not exists money_loan_enabled boolean not null default true,
  add column if not exists flight_loan_enabled boolean not null default true;

create index if not exists idx_rank_rules_active_volume
  on public.rank_rules(active, min_transaction_volume, max_transaction_volume);

-- ------------------------------------------------------------
-- 2. DEMANDE DE PRET : enrichissement non destructif
-- ------------------------------------------------------------

alter table public.loan_requests
  add column if not exists travel_origin text,
  add column if not exists travel_destination text,
  add column if not exists travel_date date,
  add column if not exists passenger_name text,
  add column if not exists accommodation_requested boolean not null default false,
  add column if not exists rejection_reason text,
  add column if not exists contacted_by_admin_id uuid,
  add column if not exists cancelled_at timestamptz;

create index if not exists idx_loan_requests_user
  on public.loan_requests(user_id, created_at desc);

create index if not exists idx_loan_requests_status
  on public.loan_requests(status, created_at desc);

create index if not exists idx_loan_requests_admin
  on public.loan_requests(admin_id, status, created_at desc);

-- ------------------------------------------------------------
-- 3. VRAI PRET : contrat créé après approbation de la demande
-- ------------------------------------------------------------

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_request_id uuid not null unique references public.loan_requests(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  loan_type text not null check (loan_type in ('money', 'flight')),
  rank_at_approval text not null check (rank_at_approval in ('standard', 'bronze', 'silver', 'gold')),
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  approved_amount numeric(14,2) not null check (approved_amount > 0),
  service_fee numeric(14,2) not null default 0 check (service_fee >= 0),
  total_due numeric(14,2) not null check (total_due >= approved_amount),
  amount_repaid numeric(14,2) not null default 0 check (amount_repaid >= 0),
  outstanding_amount numeric(14,2) not null check (outstanding_amount >= 0),
  repayment_months integer not null check (repayment_months > 0),
  accommodation_months integer not null default 0 check (accommodation_months >= 0),
  status text not null default 'approved' check (status in ('approved', 'active', 'paid', 'defaulted', 'cancelled', 'written_off')),
  disbursement_status text not null default 'pending' check (disbursement_status in ('pending', 'processing', 'completed', 'failed', 'not_applicable')),
  approved_by_admin_id uuid references public.admins(id),
  approved_at timestamptz not null default now(),
  disbursed_at timestamptz,
  maturity_date date,
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_loans_user_status
  on public.loans(user_id, status, created_at desc);

create index if not exists idx_loans_disbursement
  on public.loans(disbursement_status, status);

-- ------------------------------------------------------------
-- 4. HISTORIQUE DU DOSSIER / PRET
-- ------------------------------------------------------------

create table if not exists public.loan_status_history (
  id uuid primary key default gen_random_uuid(),
  loan_request_id uuid not null references public.loan_requests(id) on delete cascade,
  previous_status text,
  new_status text not null,
  admin_id uuid references public.admins(id),
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_status_history_request
  on public.loan_status_history(loan_request_id, created_at desc);

create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade,
  loan_request_id uuid references public.loan_requests(id) on delete cascade,
  event_type text not null,
  actor_admin_id uuid references public.admins(id),
  amount numeric(14,2),
  note text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_events_loan
  on public.loan_events(loan_id, created_at desc);

create index if not exists idx_loan_events_request
  on public.loan_events(loan_request_id, created_at desc);

-- ------------------------------------------------------------
-- 5. ECHEANCIER
-- ------------------------------------------------------------

create table if not exists public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due > 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0 and amount_paid <= amount_due),
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'late', 'waived')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (loan_id, installment_number)
);

create index if not exists idx_loan_installments_due
  on public.loan_installments(loan_id, due_date);

-- ------------------------------------------------------------
-- 6. DECAISSEMENT
-- ------------------------------------------------------------

create table if not exists public.loan_disbursements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null unique references public.loans(id) on delete restrict,
  method text not null check (method in ('wallet', 'external')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  external_reference text,
  admin_id uuid references public.admins(id),
  processed_at timestamptz,
  failure_reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_disbursements_status
  on public.loan_disbursements(status, created_at desc);

-- ------------------------------------------------------------
-- 7. REMBOURSEMENTS
-- ------------------------------------------------------------

create table if not exists public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null default 'manual' check (payment_method in ('manual', 'bank', 'mobile_money', 'cash', 'wallet')),
  external_reference text,
  proof_url text,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'reversed', 'cancelled')),
  recorded_by_admin_id uuid references public.admins(id),
  paid_at timestamptz not null default now(),
  note text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_repayments_loan
  on public.loan_repayments(loan_id, paid_at desc);

-- ------------------------------------------------------------
-- 8. HELPERS SECURITE
-- ------------------------------------------------------------

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.auth_user_id = auth.uid()
      and a.active = true
  );
$$;

revoke all on function public.is_current_admin() from public;
grant execute on function public.is_current_admin() to authenticated;

-- ------------------------------------------------------------
-- 8bis. NOTIFICATIONS DE PRET : journalisation sans faux 'sent'
-- ------------------------------------------------------------

alter table public.notifications_log
  add column if not exists status text default 'sent',
  add column if not exists failure_reason text,
  add column if not exists event_type text,
  add column if not exists metadata jsonb;

create or replace function public.queue_loan_notification(
  p_user_id uuid,
  p_event_type text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications_log(user_id, channel, message, event_type, status, metadata)
  values (p_user_id, 'push', p_message, p_event_type, 'queued', coalesce(p_metadata, '{}'::jsonb));
exception when undefined_table or undefined_column then
  -- Compatibilité avec une très ancienne base : ne pas bloquer le workflow du prêt.
  null;
end;
$$;

revoke all on function public.queue_loan_notification(uuid, text, text, jsonb) from public;
grant execute on function public.queue_loan_notification(uuid, text, text, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 9. CALCUL DU RANG
-- ------------------------------------------------------------

create or replace function public.recalculate_user_rank(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_volume numeric(14,2) := 0;
  v_rank text := 'standard';
  v_rule public.rank_rules%rowtype;
begin
  if p_user_id is null then
    raise exception 'p_user_id est requis';
  end if;

  if not (is_current_admin() or auth.uid() = p_user_id) then
    raise exception 'Accès non autorisé';
  end if;

  select coalesce(sum(t.amount), 0)
    into v_volume
  from public.transactions t
  where t.user_id = p_user_id
    and lower(t.status::text) in ('confirmed', 'settled', 'completed');

  select *
    into v_rule
  from public.rank_rules rr
  where rr.active = true
    and rr.min_transaction_volume <= v_volume
    and (rr.max_transaction_volume is null or v_volume <= rr.max_transaction_volume)
  order by rr.min_transaction_volume desc, rr.display_order asc
  limit 1;

  v_rank := coalesce(v_rule.code, 'standard');

  update public.profiles
     set rank_code = v_rank,
         rank_updated_at = now()
   where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'transaction_volume', v_volume,
    'rank_code', v_rank,
    'rank_rule', case when v_rule.id is null then null else to_jsonb(v_rule) end
  );
end;
$$;

revoke all on function public.recalculate_user_rank(uuid) from public;
grant execute on function public.recalculate_user_rank(uuid) to authenticated;

-- ------------------------------------------------------------
-- 10. ELIGIBILITE / CONDITIONS D'UN NOUVEAU DOSSIER
-- ------------------------------------------------------------

create or replace function public.get_loan_eligibility(
  p_loan_type text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rank text;
  v_rule public.rank_rules%rowtype;
  v_max numeric;
  v_repayment integer;
  v_accommodation integer;
  v_enabled boolean;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if p_loan_type not in ('money', 'flight') then
    raise exception 'Type de prêt invalide';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant doit être supérieur à zéro';
  end if;

  select lower(coalesce(rank_code, 'standard'))
    into v_rank
  from public.profiles
  where id = v_user_id;

  if v_rank is null then
    raise exception 'Profil utilisateur introuvable';
  end if;

  select * into v_rule
  from public.rank_rules
  where code = v_rank
    and active = true
  limit 1;

  if not found then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'Aucune règle active n''est configurée pour votre rang.',
      'rank_code', v_rank
    );
  end if;

  if p_loan_type = 'money' then
    v_max := v_rule.max_money_loan_amount;
    v_repayment := v_rule.money_loan_repayment_months;
    v_accommodation := 0;
    v_enabled := v_rule.money_loan_enabled;
  else
    v_max := v_rule.max_flight_loan_amount;
    v_repayment := v_rule.flight_loan_repayment_months;
    v_accommodation := v_rule.flight_accommodation_months;
    v_enabled := v_rule.flight_loan_enabled;
  end if;

  if not v_enabled then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'Ce type de prêt est temporairement indisponible pour votre rang.',
      'rank_code', v_rank,
      'rank_rule_id', v_rule.id
    );
  end if;

  if v_max is not null and p_amount > v_max then
    return jsonb_build_object(
      'eligible', false,
      'reason', format('Le montant demandé dépasse votre plafond de %s.', trim(to_char(v_max, 'FM999999999999990.00'))),
      'rank_code', v_rank,
      'rank_rule_id', v_rule.id,
      'max_amount', v_max,
      'repayment_months', v_repayment,
      'accommodation_months', v_accommodation
    );
  end if;

  return jsonb_build_object(
    'eligible', true,
    'rank_code', v_rank,
    'rank_rule_id', v_rule.id,
    'max_amount', v_max,
    'repayment_months', v_repayment,
    'accommodation_months', v_accommodation,
    'loan_type', p_loan_type
  );
end;
$$;

revoke all on function public.get_loan_eligibility(text, numeric) from public;
grant execute on function public.get_loan_eligibility(text, numeric) to authenticated;

-- ------------------------------------------------------------
-- 11. SOUMISSION ATOMIQUE D'UNE DEMANDE
-- ------------------------------------------------------------

create or replace function public.submit_loan_request(
  p_loan_type text,
  p_amount numeric,
  p_full_name text,
  p_phone_number text,
  p_whatsapp_number text,
  p_id_front_path text,
  p_id_back_path text,
  p_travel_origin text default null,
  p_travel_destination text default null,
  p_travel_date date default null,
  p_passenger_name text default null,
  p_accommodation_requested boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rank text;
  v_rule public.rank_rules%rowtype;
  v_max numeric;
  v_repayment integer;
  v_accommodation integer;
  v_enabled boolean;
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'Utilisateur non authentifié'; end if;
  if p_loan_type not in ('money', 'flight') then raise exception 'Type de prêt invalide'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant doit être supérieur à zéro'; end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'Le nom complet est requis'; end if;
  if nullif(trim(p_whatsapp_number), '') is null then raise exception 'Le numéro WhatsApp est requis'; end if;
  if nullif(trim(p_id_front_path), '') is null or nullif(trim(p_id_back_path), '') is null then
    raise exception 'Les deux faces de la pièce d''identité sont requises';
  end if;

  select lower(coalesce(rank_code, 'standard')) into v_rank
  from public.profiles where id = v_user_id;

  select * into v_rule
  from public.rank_rules
  where code = v_rank and active = true
  limit 1;

  if not found then raise exception 'Aucune règle active n''est configurée pour votre rang'; end if;

  if p_loan_type = 'money' then
    v_max := v_rule.max_money_loan_amount;
    v_repayment := v_rule.money_loan_repayment_months;
    v_accommodation := 0;
    v_enabled := v_rule.money_loan_enabled;
  else
    v_max := v_rule.max_flight_loan_amount;
    v_repayment := v_rule.flight_loan_repayment_months;
    v_accommodation := v_rule.flight_accommodation_months;
    v_enabled := v_rule.flight_loan_enabled;
    if nullif(trim(p_travel_origin), '') is null or nullif(trim(p_travel_destination), '') is null then
      raise exception 'L''origine et la destination du voyage sont requises';
    end if;
    if p_travel_date is null then raise exception 'La date du voyage est requise'; end if;
    if nullif(trim(p_passenger_name), '') is null then raise exception 'Le nom du passager est requis'; end if;
    if p_accommodation_requested and v_accommodation = 0 then
      raise exception 'L''hébergement n''est pas inclus pour votre rang';
    end if;
  end if;

  if not v_enabled then raise exception 'Ce type de prêt est temporairement indisponible pour votre rang'; end if;
  if v_max is not null and p_amount > v_max then
    raise exception 'Le montant demandé dépasse le plafond autorisé pour votre rang';
  end if;

  insert into public.loan_requests (
    user_id, loan_type, amount, rank_at_request, rank_rule_id,
    repayment_months, accommodation_months,
    full_name, phone_number, whatsapp_number,
    id_front_path, id_back_path,
    travel_origin, travel_destination, travel_date, passenger_name,
    accommodation_requested, status
  ) values (
    v_user_id, p_loan_type, p_amount, v_rank, v_rule.id,
    v_repayment, case when p_loan_type = 'flight' and p_accommodation_requested then v_accommodation else 0 end,
    trim(p_full_name), nullif(trim(p_phone_number), ''), trim(p_whatsapp_number),
    trim(p_id_front_path), trim(p_id_back_path),
    nullif(trim(p_travel_origin), ''), nullif(trim(p_travel_destination), ''), p_travel_date, nullif(trim(p_passenger_name), ''),
    coalesce(p_accommodation_requested, false), 'submitted'
  ) returning id into v_request_id;

  insert into public.loan_status_history(loan_request_id, new_status, metadata)
  values (v_request_id, 'submitted', jsonb_build_object('rank_code', v_rank, 'rank_rule_id', v_rule.id));

  perform public.queue_loan_notification(
    v_user_id, 'loan_submitted', 'Votre demande de prêt a bien été enregistrée.',
    jsonb_build_object('loan_request_id', v_request_id)
  );

  return v_request_id;
end;
$$;

revoke all on function public.submit_loan_request(text, numeric, text, text, text, text, text, text, text, date, text, boolean) from public;
grant execute on function public.submit_loan_request(text, numeric, text, text, text, text, text, text, text, date, text, boolean) to authenticated;

-- ------------------------------------------------------------
-- 12. ANNULATION PAR L'UTILISATEUR
-- ------------------------------------------------------------

create or replace function public.cancel_my_loan_request(
  p_request_id uuid
)
returns public.loan_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
  v_old_status text;
begin
  if auth.uid() is null then raise exception 'Utilisateur non authentifié'; end if;

  select * into v_request
  from public.loan_requests
  where id = p_request_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Demande de prêt introuvable'; end if;
  if v_request.status not in ('submitted', 'contacted', 'processing') then
    raise exception 'Cette demande ne peut plus être annulée';
  end if;
  v_old_status := v_request.status;

  update public.loan_requests
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.loan_status_history(loan_request_id, previous_status, new_status, reason, metadata)
  values (p_request_id, v_old_status, 'cancelled', 'Annulation utilisateur', jsonb_build_object('actor_user_id', auth.uid()));

  return v_request;
end;
$$;

revoke all on function public.cancel_my_loan_request(uuid) from public;
grant execute on function public.cancel_my_loan_request(uuid) to authenticated;

-- ------------------------------------------------------------
-- 12. TRAITEMENT ADMIN DES DEMANDES
-- ------------------------------------------------------------

create or replace function public.admin_update_loan_request_status(
  p_request_id uuid,
  p_new_status text,
  p_reason text default null
)
returns public.loan_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_request public.loan_requests%rowtype;
  v_old_status text;
  v_allowed boolean := false;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;

  if p_new_status not in ('contacted', 'processing', 'cancelled') then
    raise exception 'Statut administratif invalide';
  end if;

  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found then raise exception 'Demande de prêt introuvable'; end if;
  v_old_status := v_request.status;

  v_allowed :=
    (v_request.status = 'submitted' and p_new_status in ('contacted', 'processing', 'cancelled')) or
    (v_request.status = 'contacted' and p_new_status in ('processing', 'cancelled')) or
    (v_request.status = 'processing' and p_new_status = 'cancelled');

  if not v_allowed then
    raise exception 'Transition de statut non autorisée: % -> %', v_request.status, p_new_status;
  end if;

  update public.loan_requests
     set status = p_new_status,
         admin_id = coalesce(admin_id, v_admin_id),
         contacted_by_admin_id = case when p_new_status = 'contacted' then v_admin_id else contacted_by_admin_id end,
         contacted_at = case when p_new_status = 'contacted' then now() else contacted_at end,
         processed_at = case when p_new_status = 'processing' then now() else processed_at end,
         cancelled_at = case when p_new_status = 'cancelled' then now() else cancelled_at end,
         rejection_reason = case when p_new_status = 'cancelled' then nullif(trim(p_reason), '') else rejection_reason end,
         updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.loan_status_history(loan_request_id, previous_status, new_status, admin_id, reason)
  values (p_request_id, v_old_status, p_new_status, v_admin_id, nullif(trim(p_reason), ''));

  perform public.queue_loan_notification(
    v_request.user_id, 'loan_' || p_new_status,
    case p_new_status
      when 'contacted' then 'L''équipe Zender237 a pris en charge votre demande de prêt.'
      when 'processing' then 'Votre dossier de prêt est en cours de traitement.'
      else 'Votre demande de prêt a été annulée.'
    end,
    jsonb_build_object('loan_request_id', p_request_id, 'status', p_new_status)
  );

  return v_request;
end;
$$;

revoke all on function public.admin_update_loan_request_status(uuid, text, text) from public;
grant execute on function public.admin_update_loan_request_status(uuid, text, text) to authenticated;

create or replace function public.admin_reject_loan_request(
  p_request_id uuid,
  p_reason text
)
returns public.loan_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_old_status text;
  v_request public.loan_requests%rowtype;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'Le motif du rejet est requis'; end if;

  select status into v_old_status from public.loan_requests where id = p_request_id for update;
  if v_old_status is null then raise exception 'Demande de prêt introuvable'; end if;
  if v_old_status in ('approved', 'completed', 'cancelled', 'rejected') then raise exception 'Cette demande ne peut plus être rejetée'; end if;

  update public.loan_requests
     set status = 'rejected', admin_id = coalesce(admin_id, v_admin_id),
         rejection_reason = trim(p_reason), processed_at = coalesce(processed_at, now()), updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.loan_status_history(loan_request_id, previous_status, new_status, admin_id, reason)
  values (p_request_id, v_old_status, 'rejected', v_admin_id, trim(p_reason));

  perform public.queue_loan_notification(
    v_request.user_id, 'loan_rejected', 'Votre demande de prêt a été rejetée.',
    jsonb_build_object('loan_request_id', p_request_id, 'reason', trim(p_reason))
  );

  return v_request;
end;
$$;

revoke all on function public.admin_reject_loan_request(uuid, text) from public;
grant execute on function public.admin_reject_loan_request(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 13. APPROBATION -> CREATION ATOMIQUE DU VRAI PRET + ECHEANCIER
-- ------------------------------------------------------------

create or replace function public.admin_approve_loan_request(
  p_request_id uuid,
  p_approved_amount numeric,
  p_service_fee numeric default 0,
  p_notes text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_request public.loan_requests%rowtype;
  v_loan public.loans%rowtype;
  v_total numeric(14,2);
  v_base numeric(14,2);
  v_last numeric(14,2);
  v_maturity date;
  i integer;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;
  if p_approved_amount is null or p_approved_amount <= 0 then raise exception 'Le montant approuvé doit être supérieur à zéro'; end if;
  if p_service_fee is null or p_service_fee < 0 then raise exception 'Les frais sont invalides'; end if;

  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found then raise exception 'Demande de prêt introuvable'; end if;
  if v_request.status not in ('contacted', 'processing') then raise exception 'La demande doit être en cours de traitement avant approbation'; end if;
  if p_approved_amount > v_request.amount then raise exception 'Le montant approuvé ne peut pas dépasser le montant demandé'; end if;

  select * into v_loan from public.loans where loan_request_id = p_request_id;
  if found then return v_loan; end if;

  v_total := round(p_approved_amount + p_service_fee, 2);
  v_base := round(v_total / v_request.repayment_months, 2);
  v_last := round(v_total - (v_base * greatest(v_request.repayment_months - 1, 0)), 2);
  v_maturity := (current_date + make_interval(months => v_request.repayment_months))::date;

  insert into public.loans (
    loan_request_id, user_id, loan_type, rank_at_approval,
    requested_amount, approved_amount, service_fee, total_due,
    outstanding_amount, repayment_months, accommodation_months,
    status, disbursement_status, approved_by_admin_id, maturity_date, notes
  ) values (
    v_request.id, v_request.user_id, v_request.loan_type, v_request.rank_at_request,
    v_request.amount, p_approved_amount, p_service_fee, v_total,
    v_total, v_request.repayment_months, v_request.accommodation_months,
    'approved', 'pending', v_admin_id, v_maturity, nullif(trim(p_notes), '')
  ) returning * into v_loan;

  for i in 1..v_request.repayment_months loop
    insert into public.loan_installments(loan_id, installment_number, due_date, amount_due)
    values (
      v_loan.id,
      i,
      (current_date + make_interval(months => i))::date,
      case when i = v_request.repayment_months then v_last else v_base end
    );
  end loop;

  update public.loan_requests
     set status = 'approved',
         admin_id = v_admin_id,
         admin_notes = nullif(trim(p_notes), ''),
         processed_at = coalesce(processed_at, now()),
         updated_at = now()
   where id = p_request_id;

  insert into public.loan_status_history(loan_request_id, previous_status, new_status, admin_id, reason, metadata)
  values (p_request_id, v_request.status, 'approved', v_admin_id, nullif(trim(p_notes), ''), jsonb_build_object('loan_id', v_loan.id));

  insert into public.loan_events(loan_id, loan_request_id, event_type, actor_admin_id, amount, note)
  values (v_loan.id, p_request_id, 'approved', v_admin_id, p_approved_amount, nullif(trim(p_notes), ''));

  perform public.queue_loan_notification(
    v_loan.user_id, 'loan_approved', 'Votre demande de prêt a été approuvée.',
    jsonb_build_object('loan_id', v_loan.id, 'approved_amount', v_loan.approved_amount)
  );

  return v_loan;
end;
$$;

revoke all on function public.admin_approve_loan_request(uuid, numeric, numeric, text) from public;
grant execute on function public.admin_approve_loan_request(uuid, numeric, numeric, text) to authenticated;

-- ------------------------------------------------------------
-- 14. DECAISSEMENT (wallet pour money, référence externe pour flight)
-- ------------------------------------------------------------

create or replace function public.admin_disburse_loan(
  p_loan_id uuid,
  p_external_reference text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_loan public.loans%rowtype;
  v_wallet public.wallets%rowtype;
  v_existing public.loan_disbursements%rowtype;
  v_has_existing boolean := false;
  v_method text;
  v_ledger_id uuid;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;

  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found then raise exception 'Prêt introuvable'; end if;
  if v_loan.disbursement_status = 'completed' then return v_loan; end if;
  if v_loan.status not in ('approved', 'active') then raise exception 'Ce prêt ne peut pas être décaissé dans son état actuel'; end if;

  select * into v_existing from public.loan_disbursements where loan_id = p_loan_id;
  v_has_existing := found;
  if v_has_existing and v_existing.status = 'completed' then return v_loan; end if;

  v_method := case when v_loan.loan_type = 'money' then 'wallet' else 'external' end;

  if v_method = 'wallet' then
    select * into v_wallet from public.wallets where user_id = v_loan.user_id for update;
    if not found then raise exception 'Wallet utilisateur introuvable'; end if;

    insert into public.wallet_ledger_entries(
      wallet_id, user_id, entry_type, amount, balance_before, balance_after,
      source_type, source_id, created_by_admin_id, idempotency_key, metadata
    ) values (
      v_wallet.id, v_loan.user_id, 'credit', v_loan.approved_amount,
      v_wallet.available_balance, v_wallet.available_balance + v_loan.approved_amount,
      'loan_disbursement', v_loan.id, v_admin_id, 'loan_disbursement:' || v_loan.id,
      jsonb_build_object('loan_id', v_loan.id)
    ) returning id into v_ledger_id;

    update public.wallets
       set available_balance = available_balance + v_loan.approved_amount,
           updated_at = now()
     where id = v_wallet.id;
  end if;

  if v_has_existing then
    update public.loan_disbursements
       set method = v_method, amount = v_loan.approved_amount, status = 'completed',
           external_reference = nullif(trim(p_external_reference), ''), admin_id = v_admin_id,
           processed_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('ledger_id', v_ledger_id)
     where loan_id = p_loan_id;
  else
    insert into public.loan_disbursements(
      loan_id, method, amount, status, external_reference, admin_id, processed_at, metadata
    ) values (
      p_loan_id, v_method, v_loan.approved_amount, 'completed', nullif(trim(p_external_reference), ''),
      v_admin_id, now(), jsonb_build_object('ledger_id', v_ledger_id)
    );
  end if;

  update public.loans
     set status = 'active', disbursement_status = 'completed', disbursed_at = now(), updated_at = now()
   where id = p_loan_id
   returning * into v_loan;

  insert into public.loan_events(loan_id, loan_request_id, event_type, actor_admin_id, amount, note, metadata)
  values (v_loan.id, v_loan.loan_request_id, 'disbursed', v_admin_id, v_loan.approved_amount,
          nullif(trim(p_external_reference), ''), jsonb_build_object('method', v_method, 'ledger_id', v_ledger_id));

  perform public.queue_loan_notification(
    v_loan.user_id, 'loan_disbursed', 'Votre prêt a été décaissé.',
    jsonb_build_object('loan_id', v_loan.id, 'amount', v_loan.approved_amount, 'method', v_method)
  );

  return v_loan;
end;
$$;

revoke all on function public.admin_disburse_loan(uuid, text) from public;
grant execute on function public.admin_disburse_loan(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 15. ENREGISTREMENT D'UN REMBOURSEMENT + ALLOCATION ECHEANCES
-- ------------------------------------------------------------

create or replace function public.admin_record_loan_repayment(
  p_loan_id uuid,
  p_amount numeric,
  p_payment_method text default 'manual',
  p_external_reference text default null,
  p_proof_url text default null,
  p_note text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_loan public.loans%rowtype;
  v_repayment_id uuid;
  v_remaining numeric(14,2);
  v_to_apply numeric(14,2);
  v_installment public.loan_installments%rowtype;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Le montant du remboursement est invalide'; end if;
  if p_payment_method not in ('manual', 'bank', 'mobile_money', 'cash', 'wallet') then raise exception 'Méthode de paiement invalide'; end if;

  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found then raise exception 'Prêt introuvable'; end if;
  if v_loan.status not in ('active', 'approved') then raise exception 'Ce prêt n''accepte plus de remboursement'; end if;
  if v_loan.disbursement_status <> 'completed' then raise exception 'Le prêt doit être décaissé avant un remboursement'; end if;
  if p_amount > v_loan.outstanding_amount then raise exception 'Le remboursement dépasse le solde restant'; end if;

  insert into public.loan_repayments(
    loan_id, amount, payment_method, external_reference, proof_url,
    status, recorded_by_admin_id, note
  ) values (
    p_loan_id, p_amount, p_payment_method, nullif(trim(p_external_reference), ''), nullif(trim(p_proof_url), ''),
    'confirmed', v_admin_id, nullif(trim(p_note), '')
  ) returning id into v_repayment_id;

  v_remaining := p_amount;

  for v_installment in
    select * from public.loan_installments
    where loan_id = p_loan_id
      and status <> 'paid'
    order by installment_number
    for update
  loop
    exit when v_remaining <= 0;
    v_to_apply := least(v_remaining, v_installment.amount_due - v_installment.amount_paid);

    update public.loan_installments
       set amount_paid = amount_paid + v_to_apply,
           status = case
             when amount_paid + v_to_apply >= amount_due then 'paid'
             else 'partial'
           end,
           paid_at = case when amount_paid + v_to_apply >= amount_due then now() else paid_at end
     where id = v_installment.id;

    v_remaining := round(v_remaining - v_to_apply, 2);
  end loop;

  update public.loans
     set amount_repaid = amount_repaid + p_amount,
         outstanding_amount = outstanding_amount - p_amount,
         status = case when outstanding_amount - p_amount <= 0 then 'paid' else 'active' end,
         closed_at = case when outstanding_amount - p_amount <= 0 then now() else closed_at end,
         updated_at = now()
   where id = p_loan_id
   returning * into v_loan;

  insert into public.loan_events(loan_id, loan_request_id, event_type, actor_admin_id, amount, note, metadata)
  values (v_loan.id, v_loan.loan_request_id, 'repayment', v_admin_id, p_amount, nullif(trim(p_note), ''),
          jsonb_build_object('repayment_id', v_repayment_id, 'payment_method', p_payment_method));

  perform public.queue_loan_notification(
    v_loan.user_id, case when v_loan.status = 'paid' then 'loan_paid' else 'loan_repayment' end,
    case when v_loan.status = 'paid' then 'Votre prêt est entièrement remboursé.' else 'Un remboursement a été enregistré sur votre prêt.' end,
    jsonb_build_object('loan_id', v_loan.id, 'amount', p_amount, 'outstanding_amount', v_loan.outstanding_amount)
  );

  if v_loan.status = 'paid' then
    update public.loan_requests set status = 'completed', completed_at = now(), updated_at = now()
    where id = v_loan.loan_request_id;
    insert into public.loan_status_history(loan_request_id, previous_status, new_status, reason, metadata)
    values (v_loan.loan_request_id, 'approved', 'completed', 'Prêt entièrement remboursé', jsonb_build_object('loan_id', v_loan.id));
  end if;

  return v_loan;
end;
$$;

revoke all on function public.admin_record_loan_repayment(uuid, numeric, text, text, text, text) from public;
grant execute on function public.admin_record_loan_repayment(uuid, numeric, text, text, text, text) to authenticated;

-- Les opérations métier passent par les RPC sécurisées afin de recalculer
-- les conditions depuis le rang réel de l'utilisateur et d'assurer l'atomicité.
revoke insert, update, delete on public.loan_requests from anon, authenticated;
revoke insert, update, delete on public.loans from anon, authenticated;
revoke insert, update, delete on public.loan_installments from anon, authenticated;
revoke insert, update, delete on public.loan_repayments from anon, authenticated;
revoke insert, update, delete on public.loan_disbursements from anon, authenticated;

-- ------------------------------------------------------------
-- 15bis. RETARDS / DEFAUT
-- ------------------------------------------------------------

create or replace function public.refresh_loan_overdues()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not is_current_admin() then raise exception 'Accès administrateur requis'; end if;

  update public.loan_installments li
     set status = 'late'
   from public.loans l
   where li.loan_id = l.id
     and l.status = 'active'
     and li.due_date < current_date
     and li.amount_paid < li.amount_due
     and li.status in ('pending', 'partial');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_loan_overdues() from public;
grant execute on function public.refresh_loan_overdues() to authenticated;

create or replace function public.admin_mark_loan_defaulted(p_loan_id uuid)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_admin_id uuid;
begin
  select id into v_admin_id from public.admins where auth_user_id = auth.uid() and active = true limit 1;
  if v_admin_id is null then raise exception 'Accès administrateur requis'; end if;

  perform public.refresh_loan_overdues();
  select * into v_loan from public.loans where id = p_loan_id for update;
  if not found then raise exception 'Prêt introuvable'; end if;
  if v_loan.status <> 'active' then raise exception 'Le prêt n''est pas actif'; end if;
  if not exists (select 1 from public.loan_installments where loan_id = p_loan_id and status = 'late') then
    raise exception 'Aucune échéance en retard pour ce prêt';
  end if;

  update public.loans set status = 'defaulted', updated_at = now() where id = p_loan_id returning * into v_loan;
  insert into public.loan_events(loan_id, loan_request_id, event_type, actor_admin_id, note)
  values (v_loan.id, v_loan.loan_request_id, 'defaulted', v_admin_id, 'Prêt marqué en défaut par l''administration');

  perform public.queue_loan_notification(
    v_loan.user_id, 'loan_defaulted', 'Votre prêt présente un défaut de paiement.',
    jsonb_build_object('loan_id', v_loan.id)
  );

  return v_loan;
end;
$$;

revoke all on function public.admin_mark_loan_defaulted(uuid) from public;
grant execute on function public.admin_mark_loan_defaulted(uuid) to authenticated;

-- ------------------------------------------------------------
-- 15ter. PERMISSIONS BACK-OFFICE PRETS (si RBAC disponible)
-- ------------------------------------------------------------

do $$
begin
  if to_regclass('public.backoffice_permissions') is not null then
    insert into public.backoffice_permissions(code, label, description) values
      ('loan.view', 'Voir les prêts', 'Consulter les demandes et prêts'),
      ('loan.review', 'Traiter les demandes de prêt', 'Contacter et mettre en traitement une demande'),
      ('loan.approve', 'Approuver les prêts', 'Créer un prêt à partir d''une demande'),
      ('loan.reject', 'Rejeter les demandes de prêt', 'Refuser une demande avec un motif'),
      ('loan.disburse', 'Décaisser les prêts', 'Enregistrer un décaissement'),
      ('loan.repayment', 'Enregistrer les remboursements', 'Enregistrer les paiements reçus'),
      ('loan.default', 'Gérer les défauts', 'Marquer un prêt en défaut'),
      ('loan.rank_rules.manage', 'Gérer les règles de prêt', 'Modifier les conditions des prêts par rang')
    on conflict (code) do nothing;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 16. RLS
-- ------------------------------------------------------------

alter table public.rank_rules enable row level security;
alter table public.loan_requests enable row level security;
alter table public.loans enable row level security;
alter table public.loan_installments enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.loan_disbursements enable row level security;
alter table public.loan_status_history enable row level security;
alter table public.loan_events enable row level security;

-- rank_rules : lecture pour les utilisateurs connectés, écriture admin.
drop policy if exists "rank_rules_authenticated_read" on public.rank_rules;
create policy "rank_rules_authenticated_read"
on public.rank_rules for select to authenticated
using (active = true or is_current_admin());

drop policy if exists "rank_rules_admin_write" on public.rank_rules;
create policy "rank_rules_admin_write"
on public.rank_rules for all to authenticated
using (is_current_admin())
with check (is_current_admin());

-- loan_requests : l'utilisateur ne voit/modifie que ses propres dossiers.
drop policy if exists "loan_requests_user_read" on public.loan_requests;
create policy "loan_requests_user_read"
on public.loan_requests for select to authenticated
using (user_id = auth.uid() or is_current_admin());

drop policy if exists "loan_requests_admin_write" on public.loan_requests;
create policy "loan_requests_admin_write"
on public.loan_requests for update to authenticated
using (is_current_admin())
with check (is_current_admin());

-- Les INSERT sont volontairement faits via submit_loan_request().
drop policy if exists "loan_requests_user_insert" on public.loan_requests;
create policy "loan_requests_user_insert"
on public.loan_requests for insert to authenticated
with check (user_id = auth.uid());

-- VRAI PRET

drop policy if exists "loans_user_read" on public.loans;
create policy "loans_user_read"
on public.loans for select to authenticated
using (user_id = auth.uid() or is_current_admin());

-- ECHEANCIER

drop policy if exists "loan_installments_user_read" on public.loan_installments;
create policy "loan_installments_user_read"
on public.loan_installments for select to authenticated
using (
  exists (
    select 1 from public.loans l
    where l.id = loan_installments.loan_id
      and (l.user_id = auth.uid() or is_current_admin())
  )
);

-- REMBOURSEMENTS

drop policy if exists "loan_repayments_user_read" on public.loan_repayments;
create policy "loan_repayments_user_read"
on public.loan_repayments for select to authenticated
using (
  exists (
    select 1 from public.loans l
    where l.id = loan_repayments.loan_id
      and (l.user_id = auth.uid() or is_current_admin())
  )
);

-- DECAISSEMENTS

drop policy if exists "loan_disbursements_user_read" on public.loan_disbursements;
create policy "loan_disbursements_user_read"
on public.loan_disbursements for select to authenticated
using (
  exists (
    select 1 from public.loans l
    where l.id = loan_disbursements.loan_id
      and (l.user_id = auth.uid() or is_current_admin())
  )
);

-- HISTORIQUE / EVENTS

drop policy if exists "loan_status_history_user_read" on public.loan_status_history;
create policy "loan_status_history_user_read"
on public.loan_status_history for select to authenticated
using (
  exists (
    select 1 from public.loan_requests r
    where r.id = loan_status_history.loan_request_id
      and (r.user_id = auth.uid() or is_current_admin())
  )
);

drop policy if exists "loan_events_user_read" on public.loan_events;
create policy "loan_events_user_read"
on public.loan_events for select to authenticated
using (
  exists (
    select 1 from public.loan_requests r
    where r.id = loan_events.loan_request_id
      and (r.user_id = auth.uid() or is_current_admin())
  )
  or is_current_admin()
);

-- ------------------------------------------------------------
-- 17. TRIGGER updated_at
-- ------------------------------------------------------------

create or replace function public.touch_loan_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
before update on public.loans
for each row execute function public.touch_loan_updated_at();

drop trigger if exists trg_loan_requests_updated_at on public.loan_requests;
create trigger trg_loan_requests_updated_at
before update on public.loan_requests
for each row execute function public.touch_loan_updated_at();

-- ------------------------------------------------------------
-- FIN
-- ------------------------------------------------------------

-- ============================================================
-- SYNCHRONISATION AUTOMATIQUE DU RANG APRES TRANSACTION TERMINEE
-- ============================================================

create or replace function public.sync_user_rank_after_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank text;
begin
  select rr.code
    into v_rank
  from public.rank_rules rr
  where rr.active = true
    and rr.min_transaction_volume <= (
      select coalesce(sum(t.amount), 0)
      from public.transactions t
      where t.user_id = new.user_id
        and lower(t.status::text) in ('confirmed', 'settled', 'completed')
    )
    and (rr.max_transaction_volume is null or rr.max_transaction_volume >= (
      select coalesce(sum(t2.amount), 0)
      from public.transactions t2
      where t2.user_id = new.user_id
        and lower(t2.status::text) in ('confirmed', 'settled', 'completed')
    ))
  order by rr.min_transaction_volume desc, rr.display_order asc
  limit 1;

  update public.profiles
     set rank_code = coalesce(v_rank, 'standard'),
         rank_updated_at = now()
   where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_rank_after_transaction on public.transactions;
create trigger trg_sync_user_rank_after_transaction
after insert or update of status on public.transactions
for each row
when (lower(new.status::text) in ('confirmed', 'settled', 'completed'))
execute function public.sync_user_rank_after_transaction();

