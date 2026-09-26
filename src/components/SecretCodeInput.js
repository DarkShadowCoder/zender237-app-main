import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { components, colors, spacing } from '../theme/theme';

/**
 * Champ "Code secret" masqué avec icône œil pour basculer la visibilité
 * (voir maquettes "Informations personnelles" et "Connexion"). Contrairement
 * à <CodeInput />, il s'agit d'un unique champ texte — pas de cases séparées.
 */
export default function SecretCodeInput({
  label,
  value,
  onChangeText,
  error,
  maxLength = 6,
  placeholder = '••••••',
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const io = components.input;

  const borderColor = error ? io.errorBorderColor : focused ? io.focusBorderColor : io.borderColor;

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={io.labelStyle}>{label}</Text> : null}
      <View
        style={[
          styles.wrapper,
          {
            height: io.height,
            borderRadius: io.radius,
            backgroundColor: io.backgroundColor,
            borderColor,
            paddingHorizontal: io.paddingHorizontal,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: io.textColor }]}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, '').slice(0, maxLength))}
          placeholder={placeholder}
          placeholderTextColor={io.placeholderColor}
          keyboardType="number-pad"
          secureTextEntry={!visible}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.icon.muted}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 8 },
  input: { flex: 1, fontSize: 18, letterSpacing: 4 },
  error: { marginTop: 4, fontSize: 12, color: colors.error.default },
});
