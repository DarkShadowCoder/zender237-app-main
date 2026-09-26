-- ============================================================
-- ZENDER237 / KMERDIASPORA V7
-- Final business rules + automatic quest pseudo-deposit
-- ============================================================
-- Safe migration for the existing schema.
-- No DROP TABLE / TRUNCATE / DELETE of business data.
--
-- Main rules implemented:
--   * phone inherited from profiles.whatsapp_number
--   * fixed cities: Sigilli, Douala, Yaoundé
--   * one city for kd_job_requests
--   * multi-city missions via kd_driver_request_cities
--   * score-based matching
--   * quests may target self or another user
--   * another beneficiary must approve
--   * target_amount is optional
--   * duration_end is required for new quests
--   * membership before donation
--   * secret code + balance check before donation
--   * creator must make an initial contribution at creation
--   * if >= 2 distinct contributors when a quest closes:
--       automatic pseudo-deposit to beneficiary pending_balance
--   * if only creator contributed when the quest reaches its end:
--       automatic refund + quest closure
--   * admin NEVER creates the pseudo-deposit manually
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. Existing custom city type
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'kd_city'
  ) THEN
    CREATE TYPE public.kd_city AS ENUM ('Sigilli', 'Douala', 'Yaoundé');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Ensure city configuration exists
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kd_city_settings (
  city public.kd_city PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.kd_city_settings(city, active, display_order)
VALUES
  ('Sigilli'::public.kd_city, true, 1),
  ('Douala'::public.kd_city, true, 2),
  ('Yaoundé'::public.kd_city, true, 3)
ON CONFLICT (city) DO UPDATE
SET active = EXCLUDED.active,
    display_order = EXCLUDED.display_order;

-- ------------------------------------------------------------
-- 3. User profile: KmerDiaspora phone is inherited
-- ------------------------------------------------------------
ALTER TABLE public.kd_profiles
  ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE public.kd_job_requests
  ALTER COLUMN phone_number DROP NOT NULL;

ALTER TABLE public.kd_driver_requests
  ALTER COLUMN contact_phone DROP NOT NULL;

UPDATE public.kd_profiles kp
SET phone_number = p.whatsapp_number,
    updated_at = now()
FROM public.profiles p
WHERE p.id = kp.user_id;

UPDATE public.kd_job_requests jr
SET phone_number = p.whatsapp_number,
    updated_at = now()
FROM public.kd_profiles kp
JOIN public.profiles p ON p.id = kp.user_id
WHERE kp.id = jr.profile_id;

UPDATE public.kd_driver_requests dr
SET contact_phone = p.whatsapp_number,
    updated_at = now()
FROM public.profiles p
WHERE p.id = dr.requester_user_id;

CREATE OR REPLACE FUNCTION public.kd_sync_profile_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT p.whatsapp_number
  INTO NEW.phone_number
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kd_sync_profile_phone ON public.kd_profiles;
CREATE TRIGGER trg_kd_sync_profile_phone
BEFORE INSERT OR UPDATE OF user_id
ON public.kd_profiles
FOR EACH ROW
EXECUTE FUNCTION public.kd_sync_profile_phone();

-- ------------------------------------------------------------
-- 5. Multi-city recruiter mission
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kd_driver_request_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_request_id uuid NOT NULL,
  city public.kd_city NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. Fixed cities
-- ------------------------------------------------------------
ALTER TABLE public.kd_profiles
  DROP CONSTRAINT IF EXISTS kd_profiles_city_check;

ALTER TABLE public.kd_profiles
  ADD CONSTRAINT kd_profiles_city_check
  CHECK (
    city IS NULL
    OR city IN ('Sigilli', 'Douala', 'Yaoundé')
  );

ALTER TABLE public.kd_job_requests
  DROP CONSTRAINT IF EXISTS kd_job_requests_city_check;

ALTER TABLE public.kd_job_requests
  ADD CONSTRAINT kd_job_requests_city_check
  CHECK (
    city IN ('Sigilli', 'Douala', 'Yaoundé')
  );

ALTER TABLE public.kd_driver_requests
  DROP CONSTRAINT IF EXISTS kd_driver_requests_city_check;

ALTER TABLE public.kd_driver_requests
  ADD CONSTRAINT kd_driver_requests_city_check
  CHECK (
    city IS NULL
    OR city IN ('Sigilli', 'Douala', 'Yaoundé')
  );

ALTER TABLE public.kd_driver_request_cities
  DROP CONSTRAINT IF EXISTS kd_driver_request_cities_city_check;

ALTER TABLE public.kd_driver_request_cities
  ADD CONSTRAINT kd_driver_request_cities_city_check
  CHECK (
    city IN (
      'Sigilli'::public.kd_city,
      'Douala'::public.kd_city,
      'Yaoundé'::public.kd_city
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kd_driver_request_cities_request_fk'
  ) THEN
    ALTER TABLE public.kd_driver_request_cities
      ADD CONSTRAINT kd_driver_request_cities_request_fk
      FOREIGN KEY (driver_request_id)
      REFERENCES public.kd_driver_requests(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kd_driver_request_cities_unique'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.kd_driver_request_cities
    GROUP BY driver_request_id, city
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE public.kd_driver_request_cities
      ADD CONSTRAINT kd_driver_request_cities_unique
      UNIQUE (driver_request_id, city);
  END IF;
END $$;

INSERT INTO public.kd_driver_request_cities(driver_request_id, city)
SELECT id, city::public.kd_city
FROM public.kd_driver_requests
WHERE city IN ('Sigilli', 'Douala', 'Yaoundé')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6. Matching score
-- ------------------------------------------------------------
ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS score numeric;

ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS city_match boolean DEFAULT false;

ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS country_match boolean DEFAULT false;

ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS mobility_match boolean DEFAULT false;

ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS profile_type_match boolean DEFAULT false;

ALTER TABLE public.kd_driver_matches
  ADD COLUMN IF NOT EXISTS score_details jsonb DEFAULT '{}'::jsonb;

UPDATE public.kd_driver_matches
SET score = COALESCE(score, match_score, 0)
WHERE score IS NULL;

ALTER TABLE public.kd_driver_matches
  DROP CONSTRAINT IF EXISTS kd_driver_matches_score_check;

ALTER TABLE public.kd_driver_matches
  ADD CONSTRAINT kd_driver_matches_score_check
  CHECK (score >= 0 AND score <= 100);

CREATE INDEX IF NOT EXISTS idx_kd_driver_matches_request_score
ON public.kd_driver_matches(driver_request_id, score DESC);

-- ------------------------------------------------------------
-- 7. Quest structure
-- ------------------------------------------------------------
ALTER TABLE public.kd_quests
  ALTER COLUMN target_amount DROP NOT NULL;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS seven_day_deadline timestamptz;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS beneficiary_approval_required boolean DEFAULT false;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS beneficiary_approved_at timestamptz;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS beneficiary_rejected_at timestamptz;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS settlement_transaction_id uuid;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS settlement_amount numeric;

ALTER TABLE public.kd_quests
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

UPDATE public.kd_quests
SET seven_day_deadline = created_at + interval '7 days'
WHERE seven_day_deadline IS NULL;

-- Legacy rows: give old quests a safe transition end date.
UPDATE public.kd_quests
SET duration_end = created_at + interval '30 days'
WHERE duration_end IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kd_quests_settlement_transaction
ON public.kd_quests(settlement_transaction_id)
WHERE settlement_transaction_id IS NOT NULL;

-- ------------------------------------------------------------
-- 8. Quest members uniqueness
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kd_quest_members_unique'
  ) AND NOT EXISTS (
    SELECT quest_id, user_id
    FROM public.kd_quest_members
    GROUP BY quest_id, user_id
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE public.kd_quest_members
      ADD CONSTRAINT kd_quest_members_unique
      UNIQUE (quest_id, user_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 9. Quest contribution support columns
-- ------------------------------------------------------------
ALTER TABLE public.kd_quest_contributions
  ADD COLUMN IF NOT EXISTS is_creator_initial_contribution boolean DEFAULT false;

ALTER TABLE public.kd_quest_contributions
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE public.kd_quest_contributions
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.kd_quest_contributions
  ADD COLUMN IF NOT EXISTS wallet_ledger_entry_id uuid;

-- ------------------------------------------------------------
-- 9b. Contribution statuses: allow automatic refunds
-- ------------------------------------------------------------
ALTER TABLE public.kd_quest_contributions
  DROP CONSTRAINT IF EXISTS kd_quest_contributions_status_check;

ALTER TABLE public.kd_quest_contributions
  ADD CONSTRAINT kd_quest_contributions_status_check
  CHECK (status IN ('pending','confirmed','reversed','cancelled','refunded'));

-- ------------------------------------------------------------
-- 10. Create quest WITH initial contribution
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_create_quest(
  p_beneficiary_user_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_target_amount numeric DEFAULT NULL,
  p_duration_end timestamptz DEFAULT NULL,
  p_initial_contribution numeric DEFAULT NULL,
  p_secret_code text DEFAULT NULL,
  p_currency text DEFAULT 'XAF'
)
RETURNS public.kd_quests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid := auth.uid();
  v_beneficiary uuid;
  v_quest public.kd_quests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_before numeric;
  v_after numeric;
  v_ledger_id uuid;
  v_contribution_id uuid;
  v_needs_approval boolean;
BEGIN
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  v_beneficiary := COALESCE(p_beneficiary_user_id, v_creator);

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_beneficiary
  ) THEN
    RAISE EXCEPTION 'Bénéficiaire introuvable';
  END IF;

  IF NULLIF(trim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Le titre est obligatoire';
  END IF;

  IF p_duration_end IS NULL OR p_duration_end <= now() THEN
    RAISE EXCEPTION 'La date limite doit être dans le futur';
  END IF;

  IF p_initial_contribution IS NULL OR p_initial_contribution <= 0 THEN
    RAISE EXCEPTION 'La contribution initiale du créateur est obligatoire';
  END IF;

  IF p_target_amount IS NOT NULL AND p_target_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant maximal doit être positif';
  END IF;

  IF p_target_amount IS NOT NULL
     AND p_initial_contribution > p_target_amount THEN
    RAISE EXCEPTION 'La contribution initiale dépasse le plafond';
  END IF;

  IF p_secret_code IS NULL OR p_secret_code !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Le code secret doit contenir 6 chiffres';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_creator
      AND p.secret_code_hash = encode(digest(p_secret_code, 'sha256'), 'hex')
  ) THEN
    RAISE EXCEPTION 'Code secret incorrect';
  END IF;

  v_needs_approval := v_beneficiary <> v_creator;

  INSERT INTO public.kd_quests (
    creator_user_id,
    beneficiary_user_id,
    title,
    description,
    target_amount,
    current_amount,
    currency,
    duration_start,
    duration_end,
    seven_day_deadline,
    status,
    creator_initial_contribution_required,
    beneficiary_approval_required,
    created_at,
    updated_at
  )
  VALUES (
    v_creator,
    v_beneficiary,
    trim(p_title),
    NULLIF(trim(p_description), ''),
    p_target_amount,
    0,
    COALESCE(NULLIF(trim(p_currency), ''), 'XAF'),
    now(),
    p_duration_end,
    now() + interval '7 days',
    CASE WHEN v_needs_approval
      THEN 'pending_beneficiary_approval'
      ELSE 'published'
    END,
    true,
    v_needs_approval,
    now(),
    now()
  )
  RETURNING * INTO v_quest;

  -- Creator is a member immediately.
  INSERT INTO public.kd_quest_members(quest_id, user_id, status)
  VALUES (v_quest.id, v_creator, 'active')
  ON CONFLICT DO NOTHING;

  -- Lock wallet and debit initial contribution atomically.
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_creator
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portefeuille introuvable';
  END IF;

  v_before := v_wallet.available_balance;

  IF v_before < p_initial_contribution THEN
    RAISE EXCEPTION 'Solde disponible insuffisant pour la contribution initiale';
  END IF;

  v_after := v_before - p_initial_contribution;

  UPDATE public.wallets
  SET available_balance = v_after,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_ledger_entries (
    wallet_id,
    user_id,
    entry_type,
    amount,
    balance_before,
    balance_after,
    source_type,
    source_id,
    idempotency_key,
    metadata
  )
  VALUES (
    v_wallet.id,
    v_creator,
    'debit',
    p_initial_contribution,
    v_before,
    v_after,
    'kd_quest_initial_contribution',
    v_quest.id,
    'kd-quest-initial-' || v_quest.id::text,
    jsonb_build_object('quest_id', v_quest.id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_ledger_id;

  INSERT INTO public.kd_quest_contributions (
    quest_id,
    contributor_user_id,
    amount,
    status,
    wallet_ledger_entry_id,
    is_creator_initial_contribution,
    contributed_at,
    confirmed_at,
    metadata
  )
  VALUES (
    v_quest.id,
    v_creator,
    p_initial_contribution,
    'confirmed',
    v_ledger_id,
    true,
    now(),
    now(),
    jsonb_build_object('initial', true)
  )
  RETURNING id INTO v_contribution_id;

  UPDATE public.kd_quests
  SET current_amount = p_initial_contribution,
      updated_at = now()
  WHERE id = v_quest.id
  RETURNING * INTO v_quest;

  INSERT INTO public.kd_quest_events (
    quest_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    note,
    metadata
  )
  VALUES (
    v_quest.id,
    v_creator,
    'created',
    'draft',
    v_quest.status,
    'Quête créée avec contribution initiale obligatoire.',
    jsonb_build_object(
      'beneficiary_user_id', v_beneficiary,
      'initial_contribution', p_initial_contribution,
      'contribution_id', v_contribution_id,
      'approval_required', v_needs_approval
    )
  );

  RETURN v_quest;
END;
$$;

-- ------------------------------------------------------------
-- 11. Join quest
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_join_quest(p_quest_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.kd_quests q
    WHERE q.id = p_quest_id
      AND q.status IN ('published', 'active')
      AND (q.duration_end IS NULL OR q.duration_end > now())
      AND (q.target_amount IS NULL OR q.current_amount < q.target_amount)
  ) THEN
    RAISE EXCEPTION 'Cette quête n''est plus ouverte';
  END IF;

  INSERT INTO public.kd_quest_members(quest_id, user_id, status)
  VALUES (p_quest_id, v_user, 'active')
  ON CONFLICT (quest_id, user_id)
  DO UPDATE SET status = 'active', left_at = NULL;

  UPDATE public.kd_quests
  SET status = CASE WHEN status = 'published' THEN 'active' ELSE status END,
      updated_at = now()
  WHERE id = p_quest_id;

  RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- 12. Beneficiary approval
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_respond_quest_approval(
  p_quest_id uuid,
  p_approved boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.kd_quests
    WHERE id = p_quest_id
      AND beneficiary_user_id = v_user
      AND status = 'pending_beneficiary_approval'
  ) THEN
    RAISE EXCEPTION 'Aucune demande d''approbation correspondante';
  END IF;

  UPDATE public.kd_quests
  SET beneficiary_approved_at = CASE WHEN p_approved THEN now() ELSE beneficiary_approved_at END,
      beneficiary_rejected_at = CASE WHEN NOT p_approved THEN now() ELSE beneficiary_rejected_at END,
      status = CASE WHEN p_approved THEN 'published' ELSE 'cancelled' END,
      closed_at = CASE WHEN NOT p_approved THEN now() ELSE closed_at END,
      updated_at = now()
  WHERE id = p_quest_id;

  INSERT INTO public.kd_quest_events(
    quest_id, actor_user_id, event_type, previous_status, new_status
  )
  VALUES(
    p_quest_id,
    v_user,
    CASE WHEN p_approved THEN 'validated' ELSE 'cancelled' END,
    'pending_beneficiary_approval',
    CASE WHEN p_approved THEN 'published' ELSE 'cancelled' END
  );

  RETURN true;
END;
$$;

-- ------------------------------------------------------------
-- 13. Automatic quest settlement / close
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_close_quest_automatically(
  p_quest_id uuid,
  p_force_close boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest public.kd_quests%ROWTYPE;
  v_contributors integer;
  v_amount numeric;
  v_wallet public.wallets%ROWTYPE;
  v_before numeric;
  v_after numeric;
  v_refund numeric := 0;
  v_tx_id uuid;
  v_ledger_id uuid;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_quest
  FROM public.kd_quests
  WHERE id = p_quest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quête introuvable';
  END IF;

  IF v_quest.settlement_transaction_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'result', 'already_settled',
      'transaction_id', v_quest.settlement_transaction_id
    );
  END IF;

  SELECT COUNT(DISTINCT contributor_user_id)::integer
  INTO v_contributors
  FROM public.kd_quest_contributions
  WHERE quest_id = p_quest_id
    AND status = 'confirmed';

  SELECT COALESCE(SUM(amount), 0)
  INTO v_amount
  FROM public.kd_quest_contributions
  WHERE quest_id = p_quest_id
    AND status = 'confirmed';

  -- ----------------------------------------------------------
  -- CASE A: at least two distinct contributors
  -- -> automatic pseudo-deposit
  -- ----------------------------------------------------------
  IF v_contributors >= 2 THEN

    INSERT INTO public.transactions (
      type,
      status,
      user_id,
      sender_name,
      sender_phone_number,
      amount,
      fee_amount,
      reference_note,
      review_deadline,
      workflow_stage,
      created_at
    )
    VALUES (
      'deposit'::public.txn_type,
      'under_review'::public.txn_status,
      v_quest.beneficiary_user_id,
      'KmerDiaspora',
      NULL,
      v_amount,
      0,
      'Pseudo-dépôt automatique — Quête ' || p_quest_id::text,
      v_now + interval '10 minutes',
      'kmerdiaspora_quest_pseudo_deposit',
      v_now
    )
    RETURNING id INTO v_tx_id;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_quest.beneficiary_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Portefeuille du bénéficiaire introuvable';
    END IF;

    v_before := v_wallet.pending_balance;
    v_after := v_before + v_amount;

    UPDATE public.wallets
    SET pending_balance = v_after,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger_entries (
      wallet_id,
      user_id,
      entry_type,
      amount,
      balance_before,
      balance_after,
      source_type,
      source_id,
      idempotency_key,
      metadata
    )
    VALUES (
      v_wallet.id,
      v_quest.beneficiary_user_id,
      'pending_credit',
      v_amount,
      v_before,
      v_after,
      'kd_quest_pseudo_deposit',
      v_tx_id,
      'kd-quest-pseudodeposit-' || p_quest_id::text,
      jsonb_build_object(
        'quest_id', p_quest_id,
        'transaction_id', v_tx_id,
        'contributors', v_contributors
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_ledger_id;

    UPDATE public.kd_quests
    SET status = 'completed',
        completed_at = COALESCE(completed_at, v_now),
        closed_at = v_now,
        settlement_transaction_id = v_tx_id,
        settlement_amount = v_amount,
        settled_at = v_now,
        updated_at = v_now
    WHERE id = p_quest_id;

    INSERT INTO public.kd_quest_events(
      quest_id,
      actor_user_id,
      event_type,
      previous_status,
      new_status,
      note,
      metadata
    )
    VALUES(
      p_quest_id,
      NULL,
      'completed',
      v_quest.status,
      'completed',
      'Pseudo-dépôt créé automatiquement lors de la fermeture de la quête.',
      jsonb_build_object(
        'transaction_id', v_tx_id,
        'ledger_id', v_ledger_id,
        'amount', v_amount,
        'contributors', v_contributors
      )
    );

    RETURN jsonb_build_object(
      'result', 'pseudo_deposit_created',
      'transaction_id', v_tx_id,
      'amount', v_amount,
      'contributors', v_contributors
    );
  END IF;

  -- ----------------------------------------------------------
  -- CASE B: only creator contributed
  -- -> only close once the quest reaches its end
  -- ----------------------------------------------------------
  IF NOT p_force_close
     AND v_quest.duration_end IS NOT NULL
     AND v_quest.duration_end > v_now
     AND v_quest.seven_day_deadline IS NOT NULL
     AND v_quest.seven_day_deadline > v_now
  THEN
    RETURN jsonb_build_object(
      'result', 'still_open',
      'contributors', v_contributors
    );
  END IF;

  -- Refund creator's confirmed contributions.
  SELECT COALESCE(SUM(amount), 0)
  INTO v_refund
  FROM public.kd_quest_contributions
  WHERE quest_id = p_quest_id
    AND contributor_user_id = v_quest.creator_user_id
    AND status = 'confirmed';

  IF v_refund > 0 THEN
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_quest.creator_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Portefeuille du créateur introuvable';
    END IF;

    v_before := v_wallet.available_balance;
    v_after := v_before + v_refund;

    UPDATE public.wallets
    SET available_balance = v_after,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger_entries (
      wallet_id,
      user_id,
      entry_type,
      amount,
      balance_before,
      balance_after,
      source_type,
      source_id,
      idempotency_key,
      metadata
    )
    VALUES (
      v_wallet.id,
      v_quest.creator_user_id,
      'credit',
      v_refund,
      v_before,
      v_after,
      'kd_quest_refund',
      p_quest_id,
      'kd-quest-refund-' || p_quest_id::text,
      jsonb_build_object(
        'quest_id', p_quest_id,
        'reason', 'quest_closed_without_second_contributor'
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    UPDATE public.kd_quest_contributions
    SET status = 'refunded',
        refunded_at = v_now
    WHERE quest_id = p_quest_id
      AND contributor_user_id = v_quest.creator_user_id
      AND status = 'confirmed';
  END IF;

  UPDATE public.kd_quests
  SET status = 'closed',
      closed_at = v_now,
      updated_at = v_now
  WHERE id = p_quest_id;

  INSERT INTO public.kd_quest_events(
    quest_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    note,
    metadata
  )
  VALUES(
    p_quest_id,
    NULL,
    'expired',
    v_quest.status,
    'closed',
    'Quête fermée automatiquement sans second contributeur.',
    jsonb_build_object('refund_amount', v_refund)
  );

  RETURN jsonb_build_object(
    'result', 'creator_refunded',
    'refund_amount', v_refund,
    'contributors', v_contributors
  );
END;
$$;

-- ------------------------------------------------------------
-- 14. Donation: membership + secret code + wallet debit
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_contribute_to_quest(
  p_quest_id uuid,
  p_amount numeric,
  p_secret_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_quest public.kd_quests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_before numeric;
  v_after numeric;
  v_new_amount numeric;
  v_ledger_id uuid;
  v_contribution_id uuid;
  v_contributors integer;
  v_closed jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à zéro';
  END IF;

  IF p_secret_code IS NULL OR p_secret_code !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Le code secret doit contenir 6 chiffres';
  END IF;

  SELECT * INTO v_quest
  FROM public.kd_quests
  WHERE id = p_quest_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quête introuvable';
  END IF;

  IF v_quest.status NOT IN ('published', 'active') THEN
    RAISE EXCEPTION 'Cette quête n''accepte plus de contributions';
  END IF;

  IF v_quest.duration_end IS NOT NULL AND v_quest.duration_end <= now() THEN
    RAISE EXCEPTION 'La date limite de cotisation est dépassée';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.kd_quest_members
    WHERE quest_id = p_quest_id
      AND user_id = v_user
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Vous devez vous inscrire à la quête avant de faire un don';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user
      AND secret_code_hash = encode(digest(p_secret_code, 'sha256'), 'hex')
  ) THEN
    UPDATE public.profiles
    SET login_attempts = login_attempts + 1
    WHERE id = v_user;
    RAISE EXCEPTION 'Code secret incorrect';
  END IF;

  IF v_quest.target_amount IS NOT NULL
     AND v_quest.current_amount + p_amount > v_quest.target_amount
  THEN
    RAISE EXCEPTION 'Ce don dépasse le montant maximal de la quête';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portefeuille introuvable';
  END IF;

  v_before := v_wallet.available_balance;

  IF v_before < p_amount THEN
    RAISE EXCEPTION 'Solde disponible insuffisant';
  END IF;

  v_after := v_before - p_amount;

  UPDATE public.wallets
  SET available_balance = v_after,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_ledger_entries(
    wallet_id,
    user_id,
    entry_type,
    amount,
    balance_before,
    balance_after,
    source_type,
    source_id,
    idempotency_key,
    metadata
  )
  VALUES(
    v_wallet.id,
    v_user,
    'debit',
    p_amount,
    v_before,
    v_after,
    'kd_quest_contribution',
    p_quest_id,
    'kd-contribution-' || p_quest_id::text || '-' || v_user::text || '-' || extract(epoch from clock_timestamp())::bigint::text,
    jsonb_build_object('quest_id', p_quest_id)
  )
  RETURNING id INTO v_ledger_id;

  INSERT INTO public.kd_quest_contributions(
    quest_id,
    contributor_user_id,
    amount,
    status,
    wallet_ledger_entry_id,
    is_creator_initial_contribution,
    contributed_at,
    confirmed_at
  )
  VALUES(
    p_quest_id,
    v_user,
    p_amount,
    'confirmed',
    v_ledger_id,
    v_user = v_quest.creator_user_id,
    now(),
    now()
  )
  RETURNING id INTO v_contribution_id;

  v_new_amount := v_quest.current_amount + p_amount;

  UPDATE public.kd_quests
  SET current_amount = v_new_amount,
      status = CASE
        WHEN status = 'published' THEN 'active'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_quest_id;

  SELECT COUNT(DISTINCT contributor_user_id)::integer
  INTO v_contributors
  FROM public.kd_quest_contributions
  WHERE quest_id = p_quest_id
    AND status = 'confirmed';

  INSERT INTO public.kd_quest_events(
    quest_id,
    actor_user_id,
    event_type,
    previous_status,
    new_status,
    note,
    metadata
  )
  VALUES(
    p_quest_id,
    v_user,
    CASE
      WHEN v_quest.target_amount IS NOT NULL
           AND v_new_amount >= v_quest.target_amount
      THEN 'goal_reached'
      ELSE 'contribution'
    END,
    v_quest.status,
    CASE
      WHEN v_quest.target_amount IS NOT NULL
           AND v_new_amount >= v_quest.target_amount
      THEN 'active'
      ELSE 'active'
    END,
    'Contribution confirmée.',
    jsonb_build_object(
      'amount', p_amount,
      'contribution_id', v_contribution_id,
      'contributors', v_contributors
    )
  );

  -- If the maximum cap is reached, this is a quest closure trigger.
  -- With >=2 contributors it pays out immediately; with only the creator
  -- it refunds the creator instead of paying a single-person quest.
  IF v_quest.target_amount IS NOT NULL
     AND v_new_amount >= v_quest.target_amount
  THEN
    v_closed := public.kd_close_quest_automatically(p_quest_id, false);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quest_id', p_quest_id,
    'contribution_id', v_contribution_id,
    'amount', p_amount,
    'wallet_balance', v_after,
    'quest_current_amount', v_new_amount,
    'contributors', v_contributors,
    'closure', v_closed
  );
END;
$$;

-- ------------------------------------------------------------
-- 15. Automatic processing of date/7-day closures
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kd_process_expired_quests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id
    FROM public.kd_quests
    WHERE status IN ('published', 'active')
      AND (
        (duration_end IS NOT NULL AND duration_end <= now())
        OR
        (seven_day_deadline IS NOT NULL AND seven_day_deadline <= now())
      )
  LOOP
    PERFORM public.kd_close_quest_automatically(r.id, false);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ------------------------------------------------------------
-- 16. Best-effort pg_cron scheduling
-- ------------------------------------------------------------
DO $$
DECLARE
  v_has_cron boolean := false;
  r record;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_has_cron;

  IF v_has_cron THEN
    FOR r IN
      SELECT jobid
      FROM cron.job
      WHERE jobname = 'zender237-kd-quest-expiration'
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;

    PERFORM cron.schedule(
      'zender237-kd-quest-expiration',
      '*/10 * * * *',
      $cron$SELECT public.kd_process_expired_quests();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron non installé : configurez un scheduler Edge Function pour appeler kd_process_expired_quests().';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Planification pg_cron ignorée : %', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- 17. Helpful indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_kd_quests_status_deadline
ON public.kd_quests(status, duration_end);

CREATE INDEX IF NOT EXISTS idx_kd_quests_seven_day_deadline
ON public.kd_quests(status, seven_day_deadline);

CREATE INDEX IF NOT EXISTS idx_kd_contributions_quest_status
ON public.kd_quest_contributions(quest_id, status);

CREATE INDEX IF NOT EXISTS idx_kd_members_quest_user
ON public.kd_quest_members(quest_id, user_id);

-- ------------------------------------------------------------
-- 18. Grants
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.kd_create_quest(
  uuid, text, text, numeric, timestamptz, numeric, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.kd_join_quest(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.kd_respond_quest_approval(uuid, boolean)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.kd_contribute_to_quest(uuid, numeric, text)
TO authenticated;

REVOKE EXECUTE ON FUNCTION public.kd_close_quest_automatically(uuid, boolean)
FROM PUBLIC, authenticated;

REVOKE EXECUTE ON FUNCTION public.kd_process_expired_quests()
FROM PUBLIC, authenticated;

REVOKE EXECUTE ON FUNCTION public.kd_create_automatic_pseudo_deposit(uuid)
FROM PUBLIC, authenticated;

-- ------------------------------------------------------------
-- 19. Final verification
-- ------------------------------------------------------------
SELECT
  q.id,
  q.title,
  q.status,
  q.current_amount,
  q.target_amount,
  q.duration_end,
  q.seven_day_deadline,
  q.settlement_transaction_id,
  q.settlement_amount,
  q.settled_at
FROM public.kd_quests q
ORDER BY q.created_at DESC
LIMIT 20;

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'kd_profiles',
    'kd_job_requests',
    'kd_driver_requests',
    'kd_driver_request_cities',
    'kd_driver_matches',
    'kd_quests',
    'kd_quest_members',
    'kd_quest_contributions'
  )
  AND column_name IN (
    'city',
    'phone_number',
    'contact_phone',
    'target_amount',
    'duration_end',
    'seven_day_deadline',
    'settlement_transaction_id'
  )
ORDER BY table_name, column_name;
```
