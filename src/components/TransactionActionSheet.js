import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, transactionTypeColors } from '../theme/theme';
import { formatAmount, formatDateTime } from '../utils/formatters';
import { DELETABLE_TXN_STATUSES } from '../constants';

const ICONS = {
  deposit: 'arrow-down-circle',
  transfer: 'swap-horizontal',
  withdrawal: 'arrow-up-circle',
};

/**
 * Menu d'actions en bottom sheet, ouvert par un appui long sur une
 * transaction (voir <TransactionListItem onLongPress />). Propose de la
 * supprimer lorsque cela n'affecte pas le solde — voir
 * DELETABLE_TXN_STATUSES dans constants/index.js.
 */
export default function TransactionActionSheet({ visible, transaction, onClose, onDelete, deleting }) {
  if (!transaction) return null;

  const typeTokens = transactionTypeColors[transaction.type];
  const canDelete = DELETABLE_TXN_STATUSES.includes(transaction.status);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, shadows.modal]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.summaryRow}>
            <View style={[styles.iconWrap, { backgroundColor: typeTokens.background }]}>
              <Ionicons name={ICONS[transaction.type]} size={20} color={typeTokens.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{typeTokens.label}</Text>
              <Text style={typography.caption}>{formatDateTime(transaction.created_at)}</Text>
            </View>
            <Text style={[typography.bodyBold, { color: typeTokens.color }]}>
              {typeTokens.sign}
              {formatAmount(transaction.amount)}
            </Text>
          </View>

          <View style={styles.divider} />

          {canDelete ? (
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
              onPress={onDelete}
              disabled={deleting}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.error.light }]}>
                <Ionicons name="trash-outline" size={18} color={colors.error.default} />
              </View>
              <Text style={[typography.bodyBold, { color: colors.error.default }]}>
                {deleting ? 'Suppression...' : 'Supprimer la transaction'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.disabledRow}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.icon.muted} />
              <Text style={[typography.caption, { flex: 1 }]}>
                Cette transaction ne peut plus être supprimée (déjà en traitement ou confirmée).
              </Text>
            </View>
          )}

          <Pressable style={styles.cancelRow} onPress={onClose} disabled={deleting}>
            <Text style={[typography.bodyBold, { color: colors.text.secondary }]}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.border.light, marginBottom: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  actionRowPressed: { backgroundColor: colors.overlay.pressed },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  cancelRow: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});
