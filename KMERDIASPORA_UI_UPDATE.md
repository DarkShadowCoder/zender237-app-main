# KmerDiaspora UI Update

Cette version met à jour l'interface KmerDiaspora sans changer les flux financiers généraux de Zender237.

## UI
- Typographie compacte dédiée aux écrans KmerDiaspora/KmAdministrateur.
- Cartes, boutons, champs, badges et bannières plus compacts pour préserver les espaces.
- Navigation inférieure KmerDiaspora ajoutée aux écrans utilisateur.
- Dashboard KmerDiaspora avec `assets/images/KdDashboardBackground.png`.
- Détail de Quête avec `assets/images/KdQuestBackground.png` et hiérarchie visuelle alignée sur la maquette.
- Couleurs bleues conservées via le design system existant.

## Navigation
Les écrans utilisateur KmerDiaspora sont maintenant enregistrés dans `RootNavigator` pour permettre la navigation depuis le dashboard et la navigation interne.

## Compatibilité
Les composants génériques `Input`, `Button`, `SelectField`, `InfoBanner` et `StatusBadge` acceptent désormais une variante compacte sans modifier leur rendu par défaut dans le reste de l'application.

## Contrôle
Le parsing syntaxique TypeScript/JSX des fichiers modifiés a été vérifié sans diagnostic.
