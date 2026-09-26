import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, fontSizes } from '../../theme/theme';

/** Écran 01 — Écran de démarrage. Fond navy, logo, tagline, redirige après un court délai. */
export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Language'), 1400);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <LinearGradient colors={[colors.brand.navy, colors.palette.navy900]} style={styles.wrapper}>
      <Image source={require('../../../assets/images/loader.png')} style={styles.logo} contentFit='contain' />
      <Text style={[typography.bodyBold, { color: colors.palette.gray200, marginTop: spacing.xl, marginHorizontal: spacing.screenHorizontal, textAlign: 'center' }]}>
        Transfert d'argent rapide, sécurisé et fiable.
      </Text>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 300,
    height: 300,
    marginBottom: spacing.xl,

  },
});
