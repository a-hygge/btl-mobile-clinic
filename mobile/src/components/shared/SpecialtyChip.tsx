/**
 * SpecialtyChip - 56x56 colored icon background + label below
 * Matches Figma `div.specialty-item` pattern.
 * Used in horizontal scroll list on Home screen.
 */
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { figmaColors, figmaFonts, figmaRadius } from '../../constants/theme';

interface SpecialtyChipProps {
  icon: string; // emoji
  label: string;
  bgColor?: string;
  onPress?: () => void;
}

export function SpecialtyChip({ icon, label, bgColor = figmaColors.pastelRed, onPress }: SpecialtyChipProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.wrap}>
      <Animated.View style={[styles.iconBox, { backgroundColor: bgColor, transform: [{ scale }] }]}>
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: figmaRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: figmaFonts.sizes.xs,
    fontWeight: figmaFonts.weights.medium,
    color: figmaColors.textSecondary,
    textAlign: 'center',
  },
});
