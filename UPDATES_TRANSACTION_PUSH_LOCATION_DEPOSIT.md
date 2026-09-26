# Zender237 — mises à jour transactions, localisation et dépôt

## 1. Notifications push administrateur

L'administrateur reçoit une notification système lorsque :

- une transaction est créée ;
- le statut d'une transaction change ;
- l'étape de workflow change ;
- l'affectation à un partenaire ou administrateur change.

Le flux est :

`transactions` → trigger PostgreSQL → `notifications_log` → `pg_net` → Expo Push Service → FCM → téléphone Android.

Le token Expo de l'administrateur est enregistré dans `push_tokens` lorsqu'il se connecte sur un téléphone.

## 2. Localisation du pays au transfert

Au démarrage du parcours de transfert, Zender237 demande la permission de localisation au premier plan, récupère la position du téléphone, effectue un reverse geocoding et limite le pays détecté à :

- Cameroun (`+237`)
- Guinée (`+224`)
- Mali (`+223`)

Le pays détecté est écrit dans `profiles.country`.

Lors de la création finale du transfert, PostgreSQL relit `profiles.country` et recalcule lui-même le tarif depuis `transfer_fee_tariffs`. Le tarif affiché dans le frontend n'est donc pas la source de vérité financière.

## 3. Dépôt

Le champ « Numéro du payeur » a été retiré du formulaire.

Le numéro expéditeur de la transaction est toujours récupéré côté serveur depuis `profiles.whatsapp_number` de l'utilisateur connecté.

## Déploiement Supabase

Appliquer :

`supabase/migrations/20260922000000_transactions_push_location_deposit.sql`

Le projet doit avoir l'extension `pg_net` activée. La migration tente de l'activer automatiquement ; si Supabase refuse la création de l'extension, l'activer depuis Database → Extensions.

## Déploiement de l'application

Après l'ajout de `expo-location`, une nouvelle build native est nécessaire.

Installer les dépendances :

`npm install`

Puis construire une version Android :

`eas build --platform android --profile preview`

ou :

`eas build --platform android --profile production`

Pour les notifications push en production, les credentials push Android/FCM doivent être configurés sur le projet EAS.
