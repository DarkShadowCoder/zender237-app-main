import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, fontSizes } from '../theme/theme';

export default function EmptyState({ icon = 'file-tray-outline', title, subtitle }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm }}>
      <Ionicons name={icon} size={50} color={colors.icon.muted} />
      <Text style={typography.bodyBold}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, { textAlign: 'center', lineHeight: fontSizes.sm * 1.4 }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
