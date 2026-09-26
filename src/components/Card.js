import React from 'react';
import { View } from 'react-native';
import { components } from '../theme/theme';

export default function Card({ children, style }) {
  return (
    <View
      style={[
        {
          borderRadius: components.card.radius,
          backgroundColor: components.card.backgroundColor,
          padding: components.card.padding,
          borderColor: components.card.borderColor,
          borderWidth: components.card.borderWidth,
          shadowColor: components.card.shadowColor,
          shadowOpacity: components.card.shadowOpacity,
          shadowRadius: components.card.shadowRadius,
          shadowOffset: components.card.shadowOffset,
          elevation: components.card.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
