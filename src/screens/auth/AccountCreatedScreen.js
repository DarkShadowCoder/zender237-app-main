import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme/theme';
import Button from '../../components/Button';
import StatusIcon from '../../components/StatusIcon';
import { Image } from 'expo-image';

/** Écran 07 — Confirmation compte créé. */
export default function AccountCreatedScreen({ navigation }) {
  return (
    <View style={styles.wrapper}>
      <Image source={require('../../../assets/images/congrats.png')} style={{ width: 100, height: 100, marginBottom: spacing.xl }} />
      <Text style={[typography.h1, styles.title]}>Compte créé avec succès !</Text>
      <Text style={[typography.body, styles.subtitle]}>
        Votre compte a été créé. Vous pouvez maintenant vous connecter pour commencer à utiliser Zender237.
      </Text>
      <View style={{ flex: 1 }} />
      <Button title="Se connecter" onPress={() => navigation.replace('Login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background.default,
    padding: spacing.screenHorizontal,
    paddingTop: 100,
    alignItems: 'center',
  },
  title: { textAlign: 'center', marginTop: spacing.xl, color: colors.success.text },
  subtitle: { textAlign: 'center', marginTop: spacing.sm },
});
