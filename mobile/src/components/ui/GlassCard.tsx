/**
 * GlassCard - iOS 26 Liquid Glass with native GlassView
 */
import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

const CAN_USE_GLASS = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    const ok = isLiquidGlassAvailable();
    // eslint-disable-next-line no-console
    console.log('[GlassCard] isLiquidGlassAvailable:', ok, 'GlassView:', typeof GlassView);
    return ok;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[GlassCard] isLiquidGlassAvailable threw:', e);
    return false;
  }
})();

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
  if (CAN_USE_GLASS) {
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
