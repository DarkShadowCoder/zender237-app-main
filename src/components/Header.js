import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, layout } from '../theme/theme';

export default function Header({ title, showBack = true, right }) {
  const navigation = useNavigation();
  return (
    <View style={[styles.wrapper, { height: layout.headerHeight }]}>
      {showBack && navigation.canGoBack() ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.side}>
          <Ionicons name="chevron-back" size={24} color={colors.brand.primaryDark} />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}
      <Text style={[typography.h3, styles.title]} numberOfLines={1}>
        {title}
      </Text>
      {right ? <View style={styles.side}>{right}</View> : <View />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  side: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' , backgroundColor: colors.background.surface, borderRadius: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  title: { flex: 1, textAlign: 'left', color: colors.brand.primary, fontWeight: 'bold' },
});
