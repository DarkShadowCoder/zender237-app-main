import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme/theme';
import Header from '../../components/Header';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { getMyRank, listRankRules } from '../../services/rankService';
import { listMyLoanRequests, getRankDisplay, loanStatusLabel, loanTypeLabel } from '../../services/loanService';
import { formatAmount, formatDateTime } from '../../utils/formatters';
import { getRankColors } from '../../theme/theme';

export default function LoansScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [rank, setRank] = useState(null);
  const [rules, setRules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const userId = user?.id;
      if (!userId) return;
      const [rankData, rulesData, requestData] = await Promise.all([
        getMyRank(userId),
        listRankRules(),
        listMyLoanRequests(),
      ]);
      setRank(rankData);
      setRules(rulesData || []);
      setRequests(requestData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const rankCode = String(rank?.rank_code || profile?.rank_code || 'standard').toLowerCase();
  const rankMeta = getRankColors(rankCode);
  const rule = useMemo(() => rules.find((item) => String(item.code).toLowerCase() === rankCode), [rules, rankCode]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return <View style={styles.center}><Text style={typography.body}>Chargement de vos conditions de prêt…</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Header title="Prêts" />

        {error ? (
          <Card style={styles.errorCard}>
            <View style={styles.inlineIcon}><Ionicons name="warning-outline" size={19} color={colors.error.default} /></View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>Impossible de charger les prêts</Text>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]}>{error}</Text>
            </View>
            <Pressable onPress={load} hitSlop={10}><Ionicons name="refresh-outline" size={20} color={colors.brand.primary} /></Pressable>
          </Card>
        ) : null}

        <Card style={styles.rankCard}>
          <View style={styles.rankHeader}>
            <View style={[styles.rankIcon, { backgroundColor: rankMeta.background, borderColor: rankMeta.border }]}>
              <Ionicons name="trophy-outline" size={24} color={rankMeta.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.caption}>Votre niveau</Text>
              <Text style={[typography.h2, { color: rankMeta.text }]}>{getRankDisplay(rankCode)}</Text>
            </View>
          </View>

          {rule ? (
            <View style={styles.ruleGrid}>
              <RuleItem icon="cash-outline" label="Prêt argent" value={rule.money_loan_enabled === false ? 'Indisponible' : `${rule.money_loan_repayment_months} mois`} />
              <RuleItem icon="airplane-outline" label="Prêt billet" value={rule.flight_loan_enabled === false ? 'Indisponible' : `${rule.flight_loan_repayment_months} mois`} />
              <RuleItem icon="wallet-outline" label="Plafond argent" value={rule.max_money_loan_amount == null ? 'Illimité' : formatAmount(rule.max_money_loan_amount)} />
              <RuleItem icon="card-outline" label="Plafond billet" value={rule.max_flight_loan_amount == null ? 'Illimité' : formatAmount(rule.max_flight_loan_amount)} />
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.md }]}>Les conditions de votre rang ne sont pas encore configurées.</Text>
          )}
        </Card>

        <Text style={[typography.h3, styles.sectionTitle]}>Demander un prêt</Text>
        <View style={styles.products}>
          <LoanProduct
            icon="cash-outline"
            title="Prêt d'argent"
            description={!rule ? 'Conditions non configurées' : rule.money_loan_enabled === false ? 'Indisponible pour votre rang' : 'Recevez un financement sur votre wallet'}
            disabled={!rule || rule.money_loan_enabled === false}
            onPress={() => navigation.navigate('LoanRequest', { loanType: 'money' })}
          />
          <LoanProduct
            icon="airplane-outline"
            title="Prêt de billet"
            description={!rule ? 'Conditions non configurées' : rule.flight_loan_enabled === false ? 'Indisponible pour votre rang' : 'Financez votre billet et les services associés'}
            disabled={!rule || rule.flight_loan_enabled === false}
            onPress={() => navigation.navigate('LoanRequest', { loanType: 'flight' })}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Mes demandes</Text>
          {requests.length ? <Text style={[typography.caption, { color: colors.text.secondary }]}>{requests.length} dossier(s)</Text> : null}
        </View>

        {requests.length ? requests.map((request) => (
          <Pressable
            key={request.id}
            onPress={() => navigation.navigate('LoanDetail', { requestId: request.id })}
            style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.requestIcon}><Ionicons name={request.loan_type === 'flight' ? 'airplane-outline' : 'cash-outline'} size={20} color={colors.brand.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{loanTypeLabel(request.loan_type)}</Text>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 3 }]}>{formatAmount(request.amount)} · {formatDateTime(request.created_at)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 5 }}>
              <StatusBadge status={request.status === 'approved' ? 'confirmed' : request.status === 'rejected' || request.status === 'cancelled' ? 'rejected' : 'pending'} label={loanStatusLabel(request.status)} />
              <Ionicons name="chevron-forward" size={17} color={colors.text.tertiary} />
            </View>
          </Pressable>
        )) : (
          <EmptyState icon="cash-outline" title="Aucune demande" subtitle="Vos demandes de prêt apparaîtront ici." />
        )}

      </ScrollView>
    </View>
  );
}

function RuleItem({ icon, label, value }) {
  return (
    <View style={styles.ruleItem}>
      <View style={styles.ruleIcon}><Ionicons name={icon} size={16} color={colors.brand.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.text.secondary }]}>{label}</Text>
        <Text style={typography.bodyBold} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function LoanProduct({ icon, title, description, onPress, disabled }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.product, disabled && { opacity: 0.5 }, pressed && !disabled && { transform: [{ scale: 0.985 }] }]}>
      <View style={styles.productIcon}><Ionicons name={icon} size={24} color={colors.brand.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyBold}>{title}</Text>
        <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]}>{description}</Text>
      </View>
      {!disabled && <Ionicons name="arrow-forward-circle-outline" size={24} color={colors.brand.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingTop: spacing.md, paddingBottom: spacing.huge },
  center: { flex: 1, backgroundColor: colors.background.default, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  rankCard: { marginTop: spacing.lg, padding: spacing.lg },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rankIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ruleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg, gap: spacing.sm },
  ruleItem: { flexDirection: 'row', alignItems: 'center', width: '48%', gap: spacing.xs },
  ruleIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  products: { gap: spacing.sm },
  product: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.default, ...shadows.card },
  productIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand.primaryLight },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.default },
  requestIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  inlineIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.error.light, alignItems: 'center', justifyContent: 'center' },
});
