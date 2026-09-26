import React, { useState } from 'react';
import { ScrollView, Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../../theme/theme';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { assignTransaction } from '../../../services/adminService';
import { Screen, SectionTitle, styles } from '../AdminUI';

const RESPONSIBILITIES = [
  { value: 'deposit_review', label: 'Vérif. dépôt', icon: 'arrow-down-circle-outline' },
  { value: 'transfer_review', label: 'Vérif. transfert', icon: 'swap-horizontal-outline' },
  { value: 'withdrawal_review', label: 'Vérif. retrait', icon: 'arrow-up-circle-outline' },
  { value: 'proof_verification', label: 'Vérif. preuve', icon: 'image-outline' },
  { value: 'bank_execution', label: 'Exécution bancaire', icon: 'business-outline' },
  { value: 'settlement', label: 'Règlement', icon: 'checkmark-done-outline' },
];

export default function TransactionAssignmentScreen({ route, navigation }) {
  const { transactionId } = route.params;
  const [partnerId, setPartnerId] = useState('');
  const [responsibility, setResponsibility] = useState('proof_verification');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await assignTransaction({ transactionId, partnerId: partnerId || null, responsibility, notes });
      Alert.alert('Assignée', 'La transaction a été affectée.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const selected = RESPONSIBILITIES.find(r => r.value === responsibility);

  return (
    <Screen title="Affecter la transaction">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Partenaire" icon="person-add-outline" />
        <Card>
          <Input label="ID partenaire" value={partnerId} onChangeText={setPartnerId} placeholder="UUID du partenaire" autoCapitalize="none" />
        </Card>

        <SectionTitle title="Responsabilité" icon="briefcase-outline" />
        <Card>
          <View style={local.chipWrap}>
            {RESPONSIBILITIES.map(r => {
              const active = r.value === responsibility;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setResponsibility(r.value)}
                  style={[local.chip, { backgroundColor: active ? colors.brand.primary : colors.background.surfaceAlt, borderColor: active ? colors.brand.primary : colors.border.default }]}
                >
                  <Ionicons name={r.icon} size={15} color={active ? colors.text.inverse : colors.brand.primary} style={{ marginRight: 6 }} />
                  <Text style={[local.chipText, { color: active ? colors.text.inverse : colors.text.primary }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle title="Notes internes" icon="document-text-outline" />
        <Card>
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Précisions pour le partenaire ou le suivi interne" autoCapitalize="sentences" />
        </Card>

        <View style={local.recap}>
          <Text style={[typography.caption, styles.muted, { textAlign: 'center', marginTop: 0 }]}>
            Affectation : {selected?.label}{partnerId ? ` · Partenaire ${partnerId}` : ''}
          </Text>
        </View>
        <Button title="Affecter la transaction" loading={loading} onPress={submit} />
      </ScrollView>
    </Screen>
  );
}

const local = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1.5 },
  chipText: { fontFamily: 'Baloo2_600SemiBold', fontWeight: '700', fontSize: 13 },
  recap: { marginTop: spacing.lg, marginBottom: spacing.sm },
});