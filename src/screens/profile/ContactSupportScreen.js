import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme/theme';
import Header from '../../components/Header';

/** Écran 40 — Contact / Support. */
export default function ContactSupportScreen() {
  const items = [
    {
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      value: '+237 6 12 34 56 78',
      onPress: () => Linking.openURL('https://wa.me/237612345678'),
    },
    {
      icon: 'mail-outline',
      label: 'Email',
      value: 'support@zender237.com',
      onPress: () => Linking.openURL('mailto:support@zender237.com'),
    },
  ];

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={{ padding: spacing.screenHorizontal }}>
      <Header title="Contact / Support" />
      <Text style={[typography.body, { marginTop: spacing.lg, marginBottom: spacing.xl }]}>
        Nous sommes là pour vous aider.
      </Text>

      <View style={styles.card}>
        {items.map((item, idx) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={[styles.row, idx < items.length - 1 && styles.rowBorder]}
          >
            <Ionicons name={item.icon} size={20} color={colors.brand.primary} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={typography.bodyBold}>{item.label}</Text>
              <Text style={typography.caption}>{item.value}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { marginTop: spacing.lg }]}>
        <Text style={typography.bodyBold}>Heures d'ouverture</Text>
        <Text style={typography.caption}>Lun - Ven : 08h00 - 18h00</Text>
        <Text style={typography.caption}>Sam : 09h00 - 14h00</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default },
  card: {
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
});
