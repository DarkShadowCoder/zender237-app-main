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
