-- ============================================================
-- Zender237 - Notifications push admin + localisation transfert
-- + dépôt utilisant automatiquement le numéro du profil
-- ============================================================
-- Cette migration complète le schéma existant. Elle est conçue
-- pour être rejouable grâce à IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Colonnes de transaction utilisées par les nouveaux flux
-- ------------------------------------------------------------

alter table public.transactions
  add column if not exists recipient_country public.user_country;

alter table public.transactions
  add column if not exists sender_country_code text;

alter table public.transactions
  add column if not exists recipient_country_code text;

-- ------------------------------------------------------------
-- 2. Colonnes utiles au journal de notifications
-- ------------------------------------------------------------

alter table public.notifications_log
  add column if not exists title text;

alter table public.notifications_log
  add column if not exists read_at timestamptz;

alter table public.notifications_log
  add column if not exists resource_type text;

alter table public.notifications_log
  add column if not exists resource_id uuid;

alter table public.notifications_log
  add column if not exists notification_key text;

alter table public.notifications_log
  add column if not exists status text default 'queued';

alter table public.notifications_log
  add column if not exists failure_reason text;

alter table public.notifications_log
  add column if not exists event_type text;

alter table public.notifications_log
  add column if not exists metadata jsonb;

alter table public.notifications_log
  add column if not exists partner_id uuid references public.partners(id);

alter table public.notifications_log
  add column if not exists kmerdiaspora_admin_id uuid references public.kmerdiaspora_admins(id);

-- Compatibilité avec les bases où title est nouvellement ajoutée.
update public.notifications_log
set title = 'Notification'
where title is null;

alter table public.notifications_log
  alter column title set default 'Notification';

-- ------------------------------------------------------------
-- 3. Association des tokens aux trois types de backoffice.
-- ------------------------------------------------------------

alter table public.push_tokens
  add column if not exists partner_id uuid references public.partners(id);

alter table public.push_tokens
  add column if not exists kmerdiaspora_admin_id uuid references public.kmerdiaspora_admins(id);

create index if not exists idx_push_tokens_admin_active
  on public.push_tokens(admin_id)
  where admin_id is not null and active = true;

create index if not exists idx_notifications_log_admin_transaction
  on public.notifications_log(admin_id, transaction_id, sent_at desc)
  where admin_id is not null;

-- ------------------------------------------------------------
-- 4. Pays détecté côté serveur
-- ------------------------------------------------------------

