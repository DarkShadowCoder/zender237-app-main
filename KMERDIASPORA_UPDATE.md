# Zender237 — Mise à jour KmerDiaspora

Cette version intègre le parcours KmerDiaspora décrit dans la spécification actuelle et le design de référence.

## Utilisateur
- Accès KmerDiaspora depuis l'accueil Zender237.
- Profils KmerDiaspora avec téléphone récupéré depuis le compte Zender237.
- Trois villes fixes : Sigilli, Douala, Yaoundé.
- Besoin de position : une seule ville.
- Besoin de conducteur : une ou plusieurs villes.
- Matching par score de compatibilité.
- Sélection d'un profil dans l'application puis ouverture de WhatsApp vers KmAdministrateur.
- Quêtes pour soi-même ou pour un autre utilisateur authentifié.
- Approbation du bénéficiaire pour une quête créée en son nom.
- Plafond facultatif et date limite.
- Inscription obligatoire avant contribution.
- Code secret obligatoire avant contribution.
- Débit atomique du solde disponible via RPC.
- Contributions et historique personnels.

## KmAdministrateur
- Dashboard communauté.
- Demandes de position.
- Missions recruteur.
- Matching et détail des correspondances.
- Mise en relation WhatsApp.
- Quêtes et suivi communautaire.
- Modération et rapports conservés dans le flux KMA.

## Admin Zender237
- Les pseudo-dépôts de Quêtes sont créés automatiquement par le backend à la fermeture d'une Quête avec au moins deux contributeurs distincts.
- Le pseudo-dépôt est enregistré comme transaction `deposit` et crédite `pending_balance` du bénéficiaire.
- L'Admin ne crée pas le dépôt : il le retrouve dans l'interface Transactions et le traite comme un dépôt normal.

## Base Supabase
La migration est dans :
`supabase/migrations/20260831_kmerdiaspora_v7.sql`

À appliquer avant d'utiliser les nouveaux parcours financiers KmerDiaspora.

## Asset
Le background utilisé par les écrans KmerDiaspora est :
`assets/images/KmBackground.png`

## Variables d'environnement
Le zip de livraison ne contient pas les secrets locaux (`.env`, `credentials.json`). Conservez vos valeurs locales dans votre copie du projet.
