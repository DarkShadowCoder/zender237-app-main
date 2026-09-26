import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { components, spacing, typography } from '../theme/theme';

export default function InfoBanner({ text, icon = 'shield-checkmark-outline' }) {
  const b = components.infoBanner;
  return (
    <View style={[styles.wrapper, { backgroundColor: b.backgroundColor, borderRadius: b.radius, marginVertical: spacing.md }]}>
      <Ionicons name={icon} size={18} color={b.iconColor} />
      <Text style={[typography.caption, { color: b.textColor, flex: 1, textAlign: 'auto', lineHeight: spacing.md * 1.4 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
  },
});