create or replace function public.set_my_detected_country(
  p_country text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country public.user_country;
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  begin
    v_country := lower(trim(p_country))::public.user_country;
  exception when invalid_text_representation then
    raise exception 'Pays non pris en charge: %', p_country;
  end;

  update public.profiles
  set country = v_country
  where id = v_user_id
  returning * into v_profile;

  if not found then
    raise exception 'Profil utilisateur introuvable';
  end if;

  return to_jsonb(v_profile);
end;
$$;

revoke all on function public.set_my_detected_country(text) from public;
grant execute on function public.set_my_detected_country(text) to authenticated;

-- ------------------------------------------------------------
-- 5. Calcul tarif côté serveur
-- ------------------------------------------------------------
-- L'ordre canonique suit l'application :
-- Cameroun < Guinée < Mali.
-- A -> B et B -> A utilisent le même tarif.
-- ------------------------------------------------------------

create or replace function public.get_transfer_fee(
  p_country_a text,
  p_country_b text,
  p_amount numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_a text := lower(trim(p_country_a));
  v_b text := lower(trim(p_country_b));
  v_min_country text;
  v_max_country text;
  v_fee numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  if v_a not in ('cameroun', 'guinee', 'mali')
     or v_b not in ('cameroun', 'guinee', 'mali') then
    return null;
  end if;

  if v_a = v_b then
    return null;
  end if;

  if v_a = 'cameroun'
     or (v_a = 'guinee' and v_b = 'mali') then
    v_min_country := v_a;
    v_max_country := v_b;
  else
    v_min_country := v_b;
    v_max_country := v_a;
  end if;

  select t.fee_amount
  into v_fee
  from public.transfer_fee_tariffs t
  where (
    lower(t.country_a::text) = v_min_country
    and lower(t.country_b::text) = v_max_country
  )
  and p_amount >= t.min_amount
  and p_amount <= t.max_amount
  order by t.min_amount desc, t.id
  limit 1;

  return v_fee;
end;
$$;

revoke all on function public.get_transfer_fee(text, text, numeric) from public;
grant execute on function public.get_transfer_fee(text, text, numeric) to authenticated;

-- ------------------------------------------------------------
-- 6. Création de dépôt sécurisée côté serveur
-- ------------------------------------------------------------
-- Le numéro expéditeur n'arrive plus du frontend.
-- Il provient toujours de profiles.whatsapp_number.
-- ------------------------------------------------------------

create or replace function public.create_deposit_for_current_user(
  p_amount numeric,
  p_momo_deposit_number_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_momo public.momo_deposit_numbers%rowtype;
  v_transaction public.transactions%rowtype;
  v_country_code text;
  v_phone text;
  v_min numeric;
  v_max numeric;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant de la recharge doit être supérieur à zéro.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profil utilisateur introuvable.';
  end if;

  v_phone := trim(v_profile.whatsapp_number);

  if v_phone is null or v_phone = '' then
    raise exception 'Votre numéro WhatsApp est introuvable dans votre profil.';
  end if;

  -- Le pays est dérivé du numéro enregistré dans le profil.
  if v_phone like '+237%' then
    v_country_code := '+237';
  elsif v_phone like '+224%' then
    v_country_code := '+224';
  elsif v_phone like '+223%' then
    v_country_code := '+223';
  else
    raise exception 'Le numéro WhatsApp du profil ne correspond pas au Cameroun, à la Guinée ou au Mali.';
  end if;

  select *
  into v_momo
  from public.momo_deposit_numbers
  where id = p_momo_deposit_number_id;

  if not found or v_momo.active = false then
    raise exception 'Le numéro Mobile Money sélectionné n’est plus disponible.';
  end if;

  if v_momo.country_code is distinct from v_country_code then
    raise exception 'Le numéro Mobile Money sélectionné ne correspond pas au pays de votre numéro utilisateur.';
  end if;

  v_min := v_momo.min_amount;
  v_max := v_momo.max_amount;

  if v_min is not null and p_amount < v_min then
    raise exception 'Le numéro Mobile Money sélectionné ne couvre pas le montant de la recharge.';
  end if;

  if v_max is not null and p_amount > v_max then
    raise exception 'Le numéro Mobile Money sélectionné ne couvre pas le montant de la recharge.';
  end if;

  insert into public.transactions (
    type,
    status,
    user_id,
    amount,
    sender_phone_number,
    sender_country_code,
    momo_deposit_number_id
  )
  values (
    'deposit',
    'pending_proof',
    v_user_id,
    p_amount,
    v_phone,
    v_country_code,
    p_momo_deposit_number_id
  )
  returning * into v_transaction;

  return to_jsonb(v_transaction);
end;
$$;

revoke all on function public.create_deposit_for_current_user(numeric, uuid) from public;
grant execute on function public.create_deposit_for_current_user(numeric, uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. Création de transfert sécurisée côté serveur
-- ------------------------------------------------------------
-- Le pays d'origine n'est jamais accepté du frontend :
-- il provient de profiles.country, mis à jour par la détection
-- GPS juste avant le transfert.
-- Le tarif est aussi recalculé côté serveur.
-- ------------------------------------------------------------

create or replace function public.create_transfer_for_current_user(
  p_amount numeric,
  p_recipient_name text,
  p_recipient_mobile_number text,
  p_recipient_country text,
  p_recipient_country_code text default null,
  p_recipient_location text default null,
  p_reference_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_transaction public.transactions%rowtype;
  v_from_country text;
  v_to_country text := lower(trim(p_recipient_country));
  v_fee numeric;
  v_sender_country_code text;
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant du transfert doit être supérieur à zéro.';
  end if;

  if trim(coalesce(p_recipient_name, '')) = '' then
    raise exception 'Le nom du destinataire est requis.';
  end if;

  if v_to_country not in ('cameroun', 'guinee', 'mali') then
    raise exception 'Le pays de destination est invalide.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profil utilisateur introuvable.';
  end if;

  v_from_country := lower(v_profile.country::text);

  if v_from_country not in ('cameroun', 'guinee', 'mali') then
    raise exception 'Votre pays de localisation est invalide.';
  end if;

  if v_from_country = v_to_country then
    raise exception 'Le pays de départ et le pays de destination doivent être différents.';
  end if;

  v_fee := public.get_transfer_fee(
    v_from_country,
    v_to_country,
    p_amount
  );

  if v_fee is null then
    raise exception 'Aucun tarif de transfert défini pour ce trajet et ce montant.';
  end if;

  v_sender_country_code :=
    case v_from_country
      when 'cameroun' then '+237'
      when 'guinee' then '+224'
      when 'mali' then '+223'
      else null
    end;

  insert into public.transactions (
    type,
    status,
    user_id,
    amount,
    fee_amount,
    sender_phone_number,
    sender_country_code,
    recipient_name,
    recipient_mobile_number,
    recipient_location,
    recipient_country,
    recipient_country_code,
    reference_note
  )
  values (
    'transfer',
    'under_review',
    v_user_id,
    p_amount,
    v_fee,
    v_profile.whatsapp_number,
    v_sender_country_code,
    trim(p_recipient_name),
    trim(p_recipient_mobile_number),
    nullif(trim(coalesce(p_recipient_location, '')), ''),
    v_to_country::public.user_country,
    nullif(trim(coalesce(p_recipient_country_code, '')), ''),
    nullif(trim(coalesce(p_reference_note, '')), '')
  )
  returning * into v_transaction;

  return to_jsonb(v_transaction);
end;
$$;

revoke all on function public.create_transfer_for_current_user(numeric, text, text, text, text, text, text) from public;
grant execute on function public.create_transfer_for_current_user(numeric, text, text, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 8. Enregistrement des tokens push
-- ------------------------------------------------------------

create or replace function public.register_push_token(
  p_expo_push_token text,
  p_account_type text,
  p_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_admin_id uuid := null;
  v_user_id uuid := null;
  v_partner_id uuid := null;
  v_kma_id uuid := null;
  v_token public.push_tokens%rowtype;
begin
  if v_uid is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if nullif(trim(p_expo_push_token), '') is null then
    raise exception 'Token push manquant';
  end if;

  case lower(trim(p_account_type))
    when 'admin' then
      select id into v_admin_id
      from public.admins
      where id = p_account_id
        and auth_user_id = v_uid
        and active = true;

      if v_admin_id is null then
        raise exception 'Compte administrateur invalide.';
      end if;

    when 'partner' then
      select id into v_partner_id
      from public.partners
      where id = p_account_id
        and auth_user_id = v_uid
        and active = true;

      if v_partner_id is null then
        raise exception 'Compte partenaire invalide.';
      end if;

    when 'kmerdiaspora_admin' then
      select id into v_kma_id
      from public.kmerdiaspora_admins
      where id = p_account_id
        and auth_user_id = v_uid
        and active = true;

      if v_kma_id is null then
        raise exception 'Compte KmAdministrateur invalide.';
      end if;

    when 'user' then
      if p_account_id is not null and p_account_id <> v_uid then
        raise exception 'Compte utilisateur invalide.';
      end if;
      v_user_id := v_uid;

    else
      raise exception 'Type de compte push invalide.';
  end case;

  insert into public.push_tokens (
    expo_push_token,
    active,
    admin_id,
    user_id,
    partner_id,
    kmerdiaspora_admin_id
  )
  values (
    trim(p_expo_push_token),
    true,
    v_admin_id,
    v_user_id,
    v_partner_id,
    v_kma_id
  )
  on conflict (expo_push_token)
  do update set
    active = true,
    admin_id = excluded.admin_id,
    user_id = excluded.user_id,
    partner_id = excluded.partner_id,
    kmerdiaspora_admin_id = excluded.kmerdiaspora_admin_id;

  select * into v_token
  from public.push_tokens
  where expo_push_token = trim(p_expo_push_token);

  return to_jsonb(v_token);
end;
$$;

revoke all on function public.register_push_token(text, text, uuid) from public;
grant execute on function public.register_push_token(text, text, uuid) to authenticated;

create or replace function public.unregister_push_token(
  p_expo_push_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_tokens
  set active = false
  where expo_push_token = trim(p_expo_push_token)
    and (
      user_id = auth.uid()
      or admin_id in (
        select id from public.admins where auth_user_id = auth.uid()
      )
      or partner_id in (
        select id from public.partners where auth_user_id = auth.uid()
      )
      or kmerdiaspora_admin_id in (
        select id from public.kmerdiaspora_admins where auth_user_id = auth.uid()
      )
    );

  return true;
end;
$$;

revoke all on function public.unregister_push_token(text) from public;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ------------------------------------------------------------
-- 9. Création des lignes de notifications transaction
-- ------------------------------------------------------------

create or replace function public.queue_admin_transaction_notification_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
  v_title text;
  v_message text;
  v_status text;
  v_country text;
  v_admin record;
  v_existing_key text;
begin
  -- INSERT = nouvelle transaction.
  if TG_OP = 'INSERT' then
    v_event_type := 'transaction_created';
    v_status := NEW.status::text;
    v_title := 'Nouvelle transaction';
    v_message :=
      case NEW.type::text
        when 'deposit' then 'Un nouveau dépôt a été soumis.'
        when 'transfer' then 'Un nouveau transfert est disponible à traiter.'
        when 'withdrawal' then 'Un nouveau retrait a été soumis.'
        else 'Une nouvelle transaction a été soumise.'
      end;
  else
    -- Les changements métiers significatifs déclenchent un push.
    if NEW.status is distinct from OLD.status then
      v_event_type := 'transaction_status_updated';
    elsif NEW.workflow_stage is distinct from OLD.workflow_stage then
      v_event_type := 'transaction_stage_updated';
    elsif NEW.partner_id is distinct from OLD.partner_id then
      v_event_type := 'transaction_assignment_updated';
    elsif NEW.admin_id is distinct from OLD.admin_id then
      v_event_type := 'transaction_admin_updated';
    else
      return NEW;
    end if;

    v_status := NEW.status::text;
    v_title := 'Mise à jour transaction';
    v_message :=
      case NEW.status::text
        when 'pending_proof' then 'Une transaction attend une preuve de paiement.'
        when 'under_review' then 'Une transaction est en attente de vérification.'
        when 'confirmed' then 'Une transaction vient d’être confirmée.'
        when 'completed' then 'Une transaction est terminée.'
        when 'rejected' then 'Une transaction vient d’être rejetée.'
        when 'cancelled' then 'Une transaction vient d’être annulée.'
        else 'Une transaction a été mise à jour.'
      end;
  end if;

  v_existing_key := coalesce(
    v_event_type || ':' || NEW.id::text || ':' || coalesce(v_status, ''),
    v_event_type || ':' || NEW.id::text
  );

  for v_admin in
    select a.id
    from public.admins a
    where a.active = true
  loop
    insert into public.notifications_log (
      user_id,
      admin_id,
      transaction_id,
      channel,
      title,
      message,
      sent_at,
      event_type,
      status,
      metadata,
      resource_type,
      resource_id,
      notification_key
    )
    values (
      null,
      v_admin.id,
      NEW.id,
      'push',
      v_title,
      v_message,
      now(),
      v_event_type,
      'queued',
      jsonb_build_object(
        'transaction_id', NEW.id,
        'transaction_type', NEW.type::text,
        'transaction_status', NEW.status::text,
        'workflow_stage', NEW.workflow_stage,
        'amount', NEW.amount
      ),
      'transaction',
      NEW.id,
      v_existing_key || ':admin:' || v_admin.id::text
    )
    on conflict do nothing;
  end loop;

  return NEW;
end;
$$;

-- ------------------------------------------------------------
-- 10. Envoi réel vers Expo Push Service via pg_net
-- ------------------------------------------------------------

create extension if not exists pg_net;

create or replace function public.dispatch_admin_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token record;
  v_request_id bigint;
  v_body jsonb;
begin
  if NEW.channel::text <> 'push' or NEW.admin_id is null then
    return NEW;
  end if;

  for v_token in
    select pt.id, pt.expo_push_token
    from public.push_tokens pt
    join public.admins a
      on a.id = pt.admin_id
    where pt.admin_id = NEW.admin_id
      and pt.active = true
      and a.active = true
  loop
    v_body := jsonb_build_object(
      'to', v_token.expo_push_token,
      'title', coalesce(NEW.title, 'Zender237'),
      'body', NEW.message,
      'sound', 'default',
      'priority', 'high',
      'channelId', 'transactions',
      'data', jsonb_build_object(
        'transactionId', NEW.transaction_id,
        'notificationId', NEW.id,
        'eventType', NEW.event_type,
        'resourceType', NEW.resource_type,
        'resourceId', NEW.resource_id
      )
    );

    begin
      select net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := v_body,
        timeout_milliseconds := 10000
      )
      into v_request_id;

      update public.notifications_log
      set metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('pg_net_request_id', v_request_id),
          status = 'queued'
      where id = NEW.id;
    exception when others then
      update public.notifications_log
      set status = 'failed',
          failure_reason = sqlerrm
      where id = NEW.id;
    end;
  end loop;

  return NEW;
end;
$$;

-- ------------------------------------------------------------
-- 11. Recréation des triggers push transaction
-- ------------------------------------------------------------

drop trigger if exists trg_admin_transaction_notification_rows
  on public.transactions;

create trigger trg_admin_transaction_notification_rows
after insert or update of
  status,
  workflow_stage,
  partner_id,
  admin_id
on public.transactions
for each row
execute function public.queue_admin_transaction_notification_rows();

drop trigger if exists trg_dispatch_admin_push_notification
  on public.notifications_log;

create trigger trg_dispatch_admin_push_notification
after insert on public.notifications_log
for each row
execute function public.dispatch_admin_push_notification();

-- ------------------------------------------------------------
-- 12. Permissions de lecture du journal push côté service
-- ------------------------------------------------------------

alter table public.push_tokens enable row level security;
alter table public.notifications_log enable row level security;

-- Les fonctions SECURITY DEFINER gèrent l'écriture.
-- Les policies évitent qu'un utilisateur ordinaire puisse lire les
-- tokens d'autres comptes.

drop policy if exists "push_tokens_owner_select" on public.push_tokens;
create policy "push_tokens_owner_select"
on public.push_tokens
for select
to authenticated
using (
  user_id = auth.uid()
  or admin_id in (
    select id from public.admins where auth_user_id = auth.uid()
  )
  or partner_id in (
    select id from public.partners where auth_user_id = auth.uid()
  )
  or kmerdiaspora_admin_id in (
    select id from public.kmerdiaspora_admins where auth_user_id = auth.uid()
  )
);

-- Les admins peuvent consulter leurs propres logs push si nécessaire.
drop policy if exists "notifications_admin_select" on public.notifications_log;
create policy "notifications_admin_select"
on public.notifications_log
for select
to authenticated
using (
  admin_id in (
    select id from public.admins where auth_user_id = auth.uid()
  )
  or user_id = auth.uid()
);

commit;
