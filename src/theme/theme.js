/**
 * ============================================================
 *  ZENDER237 — DESIGN SYSTEM (theme.js)
 * ============================================================
 * Transfert d'argent rapide, sécurisé et fiable.
 *
 * Ce fichier centralise tous les tokens visuels de l'application
 * (React Native / Expo) : couleurs, typographie, espacements,
 * rayons, ombres, et tokens de composants (boutons, inputs,
 * cartes, badges de statut, moyens de paiement…).
 *
 * Construit à partir :
 *  - des 40 maquettes UI fournies (onboarding, dépôt, transfert,
 *    retrait, dashboard, profil, notifications…), analysées en
 *    détail (couleurs échantillonnées pixel par pixel sur les
 *    boutons, titres, badges, cartes de solde, icônes de statut).
 *  - du schéma Supabase/Postgres (zender237-schema.sql) : les
 *    enums `txn_status`, `txn_type`, `user_country`,
 *    `notif_channel` sont directement mappés à des couleurs et
 *    libellés pour éviter toute divergence entre le back-end
 *    et l'UI.
 *
 * Usage :
 *   import { theme } from './theme';
 *   import { colors, spacing, radii, typography } from './theme';
 *
 *   <View style={{ backgroundColor: colors.background.default, padding: spacing.md }}>
 *     <Text style={typography.h1}>Créer un compte</Text>
 *   </View>
 *
 * Police :
 *  Les maquettes utilisent une police "rounded" (arrondie, amicale,
 *  chiffres arrondis) proche de Baloo 2 / Fredoka / Nunito.
 *  -> À charger via `expo-font` / `@expo-google-fonts/baloo-2`
 *     (voir FONT_CONFIG plus bas).
 *
 *  IMPORTANT — chaque style de `typography` définit à la fois
 *  `fontFamily` (le fichier de police exact, ex. Baloo2_700Bold)
 *  ET un `fontWeight` numérique correspondant. C'est volontaire :
 *  tant que les polices Google Fonts ne sont pas chargées
 *  (`useFonts` pas encore résolu, ou police custom introuvable),
 *  React Native retombe silencieusement sur la police système —
 *  sans le `fontWeight` explicite, ce fallback s'affiche TOUJOURS
 *  en régulier (400), même pour un titre censé être en gras. Le
 *  `fontWeight` explicite garantit que la hiérarchie visuelle
 *  (gras des titres, semi-gras des montants…) reste correcte que
 *  la police custom soit chargée ou non.
 * ============================================================
 */

// ------------------------------------------------------------
// 0. CONFIGURATION DES POLICES (Google Fonts via expo-font)
// ------------------------------------------------------------
// npm install @expo-google-fonts/baloo-2 expo-font
// puis, au démarrage de l'app :
//   import { useFonts, Baloo2_400Regular, Baloo2_500Medium,
//            Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold }
//   from '@expo-google-fonts/baloo-2';


export const FONT_CONFIG = {
  googleFontsPackage: '@expo-google-fonts/baloo-2',
  families: {
    regular: 'Baloo2_400Regular',
    medium: 'Baloo2_500Medium',
    semiBold: 'Baloo2_600SemiBold',
    bold: 'Baloo2_700Bold',
    extraBold: 'Baloo2_800ExtraBold',
  },
  // Fallback natif tant que les polices custom ne sont pas chargées
  fallback: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    extraBold: 'System',
  },
};

