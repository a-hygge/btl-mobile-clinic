import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  colors?: readonly [string, string, ...string[]];
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  children?: React.ReactNode;
}

const DEFAULT_COLORS = ['#007AFF', '#0051D5'] as const;

export function GradientHeader({
  title,
  subtitle,
  colors = DEFAULT_COLORS,
  rightSlot,
  leftSlot,
  children,
}: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.row}>
        {leftSlot}
        <View style={styles.titleBlock}>
          <Text variant="headlineMedium" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyMedium" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightSlot}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1 },
  title: { color: '#fff', fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
