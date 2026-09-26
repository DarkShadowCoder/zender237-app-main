import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, components, shadows } from '../../../theme/theme';
import Card from '../../../components/Card';
import StatusBadge from '../../../components/StatusBadge';
import Button from '../../../components/Button';

export function Screen({ children, contentStyle }) {
  return <View style={styles.screen}><View style={styles.content}><View style={contentStyle}>{children}</View></View>;
}

export function PageHeader({ title, subtitle, right }) {
  return <View style={styles.header}>
    <View style={{ flex: 1 }}><Text style={typography.h1}>{title}</Text>{subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}</View>
    {right}
  </View>;
}

export function SectionHeader({ title, action, onPress }) {
  return <View style={styles.sectionHeader}><Text style={typography.h2}>{title}</Text>{action ? <Pressable onPress={onPress}><Text style={[typography.caption, styles.link]}>{action}</Text></Pressable> : null}</View>;
}

export function IconTile({ icon, color = colors.brand.primary, background = colors.brand.primaryLight, size = 44 }) {
  return <View style={[styles.iconTile, { width: size, height: size, borderRadius: Math.min(size / 3, 14), backgroundColor: background }]}><Ionicons name={icon} size={size * .5} color={color} /></View>;
}

export function LoadingState({ text = 'Chargement…' }) {
  return <View style={styles.center}><ActivityIndicator size="large" color={colors.brand.primary}/><Text style={[typography.caption, { marginTop: spacing.md }]}>{text}</Text></View>;
}

export function ErrorState({ message, onRetry }) {
  return <View style={styles.center}><IconTile icon="cloud-offline-outline" color={colors.error.default} background={colors.error.light} size={72}/><Text style={[typography.h2, { textAlign: 'center', marginTop: spacing.lg }]}>Impossible de charger</Text><Text style={[typography.body, { textAlign: 'center', marginTop: spacing.sm }]}>{message}</Text><Button title="Réessayer" onPress={onRetry} fullWidth={false} style={{ marginTop: spacing.lg }}/></View>;
}

export function Empty({ icon = 'file-tray-outline', title, subtitle }) {
  return <View style={styles.empty}><IconTile icon={icon} color={colors.text.tertiary} background={colors.background.surfaceAlt} size={56}/><Text style={[typography.h3, { marginTop: spacing.sm }]}>{title}</Text>{subtitle ? <Text style={[typography.caption, { marginTop: 4, textAlign: 'center' }]}>{subtitle}</Text> : null}</View>;
}

export function ActionRow({ icon, title, subtitle, onPress, destructive = false }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.overlay.pressed }]}><IconTile icon={icon} color={destructive ? colors.error.default : colors.brand.primary} background={destructive ? colors.error.light : colors.brand.primaryLight}/><View style={{ flex: 1, marginLeft: spacing.sm }}><Text style={typography.bodyBold}>{title}</Text>{subtitle ? <Text style={[typography.caption, { marginTop: 2 }]}>{subtitle}</Text> : null}</View><Ionicons name="chevron-forward" size={20} color={colors.text.tertiary}/></Pressable>;
}

export function KeyValue({ label, value, valueStyle }) {
  return <View style={styles.keyValue}><Text style={typography.caption}>{label}</Text><Text style={[typography.bodyBold, valueStyle]}>{value ?? '—'}</Text></View>;
}

export function Status({ status, label }) {
  return <StatusBadge status={status} label={label}/>;
}

export function ProgressBar({ value, color = colors.brand.primary }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${p}%`, backgroundColor: color }]} /></View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  content: { flex: 1, paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.screenVertical, paddingBottom: spacing.huge + 50 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
  subtitle: { marginTop: spacing.xxs, color: colors.text.secondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm },
  link: { color: colors.text.link },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background.default },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  actionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  keyValue: { minHeight: 58, justifyContent: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  progressTrack: { height: 7, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.background.surfaceAlt, marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: radii.pill },
});
