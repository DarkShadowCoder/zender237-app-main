import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, getRankColors, lineHeights } from '../../../theme/theme';
import Card from '../../../components/Card';
import { Screen, Loading, ErrorBox, Empty, Divider, styles as adminStyles } from '../AdminUI';
import { listLoanRules } from '../../../services/adminService';

const money = (value) => value == null ? 'Illimité' : `${Number(value).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} U`;

function RuleSummary({ rule }) {
  return (
    <View style={[typography.caption, styles.summary]}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel]}>Prêt d'argent</Text>
          <Text style={styles.summaryValue}>
            {rule.money_loan_enabled === false ? 'Désactivé' : money(rule.max_money_loan_amount)}
          </Text>
          {rule.money_loan_enabled !== false && (
            <Text style={styles.summaryMeta}>{rule.money_loan_repayment_months} mois</Text>
          )}
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Prêt billet</Text>
          <Text style={styles.summaryValue}>
            {rule.flight_loan_enabled === false ? 'Désactivé' : money(rule.max_flight_loan_amount)}
          </Text>
          {rule.flight_loan_enabled !== false && (
            <Text style={styles.summaryMeta}>{rule.flight_loan_repayment_months} mois</Text>
          )}
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Hébergement</Text>
          <Text style={styles.summaryValue}>{rule.flight_accommodation_months || 0} mois</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Statut du rang</Text>
          <Text style={styles.summaryValue}>{rule.active ? 'Actif' : 'Inactif'}</Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminLoanRulesScreen({ navigation }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setRules(await listLoanRules());
    } catch (e) {
      setError(e?.message || 'Impossible de charger les règles de prêts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Screen title="Règles de prêts"><Loading /></Screen>;
  if (error) return <Screen title="Règles de prêts"><ErrorBox message={error} onRetry={() => load()} /></Screen>;

  return (
    <Screen title="Règles de prêts">
      <ScrollView
        contentContainerStyle={adminStyles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={[typography.caption, styles.intro]}>
          Configurez les conditions de prêt applicables à chaque rang utilisateur.
        </Text>

        <Card>
          {rules.length ? rules.map((rule, index) => {
            const meta = getRankColors(rule.code);
            return (
              <View key={rule.id}>
                <Pressable
                  onPress={() => navigation.navigate('AdminLoanRuleForm', { rule })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.rankIcon, { backgroundColor: meta.background, borderColor: meta.border }]}>
                    <Text style={[styles.rankIconText, { color: meta.text }]}>
                      {String(rule.label || rule.code).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.content}>
                    <View style={styles.titleRow}>
                      <Text style={typography.bodyBold}>{rule.label}</Text>
                      {!rule.active && <Text style={styles.inactive}>INACTIF</Text>}
                    </View>
                    <RuleSummary rule={rule} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.icon.muted} />
                </Pressable>
                {index < rules.length - 1 && <Divider />}
              </View>
            );
          }) : (
            <Empty icon="cash-outline" title="Aucune règle" subtitle="Aucune règle de rang n'est configurée." />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.text.secondary, marginBottom: spacing.md, lineHeight: lineHeights.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md },
  pressed: { opacity: 0.75 },
  rankIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rankIconText: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, paddingRight: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  inactive: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary },
  summary: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 11, color: colors.text.tertiary },
  summaryValue: { marginTop: 2, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  summaryMeta: { marginTop: 1, fontSize: 11, color: colors.text.secondary },
});
