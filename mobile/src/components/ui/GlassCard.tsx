import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glassStyle?: GlassStyle;
  tintColor?: string;
  interactive?: boolean;
}

// Check multiple ways — Platform.Version can be string or number on iOS
let USE_GLASS = false;
try {
  USE_GLASS = isLiquidGlassAvailable();
} catch {
  if (Platform.OS === 'ios') {
    const v = typeof Platform.Version === 'string'
      ? parseInt(Platform.Version, 10)
      : Platform.Version;
    USE_GLASS = v >= 26;
  }
}

export function GlassCard({
  children,
  style,
  glassStyle = 'regular',
  tintColor,
  interactive = false,
}: GlassCardProps) {
  if (USE_GLASS) {
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
    padding: 16,
    overflow: 'hidden',
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
