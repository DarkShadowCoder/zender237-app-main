import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl, Pressable, Text } from 'react-native';
import { colors, typography } from '../../../theme/theme';
import InfoBanner from '../../../components/InfoBanner';
import { listJobRequests, listDriverRequests, listQuests, listMatches } from '../../../services/kmerDiasporaService';
import { Screen, Loading, ErrorBox, SectionTitle, MetricTile, ActionTile, styles } from '../AdminUI';
import { Ionicons } from '@expo/vector-icons';

export default function AdminKdDashboardScreen({ navigation }) {
  const [d, setD] = useState({ jobs: 0, drivers: 0, quests: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [j, dr, q, m] = await Promise.all([
        listJobRequests({ limit: 50 }),
        listDriverRequests({ limit: 50 }),
        listQuests({ status: 'published', limit: 50 }),
        listMatches({ limit: 50 }),
      ]);
      setD({
        jobs: j.data?.length || 0,
        drivers: dr.data?.length || 0,
        quests: q.data?.length || 0,
        matches: m.data?.length || 0,
      });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <Screen title="KmerDiaspora"><Loading /></Screen>;
  if (error) return <Screen title="KmerDiaspora"><ErrorBox message={error} onRetry={load} /></Screen>;

  return (
    <Screen title="KmerDiaspora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MetricTile
            icon="briefcase-outline"
            label="Postes"
            value={d.jobs}
            color={colors.brand.primary}
            bg={colors.brand.primaryLight}
            onPress={() => navigation.navigate('AdminKdJobRequests')}
          />
          <MetricTile
            icon="car-outline"
            label="Conducteurs"
            value={d.drivers}
            color={colors.success.default}
            bg={colors.success.light}
            onPress={() => navigation.navigate('AdminKdDriverRequests')}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <MetricTile
            icon="git-network-outline"
            label="Matchings"
            value={d.matches}
            color={colors.info.default}
            bg={colors.info.light}
            onPress={() => navigation.navigate('AdminKdMatching')}
          />
          <MetricTile
            icon="heart-outline"
            label="Quêtes publiées"
            value={d.quests}
            color={colors.brand.secondaryDark}
            bg="#FFF6E0"
            onPress={() => navigation.navigate('AdminKdQuests')}
          />
        </View>

        <SectionTitle title="Activité communautaire" icon="people-outline" />

        <ActionTile
          icon="briefcase-outline"
          iconColor={colors.brand.primary}
          iconBg={colors.brand.primaryLight}
          title="Besoins de position"
          subtitle="Superviser les demandes d'emploi"
          onPress={() => navigation.navigate('AdminKdJobRequests')}
        />
        <ActionTile
          icon="car-outline"
          iconColor={colors.success.default}
          iconBg={colors.success.light}
          title="Besoins de conducteur"
          subtitle="Superviser les recherches de chauffeurs"
          onPress={() => navigation.navigate('AdminKdDriverRequests')}
        />
        <ActionTile
          icon="git-network-outline"
          iconColor={colors.info.default}
          iconBg={colors.info.light}
          title="Matching"
          subtitle="Gérer les correspondances conducteur ↔ poste"
          onPress={() => navigation.navigate('AdminKdMatching')}
        />
        <ActionTile
          icon="heart-outline"
          iconColor={colors.brand.secondaryDark}
          iconBg="#FFF6E0"
          title="Quêtes"
          subtitle="Superviser les collectes communautaires"
          onPress={() => navigation.navigate('AdminKdQuests')}
        />

        <SectionTitle title="Supervision & qualité" icon="shield-checkmark-outline" />
        <View style={styles.quickActionsGrid}>
            <Pressable
                onPress={() => navigation.navigate('AdminKdJobRequests')}
                style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
            >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.error.light }]}>
                <Ionicons name={"shield-checkmark-outline"} size={20} color={colors.error.default} />
                </View>
                <Text style={[typography.h3, styles.quickActionTitle]} numberOfLines={1}>
                Modération
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
                onPress={() => navigation.navigate('AdminKdReports')}
                style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
            >
                <View style={[styles.quickActionIcon, { backgroundColor: colors.brand.primaryLight }]}>
                <Ionicons name={"bar-chart-outline"} size={20} color={colors.brand.primary} />
                </View>
                <Text style={[typography.h3, styles.quickActionTitle]} numberOfLines={1}>
                Rapports
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
