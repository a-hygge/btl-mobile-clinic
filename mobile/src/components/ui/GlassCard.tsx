/**
 * GlassCard - iOS 26 Liquid Glass with native GlassView
 *
 * Based on a working production implementation:
 * - Uses 'clear' glass style by default (more transparent, more visible)
 * - borderRadius + overflow: 'hidden' for proper clipping
 * - Conditional require to gracefully handle missing module
 */
import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';

// Conditionally import GlassView for iOS 26+
let GlassView: React.ComponentType<{
  style?: object;
  glassEffectStyle?: 'clear' | 'regular';
  tintColor?: string;
  isInteractive?: boolean;
  children?: React.ReactNode;
}> | null = null;

let isLiquidGlassAvailableFn: (() => boolean) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const glassEffect = require('expo-glass-effect');
  GlassView = glassEffect.GlassView;
  isLiquidGlassAvailableFn = glassEffect.isLiquidGlassAvailable;
} catch {
  // expo-glass-effect not available
}

function useNativeGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (!GlassView || !isLiquidGlassAvailableFn) return false;
  try {
    return isLiquidGlassAvailableFn();
  } catch {
    return false;
  }
}

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Glass effect style for iOS 26+. 'clear' is more transparent, 'regular' is more opaque. */
  glassStyle?: 'clear' | 'regular';
  /** Tint color for the glass effect */
  tintColor?: string;
  /** Whether glass should respond to touch */
  interactive?: boolean;
}

export function GlassCard({
  children,
  style,
  glassStyle = 'clear',
  tintColor,
  interactive = false,
}: GlassCardProps) {
  const canUseNativeGlass = useNativeGlass();

  // Native iOS 26+ Liquid Glass
  if (canUseNativeGlass && GlassView) {
    return (
      <GlassView
        style={[styles.glass, style]}
        glassEffectStyle={glassStyle}
        tintColor={tintColor}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback for Android / older iOS
  return (
    <View style={[styles.fallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
  },
  fallback: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
});

export default GlassCard;
