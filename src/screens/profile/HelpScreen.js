import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme/theme';
import Header from '../../components/Header';

const FAQS = [
  { q: 'Comment effectuer un dépôt ?', a: "Depuis l'accueil, appuyez sur \"Recharge\", choisissez un montant et un numéro Mobile Money, puis envoyez la preuve de paiement." },
  { q: 'Combien de temps prend un transfert ?', a: 'Les transferts sont généralement traités sous 10 à 30 minutes ouvrées.' },
  { q: "J'ai oublié mon code secret, que faire ?", a: "Utilisez l'option \"Mot de passe oublié\" sur l'écran de connexion pour le réinitialiser via WhatsApp." },
  { q: 'Quels sont les frais appliqués ?', a: 'Les frais varient selon le montant et la méthode choisie ; ils sont toujours affichés avant confirmation.' },
];

/** Écran 39 — Centre d'aide (FAQ). */
export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={{ padding: spacing.screenHorizontal }}>
      <Header title="Centre d'aide" />
      <View style={{ marginTop: spacing.xl }}>
        {FAQS.map((faq, idx) => {
          const open = openIndex === idx;
          return (
            <Pressable key={faq.q} onPress={() => setOpenIndex(open ? null : idx)} style={styles.card}>
              <View style={styles.faqHeader}>
                <Text style={[typography.bodyBold, { flex: 1 }]}>{faq.q}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.icon.muted} />
              </View>
              {open ? <Text style={[typography.caption, { marginTop: spacing.sm }]}>{faq.a}</Text> : null}
            </Pressable>
          );
        })}
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
    marginBottom: spacing.md,
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center' },
});
