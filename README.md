# Zender237 — App mobile (React Native / Expo)

Application de transfert d'argent (dépôt, transfert, retrait) construite avec
Expo, React Navigation et Supabase, conforme au cahier des charges v0.2 et au
schéma `supabase/schema.sql`.

## Stack

- **Expo SDK 51** (React Native 0.74)
- **React Navigation** (native-stack + bottom-tabs)
- **Supabase** (Postgres, Auth, Realtime, Storage, Edge Functions)
- **i18n-js** pour le multilingue (FR par défaut)
- Thème centralisé dans `src/theme/theme.js` (design tokens fournis)

## Structure du projet

```
zender237-app/
├── App.js                      # Point d'entrée (fonts, providers, navigation)
├── app.json                    # Config Expo
├── babel.config.js
├── package.json
├── .env.example                 # Variables Supabase à copier en .env
├── assets/
│   ├── images/                  # icon, splash, adaptive-icon (à fournir)
│   └── fonts/
├── src/
│   ├── theme/theme.js           # Design tokens (couleurs, typo, composants)
│   ├── constants/index.js       # Enums alignés sur le schéma SQL
│   ├── i18n/                    # fr.json, en.json
│   ├── lib/supabase.js          # Client Supabase
│   ├── context/                 # AuthContext, WalletContext
│   ├── hooks/                   # useTransactions, useCountdown
│   ├── services/                # Appels Supabase (auth, wallet, transactions...)
│   ├── navigation/               # AuthNavigator, MainTabNavigator, RootNavigator
│   ├── components/              # Button, Input, CodeInput, Card, StatusBadge...
│   └── screens/
│       ├── onboarding/          # Splash, Language, Welcome            (écrans 01-03)
│       ├── auth/                 # SignUp, OTP, PersonalInfo...        (écrans 04-11)
│       ├── dashboard/            # Dashboard                            (écran 12)
│       ├── deposit/              # Amount, Number, Proof, Status       (écrans 13-18)
│       ├── transfer/             # Destination, Recipient, Summary...  (écrans 19-24)
│       ├── withdrawal/           # Amount, Method, Summary, Status     (écrans 25-30)
│       ├── history/              # Historique, Détail, Mes dépôts...   (écrans 31-35)
│       ├── notifications/        # Notifications                       (écran 36)
│       ├── profile/              # Profil, Sécurité, Aide, Support     (écrans 37-40)
│       └── shared/               # Vues réutilisées (statut, listes filtrées)
└── supabase/
    ├── schema.sql                # Schéma fourni (tables, triggers, RLS)
    ├── storage-setup.sql         # Bucket `transaction-proofs`
    └── functions/                # Edge Functions (OTP, login, inscription)
```

## Mise en route

### 1. Backend Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Exécutez `supabase/schema.sql` dans le SQL Editor.
3. Exécutez `supabase/storage-setup.sql` pour créer le bucket de preuves.
4. Déployez les Edge Functions (`supabase/functions/*`) :
   ```bash
   supabase functions deploy send-otp
   supabase functions deploy verify-otp
   supabase functions deploy complete-registration
   supabase functions deploy login
   supabase functions deploy reset-secret-code
   ```
5. Renseignez les secrets nécessaires (WhatsApp Business API) :
   ```bash
   supabase secrets set WHATSAPP_BUSINESS_TOKEN=xxx WHATSAPP_PHONE_NUMBER_ID=xxx
   ```
6. Activez Realtime sur les tables `wallets`, `transactions`, `notifications_log`.

> ⚠️ Les Edge Functions sont des **stubs fonctionnels** illustrant le flux
> attendu (hash SHA-256 simplifié, génération de lien magique). Avant mise en
> production, remplacez le hash par bcrypt/argon2 (via une extension Postgres
> ou un service dédié) et sécurisez le rate-limiting des OTP.

### 2. Application mobile

```bash
npm install
cp .env.example .env
# Renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env
npx expo start
```

Scannez le QR code avec Expo Go (Android/iOS) ou lancez un simulateur :

```bash
npm run ios
npm run android
```

### 3. Assets

Ajoutez vos fichiers réels dans `assets/images/` (voir `assets/images/README.md`)
avant de builder avec EAS :

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Notes d'implémentation

- **Solde en attente / disponible** : entièrement géré côté base par les
  triggers `trg_deposit_status`, `trg_transfer_status`, `trg_withdrawal_status`
  du schéma fourni. Le client ne fait que créer/faire progresser le statut
  des transactions ; il ne calcule jamais le solde lui-même.
- **Temps réel** : `WalletContext` et `TransactionStatusView` s'abonnent aux
  changements Postgres via Supabase Realtime pour refléter les confirmations
  admin sans polling.
- **Sécurité** : les changements de statut (`confirmed`, `rejected`) ne sont
  possibles que depuis le backend (service_role / Edge Functions), jamais
  depuis l'app cliente — cohérent avec les policies RLS du schéma.
- **i18n** : structure prête pour Français/Anglais ; les langues supplémentaires
  vues en maquette (Bambara, Pulaar, Espagnol) retombent sur le français tant
  que les traductions ne sont pas fournies.

## Écrans couverts

Les 40 écrans des maquettes fournies sont implémentés (démarrage → langue →
onboarding → inscription/connexion → dashboard → dépôt/transfert/retrait avec
leurs statuts → historique détaillé par type → notifications → profil/sécurité/
aide/support).
