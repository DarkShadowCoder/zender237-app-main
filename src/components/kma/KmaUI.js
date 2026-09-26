import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, components, fontSizes, radii, shadows, spacing, typography } from '../../theme/theme';
import Card from '../Card';
import StatusBadge from '../StatusBadge';
import Button from '../Button';

export function ScreenShell({ children, contentStyle }) {
  return <View style={styles.screen}><View style={styles.topSpace} />{children}</View>;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={typography.h2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? <Pressable onPress={onAction}><Text style={styles.link}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

export function KmaStatus({ status, label }) {
  const map = {
    published: 'confirmed', active: 'confirmed', open: 'confirmed', matched: 'under_review', partially_matched: 'under_review', pending_validation: 'under_review', pending: 'under_review', processing: 'under_review', suspended: 'rejected', rejected: 'rejected', cancelled: 'cancelled', closed: 'confirmed', completed: 'confirmed', expired: 'cancelled', draft: 'pending_proof', notified: 'under_review', accepted: 'confirmed', declined: 'rejected', flagged: 'under_review',
  };
  return <StatusBadge status={map[status] || 'under_review'} label={label || status?.replaceAll('_', ' ')} />;
}

export function MetricCard({ icon, value, title, subtitle, onPress, color = colors.brand.primary, bg = colors.brand.primaryLight }) {
  const body = (
    <Card style={styles.metricCard}>
      <View style={styles.metricTop}><View style={[styles.metricIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View>{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} /> : null}</View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
    </Card>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: .86 }}>{body}</Pressable> : body;
}

export function QuickAction({ icon, title, subtitle, onPress, color = colors.brand.primary, bg = colors.brand.primaryLight }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { marginBottom: spacing.sm }, pressed && styles.rowPressed]}><View style={[styles.rowIcon,{backgroundColor:bg}]}><Ionicons name={icon} size={21} color={color}/></View><View style={styles.rowContent}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.text.tertiary}/></Pressable>; }

export function ListRow({ icon, title, subtitle, right, onPress, iconColor = colors.brand.primary, iconBg = colors.brand.primaryLight }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}><Ionicons name={icon} size={20} color={iconColor} /></View>
      <View style={styles.rowContent}><Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>{subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text> : null}</View>
      <View style={styles.rowRight}>{right || (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} /> : null)}</View>
    </Pressable>
  );
}

export function EmptyKma({ icon = 'file-tray-outline', title, subtitle }) {
  return <View style={styles.empty}><Ionicons name={icon} size={48} color={colors.icon.muted} /><Text style={styles.emptyTitle}>{title}</Text>{subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}</View>;
}

export function ActionBar({ primary, secondary, danger }) {
  return (
    <View style={styles.actionBar}>
      {primary ? <Button {...primary} /> : null}
      {secondary ? <Button {...secondary} variant="outline" /> : null}
      {danger ? <Button {...danger} variant="danger" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  topSpace: { height: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.screenHorizontal },
  subtitle: { ...typography.caption, marginTop: 3 },
  link: { ...typography.caption, color: colors.text.link },
  metricCard: { flex: 1, minHeight: 140, padding: spacing.md },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  metricValue: { ...typography.h2, fontSize: fontSizes.xxl, marginTop: spacing.sm },
  metricTitle: { ...typography.bodyBold, fontSize: fontSizes.sm, marginTop: 2 },
  metricSubtitle: { ...typography.caption, marginTop: 2 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  rowPressed: { backgroundColor: colors.overlay.pressed },
  rowIcon: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { ...typography.h3, fontSize: fontSizes.sm },
  rowSubtitle: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  rowRight: { marginLeft: spacing.xs, alignItems: 'flex-end' },
  empty: { alignItems: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.lg, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, textAlign: 'center' },
  emptySubtitle: { ...typography.caption, textAlign: 'center' },
  actionBar: { gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.screenHorizontal },
});
