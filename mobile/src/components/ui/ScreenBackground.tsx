import { type ColorValue, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenBackgroundProps {
  children: React.ReactNode;
}

const BG_COLORS = ['#E8EFF5', '#F2F2F7', '#EDE7F6'] as const;

/**
 * Gradient background for screens — makes GlassCard / Liquid Glass visible.
 * Glass effects need varied background content to be perceivable.
 */
export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <LinearGradient
      colors={BG_COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
