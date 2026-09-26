import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { components, getStatusColors, radii } from '../theme/theme';

const ICONS = {
  pending_proof: 'time-outline',
  under_review: 'time-outline',
  confirmed: 'checkmark-circle',
  rejected: 'close-circle',
  cancelled: 'ban-outline',
};

/** Grande icône ronde de statut plein écran (check vert / X rouge / horloge bleue). */
export default function StatusIcon({ status }) {
  const s = getStatusColors(status);
  const { size, haloSize } = components.statusIcon;

  return (
    <View
      style={{
        width: haloSize,
        height: haloSize,
        borderRadius: radii.circle,
        backgroundColor: s.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      
      <Ionicons name={ICONS[status] ?? 'time-outline'} size={size * 0.6} color={s.icon} />
    </View>
  );
}
