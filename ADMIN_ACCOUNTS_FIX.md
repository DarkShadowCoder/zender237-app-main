# Zender237 — réparation des comptes administrateur / partenaire / utilisateur

## Correctifs inclus

- `src/services/adminService.js`
  - ajoute `createPartner()`
  - ajoute `createKmAdministrator()`
  - ajoute `updateKmAdministrator()`
  - ajoute `configureKmAdministratorWhatsApp()`
  - remplace les suppressions directes par l’Edge Function sécurisée
  - supprime la lecture inexistante `profiles.auth_user_id`
  - utilise la syntaxe PostgREST correcte `profiles:profiles!transactions_user_id_fkey(...)` et `partners:partners!transactions_partner_id_fkey(...)`, avec le nom réel des tables comme cible de relation
  - corrige les champs réels de `partners` dans `updatePartner()`
- `supabase/functions/provision-backoffice-account/index.ts`
  - vérifie maintenant qu’un administrateur actif appelle la fonction
- `supabase/functions/delete-backoffice-account/index.ts`
  - nouvelle fonction sécurisée de suppression
  - détache les références facultatives avant suppression des partenaires/KmAdministrateurs
  - conserve les transactions et traces historiques des partenaires/KmAdministrateurs
  - bloque la suppression d’un utilisateur lorsqu’un historique financier non détachable existe
  - supprime le compte Auth associé lorsque possible
- `src/screens/admin/partners/PartnersScreen.js`
  - texte de confirmation adapté au nouveau comportement
- `src/screens/admin/kmerdiaspora/KmAdministratorsScreen.js`
  - texte de confirmation adapté au nouveau comportement

## Déploiement Supabase

Depuis la racine du projet :

```bash
supabase functions deploy provision-backoffice-account
supabase functions deploy delete-backoffice-account
```

La clé `SUPABASE_SERVICE_ROLE_KEY` reste uniquement côté Edge Functions. Ne la placez pas dans l’application React Native.

## Redémarrage Expo

Après remplacement des fichiers, redémarrez Metro avec le cache vidé :

```bash
npx expo start -c
```

Cela évite de conserver un ancien bundle contenant l’ancienne syntaxe de relation `profiles:user_id!transactions_user_id_fkey(...)`.

## Important concernant les utilisateurs

La suppression d’un utilisateur ayant des transactions, écritures de ledger, prêts/demandes de prêts, contributions ou preuves de transaction est volontairement refusée afin de ne pas détruire l’historique financier. Dans ce cas, utilisez la désactivation du compte.
