import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glassStyle?: GlassStyle;
  tintColor?: string;
  interactive?: boolean;
}

// Native Liquid Glass requires iOS 26+ with working UIGlassEffect
let USE_NATIVE_GLASS = false;
try {
  USE_NATIVE_GLASS = isLiquidGlassAvailable();
} catch {
  // isLiquidGlassAvailable may not exist at module init time
}

// eslint-disable-next-line no-console
console.log('[GlassCard] isLiquidGlassAvailable:', USE_NATIVE_GLASS, 'Platform:', Platform.OS, Platform.Version);

const IS_IOS = Platform.OS === 'ios';

export function GlassCard({
  children,
  style,
  glassStyle = 'regular',
  tintColor,
  interactive = false,
}: GlassCardProps) {
  // Best: native Liquid Glass (iOS 26+ with working API)
  if (USE_NATIVE_GLASS) {
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

  // Good fallback: BlurView frosted glass (iOS)
  if (IS_IOS) {
    return (
      <View style={[styles.blurOuter, style]}>
        <BlurView style={StyleSheet.absoluteFill} intensity={60} tint="light" />
        <View style={styles.blurContent}>
          {children}
        </View>
      </View>
    );
  }

  // Android fallback: semi-transparent card
  return (
    <View style={[styles.fallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    padding: 16,
  },
  blurOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  blurContent: {
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