// ------------------------------------------------------------
// 1. PALETTE BRUTE (valeurs sources — ne pas utiliser directement
//    dans les écrans, préférer les tokens sémantiques ci-dessous)
//
//    Valeurs recalibrées par échantillonnage direct des pixels
//    des maquettes (boutons, titres, icônes de statut, cartes).
// ------------------------------------------------------------
const palette = {
  // Bleu de marque (logo, CTA principal, TITRES D'ÉCRAN, liens)
  // #1F63F2 = couleur exacte mesurée sur les boutons "Continuer" /
  // "Se connecter" ET sur les titres d'écran ("Créer un compte",
  // "Informations personnelles", "Résumé du transfert"…).
  blue50: '#EAF1FE',
  blue100: '#D3E2FD',
  blue200: '#A7C5FB',
  blue300: '#6E9DF7',
  blue400: '#3E78F4',
  blue500: '#1F63F2', // <- bouton primaire ET titres d'écran (h1)
  blue600: '#1650D1',
  blue700: '#123FA6',
  blue800: '#0E2E7A',

  // Bleu marine profond (fond de l'écran de démarrage)
  // #001257 = couleur exacte mesurée sur le fond de l'écran "01. Écran de démarrage"
  navy900: '#000B33', // texte le plus sombre (titres de section, valeurs, noms)
  navy800: '#001257', // <- fond de l'écran de démarrage
  navy700: '#0A1D6E',
  navy600: '#12278A',

  // Orange / jaune (accent du logo "Zender237", flèche, "237")
  orange400: '#FFC94D',
  orange500: '#FEB80D', // <- "237" dans le logo
  orange600: '#F59E00',
  orange700: '#DB7F00',

  // Vert succès (dépôt confirmé, transfert réussi, solde crédité,
  // montants entrants "+50 000 U")
  green50: '#E7FBF3',
  green100: '#C3F5E1',
  green300: '#5FE0B7',
  green500: '#1FB983', // <- check "Compte créé avec succès"
  green600: '#149A6B',
  green700: '#0E7A55',

  // Rouge erreur (dépôt/transfert/retrait rejeté, retraits sortants)
  // #F5222D = recalibré sur l'icône "X" bien saturée des écrans "Rejeté"
  red50: '#FEECEC',
  red100: '#FCD2D2',
  red300: '#F97878',
  red500: '#F5222D', // <- icône "X" des écrans "Rejeté"
  red600: '#D3161F',
  red700: '#A81F1F',

  // Bleu "info" (statut "En attente" / "En cours" — icône horloge
  // des écrans dédiés "Recharge en attente", "Transfert en cours",
  // "Retrait en attente")
  info50: '#E9F1FE',
  info300: '#5FA3F7',
  info500: '#2F80ED',
  info600: '#1E63C4',

  // Ambre / avertissement (badges "en attente" compacts des listes,
  // étape "preuve requise" avant passage en revue)
  amber50: '#FFF6E0',
  amber100: '#FCE7B0',
  amber500: '#F5A623',
  amber600: '#DB8B00',
  amber700: '#A66000',

  // Gris neutres (textes, bordures, fonds de carte)
  gray0: '#FFFFFF',
  gray25: '#FBFCFE',
  gray50: '#F5F7FB', // fond d'écran général
  gray100: '#EEF1F6',
  gray200: '#E3E7EF',
  gray300: '#CBD2DF',
  gray400: '#A4ACBD',
  gray500: '#7C8598',
  gray600: '#5B6478',
  gray700: '#3F4759',
  gray800: '#242B3D',
  gray900: '#12172A',

  // Couleurs de marques des opérateurs Mobile Money (2.3.1 — momo_deposit_numbers)
  mtnYellow: '#FFCC08',
  mtnYellowDark: '#1A1A1A',
  orangeMoney: '#FF6600',
  moovBlue: '#0A5FBF',
  whatsappGreen: '#25D366',
};

