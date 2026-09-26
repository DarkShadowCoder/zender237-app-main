import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { components, spacing, typography, fontSizes } from '../theme/theme';

/** Filtres segmentés ("Toutes" / "Recharges" / "Transferts" / "Retraits", "En attente" / "Confirmés" / "Rejetés"). */
export default function SegmentedControl({ options, value, onChange }) {
  const sc = components.segmentedControl;
  return (
    <View style={[styles.wrapper, { height: sc.height, borderRadius: sc.radius, backgroundColor: sc.backgroundColor }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              { borderRadius: sc.radius },
              active && { backgroundColor: sc.activeBackgroundColor },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: active ? sc.activeTextColor : sc.inactiveTextColor, fontWeight: '600', lineHeight: spacing.md *1.4, top: 2, fontSize: fontSizes.sm },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SegmentedControl2({ options, value, onChange }) {
  const sc = components.segmentedControl;
  return (
    <View style={[styles.wrapper, { height: sc.height, borderRadius: sc.radius, backgroundColor: sc.backgroundColor }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              { borderRadius: sc.radius },
              active && { backgroundColor: sc.activeBackgroundColor },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: active ? sc.activeTextColor : sc.inactiveTextColor, fontWeight: '600', lineHeight: spacing.md *1.4, top: 2, fontSize: fontSizes.sm },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', padding: 3, marginBottom: 16 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
