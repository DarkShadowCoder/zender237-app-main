import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, typography, spacing, fontWeights } from '../../theme/theme';
import Button from '../../components/Button';
 */
/** Écran 03 — Bienvenue / Intro. */
/*const FEATURES = [
  { icon: 'flash', label: 'Rapide', color: colors.brand.secondary },
  { icon: 'shield-checkmark', label: 'Sécurisé', color: colors.success.default },
  { icon: 'time', label: 'Disponible 24/7', color: colors.info.default },
];

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.wrapper}>
      <Text style={[typography.h1, styles.title]}>{'Bienvenue sur\nZender237'}</Text>
      <Text style={[typography.body, styles.subtitle]}>
        La solution simple et sécurisée pour envoyer et recevoir de l'argent.
      </Text>

      <Image
        source={require('../../../assets/images/onboarding.png')}
        style={styles.image}
        contentFit="contain"
      />

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: `${f.color}1A` }]}>
              <Ionicons name={f.icon} size={20} color={f.color} />
            </View>
            <Text style={typography.caption}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Button title="Suivant" onPress={() => navigation.replace('SignUp')} />
      <Pressable onPress={() => navigation.replace('SignUp')} style={styles.skip}>
        <Text style={[typography.body, { color: colors.text.link }]}>Passer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default, padding: spacing.screenHorizontal },
  title: { textAlign: 'center', marginTop: spacing.xxl },
  subtitle: {
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: spacing.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
    width: '80%',
  },
  image: {
    width: '100%',
    height: '42%',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  feature: { alignItems: 'center', gap: 6 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  skip: { marginTop: spacing.md, marginBottom: spacing.sm, alignItems: 'center' },
});
*/
export default function WelcomeScreen() {
  return <View style={{ flex: 1 }} />;
}