// ------------------------------------------------------------
// 2. COULEURS SÉMANTIQUES
// ------------------------------------------------------------
export const colors = {
  brand: {
    primary: palette.blue500,
    primaryLight: palette.blue100,
    primaryDark: palette.blue700,
    secondary: palette.orange500, // accent orange du logo
    secondaryLight: palette.orange400,
    secondaryDark: palette.orange700,
    navy: palette.navy800, // fond écran de démarrage / éléments premium
    gradientLogo: [palette.blue300, palette.blue700], // dégradé du "Z" du logo
    gradientArrow: [palette.orange400, palette.orange600], // dégradé de la flèche
    gradientBalanceCard: [palette.blue500, palette.blue700], // carte "Solde disponible"
  },

  // États fonctionnels génériques
  success: {
    default: palette.green500,
    light: palette.green50,
    border: palette.green100,
    text: palette.green700,
  },
  error: {
    default: palette.red500,
    light: palette.red50,
    border: palette.red100,
    text: palette.red700,
  },
  warning: {
    default: palette.amber500,
    light: palette.amber50,
    border: palette.amber100,
    text: palette.amber700,
  },
  info: {
    default: palette.info500,
    light: palette.info50,
    border: palette.info300,
    text: palette.info600,
  },

  // Texte
  // IMPORTANT : `primary` est le texte SOMBRE utilisé pour les
  // labels, les valeurs de champ, les noms et les montants
  // ("Nom complet", "Yvan Landry", "100 000 U", "Transactions
  // récentes"…). Les TITRES D'ÉCRAN (h1) ne l'utilisent volontairement
  // PAS : ils sont toujours bleu marque (voir `typography.h1` qui
  // référence `colors.brand.primary`, mesuré à l'identique sur
  // chaque maquette : "Créer un compte", "Informations
  // personnelles", "Résumé du transfert", "Mes dépôts"…).
  text: {
    primary: palette.navy900,     // labels, valeurs, noms, sections ("Transactions récentes")
    secondary: palette.gray600,   // sous-titres, descriptions ("Voici un aperçu de votre compte")
    tertiary: palette.gray500,    // dates, notes, placeholders
    disabled: palette.gray400,
    inverse: palette.gray0,       // texte sur fond sombre / bouton primaire
    link: palette.blue500,
  },

  // Fonds
  background: {
    default: palette.gray50,      // fond général des écrans
    surface: palette.gray0,       // cartes, inputs, bottom sheets
    surfaceAlt: palette.gray100,  // sections secondaires (résumé, notes)
    dark: palette.navy700,        // écran de démarrage
    overlay: 'rgba(6, 12, 34, 0.55)', // modales / bottom sheets
  },

  // Bordures / séparateurs
  border: {
    default: palette.gray200,
    light: palette.gray100,
    focus: palette.blue500,
    error: palette.red300,
  },

  // Icônes
  icon: {
    default: palette.gray600,
    muted: palette.gray400,
    onPrimary: palette.gray0,
    active: palette.blue500,
  },

  // Overlays d'état désactivé / pression
  overlay: {
    pressed: 'rgba(31, 99, 242, 0.08)',
    disabled: palette.gray200,
  },

  // Accès direct à la palette brute si besoin ponctuel
  palette,
};

