import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, components, shadows, fontSizes, fontWeights } from '../../../theme/theme';
import Card from '../../../components/Card';
import Header from '../../../components/Header';
import Button from '../../../components/Button';
import StatusBadge from '../../../components/StatusBadge';
import InfoBanner from '../../../components/InfoBanner';
import SelectField from '../../../components/SelectField';
import TextInputComponent from '../../../components/Input';

const BACKGROUND = require('../../../../assets/images/KmBackground.png');

export function KdScreen({ title, children, scrollView: ScrollViewComponent, noBackground = false, headerRight }) {
  const Content = ScrollViewComponent || View;
  return (
    <View style={styles.screen}>
      {!noBackground && <ImageBackground source={BACKGROUND} style={StyleSheet.absoluteFillObject} imageStyle={styles.backgroundImage}><View style={styles.backgroundWash} /></ImageBackground>}
      <Content showsVerticalScrollIndicator={false} contentContainerStyle={ScrollViewComponent ? styles.scrollContent : undefined}>
        <Header title={title} right={headerRight} />
        {children}
      </Content>
    </View>
  );
}

export function SectionTitle({ title, actionLabel, onAction, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Text style={[typography.h2, styles.sectionTitle]}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={[typography.caption, styles.link]}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

export function KdStatus({ status, label }) {
  const mapped = ['published', 'open', 'active', 'accepted', 'selected', 'contact_initiated'].includes(status) ? 'confirmed' :
    ['matched', 'notified', 'partially_matched', 'pending_validation', 'pending_beneficiary_approval'].includes(status) ? 'under_review' :
      ['cancelled', 'suspended', 'rejected', 'expired', 'closed'].includes(status) ? 'rejected' : status;
  return <StatusBadge status={mapped} label={label || status} />;
}

export function KdListRow({ icon = 'ellipse-outline', iconColor = colors.brand.primary, iconBackground = colors.brand.primaryLight, title, subtitle, right, onPress }) {
  const body = <View style={styles.row}>
    <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}><Ionicons name={icon} size={21} color={iconColor} /></View>
    <View style={styles.rowBody}><Text style={[typography.caption, styles.rowTitle]} numberOfLines={1}>{title}</Text>{subtitle ? <Text style={[typography.caption, styles.rowSubtitle]} numberOfLines={2}>{subtitle}</Text> : null}</View>
    <View style={styles.rowRight}>{right}{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} /> : null}</View>
  </View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed ? styles.pressed : undefined}>{body}</Pressable> : body;
}

export function KdEmpty({ icon = 'people-outline', title, subtitle }) {
  return <View style={styles.empty}><Ionicons name={icon} size={48} color={colors.icon.muted} /><Text style={[typography.bodyBold, styles.emptyTitle]}>{title}</Text>{subtitle ? <Text style={[typography.caption, styles.emptySubtitle]}>{subtitle}</Text> : null}</View>;
}

export function KdLoading({ label = 'Chargement…' }) {
  return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand.primary} /><Text style={[typography.caption, styles.loadingText]}>{label}</Text></View>;
}

export function KdError({ message, onRetry }) {
  return <View style={styles.error}><Ionicons name="cloud-offline-outline" size={42} color={colors.error.default} /><Text style={[typography.h2, styles.errorTitle]}>Impossible de charger</Text><Text style={[typography.body, styles.errorText]}>{message}</Text><Button title="Réessayer" onPress={onRetry} fullWidth={false} /></View>;
}

export function KdHero({ icon = 'globe-outline', title, value, subtitle }) {
  return <View style={styles.hero}><View style={styles.heroText}><Text style={[typography.caption, styles.heroCaption]}>KmerDiaspora</Text><Text style={typography.amountLg}>{value}</Text><Text style={[typography.caption, styles.heroSubtitle]}>{title} · {subtitle}</Text></View><View style={styles.heroIcon}><Ionicons name={icon} size={27} color={colors.text.inverse} /></View></View>;
}

export function KdProgress({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>;
}

export function KdFormSection({ title, children }) {
  return <Card style={styles.formCard}><Text style={[typography.h2, styles.formTitle]}>{title}</Text>{children}</Card>;
}

export function ChoiceGroup({ label, value, options, onChange, multi = false }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  return <View style={styles.choiceWrap}><Text style={components.input.labelStyle}>{label}</Text><View style={styles.choiceRow}>{options.map((option) => {
    const active = multi ? selected.includes(option) : selected === option;
    return <Pressable key={option} onPress={() => {
      if (multi) onChange(active ? selected.filter((x) => x !== option) : [...selected, option]);
      else onChange(option);
    }} style={[styles.choice, active && styles.choiceActive]}>
      <View style={[styles.choiceDot, active && styles.choiceDotActive]} />
      <Text style={[typography.caption, active && styles.choiceTextActive]}>{option}</Text>
    </Pressable>;
  })}</View></View>;
}

export function KdSelect({ label, value, options, onChange }) {
  return <SelectField label={label} valueLabel={value} onPress={() => {}} />;
}

export const Input = TextInputComponent;
export { Button, Card, Header, InfoBanner };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  backgroundImage: { opacity: 0.18 },
  backgroundWash: { flex: 1, backgroundColor: 'rgba(255,255,255,0.84)' },
  scrollContent: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.huge + 60 },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleWrap: { flex: 1 }, sectionTitle: { color: colors.brand.primaryDark }, subtitle: { marginTop: spacing.xxs }, link: { color: colors.brand.primary, fontWeight: '700' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rowIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }, rowBody: { flex: 1, minWidth: 0, paddingRight: spacing.xs }, rowTitle: { fontSize: fontSizes.md - 2, color: colors.text.primary }, rowSubtitle: { marginTop: 2, color: colors.text.tertiary }, rowRight: { alignItems: 'flex-end', gap: spacing.xxs, marginLeft: spacing.xs }, pressed: { backgroundColor: colors.overlay.pressed, borderRadius: radii.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm }, emptyTitle: { textAlign: 'center' }, emptySubtitle: { textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.default }, loadingText: { marginTop: spacing.md },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.screenHorizontal, backgroundColor: colors.background.default, gap: spacing.sm }, errorTitle: { textAlign: 'center' }, errorText: { textAlign: 'center', marginBottom: spacing.md },
  hero: { marginTop: spacing.lg, padding: components.balanceCard.padding, borderRadius: components.balanceCard.radius, backgroundColor: colors.brand.primary, flexDirection: 'row', justifyContent: 'space-between', ...shadows.button }, heroText: { flex: 1 }, heroCaption: { color: colors.palette.gray100 }, heroSubtitle: { color: 'rgba(255,255,255,0.82)', marginTop: spacing.xxs }, heroIcon: { width: 50, height: 50, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  progressTrack: { height: 7, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.background.surfaceAlt, marginTop: spacing.sm }, progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.brand.primary }, formCard: { marginBottom: spacing.md }, formTitle: { marginBottom: spacing.md, color: colors.brand.primaryDark },
  choiceWrap: { marginBottom: spacing.md, flex: 1, gap: spacing.xs }, choiceRow: { gap: spacing.xs }, choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.light, backgroundColor: colors.background.surface }, choiceActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryLight }, choiceDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border.default }, choiceDotActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary }, choiceTextActive: { color: colors.brand.primary, fontWeight: '700' },
});
