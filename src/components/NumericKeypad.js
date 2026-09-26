import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../theme/theme';

const KEYS = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
];

/**
 * Clavier numérique custom (type composeur téléphonique) utilisé pour la
 * saisie de l'OTP/code secret sans faire apparaître le clavier système —
 * reproduit le pavé vu sur l'écran "Vérification OTP" des maquettes.
 */
export default function NumericKeypad({ onKeyPress, onBackspace }) {
  return (
    <View style={styles.grid}>
      {KEYS.map((key) => (
        <Pressable
          key={key.digit}
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          onPress={() => onKeyPress(key.digit)}
        >
          <Text style={styles.digit}>{key.digit}</Text>
          {key.sub ? <Text style={styles.sub}>{key.sub}</Text> : null}
        </Pressable>
      ))}

      <View style={styles.key} />

      <Pressable
        style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        onPress={() => onKeyPress('0')}
      >
        <Text style={styles.digit}>0</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        onPress={onBackspace}
      >
        <Ionicons name="backspace-outline" size={24} color={colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  key: {
    width: '31%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderRadius: radii.md,
  },
  keyPressed: {
    backgroundColor: colors.overlay.pressed,
  },
  digit: {
    ...typography.h2,
    fontWeight: '700',
  },
  sub: {
    ...typography.overline,
    marginTop: 2,
    letterSpacing: 1.5,
  },
});