// ------------------------------------------------------------
// 3. STATUTS MÉTIER — mappés 1:1 sur l'enum `txn_status` du schéma
//    (pending_proof, under_review, confirmed, rejected, cancelled)
//
//    pending_proof  -> ambre (action requise de l'utilisateur, avant
//                       soumission — ex. badge compact "En attente"
//                       affiché sur la liste des transactions du
//                       dashboard tant que la preuve n'est pas envoyée)
//    under_review   -> bleu info (soumis, en cours de vérification —
//                       écrans dédiés "Recharge en attente" / "Transfert
//                       en cours" / "Retrait en attente", icône
//                       horloge bleue mesurée sur les maquettes)
//    confirmed      -> vert (écrans "…confirmé !" / "…réussi !")
//    rejected       -> rouge (écrans "…rejeté")
//    cancelled      -> gris neutre
// ------------------------------------------------------------
export const STATUS = {
  pending_proof: 'pending_proof',
  under_review: 'under_review',
  confirmed: 'confirmed',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

export const statusColors = {
  [STATUS.pending_proof]: {
    background: colors.warning.light,
    border: colors.warning.border,
    text: colors.warning.text,
    icon: colors.warning.default,
    label: 'À compléter',
  },
  [STATUS.under_review]: {
    // Écrans "Recharge en attente" / "Transfert en cours" / "Retrait en attente"
    background: colors.info.light,
    border: colors.info.border,
    text: colors.info.text,
    icon: colors.info.default,
    label: 'En attente',
  },
  [STATUS.confirmed]: {
    // Écrans "Recharge confirmé !" / "Transfert réussi !" / "Retrait effectué !"
    background: colors.success.light,
    border: colors.success.border,
    text: colors.success.text,
    icon: colors.success.default,
    label: 'Confirmé',
  },
  [STATUS.rejected]: {
    // Écrans "Recharge rejeté" / "Transfert rejeté" / "Retrait rejeté"
    background: colors.error.light,
    border: colors.error.border,
    text: colors.error.text,
    icon: colors.error.default,
    label: 'Rejeté',
  },
  [STATUS.cancelled]: {
    background: palette.gray100,
    border: palette.gray300,
    text: palette.gray500,
    icon: palette.gray400,
    label: 'Annulé',
  },
};

/** Retourne les tokens visuels d'un statut de transaction. */
export const getStatusColors = (status) =>
  statusColors[status] ?? statusColors[STATUS.pending_proof];

// ------------------------------------------------------------
// 4. TYPES DE TRANSACTION — mappés sur l'enum `txn_type`
//    (deposit, transfer, withdrawal) — liste "Transactions récentes"
//    du dashboard.
//
//    Mesuré directement sur la maquette : le dépôt (argent entrant)
//    est en VERT avec un "+", le retrait (argent sortant vers la
//    banque) est en ROUGE avec un "-" (opération plus sensible), et
//    le transfert (entre utilisateurs) reste en texte NEUTRE sombre
//    avec un "-" — il n'est PAS bleu dans la liste.
// ------------------------------------------------------------
export const transactionTypeColors = {
  deposit: { color: colors.success.default, background: colors.success.light, sign: '+', label: 'Recharge' },
  transfer: { color: colors.text.primary, background: colors.background.surfaceAlt, sign: '-', label: 'Transfert' },
  withdrawal: { color: colors.error.default, background: colors.error.light, sign: '-', label: 'Retrait' },
};

// ------------------------------------------------------------
// 5. PAYS — mappés sur l'enum `user_country` (mali, guinee, cameroun)
// ------------------------------------------------------------
export const countries = {
  mali: { label: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  guinee: { label: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  cameroun: { label: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
};

// ------------------------------------------------------------
// 6. MOYENS DE PAIEMENT MOBILE MONEY (2.3.1 — numéros de dépôt)
// ------------------------------------------------------------
export const paymentMethods = {
  mtn: {
    label: 'MTN Mobile Money',
    background: palette.mtnYellow,
    text: palette.mtnYellowDark,
  },
  orange_money: {
    label: 'Orange Money',
    background: palette.orangeMoney,
    text: palette.gray0,
  },
  moov_money: {
    label: 'Moov Money',
    background: palette.moovBlue,
    text: palette.gray0,
  },
};

// ------------------------------------------------------------
// 7. CANAUX DE NOTIFICATION — enum `notif_channel` (whatsapp, push)
// ------------------------------------------------------------
export const notificationChannels = {
  whatsapp: { label: 'WhatsApp', color: palette.whatsappGreen },
  push: { label: 'Notification push', color: colors.brand.primary },
};

// ------------------------------------------------------------
// 8. ESPACEMENTS (échelle base 4, recalibrée pour respirer comme
//    sur les maquettes — cartes et sections généreusement aérées)
// ------------------------------------------------------------
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 36,
  huge: 44,
  giant: 52,

  // Marges d'écran standard vues sur toutes les maquettes
  screenHorizontal: 24,
  screenVertical: 30,
};

// ------------------------------------------------------------
// 9. RAYONS DE BORDURE
// ------------------------------------------------------------
export const radii = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 14,   // inputs, chips rectangulaires
  lg: 18,   // boutons
  xl: 22,   // cartes (résumé, dashboard, écrans de statut)
  xxl: 28,  // bottom sheets, grandes cartes
  pill: 999, // badges de statut, filtres ("En attente" / "Confirmés")
  circle: 9999, // avatars, icônes rondes (check / X / horloge)
};

// ------------------------------------------------------------
// 10. OMBRES (iOS shadow* + Android elevation)
// ------------------------------------------------------------
const shadow = (color, opacity, radius, elevation, offsetY = 2) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export const shadows = {
  none: shadow('#000', 0, 0, 0, 0),
  card: shadow(palette.navy900, 0.06, 12, 3),
  cardHover: shadow(palette.navy900, 0.1, 16, 5),
  button: shadow(palette.blue500, 0.25, 10, 4),
  modal: shadow(palette.navy900, 0.18, 24, 10, 6),
};

// ------------------------------------------------------------
// 11. TYPOGRAPHIE
// ------------------------------------------------------------
const fontFamily = FONT_CONFIG.families;

// Échelle inspirée de la hiérarchie iOS/Material adaptée à une
// police "rounded" chargée (Baloo 2), volontairement généreuse
// pour restituer le rendu dense et affirmé des maquettes.
export const fontSizes = {
  xs: 16,
  sm: 18,
  base: 20,
  md: 21,
  lg: 23,
  xl: 25,
  xxl: 30,
  display: 34,
  hero: 40,
};

export const lineHeights = {
  xs: 17,
  sm: 20,
  base: 23,
  md: 24,
  lg: 26,
  xl: 29,
  xxl: 33,
  display: 38,
  hero: 43,
};

export const fontWeights = {
  regular: '500',
  medium: '600',
  semiBold: '700',
  bold: '800',
  extraBold: '900',
};

/**
 * Styles de texte prêts à l'emploi, calqués sur la hiérarchie
 * observée dans les maquettes :
 *  - hero      : "Zender237" (écran de démarrage) — blanc, extra-gras
 *  - h1        : titre principal d'écran — TOUJOURS bleu marque,
 *                extra-gras ("Créer un compte", "Informations
 *                personnelles", "Résumé du transfert", "Mes dépôts",
 *                "Notifications", "Bonjour, Yvan")
 *  - h2        : en-tête de section DANS un écran — sombre, gras
 *                ("Transactions récentes")
 *  - h3        : titre de sous-carte / ligne de liste — sombre, semi-gras
 *  - body      : texte courant (gris)
 *  - bodyBold  : montants, noms ("100 000 U", "Mamadou Traoré") — sombre
 *  - caption   : dates, notes, sous-texte ("12 Mar 2024 - 10:30")
 *  - button    : libellés de boutons ("Continuer", "Se connecter") — gras
 *  - amountLg  : gros montant du dashboard (sur fond bleu, blanc, extra-gras)
 *  - amountMd  : montants sur fond clair (sombre, gras)
 */
export const typography = {
  hero: {
    fontFamily: fontFamily.extraBold,
    fontWeight: fontWeights.extraBold,
    fontSize: fontSizes.hero,
    lineHeight: lineHeights.hero,
    letterSpacing: -0.4,
    color: colors.text.inverse,
  },
  h1: {
    fontFamily: fontFamily.extraBold,
    fontWeight: fontWeights.extraBold,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    letterSpacing: 0,
    color: colors.brand.primary, // <- toujours bleu marque, jamais colors.text.primary
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    color: colors.text.primary,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeights.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    color: colors.text.primary,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    color: colors.text.secondary,
  },
  bodyBold: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeights.semiBold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    color: colors.text.primary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontWeight: fontWeights.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.md * 1.4,
    color: colors.text.tertiary,
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeights.semiBold,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  button: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    color: colors.text.inverse,
  },
  amountLg: {
    // "150 000 U" sur la carte solde du dashboard
    fontFamily: fontFamily.extraBold,
    fontWeight: fontWeights.extraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.text.inverse,
  },
  amountMd: {
    fontFamily: fontFamily.bold,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    color: colors.text.primary,
  },
};

// ------------------------------------------------------------
// 12. TOKENS DE COMPOSANTS
// ------------------------------------------------------------
export const components = {
  button: {
    height: {
      sm: 44,
      md: 56, // hauteur standard vue sur "Continuer" / "Se connecter"
      lg: 60,
    },
    radius: radii.lg,
    paddingHorizontal: spacing.xl,
    variants: {
      primary: {
        backgroundColor: colors.brand.primary,
        textColor: colors.text.inverse,
        borderColor: 'transparent',
        ...shadows.button,
      },
      secondary: {
        // ex: "Créer un compte" sur fond sombre (bordure translucide)
        backgroundColor: 'transparent',
        textColor: colors.text.inverse,
        borderColor: 'rgba(255,255,255,0.35)',
        borderWidth: 1.5,
      },
      outline: {
        backgroundColor: 'transparent',
        textColor: colors.brand.primary,
        borderColor: colors.brand.primary,
        borderWidth: 1.5,
      },
      ghost: {
        backgroundColor: 'transparent',
        textColor: colors.brand.primary,
        borderColor: 'transparent',
      },
      danger: {
        // "Supprimer mon compte", "Réessayer" sur retrait rejeté
        backgroundColor: colors.error.default,
        textColor: colors.text.inverse,
        borderColor: 'transparent',
      },
      success: {
        backgroundColor: colors.success.default,
        textColor: colors.text.inverse,
        borderColor: 'transparent',
      },
      disabled: {
        backgroundColor: colors.overlay.disabled,
        textColor: colors.text.disabled,
        borderColor: 'transparent',
      },
    },
  },

  input: {
    height: 66,
    radius: radii.md,
    backgroundColor: colors.background.surface,
    borderColor: colors.border.default,
    borderWidth: 1,
    focusBorderColor: colors.border.focus,
    errorBorderColor: colors.border.error,
    paddingHorizontal: spacing.lg,
    placeholderColor: colors.text.tertiary,
    textColor: colors.text.primary,
    labelStyle: {
      fontFamily: fontFamily.medium,
      fontWeight: fontWeights.medium,
      fontSize: fontSizes.sm,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
  },

  // Champs OTP / code secret à 4-6 cases (écrans de vérification)
  otpCell: {
    size: 65,
    radius: radii.md,
    borderColor: colors.border.default,
    activeBorderColor: colors.brand.primary,
    filledBackgroundColor: colors.background.surface,
    textColor: colors.text.primary,
  },

  card: {
    radius: radii.xl,
    backgroundColor: colors.background.surface,
    padding: spacing.xl,
    borderColor: colors.border.light,
    borderWidth: 1,
    ...shadows.card,
  },

  // Carte "Solde disponible" du dashboard (fond bleu dégradé)
  balanceCard: {
    radius: radii.xl,
    padding: spacing.xl,
    backgroundColor: colors.brand.primary,
    gradient: colors.brand.gradientBalanceCard,
    ...shadows.button,
  },

  badge: {
    radius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 3,
    fontFamily: fontFamily.semiBold,
    fontWeight: fontWeights.semiBold,
    fontSize: fontSizes.xs,
  },

  // Icônes rondes de statut plein écran (check vert / X rouge / horloge bleue)
  statusIcon: {
    size: 104,
    haloSize: 144, // halo translucide autour de l'icône
  },

  avatar: {
    sm: 36,
    md: 56,
    lg: 80,
    radius: radii.circle,
    backgroundColor: colors.brand.navy,
    textColor: colors.text.inverse,
  },

  divider: {
    color: colors.border.light,
    thickness: 1,
  },

  tabBar: {
    height: 68,
    backgroundColor: colors.background.surface,
    activeColor: colors.brand.primary,
    inactiveColor: colors.text.tertiary,
    borderTopColor: colors.border.light,
  },

  // Filtres segmentés ("En attente" / "Confirmés" / "Rejetés")
  segmentedControl: {
    height: 44,
    radius: radii.pill,
    backgroundColor: colors.background.surfaceAlt,
    activeBackgroundColor: colors.brand.primary,
    activeTextColor: colors.text.inverse,
    inactiveTextColor: colors.text.secondary,
  },

  // Bannière d'aide/sécurité ("Vos données sont sécurisées")
  infoBanner: {
    backgroundColor: colors.info.light,
    textColor: colors.info.text,
    iconColor: colors.info.default,
    radius: radii.md,
  },
};

// ------------------------------------------------------------
// 13. AUTRES CONSTANTES UI
// ------------------------------------------------------------
export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 480,
  headerHeight: 56,
  bottomSheetHandleColor: palette.gray300,
};

export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  overlay: 0.55,
};

