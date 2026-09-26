import React from 'react';
import { View, Text } from 'react-native';
import { components } from '../theme/theme';
import { getStatusColors } from '../theme/theme';

/** Badge de statut de transaction — couleurs pilotées par `statusColors` (theme.js). */
export default function StatusBadge({ status, label }) {
  const s = getStatusColors(status);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: components.badge.radius,
        paddingHorizontal: components.badge.paddingHorizontal,
        paddingVertical: components.badge.paddingVertical,
        backgroundColor: s.background,
        borderWidth: 1,
        borderColor: s.border,
      }}
    >
      <Text
        style={{
          fontFamily: components.badge.fontFamily,
          fontSize: components.badge.fontSize,
          color: s.text,
        }}
      >
        {label ?? s.label}
      </Text>
    </View>
  );
}
