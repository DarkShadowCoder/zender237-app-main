import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { components, colors, typography } from '../theme/theme';

/**
 * Bouton générique piloté par les tokens `components.button` du thème.
 * variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
 * size: 'sm' | 'md' | 'lg'
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  icon,
}) {
  const variantTokens = components.button.variants[disabled ? 'disabled' : variant];

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: components.button.height[size],
          borderRadius: components.button.radius,
          paddingHorizontal: components.button.paddingHorizontal,
          backgroundColor: variantTokens.backgroundColor,
          borderColor: variantTokens.borderColor,
          borderWidth: variantTokens.borderWidth || 0,
          width: fullWidth ? '100%' : undefined,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantTokens.textColor} />
      ) : (
        <>
          {icon}
          <Text style={[typography.button, { color: variantTokens.textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