export const animation = {
  fast: 150,
  base: 250,
  slow: 400,
};

// ------------------------------------------------------------
// 14. THEME OBJECT (export par défaut)
// ------------------------------------------------------------
export const theme = {
  colors,
  statusColors,
  transactionTypeColors,
  countries,
  paymentMethods,
  notificationChannels,
  spacing,
  radii,
  shadows,
  typography,
  fontSizes,
  fontWeights,
  lineHeights,
  fontFamily,
  components,
  layout,
  opacity,
  animation,
  isDark: false,
  rankColors,
};

// ------------------------------------------------------------
// RANGS CLIENT
// ------------------------------------------------------------

export const rankColors = {
  standard: {
    background: '#EEF1F6',
    border: '#CBD2DF',
    text: '#5B6478',
    accent: '#7C8598',
  },

  bronze: {
    background: '#F8EBDD',
    border: '#D99A62',
    text: '#8B5428',
    accent: '#B87333',
  },

  silver: {
    background: '#EEF2F6',
    border: '#AEB8C5',
    text: '#4C5A68',
    accent: '#8D99A8',
  },

  gold: {
    background: '#FFF5CC',
    border: '#E8B928',
    text: '#8A6800',
    accent: '#D4A300',
  },
};

export const getRankColors = (
  rankCode
) =>
  rankColors[
    String(
      rankCode || 'standard'
    ).toLowerCase()
  ] ||
  rankColors.standard;

export default theme;