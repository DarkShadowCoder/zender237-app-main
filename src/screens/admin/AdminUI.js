import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, components, shadows, lineHeights, fontSizes } from '../../theme/theme';
import Card from '../../components/Card';
import Header from '../../components/Header';
import EmptyState from '../../components/EmptyState';

/* ------------------------------------------------------------------ */
/*  Layout de base (signatures inchangées — sûr pour le reste de l'app) */
/* ------------------------------------------------------------------ */

export function Screen({ title, children, right }) {
  return (
    <View style={styles.screen}>
      <View style={styles.inner}>
        <Header title={title} right={right} />
        {children}
      </View>
    </View>
  );
}

export function Loading({ label = 'Chargement…' }) {
  return (
    <View style={styles.center}>
      <View style={styles.loadingRing}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
      <Text style={[typography.caption, styles.muted, { marginTop: spacing.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconHalo, { backgroundColor: colors.error.light }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.error.default} />
      </View>
      <Text style={[typography.h2, styles.centerText, { marginTop: spacing.lg }]}>Impossible de charger</Text>
      <Text style={[typography.body, styles.centerText, styles.muted]}>{message || 'Une erreur est survenue.'}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}>
          <Ionicons name="refresh-outline" size={18} color={colors.text.inverse} />
          <Text style={[typography.button, { marginLeft: spacing.xs }]}>Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

export function SectionTitle({ title, actionLabel, onAction, icon }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {icon && (
          <View style={styles.sectionIconDot}>
            <Ionicons name={icon} size={13} color={colors.brand.primary} />
          </View>
        )}
        <Text style={typography.h2}>{title}</Text>
      </View>
      {onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.link}>{actionLabel || 'Voir tout'}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Stat({ label, value, icon, color = colors.brand.primary, bg = colors.brand.primaryLight, onPress }) {
  const body = (
    <Card style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={[typography.h2, { marginTop: spacing.xs }]}>{value}</Text>
      <Text style={[typography.caption, styles.muted]}>{label}</Text>
    </Card>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>{body}</Pressable>
  ) : body;
}

export function Row({ icon = 'document-text-outline', iconColor = colors.brand.primary, iconBg = colors.brand.primaryLight, title, subtitle, right, onPress, children }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowMain}>
        <Text style={typography.bodyBold} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, styles.muted]} numberOfLines={2}>{subtitle}</Text> : null}
        {children}
      </View>
      {right || (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Empty({ icon = 'file-tray-outline', title, subtitle }) {
  return <EmptyState icon={icon} title={title} subtitle={subtitle} />;
}

/* ------------------------------------------------------------------ */
/*  Éléments partagés — badges, bannières, chronologie                  */
/*  (exports additifs uniquement, rien d'existant n'est modifié)        */
/* ------------------------------------------------------------------ */

const TONES = {
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  neutral: { default: colors.text.tertiary, light: colors.background.surfaceAlt, border: colors.border.default, text: colors.text.secondary },
};

/** Petit badge arrondi — utile pour un statut, une étape, un tag. */
export function Pill({ label, tone = 'neutral', icon, background, textColor, borderColor }) {
  const t = TONES[tone] || TONES.neutral;
  const bg = background || t.light;
  const fg = textColor || t.text || t.default;
  const bd = borderColor || t.border;
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: bd }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Bannière d'information/avertissement (tons alignés sur components.infoBanner du thème). */
export function InfoBanner({ text, tone = 'info', icon = 'information-circle-outline' }) {
  const t = TONES[tone] || TONES.info;
  return (
    <View style={[styles.infoBanner, { backgroundColor: t.light }]}>
      <Ionicons name={icon} size={18} color={t.default} style={{ marginTop: 1 }} />
      <Text style={[typography.caption, styles.infoBannerText, { color: t.text }]}>{text}</Text>
    </View>
  );
}

/** Une ligne de chronologie (historique de statut, journal d'événements…). */
export function TimelineRow({ tone = 'neutral', dotColor, title, subtitle, isLast }) {
  const t = TONES[tone] || TONES.neutral;
  const dc = dotColor || t.default;
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: dc }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
        <Text style={typography.bodyBold} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, styles.muted]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers de statut métier — un seul endroit pour transformer une     */
/*  valeur d'enum backend (ex. "partially_matched") en libellé FR + ton */
/*  visuel cohérent. Les écrans KmerDiaspora consomment ces deux        */
/*  fonctions au lieu de ré-écrire un ternaire par écran.               */
/* ------------------------------------------------------------------ */

const STATUS_LABELS = {
  open: 'Ouverte',
  partially_matched: 'Partiellement pourvue',
  matched: 'Pourvue',
  published: 'Publiée',
  draft: 'Brouillon',
  closed: 'Clôturée',
  accepted: 'Acceptée',
  rejected: 'Rejetée',
  cancelled: 'Annulée',
  pending: 'En attente',
  completed: 'Terminée',
  suspended: 'Suspendue',
  active: 'Active',
};

const STATUS_TONES = {
  success: ['matched', 'accepted', 'completed', 'confirmed', 'active'],
  info: ['open', 'published', 'pending', 'partially_matched'],
  warning: ['suspended', 'draft'],
  error: ['rejected', 'cancelled', 'closed'],
};

/** "partially_matched" -> "Partiellement pourvue" (repli lisible si la valeur est inconnue). */
export function statusLabel(status) {
  if (!status) return '—';
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Retourne le ton visuel (info/success/warning/error/neutral) associé à un statut métier. */
export function statusTone(status) {
  for (const tone of Object.keys(STATUS_TONES)) {
    if (STATUS_TONES[tone].includes(status)) return tone;
  }
  return 'neutral';
}

/** Formate un montant avec séparateur de milliers ("125000" -> "125 000"). */
export function formatAmount(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('fr-FR');
}

/* ------------------------------------------------------------------ */
/*  Kit de filtrage & de données — recherche, filtre segmenté, chips,   */
/*  barre de progression, tuiles de métrique/action.                    */
/*  (exports additifs, indépendants du reste de l'app)                  */
/* ------------------------------------------------------------------ */

/** Barre de recherche compacte pour l'en-tête d'une liste. */
export function SearchField({ value, onChangeText, placeholder = 'Rechercher…' }) {
  return (
    <View style={styles.searchField}>
      <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
        </Pressable>
      )}
    </View>
  );
}

/** Filtre segmenté plein-largeur (2-4 options) — tokens alignés sur components.segmentedControl. */
export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.key;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = value === key;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[styles.segmentedItem, active && styles.segmentedItemActive]}>
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Groupe de chips sélectionnables (remplace avantageusement un SelectField "à cycler" quand il y a peu d'options à choisir explicitement). */
export function ChipGroup({ options, value, onChange, getLabel, getIcon }) {
  return (
    <View style={styles.chipGroup}>
      {options.map((opt) => {
        const active = value === opt;
        const label = getLabel ? getLabel(opt) : String(opt);
        const icon = getIcon ? getIcon(opt) : null;
        return (
          <Pressable key={String(opt)} onPress={() => onChange(opt)} style={[styles.chip, active && styles.chipActive]}>
            {icon ? <Ionicons name={icon} size={14} color={active ? colors.text.inverse : colors.text.secondary} style={{ marginRight: 6 }} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Barre de progression fine (avancement d'une quête, score de matching…). */
export function ProgressBar({ value = 0, tone = 'brand', height = 8 }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  const fillColor =
    tone === 'success' ? colors.success.default :
    tone === 'warning' ? colors.warning.default :
    tone === 'error' ? colors.error.default :
    colors.brand.secondary;
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: fillColor, borderRadius: height / 2 }]} />
    </View>
  );
}

/** Tuile de métrique compacte pour une grille de tableau de bord (icône + gros nombre + libellé). */
export function MetricTile({ icon, label, value, color = colors.brand.primary, bg = colors.brand.primaryLight, onPress }) {
  const body = (
    <Card style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[typography.caption, styles.muted]} numberOfLines={1}>{label}</Text>
    </Card>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.metricWrap, pressed && { opacity: 0.86 }]}>{body}</Pressable>
  ) : (
    <View style={styles.metricWrap}>{body}</View>
  );
}

/** Ligne d'action de navigation (remplace un bouton "carte" ad hoc par écran). */
export function ActionTile({ icon, iconColor = colors.brand.primary, iconBg = colors.brand.primaryLight, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}>
      <View style={[styles.actionTileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={typography.bodyBold} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, styles.muted]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles — toutes les clés existantes sont conservées à l'identique,  */
/*  de nouvelles clés sont ajoutées à la suite (aucune clé supprimée ou */
/*  renommée — sûr pour d'autres écrans admin non fournis ici)          */
/* ------------------------------------------------------------------ */

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default, paddingTop: spacing.screenVertical },
  inner: { flex: 1, paddingHorizontal: spacing.screenHorizontal },
  scroll: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  centerText: { textAlign: 'center', marginTop: spacing.sm },
  muted: { color: colors.text.secondary, marginTop: 2, lineHeight: lineHeights.md * 1.4 },
  loadingRing: { width: 84, height: 84, borderRadius: radii.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand.primaryLight },
  iconHalo: { width: 88, height: 88, borderRadius: radii.circle, alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: spacing.lg, height: components.button.height.md, paddingHorizontal: spacing.xl, borderRadius: components.button.radius, backgroundColor: colors.brand.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.button },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionIconDot: { width: 24, height: 24, borderRadius: radii.circle, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.text.link, fontFamily: 'Baloo2_600SemiBold', fontSize: 16 },
  stat: { flex: 1, minHeight: 120, padding: spacing.md },
  statIcon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  rowIcon: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0 },
  pressed: { backgroundColor: colors.overlay.pressed },
  divider: { height: 1, backgroundColor: colors.border.light },

  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs + 3 },
  pillText: { fontFamily: 'Baloo2_600SemiBold', fontWeight: '700', fontSize: 12 },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.md, padding: spacing.md },
  infoBannerText: { flex: 1, lineHeight: 19, marginTop: 0 },

  timelineRow: { flexDirection: 'row' },
  timelineRail: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: radii.circle, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border.light, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.sm },

  /* Kit de filtrage & de données (nouveau) */
  searchField: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: radii.md, backgroundColor: colors.background.surface, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, gap: spacing.xs },
  searchInput: { flex: 1, fontFamily: 'Baloo2_500Medium', fontSize: 16, color: colors.text.primary, paddingVertical: 0 },

  segmented: { flexDirection: 'row', backgroundColor: components.segmentedControl.backgroundColor, borderRadius: components.segmentedControl.radius, padding: 4 },
  segmentedItem: { flex: 1, height: components.segmentedControl.height - 8, borderRadius: components.segmentedControl.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  segmentedItemActive: { backgroundColor: components.segmentedControl.activeBackgroundColor, ...shadows.button },
  segmentedText: { fontFamily: 'Baloo2_600SemiBold', fontSize: 13, color: components.segmentedControl.inactiveTextColor },
  segmentedTextActive: { color: components.segmentedControl.activeTextColor },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.background.surfaceAlt, borderWidth: 1, borderColor: colors.border.light },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { fontFamily: 'Baloo2_600SemiBold', fontSize: 13, color: colors.text.secondary },
  chipTextActive: { color: colors.text.inverse },

  progressTrack: { width: '100%', backgroundColor: colors.background.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%' },

  metricWrap: { flex: 1, justifyContent: 'space-between' },
  metricTile: { padding: spacing.md, minHeight: 104, width: '98%' },
  metricIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  metricValue: { fontFamily: 'Baloo2_800ExtraBold', fontWeight: '800', fontSize: 26, color: colors.text.primary, marginTop: 2 },

  actionTile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border.light, padding: spacing.md, marginBottom: spacing.sm },
  actionTileIcon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickAction: {
      width: '48.5%',
      minHeight: 68,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: components.card.backgroundColor,
      borderWidth: components.card.borderWidth,
      borderColor: components.card.borderColor,
      ...shadows.card,
    },
    quickActionPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.985 }],
    },
    quickActionIcon: {
      width: 38,
      height: 38,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
    },
    quickActionTitle: {
      flex: 1,
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.xs,
    },
});