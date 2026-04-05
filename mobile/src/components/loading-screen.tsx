import { Text, View, StyleSheet } from 'react-native';
import { Surface } from 'react-native-paper';
import { theme } from '../constants/theme';
import { HealthPulse } from './health-pulse';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Surface style={styles.panel} elevation={2}>
        <HealthPulse size={160} />
        <Text style={styles.title}>BTL Healthcare</Text>
        <Text style={styles.text}>Preparing your care dashboard</Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: theme.colors.primaryContainer,
    opacity: 0.7,
  },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.surface,
  },
  text: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 15,
    fontWeight: '500',
  },
  title: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
});
