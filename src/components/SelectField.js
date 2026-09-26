import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { components, spacing, typography } from '../theme/theme';

/** Champ "select" style maquette (Pays, Méthode de retrait…) — ouvre un bottom sheet/menu au tap. */
export default function SelectField({ label, valueLabel, placeholder = 'Sélectionner', onPress, leftIcon }) {
  const io = components.input;
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={io.labelStyle}>{label}</Text> : null}
      <Pressable
        onPress={onPress}
        style={[
          styles.wrapper,
          {
            height: io.height,
            borderRadius: io.radius,
            backgroundColor: io.backgroundColor,
            borderColor: io.borderColor,
            paddingHorizontal: io.paddingHorizontal,
          },
        ]}
      >
        {leftIcon}
        <Text style={[typography.caption, { flex: 1, color: valueLabel ? io.textColor : io.placeholderColor, fontSize: 16 }]}>
          {valueLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={io.placeholderColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 8 },
});
