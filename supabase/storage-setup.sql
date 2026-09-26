-- Bucket Storage pour les preuves de transaction (dépôts).
-- À exécuter une fois dans le SQL editor de Supabase, ou via la console Storage.

insert into storage.buckets (id, name, public)
values ('transaction-proofs', 'transaction-proofs', true)
on conflict (id) do nothing;

-- Un utilisateur ne peut uploader que dans son propre dossier de transaction
-- (le chemin utilisé côté client est `${transactionId}/${fileName}`;
-- pour un contrôle strict, préférez `${userId}/${transactionId}/...`).
create policy "Authenticated users can upload proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'transaction-proofs');

create policy "Anyone can view proofs (public bucket)"
on storage.objects for select
using (bucket_id = 'transaction-proofs');

-- Bucket privé dédié aux pièces d'identité des demandes de prêt.
insert into storage.buckets (id, name, public)
values ('loan-identities', 'loan-identities', false)
on conflict (id) do nothing;

drop policy if exists "loan_identities_authenticated_insert" on storage.objects;
create policy "loan_identities_authenticated_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'loan-identities'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "loan_identities_owner_or_admin_select" on storage.objects;
create policy "loan_identities_owner_or_admin_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'loan-identities'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_current_admin()
  )
);

drop policy if exists "loan_identities_owner_update" on storage.objects;
create policy "loan_identities_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'loan-identities'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'loan-identities'
  and (storage.foldername(name))[1] = auth.uid()::text
);
