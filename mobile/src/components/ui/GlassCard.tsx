import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { GlassView, type GlassStyle } from 'expo-glass-effect';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glassStyle?: GlassStyle;
  tintColor?: string;
  interactive?: boolean;
}

const IS_IOS = Platform.OS === 'ios';

export function GlassCard({
  children,
  style,
  glassStyle = 'regular',
  tintColor,
  interactive = false,
}: GlassCardProps) {
  // Always use GlassView on iOS — it handles its own fallback natively
  if (IS_IOS) {
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
